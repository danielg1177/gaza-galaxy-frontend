import {
  computeClickDistance,
  computeTurnsInTransit,
  effectiveRange,
  effectiveSpeed,
  isInRange,
} from './movementEngine';
import {
  FACTORY_GOLD_COST,
  FACTORY_GOLD_OUTPUT,
  FACTORY_TROOP_OUTPUT,
  RESEARCH_LAB_GOLD_COST,
} from './productionEngine';
import type { TurnInput } from './turnEngine';
import type {
  AiPlanetMemory,
  AiPlayerState,
  BuildingType,
  Fleet,
  GameState,
  OwnerId,
  Planet,
  PlanetClass,
  Player,
  Position,
} from './types';

// ---------------------------------------------------------------------------
// Difficulty type & name pool
// ---------------------------------------------------------------------------

export type AiDifficulty = 'easy' | 'normal' | 'hard';

const AI_NAMES = [
  'Aria', 'Cael', 'Dax', 'Lyra', 'Rex', 'Nova', 'Zara', 'Finn', 'Mira', 'Jax',
  'Sable', 'Kira', 'Oryn', 'Vex', 'Tala', 'Cyrus', 'Nira', 'Brax', 'Lena', 'Orin',
  'Zoe', 'Dane', 'Mace', 'Sera', 'Kael', 'Lux', 'Ryn', 'Thea', 'Beck', 'Vera',
  'Ashe', 'Cole', 'Faye', 'Gwen', 'Hale', 'Ivy', 'Jude', 'Kade', 'Lane', 'Mae',
  'Nash', 'Pax', 'Quinn', 'Rue', 'Sage', 'Tess', 'Uma', 'Vale', 'Wren', 'Xen',
];

export function generateAiName(rng: () => number, usedNames: Set<string>): string {
  const shuffled = [...AI_NAMES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const usedLower = new Set(Array.from(usedNames, (name) => name.toLowerCase()));
  for (const name of shuffled) {
    if (!usedLower.has(name.toLowerCase())) {
      return name;
    }
  }
  return `AI ${usedNames.size + 1}`;
}

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Minimum garrison ratio: keep at least this fraction of ships on source planet. */
const GARRISON_RATIO: Record<AiDifficulty, number> = {
  easy: 0.5,
  normal: 0.4,
  hard: 0.2,
};

/**
 * Absolute minimum garrison regardless of ratio.
 * Hard is willing to leave almost nothing behind during exploration and expansion.
 */
const MIN_GARRISON: Record<AiDifficulty, number> = {
  easy: 5,
  normal: 5,
  hard: 2,
};

/**
 * Maximum fleet dispatches per AI turn.
 * Hard has no practical limit — it dispatches as many fleets as ships and targets allow.
 */
const MAX_FLEETS: Record<AiDifficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 500,
};

/**
 * Attacker strength multiple required to commit to an attack.
 * Lower = more aggressive.
 */
const ATTACK_ADVANTAGE: Record<AiDifficulty, number> = {
  easy: 1.5,
  normal: 1.35,
  hard: 1.2,
};

/** Gold to keep in reserve before spending on buildings. */
const GOLD_RESERVE: Record<Exclude<AiDifficulty, 'easy'>, number> = {
  normal: 0,
  hard: 0,
};

/**
 * Round at which the AI begins building research labs.
 * Before this round every building slot gets a factory regardless of planet class.
 * After this round low-class planets transition to research labs.
 */
const RESEARCH_START_ROUND: Record<Exclude<AiDifficulty, 'easy'>, number> = {
  normal: 20,
  hard: 15,
};

/** Number of rounds before memory is considered stale. */
const STALE_ROUNDS = 6;

/** Ship count for a scout probe — 1 is enough to reveal and claim an empty planet. */
const SCOUT_SHIPS = 1;

/**
 * Assumed enemy troop growth per round when memory is stale.
 * Used to estimate current enemy garrison from last-seen value.
 */
const ESTIMATED_ENEMY_GROWTH_PER_ROUND = 2;

// ---------------------------------------------------------------------------
// Early-game exploration & threat-based garrison constants
// ---------------------------------------------------------------------------

/**
 * Number of rounds in the early-game "spider-web" exploration phase.
 * During this window the AI keeps no garrison on planets that have no buildings
 * and are not a strategic choke-point — every ship goes forward to discover.
 */
const EARLY_EXPLORE_ROUNDS = 10;

/**
 * Hub-value threshold at which a planet is considered a strategic choke-point.
 * Planets with hubValue >= this unlock additional territory and are worth a token garrison
 * even when they have no buildings.
 */
const CHOKEPOINT_THRESHOLD = 3;

/**
 * Transit turns to the nearest known enemy planet at which the AI feels "safe".
 * Beyond this distance the garrison ratio starts dropping toward the safe minimum.
 */
const ENEMY_SAFE_TURNS = 4;

/**
 * Transit turns to the nearest unexplored planet at which the AI feels "safe".
 * Unexplored territory is treated as half as threatening as a confirmed enemy.
 */
const UNKNOWN_SAFE_TURNS = 3;

/**
 * Minimum garrison ratio when a planet is completely safe (no known enemies or
 * unexplored territory nearby).  The actual ratio scales linearly from this floor
 * up to GARRISON_RATIO[difficulty] as threat approaches 1.
 */
const MIN_SAFE_GARRISON_RATIO: Record<Exclude<AiDifficulty, 'easy'>, number> = {
  normal: 0.1,
  hard: 0.05,
};

/**
 * Class index at-or-below which a planet is "valuable" (worth defending fully and
 * recapturing at all costs).  Index 5 corresponds to class 'F'; classes A–F cover
 * the top ~37 % of the 16-tier A–P scale.
 *
 * Owned planets with any buildings are always considered valuable regardless of class
 * because the AI has already invested gold in them.
 */
const VALUABLE_CLASS_INDEX = 5; // 'ABCDEFGHIJKLMNOP'[5] = 'F'

/**
 * Click distance at-or-below which a known enemy planet triggers full troop production
 * on any owned planet with active factories.
 *
 * 20 clicks ≈ 1.8× the base fleet range (11 clicks), so the enemy is either already in
 * direct strike range at higher tech levels or just one relay hop away at base tech.
 * A factory planet within this radius switches to 100 % troop output until the
 * threat leaves sensor range or goes stale.
 */
const FACTORY_DEFENSE_RANGE_CLICKS = 20;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Unified view of a planet combining static map data with AI memory.
 * For owned planets every field reflects live state; for others it reflects
 * the most recent observation or defaults when unexplored.
 */
interface MemorizedPlanet {
  id: string;
  name: string;
  position: Position;
  class: PlanetClass;
  isHomePlanet: boolean;
  isOwned: boolean;
  /** Neutrals or unknown territory. */
  isNeutral: boolean;
  /** Known to be enemy-owned as of last observation. */
  isEnemy: boolean;
  /** Was observed at least once. */
  isExplored: boolean;
  lastSeenOwner: OwnerId;
  /** Estimated current ship count (accounts for growth since last seen). */
  estimatedShipCount: number;
  /** Rounds since last observation. 0 = observed this round. */
  staleness: number;
}

interface AiContext {
  state: GameState;
  player: Player;
  playerId: string;
  difficulty: AiDifficulty;
  rangeClicks: number;
  aiState: AiPlayerState;
  /** All planets as known to this AI. */
  memorized: MemorizedPlanet[];
  /** Currently owned planets (live state). */
  ownedPlanets: Planet[];
  /** Actions accumulated so far this turn. */
  actions: TurnInput['actions'];
  /** Ships already queued to leave each planet this turn (tracks garrison budget). */
  reservedShips: Map<string, number>;
  /**
   * Target planet ids already assigned a fleet this turn.
   * Prevents sending duplicate fleets to the same neutral (wasteful) while still
   * allowing coordinated multi-source attacks on enemies.
   */
  usedTargetIds: Set<string>;
  /** How many fleet dispatches have been queued so far. */
  fleetsQueued: number;
}

// ---------------------------------------------------------------------------
// Observation / memory update  (exported — called by turnEngine)
// ---------------------------------------------------------------------------

function emptyAiState(): AiPlayerState {
  return {
    planetMemory: {},
    knownEnemyHomePlanetIds: [],
    strategicPhase: 'expand',
  };
}

/**
 * Updates the AI player's fog-of-war memory based on what is currently visible.
 * Called at the end of each AI turn inside `resolveTurn` so that the AI's next
 * decision starts with an up-to-date snapshot of everything in sensor range.
 */
export function updateAiObservation(
  state: GameState,
  playerId: string,
  existing?: AiPlayerState,
): AiPlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined || player.isEliminated) {
    return existing ?? emptyAiState();
  }

  const rangeClicks = effectiveRange(player.techLevel);
  const ownedPlanets = state.map.planets.filter((p) => p.owner === playerId);

  // Build set of currently visible planet ids.
  const visibleIds = new Set<string>();
  for (const planet of state.map.planets) {
    if (planet.owner === playerId) {
      visibleIds.add(planet.id);
      continue;
    }
    for (const owned of ownedPlanets) {
      if (isInRange(owned.position, planet.position, rangeClicks)) {
        visibleIds.add(planet.id);
        break;
      }
    }
  }

  // In-transit fleet destinations are also observed on arrival.
  for (const fleet of state.fleets) {
    if (fleet.ownerId === playerId) {
      visibleIds.add(fleet.destinationPlanetId);
    }
  }

  // Merge into memory.
  const memory: Record<string, AiPlanetMemory> = { ...(existing?.planetMemory ?? {}) };
  for (const planetId of visibleIds) {
    const planet = state.map.planets.find((p) => p.id === planetId);
    if (planet === undefined) continue;
    memory[planetId] = {
      lastSeenRound: state.roundNumber,
      lastSeenOwner: planet.owner,
      lastSeenShipCount: planet.shipCount,
      isExplored: true,
    };
  }

  // Track confirmed enemy home planets.
  const knownEnemyHomePlanetIds = [...(existing?.knownEnemyHomePlanetIds ?? [])];
  for (const planetId of visibleIds) {
    const planet = state.map.planets.find((p) => p.id === planetId);
    if (
      planet !== undefined &&
      planet.isHomePlanet &&
      planet.owner !== playerId &&
      planet.owner !== 'neutral' &&
      !knownEnemyHomePlanetIds.includes(planetId)
    ) {
      knownEnemyHomePlanetIds.push(planetId);
    }
  }

  const strategicPhase = computeStrategicPhase(state, playerId, memory, existing?.strategicPhase);

  return { planetMemory: memory, knownEnemyHomePlanetIds, strategicPhase };
}

// ---------------------------------------------------------------------------
// Strategic phase
// ---------------------------------------------------------------------------

function computeStrategicPhase(
  state: GameState,
  playerId: string,
  memory: Record<string, AiPlanetMemory>,
  existingPhase?: AiPlayerState['strategicPhase'],
): AiPlayerState['strategicPhase'] {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined) return existingPhase ?? 'expand';

  const ownedPlanets = state.map.planets.filter((p) => p.owner === playerId);
  const home = state.map.planets.find((p) => p.id === player.homePlanetId);

  // Defend overrides everything when the home planet is directly threatened.
  if (home !== undefined) {
    const homeThreat = state.fleets.filter(
      (f) => f.destinationPlanetId === home.id && f.ownerId !== playerId,
    );
    const maxThreat = homeThreat.reduce((acc, f) => Math.max(acc, f.shipCount), 0);
    if (homeThreat.length > 0 && maxThreat > home.shipCount * 0.8) {
      return 'defend';
    }
  }

  // Early-game: expand while we have few planets or low tech.
  if (player.techLevel < 3 || ownedPlanets.length < 4) {
    return 'expand';
  }

  // Know at least one enemy and have a force advantage → strike.
  const knownEnemyMemory = Object.values(memory).filter(
    (m) => m.isExplored && m.lastSeenOwner !== 'neutral' && m.lastSeenOwner !== playerId,
  );
  if (knownEnemyMemory.length > 0) {
    const ownedShips = ownedPlanets.reduce((acc, p) => acc + p.shipCount, 0);
    const knownEnemyShips = knownEnemyMemory.reduce(
      (acc, m) => acc + m.lastSeenShipCount,
      0,
    );
    if (ownedShips > knownEnemyShips * 1.2) {
      return 'strike';
    }
  }

  // Default mid-game: build economy and research.
  return 'build';
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function buildContext(state: GameState, playerId: string): AiContext | null {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined || player.isEliminated || state.status !== 'active') {
    return null;
  }

  const difficulty: AiDifficulty = (player.difficulty as AiDifficulty) ?? 'normal';
  const rangeClicks = effectiveRange(player.techLevel);

  // Recompute a fresh observation from the current game state before making any
  // decisions.  The stored aiState in state.aiStates was last written at the END of
  // the previous AI turn, so it can be up to a full round stale — everything the
  // human player(s) did since then is invisible to the AI.  By running
  // updateAiObservation here (read-only, does not mutate state) the AI uses what is
  // actually visible right now from its current territory, not from last turn.
  // The turnEngine still writes the post-action observation at the end of the turn as
  // before; this inline call only affects the local decision context.
  const aiState = updateAiObservation(state, playerId, state.aiStates?.[playerId]);
  const ownedPlanets = state.map.planets.filter((p) => p.owner === playerId);

  const memorized = buildMemorizedPlanets(state, playerId, aiState, ownedPlanets);

  return {
    state,
    player,
    playerId,
    difficulty,
    rangeClicks,
    aiState,
    memorized,
    ownedPlanets,
    actions: [],
    reservedShips: new Map(),
    usedTargetIds: new Set(),
    fleetsQueued: 0,
  };
}

function buildMemorizedPlanets(
  state: GameState,
  playerId: string,
  aiState: AiPlayerState,
  ownedPlanets: Planet[],
): MemorizedPlanet[] {
  return state.map.planets.map((planet): MemorizedPlanet => {
    if (planet.owner === playerId) {
      return {
        id: planet.id,
        name: planet.name,
        position: planet.position,
        class: planet.class,
        isHomePlanet: planet.isHomePlanet,
        isOwned: true,
        isNeutral: false,
        isEnemy: false,
        isExplored: true,
        lastSeenOwner: playerId,
        estimatedShipCount: planet.shipCount,
        staleness: 0,
      };
    }

    const mem = aiState.planetMemory[planet.id];
    if (mem === undefined || !mem.isExplored) {
      return {
        id: planet.id,
        name: planet.name,
        position: planet.position,
        class: planet.class,
        isHomePlanet: planet.isHomePlanet,
        isOwned: false,
        isNeutral: true,
        isEnemy: false,
        isExplored: false,
        lastSeenOwner: 'neutral',
        estimatedShipCount: 0,
        staleness: Infinity,
      };
    }

    const staleness = state.roundNumber - mem.lastSeenRound;
    const isEnemy = mem.lastSeenOwner !== 'neutral' && mem.lastSeenOwner !== playerId;
    const growthEstimate = isEnemy ? staleness * ESTIMATED_ENEMY_GROWTH_PER_ROUND : 0;

    return {
      id: planet.id,
      name: planet.name,
      position: planet.position,
      class: planet.class,
      isHomePlanet: planet.isHomePlanet,
      isOwned: false,
      isNeutral: !isEnemy,
      isEnemy,
      isExplored: true,
      lastSeenOwner: mem.lastSeenOwner,
      estimatedShipCount: Math.max(0, mem.lastSeenShipCount + growthEstimate),
      staleness,
    };
  });
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function availableShips(ctx: AiContext, planetId: string): number {
  const planet = ctx.ownedPlanets.find((p) => p.id === planetId);
  if (planet === undefined) return 0;
  const reserved = ctx.reservedShips.get(planetId) ?? 0;
  return planet.shipCount - reserved;
}

function garrisonKeep(ctx: AiContext, planetId: string): number {
  const planet = ctx.ownedPlanets.find((p) => p.id === planetId);
  if (planet === undefined) return 0;

  const minGarrison = MIN_GARRISON[ctx.difficulty];
  const baseRatio = GARRISON_RATIO[ctx.difficulty];

  // Easy AI: unchanged flat ratio.
  if (ctx.difficulty === 'easy') {
    return Math.max(minGarrison, Math.floor(planet.shipCount * baseRatio));
  }

  // ── Early exploration phase (rounds 1 – EARLY_EXPLORE_ROUNDS) ──────────────
  // Goal: spider-web outward as fast as possible.  Leave nothing behind unless
  // the planet already has buildings, is the home planet (always protect), or
  // is a strategic choke-point that unlocks additional territory.
  if (ctx.state.roundNumber <= EARLY_EXPLORE_ROUNDS) {
    const isHomePlanet = planet.id === ctx.player.homePlanetId;
    const hasBuildings = planet.buildings.length > 0;
    const memPlanet = ctx.memorized.find((m) => m.id === planet.id);
    const isChokepoint =
      memPlanet !== undefined && hubValue(ctx, memPlanet) >= CHOKEPOINT_THRESHOLD;

    if (!isHomePlanet && !hasBuildings && !isChokepoint) {
      // Nothing worth protecting — send everything forward.
      return 0;
    }
    // Token garrison only; still prioritise forward movement.
    return minGarrison;
  }

  // ── Threat-based garrison (post early-game) ────────────────────────────────
  // Garrison ratio scales linearly between a safe-minimum (far from all threats)
  // and the full base ratio (enemy or fog right on the doorstep).
  //
  //   threat = 0  →  adjustedRatio = MIN_SAFE_GARRISON_RATIO  (interior planet, route ships forward)
  //   threat = 1  →  adjustedRatio = GARRISON_RATIO            (frontier planet under pressure)
  const threat = computeThreatLevel(ctx, planet);
  const minSafeRatio = MIN_SAFE_GARRISON_RATIO[ctx.difficulty];
  const adjustedRatio = minSafeRatio + (baseRatio - minSafeRatio) * threat;

  // Minimum garrison also scales down when the planet is deep in safe territory
  // so small planet garrisons don't hoard ships unnecessarily.
  const scaledMin = Math.max(1, Math.floor(minGarrison * Math.max(0.2, threat)));

  return Math.max(scaledMin, Math.floor(planet.shipCount * adjustedRatio));
}

function maxSendable(ctx: AiContext, planetId: string): number {
  const avail = availableShips(ctx, planetId);
  const keep = garrisonKeep(ctx, planetId);
  return Math.max(0, avail - keep);
}

function queueFleet(
  ctx: AiContext,
  fromPlanetId: string,
  toPlanetId: string,
  shipCount: number,
): boolean {
  if (shipCount < 1) return false;
  ctx.actions.push({ type: 'SEND_FLEET', fromPlanetId, toPlanetId, shipCount });
  ctx.reservedShips.set(fromPlanetId, (ctx.reservedShips.get(fromPlanetId) ?? 0) + shipCount);
  ctx.fleetsQueued += 1;
  return true;
}

/** Nearest owned planet (by transit turns) that can send ships to `targetPos`. */
function bestSource(
  ctx: AiContext,
  targetPos: Position,
  minSend: number,
  excludeIds?: Set<string>,
): Planet | undefined {
  let best: Planet | undefined;
  let bestDist = Infinity;

  for (const planet of ctx.ownedPlanets) {
    if (excludeIds?.has(planet.id)) continue;
    if (!isInRange(planet.position, targetPos, ctx.rangeClicks)) continue;
    if (maxSendable(ctx, planet.id) < minSend) continue;
    const dist = computeTurnsInTransit(planet.position, targetPos);
    if (dist < bestDist) {
      bestDist = dist;
      best = planet;
    }
  }

  return best;
}

/** All owned planets within send range of `targetPos`, sorted nearest first. */
function sourcesInRange(ctx: AiContext, targetPos: Position, minSend: number): Planet[] {
  return ctx.ownedPlanets
    .filter(
      (p) =>
        isInRange(p.position, targetPos, ctx.rangeClicks) &&
        maxSendable(ctx, p.id) >= minSend,
    )
    .sort(
      (a, b) =>
        computeTurnsInTransit(a.position, targetPos) -
        computeTurnsInTransit(b.position, targetPos),
    );
}

/**
 * Hub / choke-point value: how many planets become newly reachable if we own this position.
 * Planets already in range of an owned planet score 0 new reach.
 * High hub value → strategic relay point worth prioritising even over closer neutrals.
 */
function hubValue(ctx: AiContext, planet: MemorizedPlanet): number {
  return ctx.memorized.filter(
    (m) =>
      m.id !== planet.id &&
      isInRange(planet.position, m.position, ctx.rangeClicks) &&
      !ctx.ownedPlanets.some((op) => isInRange(op.position, m.position, ctx.rangeClicks)),
  ).length;
}

/** Is this planet a "frontier" — does it have known or unexplored territory within double range? */
function isFrontier(ctx: AiContext, planet: Planet): boolean {
  const doubleRange = ctx.rangeClicks * 2;
  return ctx.memorized.some(
    (m) =>
      m.id !== planet.id &&
      (m.isEnemy || !m.isExplored) &&
      computeClickDistance(planet.position, m.position) <= doubleRange,
  );
}

/**
 * Returns a normalised threat level [0, 1] for an owned planet.
 *
 * The score is based on transit turns to the nearest known enemy planet and to
 * the nearest unexplored (fog) planet:
 *   - Known enemy → full (1×) threat weight.  Closer = more danger.
 *   - Unexplored territory → half (0.5×) threat weight — could be empty neutrals.
 *
 * 0.0 = completely safe (enemies and fog are both far away or absent).
 * 1.0 = immediate threat on the doorstep.
 *
 * The result drives garrison sizing after the early-game exploration phase:
 * a safe interior planet keeps only MIN_SAFE_GARRISON_RATIO of its ships while a
 * frontier planet under pressure keeps up to the full GARRISON_RATIO.
 */
function computeThreatLevel(ctx: AiContext, planet: Planet): number {
  const speed = effectiveSpeed(ctx.player.techLevel);
  let minEnemyTurns = Infinity;
  let minUnknownTurns = Infinity;

  for (const mem of ctx.memorized) {
    if (mem.id === planet.id) continue;
    const turns = computeTurnsInTransit(planet.position, mem.position, speed);
    if (mem.isEnemy) {
      minEnemyTurns = Math.min(minEnemyTurns, turns);
    } else if (!mem.isExplored) {
      minUnknownTurns = Math.min(minUnknownTurns, turns);
    }
  }

  // Linear decay from 1 at distance 0 to 0 at SAFE_TURNS.
  const enemyThreat =
    minEnemyTurns === Infinity ? 0 : Math.max(0, 1 - minEnemyTurns / ENEMY_SAFE_TURNS);
  // Unknown territory is half as threatening as a confirmed enemy position.
  const unknownThreat =
    minUnknownTurns === Infinity
      ? 0
      : Math.max(0, 1 - minUnknownTurns / UNKNOWN_SAFE_TURNS) * 0.5;

  return Math.min(1, Math.max(enemyThreat, unknownThreat));
}

/**
 * Returns true when an owned planet is worth devoting defence/recapture resources to.
 * Considers class, existing buildings (sunk investment), and home-planet status.
 */
function isOwnedPlanetValuable(planet: Planet): boolean {
  const idx = 'ABCDEFGHIJKLMNOP'.indexOf(planet.class);
  return planet.isHomePlanet || idx <= VALUABLE_CLASS_INDEX || planet.buildings.length > 0;
}

/**
 * Returns true when a memorized (potentially enemy-held) planet is worth recapturing.
 * Building data is not stored in memory, so only class and home-planet status are used.
 */
function isMemorizedPlanetValuable(planet: MemorizedPlanet): boolean {
  const idx = 'ABCDEFGHIJKLMNOP'.indexOf(planet.class);
  return planet.isHomePlanet || idx <= VALUABLE_CLASS_INDEX;
}

// ---------------------------------------------------------------------------
// Building decisions
// ---------------------------------------------------------------------------

/**
 * Returns the intended building type for each slot on a planet.
 *
 * Early game (before RESEARCH_START_ROUND): factories on every slot, every planet.
 * The compounding effect of gold from factories far outweighs early research investment.
 *
 * Late game: class-based split.
 * - A–C: all factories — these are the economic powerhouses; never waste a slot on labs.
 * - D–G: one factory first, then research labs for tech advancement.
 * - H–P: pure research — low production value, better used as tech hubs.
 */
function buildingMix(
  cls: PlanetClass,
  roundNumber: number,
  difficulty: Exclude<AiDifficulty, 'easy'>,
): BuildingType[] {
  const researchStart = RESEARCH_START_ROUND[difficulty];
  const FACTORY_FILL = new Array<BuildingType>(20).fill('factory');

  if (roundNumber < researchStart) {
    return FACTORY_FILL;
  }

  const classIndex = 'ABCDEFGHIJKLMNOP'.indexOf(cls);
  if (classIndex <= 2) {
    // A-C: always factories — highest gold/troop output.
    return FACTORY_FILL;
  }
  if (classIndex <= 6) {
    // D-G: one factory first (gold base), then research labs.
    return ['factory', 'researchLab', 'researchLab', 'researchLab', 'researchLab',
            'researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab',
            'researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab',
            'researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab'];
  }
  // H-P: pure research — these planets barely produce gold or troops anyway.
  return new Array<BuildingType>(20).fill('researchLab');
}

function decideBuildActions(ctx: AiContext): void {
  const difficulty = ctx.difficulty;
  if (difficulty === 'easy') return;

  const goldReserve = GOLD_RESERVE[difficulty];
  let goldSpent = 0;

  // Sort planets: better class first so we invest in A-C before lower tiers.
  const sortedPlanets = [...ctx.ownedPlanets].sort((a, b) => {
    const ai = 'ABCDEFGHIJKLMNOP'.indexOf(a.class);
    const bi = 'ABCDEFGHIJKLMNOP'.indexOf(b.class);
    return ai - bi;
  });

  for (const planet of sortedPlanets) {
    const existingCount = planet.buildings.length;
    if (existingCount >= planet.buildingSlots) continue;

    const mix = buildingMix(planet.class, ctx.state.roundNumber, difficulty);
    const slotsToFill = planet.buildingSlots - existingCount;

    for (let slot = 0; slot < slotsToFill; slot++) {
      const buildingType = mix[existingCount + slot] ?? 'researchLab';
      const cost = buildingType === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;

      if (ctx.player.gold - goldSpent < cost) {
        return; // No more gold for buildings this turn.
      }

      ctx.actions.push({ type: 'BUILD', planetId: planet.id, buildingType });
      goldSpent += cost;
      // Continue filling slots on the same planet until no more gold or slots remain.
    }
  }
}

// ---------------------------------------------------------------------------
// Production slider decisions
// ---------------------------------------------------------------------------

function decideSliderActions(ctx: AiContext): void {
  if (ctx.difficulty === 'easy') return;

  const goldEmergency = ctx.player.gold < 400;
  const difficulty = ctx.difficulty as Exclude<AiDifficulty, 'easy'>;
  const inFactoryPhase =
    ctx.difficulty === 'hard' && ctx.state.roundNumber < RESEARCH_START_ROUND[difficulty];

  for (const planet of ctx.ownedPlanets) {
    const factories = planet.buildings.filter(
      (b) => b.type === 'factory' && b.builtOnRound < ctx.state.roundNumber,
    ).length;
    if (factories === 0) continue;

    // Is there a known, non-stale enemy planet within the threat radius of this factory?
    const enemyWithin20 = ctx.memorized.some(
      (m) =>
        m.isEnemy &&
        m.isExplored &&
        m.staleness < STALE_ROUNDS &&
        computeClickDistance(planet.position, m.position) <= FACTORY_DEFENSE_RANGE_CLICKS,
    );

    let targetSlider: number;

    if (enemyWithin20) {
      // An enemy is within striking distance of this factory — pour everything into troops.
      // Overrides economy and factory-phase rules: survival trumps gold accumulation.
      targetSlider = 1.0;
    } else if (goldEmergency) {
      // Cash crisis: push everything to gold regardless of phase.
      targetSlider = 0.05;
    } else if (inFactoryPhase) {
      // Early game: maximize gold to compound factory purchases on every planet.
      // A small troop trickle (10%) keeps garrison growing so planets stay defended.
      targetSlider = 0.1;
    } else if (ctx.aiState.strategicPhase === 'strike') {
      targetSlider = isFrontier(ctx, planet) ? 0.75 : 0.25;
    } else {
      // Mid-game peacetime: interior leans gold, frontier balanced.
      targetSlider = isFrontier(ctx, planet) ? 0.5 : 0.25;
    }

    const current = planet.productionSlider;
    if (Math.abs(current - targetSlider) > 0.05) {
      ctx.actions.push({ type: 'SET_PRODUCTION_SLIDER', planetId: planet.id, value: targetSlider });
    }
  }
}

// ---------------------------------------------------------------------------
// Fleet strategies
// ---------------------------------------------------------------------------

function tryDefendHome(ctx: AiContext): boolean {
  const home = ctx.ownedPlanets.find((p) => p.id === ctx.player.homePlanetId);
  if (home === undefined) return false;

  const threats = ctx.state.fleets.filter(
    (f) => f.destinationPlanetId === home.id && f.ownerId !== ctx.playerId,
  );
  if (threats.length === 0) return false;

  const maxIncoming = Math.max(...threats.map((f) => f.shipCount));
  if (home.shipCount >= maxIncoming * 1.2) return false; // Already well-defended.

  const shipsNeeded = maxIncoming - home.shipCount + 5;
  const source = bestSource(ctx, home.position, Math.min(shipsNeeded, 5), new Set([home.id]));
  if (source === undefined) return false;

  const sendCount = Math.min(maxSendable(ctx, source.id), shipsNeeded);
  return queueFleet(ctx, source.id, home.id, sendCount);
}

/**
 * Mobilises reinforcements for any valuable owned planet (non-home) that has
 * incoming enemy fleets.  Pulls ships from every nearby source in a single pass,
 * worst-deficit planet first.
 *
 * This runs immediately after home-planet defence and before any offensive or
 * expansion action — the AI drops everything else to protect its investments.
 * Returns true if at least one reinforcement fleet was queued.
 */
function tryDefendValuableAsset(ctx: AiContext): boolean {
  const maxFleets = MAX_FLEETS[ctx.difficulty];

  type Threat = { planet: Planet; deficit: number; incomingShips: number };
  const threats: Threat[] = [];

  for (const planet of ctx.ownedPlanets) {
    if (planet.isHomePlanet) continue; // Handled by tryDefendHome.
    if (!isOwnedPlanetValuable(planet)) continue;

    const incomingFleets = ctx.state.fleets.filter(
      (f) => f.destinationPlanetId === planet.id && f.ownerId !== ctx.playerId,
    );
    if (incomingFleets.length === 0) continue;

    const incomingShips = incomingFleets.reduce((sum, f) => sum + f.shipCount, 0);
    const deficit = incomingShips - planet.shipCount;
    if (deficit > 0) threats.push({ planet, deficit, incomingShips });
  }

  if (threats.length === 0) return false;
  threats.sort((a, b) => b.deficit - a.deficit); // Worst deficit first.

  let queued = false;
  for (const { planet: asset, incomingShips } of threats) {
    if (ctx.fleetsQueued >= maxFleets) break;

    // Gather enough ships from nearby friendly planets to cover the incoming force plus a buffer.
    let shipsNeeded = Math.max(0, incomingShips - asset.shipCount + 5);
    if (shipsNeeded === 0) continue;

    const sources = sourcesInRange(ctx, asset.position, 1).filter((p) => p.id !== asset.id);
    for (const source of sources) {
      if (shipsNeeded <= 0 || ctx.fleetsQueued >= maxFleets) break;
      const sendCount = Math.min(maxSendable(ctx, source.id), shipsNeeded);
      if (sendCount < 1) continue;
      if (queueFleet(ctx, source.id, asset.id, sendCount)) {
        shipsNeeded -= sendCount;
        queued = true;
      }
    }
  }

  return queued;
}

/**
 * Attempts to recapture a valuable planet currently held by an enemy.
 *
 * "Winnable" test: total ships available from all sources in range ≥ estimated
 * enemy garrison × ATTACK_ADVANTAGE[difficulty].  If the fight is unwinnable the
 * planet is skipped entirely and the AI focuses on building up elsewhere.
 *
 * Candidates are sorted nearest-first then by planet class so the AI commits to
 * the most recoverable fight first.  Returns true if at least one fleet was queued.
 *
 * The AI re-evaluates every turn: once a planet is retaken it is no longer in the
 * enemy memory list and the commitment automatically ends.  If the enemy strengthens
 * beyond our reach the feasibility check drops to false and the AI pivots away.
 */
function tryRecaptureValuablePlanet(ctx: AiContext): boolean {
  const maxFleets = MAX_FLEETS[ctx.difficulty];
  const advantage = ATTACK_ADVANTAGE[ctx.difficulty];

  type RecaptureTarget = {
    target: MemorizedPlanet;
    sources: Planet[];
    needed: number;
  };

  const candidates: RecaptureTarget[] = [];

  for (const mem of ctx.memorized) {
    if (!mem.isEnemy || !mem.isExplored || mem.staleness >= STALE_ROUNDS) continue;
    if (!isMemorizedPlanetValuable(mem)) continue;
    if (ctx.usedTargetIds.has(mem.id)) continue;

    const sources = sourcesInRange(ctx, mem.position, 1);
    if (sources.length === 0) continue;

    const availableForce = sources.reduce((sum, p) => sum + maxSendable(ctx, p.id), 0);
    const needed = Math.ceil(mem.estimatedShipCount * advantage);

    // Unwinnable: enemy is too strong given our current force — skip, focus elsewhere.
    if (availableForce < needed) continue;

    candidates.push({ target: mem, sources, needed });
  }

  if (candidates.length === 0) return false;

  // Nearest (fastest to resolve) first; break ties by planet class (better class first).
  candidates.sort((a, b) => {
    const aTurns = computeTurnsInTransit(a.sources[0].position, a.target.position);
    const bTurns = computeTurnsInTransit(b.sources[0].position, b.target.position);
    if (aTurns !== bTurns) return aTurns - bTurns;
    const aIdx = 'ABCDEFGHIJKLMNOP'.indexOf(a.target.class);
    const bIdx = 'ABCDEFGHIJKLMNOP'.indexOf(b.target.class);
    return aIdx - bIdx;
  });

  let queued = false;
  for (const { target, sources, needed } of candidates) {
    if (ctx.fleetsQueued >= maxFleets) break;
    if (ctx.usedTargetIds.has(target.id)) continue;

    let shipped = 0;
    for (const source of sources) {
      if (shipped >= needed || ctx.fleetsQueued >= maxFleets) break;
      const sendCount = Math.min(maxSendable(ctx, source.id), needed - shipped);
      if (sendCount < 1) continue;
      if (queueFleet(ctx, source.id, target.id, sendCount)) {
        shipped += sendCount;
        queued = true;
      }
    }

    if (shipped > 0) ctx.usedTargetIds.add(target.id);
  }

  return queued;
}

function tryStrikeEnemyHome(ctx: AiContext): boolean {
  for (const targetId of ctx.aiState.knownEnemyHomePlanetIds) {
    const target = ctx.memorized.find((m) => m.id === targetId && m.isEnemy);
    if (target === undefined) continue;

    const sources = sourcesInRange(ctx, target.position, 5);
    if (sources.length === 0) continue;

    const source = sources[0];
    const sendCount = maxSendable(ctx, source.id);
    const advantage = ATTACK_ADVANTAGE[ctx.difficulty];
    if (sendCount < target.estimatedShipCount * advantage) continue;

    const queued = queueFleet(ctx, source.id, target.id, sendCount);
    if (queued) ctx.usedTargetIds.add(target.id);
    return queued;
  }
  return false;
}

function tryAttackEnemy(ctx: AiContext): boolean {
  const minSend = ctx.difficulty === 'hard' ? 3 : 4;

  // Score enemy planets: low ship-count and close = best target.
  // Hard AI allows revisiting already-targeted enemies (multi-wave); Normal diversifies.
  const candidates = ctx.memorized
    .filter((m) => {
      if (!m.isEnemy || !m.isExplored || m.staleness >= STALE_ROUNDS) return false;
      // Normal difficulty skips targets already assigned a fleet this turn.
      if (ctx.difficulty === 'normal' && ctx.usedTargetIds.has(m.id)) return false;
      return true;
    })
    .map((m) => {
      const nearestSource = sourcesInRange(ctx, m.position, minSend)[0];
      if (nearestSource === undefined) return null;
      const dist = computeTurnsInTransit(nearestSource.position, m.position);
      const score = m.estimatedShipCount / dist;
      return { target: m, source: nearestSource, score };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.score - b.score);

  for (const { target, source } of candidates) {
    const sendCount = maxSendable(ctx, source.id);
    const advantage = ATTACK_ADVANTAGE[ctx.difficulty];
    if (sendCount < target.estimatedShipCount * advantage) continue;
    if (sendCount < minSend) continue;

    const queued = queueFleet(ctx, source.id, target.id, sendCount);
    if (queued) ctx.usedTargetIds.add(target.id);
    return queued;
  }
  return false;
}

function tryExpand(ctx: AiContext): boolean {
  // Hard sends the minimum needed to reliably capture each planet so it can
  // simultaneously claim as many neutrals as possible in one turn.
  // Normal sends half its sendable ships — fewer targets but stronger garrisons.
  const useMinimalSend = ctx.difficulty === 'hard';

  // Find the best unexplored or neutral planet to claim.
  type Candidate = { target: MemorizedPlanet; source: Planet; dist: number };
  const candidates: Candidate[] = [];

  for (const target of ctx.memorized) {
    if (!target.isNeutral) continue;
    // Never send two fleets to the same neutral in one turn — wasteful.
    if (ctx.usedTargetIds.has(target.id)) continue;
    const sources = sourcesInRange(ctx, target.position, 1);
    if (sources.length === 0) continue;
    const source = sources[0];
    const dist = computeTurnsInTransit(source.position, target.position);
    candidates.push({ target, source, dist });
  }

  if (candidates.length === 0) return false;

  // Sort candidates by strategic value.
  // Hard: weight hub value (new territory unlocked) × class quality ÷ distance²
  //   so that choke-point relays are prioritised even when slightly farther away.
  // Normal: explored-first, then nearest, then best class (simpler).
  if (ctx.difficulty === 'hard') {
    const CLASS_VALUES: Record<PlanetClass, number> = {
      A: 16, B: 15, C: 14, D: 13, E: 12, F: 11, G: 10,
      H: 9, I: 8, J: 7, K: 6, L: 5, M: 4, N: 3, O: 2, P: 1,
    };
    candidates.sort((a, b) => {
      const aHub = hubValue(ctx, a.target);
      const bHub = hubValue(ctx, b.target);
      const aScore = (1 + aHub) * CLASS_VALUES[a.target.class] / (a.dist * a.dist);
      const bScore = (1 + bHub) * CLASS_VALUES[b.target.class] / (b.dist * b.dist);
      return bScore - aScore; // Higher score first.
    });
  } else {
    candidates.sort((a, b) => {
      if (a.target.isExplored !== b.target.isExplored) {
        return a.target.isExplored ? -1 : 1;
      }
      if (a.dist !== b.dist) return a.dist - b.dist;
      const aClass = 'ABCDEFGHIJKLMNOP'.indexOf(a.target.class);
      const bClass = 'ABCDEFGHIJKLMNOP'.indexOf(b.target.class);
      return aClass - bClass;
    });
  }

  for (const { target, source } of candidates) {
    const estDefense = target.estimatedShipCount;
    // Hard: send just enough to beat the estimated defense — conserves ships for
    // simultaneous expansion to many planets.
    // Normal: send half the sendable pool — fewer targets but stronger initial garrisons.
    const sendCount = useMinimalSend
      ? Math.max(estDefense + 2, 2)
      : Math.max(estDefense + 2, Math.floor(maxSendable(ctx, source.id) * 0.5));
    const actualSend = Math.min(sendCount, maxSendable(ctx, source.id));
    if (actualSend < 1) continue;

    const queued = queueFleet(ctx, source.id, target.id, actualSend);
    if (queued) ctx.usedTargetIds.add(target.id);
    return queued;
  }
  return false;
}

function tryScout(ctx: AiContext): boolean {
  // Hard only: send a 1-ship probe toward unexplored territory not already
  // targeted by the expansion pass this turn.
  const unexplored = ctx.memorized.filter(
    (m) => !m.isExplored && !ctx.usedTargetIds.has(m.id),
  );
  if (unexplored.length === 0) return false;

  type Candidate = { target: MemorizedPlanet; source: Planet; dist: number };
  const candidates: Candidate[] = [];

  for (const target of unexplored) {
    const sources = sourcesInRange(ctx, target.position, SCOUT_SHIPS);
    if (sources.length === 0) continue;
    const source = sources[0];
    const dist = computeTurnsInTransit(source.position, target.position);
    candidates.push({ target, source, dist });
  }

  if (candidates.length === 0) return false;
  candidates.sort((a, b) => a.dist - b.dist);

  const { target, source } = candidates[0];
  const queued = queueFleet(ctx, source.id, target.id, SCOUT_SHIPS);
  if (queued) ctx.usedTargetIds.add(target.id);
  return queued;
}

// ---------------------------------------------------------------------------
// Easy AI  (full-state heuristic, no fog, single fleet — preserved from v1)
// ---------------------------------------------------------------------------

function computeEasyTurn(ctx: AiContext): void {
  const state = ctx.state;
  const playerId = ctx.playerId;
  const rangeClicks = ctx.rangeClicks;

  // 1. Reinforce threatened home planet.
  const home = ctx.ownedPlanets.find((p) => p.id === ctx.player.homePlanetId);
  if (home !== undefined) {
    const threats = state.fleets.filter(
      (f) => f.destinationPlanetId === home.id && f.ownerId !== playerId,
    );
    if (threats.length > 0) {
      const maxIncoming = Math.max(...threats.map((f) => f.shipCount));
      if (home.shipCount < maxIncoming) {
        const source = ctx.ownedPlanets
          .filter(
            (p) =>
              p.id !== home.id &&
              p.shipCount > 6 &&
              isInRange(p.position, home.position, rangeClicks),
          )
          .sort(
            (a, b) =>
              computeTurnsInTransit(a.position, home.position) -
              computeTurnsInTransit(b.position, home.position),
          )[0];
        if (source !== undefined) {
          const needed = maxIncoming - home.shipCount;
          const send = Math.min(source.shipCount - 1, needed);
          if (send >= 1) {
            ctx.actions.push({ type: 'SEND_FLEET', fromPlanetId: source.id, toPlanetId: home.id, shipCount: send });
            return;
          }
        }
      }
    }
  }

  // 2. Attack weakest reachable enemy planet.
  const enemies = state.map.planets.filter(
    (p) => p.owner !== 'neutral' && p.owner !== playerId,
  );
  if (enemies.length > 0) {
    const scored = enemies
      .map((planet) => {
        const nearest = ctx.ownedPlanets.reduce(
          (best, op) =>
            computeTurnsInTransit(op.position, planet.position) <
            computeTurnsInTransit(best.position, planet.position)
              ? op
              : best,
          ctx.ownedPlanets[0],
        );
        const distance = computeTurnsInTransit(nearest.position, planet.position);
        const score = planet.shipCount / distance;
        return { planet, score };
      })
      .sort((a, b) => a.score - b.score || a.planet.id.localeCompare(b.planet.id));

    for (const { planet: target } of scored) {
      const source = ctx.ownedPlanets
        .filter(
          (p) =>
            p.shipCount > 6 &&
            isInRange(p.position, target.position, rangeClicks),
        )
        .sort(
          (a, b) =>
            computeTurnsInTransit(a.position, target.position) -
            computeTurnsInTransit(b.position, target.position),
        )[0];
      if (source === undefined) continue;

      const sendCount = Math.min(source.shipCount - 1, Math.floor(source.shipCount * 0.6));
      if (sendCount < target.shipCount * 1.5) continue;

      ctx.actions.push({ type: 'SEND_FLEET', fromPlanetId: source.id, toPlanetId: target.id, shipCount: sendCount });
      return;
    }
  }

  // 3. Expand to nearest neutral planet.
  const neutrals = state.map.planets.filter((p) => p.owner === 'neutral');
  let bestSource: Planet | undefined;
  let bestTarget: Planet | undefined;
  let bestDist = Infinity;

  for (const target of neutrals) {
    for (const source of ctx.ownedPlanets) {
      if (source.shipCount <= 4) continue;
      if (!isInRange(source.position, target.position, rangeClicks)) continue;
      const dist = computeTurnsInTransit(source.position, target.position);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = target;
        bestSource = source;
      }
    }
  }

  if (bestTarget !== undefined && bestSource !== undefined) {
    const send = Math.min(
      bestSource.shipCount - 1,
      Math.floor(bestSource.shipCount * 0.5),
    );
    if (send >= 1) {
      ctx.actions.push({ type: 'SEND_FLEET', fromPlanetId: bestSource.id, toPlanetId: bestTarget.id, shipCount: send });
    }
  }
}

// ---------------------------------------------------------------------------
// Normal / Hard AI
// ---------------------------------------------------------------------------

function computeNormalOrHardTurn(ctx: AiContext): void {
  const maxFleets = MAX_FLEETS[ctx.difficulty];
  const phase = ctx.aiState.strategicPhase;

  // Economic decisions first (do not count toward fleet budget).
  decideBuildActions(ctx);
  decideSliderActions(ctx);

  // Fleet decisions in priority order — highest priority first.

  // 1. Defend the home planet when threatened (unconditional top priority).
  if (ctx.fleetsQueued < maxFleets) {
    tryDefendHome(ctx);
  }

  // 2. Defend any other valuable owned planet under active enemy attack.
  //    The AI drops expansion and standard offensive actions to cover investments
  //    (buildings, high-class planets) it cannot afford to lose.
  if (ctx.fleetsQueued < maxFleets) {
    tryDefendValuableAsset(ctx);
  }

  // 3. Recapture valuable planets recently taken by an enemy — only commits when
  //    the fight is winnable (available force >= enemy strength × advantage).
  //    If unwinnable the planet is skipped entirely and the AI focuses elsewhere.
  //    Re-evaluated every turn: commitment ends automatically once the planet is
  //    retaken or the enemy becomes too strong to challenge.
  if (ctx.fleetsQueued < maxFleets) {
    tryRecaptureValuablePlanet(ctx);
  }

  // 4. Strike phase: hit the known enemy home planet as the top offensive goal.
  if (phase === 'strike' && ctx.fleetsQueued < maxFleets) {
    tryStrikeEnemyHome(ctx);
  }

  // 5. Attack the weakest known enemy planet (up to budget).
  while (ctx.fleetsQueued < maxFleets) {
    if (!tryAttackEnemy(ctx)) break;
  }

  // 6. Fill remaining budget with neutral expansion.
  while (ctx.fleetsQueued < maxFleets) {
    if (!tryExpand(ctx)) break;
  }

  // 7. Hard only: probe every unexplored planet in range not already targeted.
  if (ctx.difficulty === 'hard') {
    while (ctx.fleetsQueued < maxFleets) {
      if (!tryScout(ctx)) break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Computes the AI player's full turn actions.
 *
 * - Easy: full-state visibility, single fleet, no economy management (original heuristic).
 * - Normal: fog-of-war memory, up to 3 fleets, factory/lab building, slider management,
 *           strategic phases (expand → build → strike).
 * - Hard: no fleet limit — dispatches to every reachable target in one turn. Sends minimal
 *         ships per expansion (just enough to capture) to maximise simultaneous planet grabs.
 *         Probes every unexplored planet in range. Keeps only 2-ship minimum garrison.
 */
export function computeAiTurn(state: GameState, playerId: string): TurnInput {
  const ctx = buildContext(state, playerId);
  if (ctx === null) {
    return { actions: [{ type: 'END_TURN' }], playerId };
  }

  if (ctx.difficulty === 'easy') {
    computeEasyTurn(ctx);
  } else {
    computeNormalOrHardTurn(ctx);
  }

  ctx.actions.push({ type: 'END_TURN' });
  return { actions: ctx.actions, playerId };
}
