import assert from 'node:assert/strict';
import type { Fleet, GameState, Planet, Player } from '../src/game/types';
import { applyVisibility, classifyPlanetSight, oneTurnReachClicks } from '../src/game/visibility';

function planet(partial: Partial<Planet> & Pick<Planet, 'id' | 'position' | 'owner'>): Planet {
  return {
    name: partial.id,
    class: 'A',
    shipCount: 12,
    troopAccumulator: 0.4,
    buildings: [{ type: 'factory', builtOnRound: 0 }],
    buildingSlots: 4,
    productionSlider: 0.2,
    isHomePlanet: false,
    ...partial,
  };
}

function player(id: string, techLevel: number): Player {
  return {
    id,
    name: id,
    homePlanetId: `${id}-home`,
    techLevel,
    gold: 500,
    researchPoints: 0,
    isEliminated: false,
    isAI: id !== 'viewer',
  };
}

function state(planets: Planet[], fleets: Fleet[], visibility: GameState['visibility'], techLevel = 0): GameState {
  return {
    map: { width: 40, height: 40, planets },
    players: [player('viewer', techLevel), player('enemy', 0)],
    fleets,
    turnNumber: 1,
    roundNumber: 1,
    currentPlayerId: 'viewer',
    seed: 1,
    playMode: 'passAndPlay',
    visibility,
    status: 'active',
    winnerId: null,
  };
}

const home = planet({ id: 'home', position: { x: 0, y: 0 }, owner: 'viewer', isHomePlanet: true, shipCount: 8 });
const near = planet({ id: 'near', position: { x: 5, y: 0 }, owner: 'enemy', shipCount: 7, isHomePlanet: true });
const edge = planet({ id: 'edge', position: { x: 5.01, y: 0 }, owner: 'neutral', shipCount: 3 });
const far = planet({ id: 'far', position: { x: 20, y: 0 }, owner: 'enemy', shipCount: 40, class: 'C' });

const approaching = {
  id: 'approach',
  ownerId: 'enemy',
  shipCount: 15,
  originPlanetId: 'far',
  destinationPlanetId: 'home',
  turnsRemaining: 1,
  totalTurns: 4,
  dispatchedInRound: 1,
} satisfies Fleet;

const distantFleet = {
  ...approaching,
  id: 'distant',
  turnsRemaining: 4,
  shipCount: 9,
} satisfies Fleet;

const ownFleet = {
  ...approaching,
  id: 'own',
  ownerId: 'viewer',
  shipCount: 4,
  originPlanetId: 'home',
  destinationPlanetId: 'far',
  turnsRemaining: 4,
} satisfies Fleet;

const fog = applyVisibility(
  state([home, near, edge, far], [approaching, distantFleet, ownFleet], 'fog'),
  'viewer',
);

const seen = Object.fromEntries(fog.map.planets.map((item) => [item.id, item]));
assert.equal(seen.home.shipCount, 8);
assert.equal(seen.home.buildings.length, 1);
assert.equal(seen.home.fogSight, undefined);
assert.equal(seen.near.fogSight, 'scouted');
assert.equal(seen.near.owner, 'enemy');
assert.equal(seen.near.shipCount, 7);
assert.equal(seen.near.class, 'A');
assert.equal(seen.near.buildings.length, 0);
assert.equal(seen.near.buildingSlots, 0);
assert.equal(seen.near.isHomePlanet, false);
assert.equal(seen.edge.fogSight, 'hidden');
assert.equal(seen.edge.owner, 'neutral');
assert.equal(seen.edge.shipCount, 0);
assert.equal(seen.far.fogSight, 'hidden');
assert.equal(seen.far.class, 'C');
assert.deepEqual(
  fog.fleets.map((fleet) => fleet.id).sort(),
  ['approach', 'own'],
);

const faster = applyVisibility(
  state([home, edge], [], 'fog', 2),
  'viewer',
);
assert.equal(faster.map.planets.find((item) => item.id === 'edge')?.fogSight, 'scouted');

assert.equal(
  classifyPlanetSight(state([home, far], [], 'fog'), 'viewer', far),
  'hidden',
);
assert.equal(
  classifyPlanetSight(state([home, near], [], 'fog'), 'viewer', near),
  'scouted',
);

const classic = applyVisibility(
  state([home, near, far], [approaching, ownFleet], 'classic'),
  'viewer',
);
assert.equal(classic.map.planets.find((item) => item.id === 'far')?.fogSight, undefined);
assert.equal(classic.map.planets.find((item) => item.id === 'far')?.class, 'C');
assert.equal(classic.map.planets.find((item) => item.id === 'far')?.shipCount, 0);
assert.deepEqual(
  classic.fleets.map((fleet) => fleet.id),
  ['own'],
);

const legacy = applyVisibility(
  state([home, far], [approaching], undefined),
  'viewer',
);
assert.equal(legacy.fleets.length, 0);
assert.equal(legacy.map.planets.find((item) => item.id === 'far')?.class, 'C');

assert.equal(oneTurnReachClicks(0), 5);
assert.equal(oneTurnReachClicks(5), 10);
const colony = planet({
  id: 'colony',
  position: { x: 30, y: 0 },
  owner: 'viewer',
  shipCount: 4,
});
const enemyNearColony = planet({
  id: 'enemy-near',
  position: { x: 35, y: 0 },
  owner: 'enemy',
  shipCount: 9,
  class: 'C',
  isHomePlanet: true,
});
const fromColony = applyVisibility(
  state([home, colony, enemyNearColony], [], 'fog', 5),
  'viewer',
);
const revealedEnemy = fromColony.map.planets.find((item) => item.id === 'enemy-near');
assert.equal(revealedEnemy?.fogSight, 'scouted');
assert.equal(revealedEnemy?.owner, 'enemy');
assert.equal(revealedEnemy?.shipCount, 9);
assert.equal(revealedEnemy?.class, 'C');
const atTech5 = applyVisibility(
  state(
    [
      home,
      planet({ id: 'five', position: { x: 5, y: 0 }, owner: 'enemy', shipCount: 4 }),
      planet({ id: 'ten', position: { x: 10, y: 0 }, owner: 'enemy', shipCount: 4 }),
      planet({ id: 'pastTen', position: { x: 10.01, y: 0 }, owner: 'enemy', shipCount: 4 }),
    ],
    [],
    'fog',
    5,
  ),
  'viewer',
);
assert.equal(atTech5.map.planets.find((item) => item.id === 'five')?.fogSight, 'scouted');
assert.equal(atTech5.map.planets.find((item) => item.id === 'five')?.shipCount, 4);
assert.equal(atTech5.map.planets.find((item) => item.id === 'ten')?.fogSight, 'scouted');
assert.equal(atTech5.map.planets.find((item) => item.id === 'pastTen')?.fogSight, 'hidden');
assert.equal(oneTurnReachClicks(10), 15);
assert.equal(oneTurnReachClicks(15), 15);
const atCap = planet({ id: 'cap', position: { x: 15, y: 0 }, owner: 'enemy' });
const pastCap = planet({ id: 'past', position: { x: 15.01, y: 0 }, owner: 'enemy' });
const capped = applyVisibility(state([home, atCap, pastCap], [], 'fog', 15), 'viewer');
assert.equal(capped.map.planets.find((item) => item.id === 'cap')?.fogSight, 'scouted');
assert.equal(capped.map.planets.find((item) => item.id === 'past')?.fogSight, 'hidden');

console.log('visibility checks passed');
