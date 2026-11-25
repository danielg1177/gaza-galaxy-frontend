import assert from 'node:assert/strict';
import type { Fleet, GameState, Planet, Player, TurnEvent } from '../src/game/types';
import {
  applyVisibility,
  classifyPlanetSight,
  collectBattleLossRevealIds,
  oneTurnReachClicks,
} from '../src/game/visibility';

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

const leftThisRound = {
  id: 'left-now',
  ownerId: 'enemy',
  shipCount: 4,
  originPlanetId: 'near',
  destinationPlanetId: 'far',
  turnsRemaining: 2,
  totalTurns: 2,
  dispatchedInRound: 3,
} satisfies Fleet;
const leftEarlier = {
  id: 'left-earlier',
  ownerId: 'enemy',
  shipCount: 6,
  originPlanetId: 'near',
  destinationPlanetId: 'home',
  turnsRemaining: 1,
  totalTurns: 2,
  dispatchedInRound: 2,
} satisfies Fleet;
const ownDeparture = {
  id: 'own-now',
  ownerId: 'viewer',
  shipCount: 2,
  originPlanetId: 'home',
  destinationPlanetId: 'far',
  turnsRemaining: 2,
  totalTurns: 2,
  dispatchedInRound: 3,
} satisfies Fleet;
const sameRound = applyVisibility(
  {
    ...state(
      [home, { ...near, shipCount: 7 }, far],
      [leftThisRound, leftEarlier, ownDeparture],
      'fog',
    ),
    roundNumber: 3,
  },
  'viewer',
);
const sameRoundNear = sameRound.map.planets.find((item) => item.id === 'near');
assert.equal(sameRoundNear?.fogSight, 'scouted');
assert.equal(sameRoundNear?.shipCount, 11);
assert.equal(sameRound.map.planets.find((item) => item.id === 'home')?.shipCount, 8);
assert.deepEqual(
  sameRound.fleets.map((fleet) => fleet.id).sort(),
  ['left-earlier', 'own-now'],
);

const shipAtTwenty = {
  id: 'mid-flight',
  ownerId: 'viewer',
  shipCount: 3,
  originPlanetId: 'home',
  destinationPlanetId: 'route-end',
  turnsRemaining: 2,
  totalTurns: 4,
  dispatchedInRound: 1,
} satisfies Fleet;
const routeEnd = planet({ id: 'route-end', position: { x: 40, y: 0 }, owner: 'neutral', shipCount: 1 });
const besideShip = planet({ id: 'beside-ship', position: { x: 25, y: 0 }, owner: 'enemy', shipCount: 6, class: 'B' });
const pastShipTech0 = planet({ id: 'past-ship', position: { x: 26, y: 0 }, owner: 'enemy', shipCount: 5 });
const fromShip = applyVisibility(
  state([home, routeEnd, besideShip, pastShipTech0], [shipAtTwenty], 'fog', 0),
  'viewer',
);
assert.equal(fromShip.map.planets.find((item) => item.id === 'beside-ship')?.fogSight, 'scouted');
assert.equal(fromShip.map.planets.find((item) => item.id === 'beside-ship')?.owner, 'enemy');
assert.equal(fromShip.map.planets.find((item) => item.id === 'beside-ship')?.shipCount, 6);
assert.equal(fromShip.map.planets.find((item) => item.id === 'past-ship')?.fogSight, 'hidden');
assert.equal(fromShip.map.planets.find((item) => item.id === 'route-end')?.fogSight, 'hidden');
assert.equal(
  classifyPlanetSight(
    state([home, routeEnd, besideShip], [shipAtTwenty], 'fog', 0),
    'viewer',
    besideShip,
  ),
  'scouted',
);

const stillHome = {
  ...shipAtTwenty,
  id: 'still-home',
  turnsRemaining: 4,
  totalTurns: 4,
} satisfies Fleet;
const unmoved = applyVisibility(
  state([home, besideShip], [stillHome], 'fog', 0),
  'viewer',
);
assert.equal(unmoved.map.planets.find((item) => item.id === 'beside-ship')?.fogSight, 'hidden');

const parked = {
  id: 'parked',
  ownerId: 'viewer',
  shipCount: 3,
  originPlanetId: 'home',
  destinationPlanetId: 'home',
  turnsRemaining: 1,
  totalTurns: 1,
  dispatchedInRound: 1,
  holding: true,
  course: {
    vertices: [
      { x: 0, y: 0, planetId: 'home' },
      { x: 20, y: 0 },
    ],
    distanceTraveled: 20,
  },
} satisfies Fleet;
const parkedView = applyVisibility(
  state([home, besideShip], [parked], 'fog', 0),
  'viewer',
);
assert.equal(parkedView.map.planets.find((item) => item.id === 'beside-ship')?.fogSight, 'scouted');
assert.equal(parkedView.map.planets.find((item) => item.id === 'beside-ship')?.owner, 'enemy');
assert.equal(parkedView.map.planets.find((item) => item.id === 'beside-ship')?.shipCount, 6);

const atShipCap = planet({ id: 'ship-cap', position: { x: 27, y: 0 }, owner: 'enemy', shipCount: 2 });
const pastShipCap = planet({ id: 'past-ship-cap', position: { x: 27.01, y: 0 }, owner: 'enemy', shipCount: 2 });
const cappedShip = applyVisibility(
  state([home, routeEnd, atShipCap, pastShipCap], [shipAtTwenty], 'fog', 10),
  'viewer',
);
assert.equal(cappedShip.map.planets.find((item) => item.id === 'ship-cap')?.fogSight, 'scouted');
assert.equal(cappedShip.map.planets.find((item) => item.id === 'past-ship-cap')?.fogSight, 'hidden');

const enemyByShip = {
  id: 'enemy-by-ship',
  ownerId: 'enemy',
  shipCount: 8,
  originPlanetId: 'route-end',
  destinationPlanetId: 'home',
  turnsRemaining: 2,
  totalTurns: 4,
  dispatchedInRound: 1,
} satisfies Fleet;
const enemyPastShip = {
  ...enemyByShip,
  id: 'enemy-past-ship',
  turnsRemaining: 3,
  totalTurns: 4,
} satisfies Fleet;
const fleetsFromShip = applyVisibility(
  state([home, routeEnd], [shipAtTwenty, enemyByShip, enemyPastShip], 'fog', 0),
  'viewer',
);
assert.deepEqual(
  fleetsFromShip.fleets.map((fleet) => fleet.id).sort(),
  ['enemy-by-ship', 'mid-flight'],
);

const lostFight: TurnEvent = {
  kind: 'combat',
  planetName: 'far',
  planetId: 'far',
  attackerName: 'viewer',
  defenderName: 'enemy',
  attackerWon: false,
  attackerLost: 5,
  defenderLost: 1,
  attackerShipsBefore: 5,
  defenderShipsBefore: 40,
  remainingShips: 39,
};
const lossRevealIds = collectBattleLossRevealIds(
  [lostFight],
  'viewer',
  state([home, far], [], 'fog').players,
  state([home, far], [], 'fog'),
);
assert.ok(lossRevealIds.has('far'));
const afterLoss = applyVisibility(
  state([home, far], [], 'fog'),
  'viewer',
  lossRevealIds,
);
const revealedFar = afterLoss.map.planets.find((item) => item.id === 'far');
assert.equal(revealedFar?.fogSight, 'scouted');
assert.equal(revealedFar?.owner, 'enemy');
assert.equal(revealedFar?.shipCount, 40);
assert.equal(revealedFar?.class, 'C');
assert.equal(
  classifyPlanetSight(state([home, far], [], 'fog'), 'viewer', far, lossRevealIds),
  'scouted',
);

console.log('visibility checks passed');
