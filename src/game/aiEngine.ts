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
  hard: 0.35,
};

/** Maximum fleet dispatches per AI turn. */
const MAX_FLEETS: Record<AiDifficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 5,
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
  normal: 400,
  hard: 300,
};

/** Number of rounds before memory is considered stale. */
const STALE_ROUNDS = 6;

/** Ship count for a scout probe. */
const SCOUT_SHIPS = 3;

/**
 * Assumed enemy troop growth per round when memory is stale.
 * Used to estimate current enemy garrison from last-seen value.
 */
const ESTIMATED_ENEMY_GROWTH_PER_ROUND = 2;

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
  /** Planet ids already used as a fleet source this turn. */
  usedSourceIds: Set<string>;
  /** Ships already queued to leave each planet this turn. */
  reservedShips: Map<string, number>;
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
  const aiState = state.aiStates?.[playerId] ?? emptyAiState();
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
    usedSourceIds: new Set(),
    reservedShips: new Map(),
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
  const ratio = GARRISON_RATIO[ctx.difficulty];
  return Math.max(5, Math.floor(planet.shipCount * ratio));
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
  ctx.usedSourceIds.add(fromPlanetId);
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
    if (ctx.usedSourceIds.has(planet.id)) continue;
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
        !ctx.usedSourceIds.has(p.id) &&
        isInRange(p.position, targetPos, ctx.rangeClicks) &&
        maxSendable(ctx, p.id) >= minSend,
    )
    .sort(
      (a, b) =>
        computeTurnsInTransit(a.position, targetPos) -
        computeTurnsInTransit(b.position, targetPos),
    );
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

// ---------------------------------------------------------------------------
// Building decisions
// ---------------------------------------------------------------------------

/** What building type the AI prefers for a given planet class. */
function preferredBuilding(cls: PlanetClass): BuildingType {
  const classIndex = 'ABCDEFGHIJKLMNOP'.indexOf(cls);
  if (classIndex <= 2) return 'factory';   // A-C: factory
  if (classIndex <= 6) return 'factory';   // D-G: still factory first (one factory then labs)
  return 'researchLab';                    // H-P: lab
}

/** Whether a planet at this class should have a mix of buildings or pure one type. */
function buildingMix(cls: PlanetClass): BuildingType[] {
  const classIndex = 'ABCDEFGHIJKLMNOP'.indexOf(cls);
  if (classIndex <= 2) {
    // A-C: all factories
    return ['factory', 'factory', 'factory', 'factory', 'factory', 'factory', 'factory', 'factory'];
  }
  if (classIndex <= 6) {
    // D-G: 1 factory then labs
    return ['factory', 'researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab'];
  }
  // H-P: all labs
  return ['researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab', 'researchLab'];
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

    const mix = buildingMix(planet.class);
    const slotsToFill = planet.buildingSlots - existingCount;

    for (let slot = 0; slot < slotsToFill; slot++) {
      const buildingType = mix[existingCount + slot] ?? 'researchLab';
      const cost = buildingType === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;

      if (ctx.player.gold - goldSpent < goldReserve + cost) {
        return; // No more gold for buildings this turn.
      }

      ctx.actions.push({ type: 'BUILD', planetId: planet.id, buildingType });
      goldSpent += cost;

      // Only place one building per planet per turn to let gold flow.
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Production slider decisions
// ---------------------------------------------------------------------------

function decideSliderActions(ctx: AiContext): void {
  if (ctx.difficulty === 'easy') return;

  const goldEmergency = ctx.player.gold < 400;

  for (const planet of ctx.ownedPlanets) {
    const factories = planet.buildings.filter(
      (b) => b.type === 'factory' && b.builtOnRound < ctx.state.roundNumber,
    ).length;
    if (factories === 0) continue; // No active factories; slider has no effect.

    let targetSlider: number;

    if (goldEmergency) {
      targetSlider = 0.1; // Push all production toward gold.
    } else if (ctx.aiState.strategicPhase === 'strike') {
      // During a strike, staging planets near enemies build troops; interior builds gold.
      targetSlider = isFrontier(ctx, planet) ? 0.75 : 0.25;
    } else {
      // Peacetime: interior planets lean gold, frontier planets balanced.
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

function tryStrikeEnemyHome(ctx: AiContext): boolean {
  for (const targetId of ctx.aiState.knownEnemyHomePlanetIds) {
    const target = ctx.memorized.find((m) => m.id === targetId && m.isEnemy);
    if (target === undefined) continue;

    const sources = sourcesInRange(ctx, target.position, 10);
    if (sources.length === 0) continue;

    const source = sources[0];
    const sendCount = maxSendable(ctx, source.id);
    const advantage = ATTACK_ADVANTAGE[ctx.difficulty];
    if (sendCount < target.estimatedShipCount * advantage) continue;

    return queueFleet(ctx, source.id, target.id, sendCount);
  }
  return false;
}

function tryAttackEnemy(ctx: AiContext): boolean {
  // Score enemy planets: low ship-count and close = best target.
  const candidates = ctx.memorized
    .filter((m) => m.isEnemy && m.isExplored && m.staleness < STALE_ROUNDS)
    .map((m) => {
      const nearestSource = sourcesInRange(ctx, m.position, 6)[0];
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
    if (sendCount < 6) continue;

    return queueFleet(ctx, source.id, target.id, sendCount);
  }
  return false;
}

function tryExpand(ctx: AiContext): boolean {
  // Find the best unexplored or neutral planet to claim.
  type Candidate = { target: MemorizedPlanet; source: Planet; dist: number };
  const candidates: Candidate[] = [];

  for (const target of ctx.memorized) {
    if (!target.isNeutral) continue;
    const sources = sourcesInRange(ctx, target.position, 2);
    if (sources.length === 0) continue;
    const source = sources[0];
    const dist = computeTurnsInTransit(source.position, target.position);
    candidates.push({ target, source, dist });
  }

  if (candidates.length === 0) return false;

  // Sort: explored neutrals first (we know they're neutral), then unexplored.
  // Among same exploration status, closer is better. Better class is a tiebreak.
  candidates.sort((a, b) => {
    if (a.target.isExplored !== b.target.isExplored) {
      return a.target.isExplored ? -1 : 1;
    }
    if (a.dist !== b.dist) return a.dist - b.dist;
    const aClass = 'ABCDEFGHIJKLMNOP'.indexOf(a.target.class);
    const bClass = 'ABCDEFGHIJKLMNOP'.indexOf(b.target.class);
    return aClass - bClass;
  });

  for (const { target, source } of candidates) {
    const estDefense = target.estimatedShipCount;
    const sendCount = Math.max(
      estDefense + 2,
      Math.floor(maxSendable(ctx, source.id) * 0.5),
    );
    const actualSend = Math.min(sendCount, maxSendable(ctx, source.id));
    if (actualSend < 1) continue;

    return queueFleet(ctx, source.id, target.id, actualSend);
  }
  return false;
}

function tryScout(ctx: AiContext): boolean {
  // Hard only: send a tiny probe toward unexplored territory.
  const unexplored = ctx.memorized.filter((m) => !m.isExplored);
  if (unexplored.length === 0) return false;

  // Pick the closest unexplored planet to any owned planet.
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
  return queueFleet(ctx, source.id, target.id, SCOUT_SHIPS);
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

  // Fleet decisions in priority order.

  // Always defend the home planet when threatened.
  if (ctx.fleetsQueued < maxFleets) {
    tryDefendHome(ctx);
  }

  // Strike phase: hit the known enemy home planet as the top offensive goal.
  if (phase === 'strike' && ctx.fleetsQueued < maxFleets) {
    tryStrikeEnemyHome(ctx);
  }

  // Attack the weakest known enemy planet (up to budget).
  while (ctx.fleetsQueued < maxFleets) {
    if (!tryAttackEnemy(ctx)) break;
  }

  // Fill remaining budget with neutral expansion.
  while (ctx.fleetsQueued < maxFleets) {
    if (!tryExpand(ctx)) break;
  }

  // Hard only: send scouts into unexplored territory with any remaining budget.
  if (ctx.difficulty === 'hard' && ctx.fleetsQueued < maxFleets) {
    tryScout(ctx);
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
 * - Hard: same as Normal plus active scouting, up to 5 fleets, more aggressive thresholds.
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
