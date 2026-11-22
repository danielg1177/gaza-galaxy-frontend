import assert from 'node:assert/strict';
import { advanceFleets, createFleet } from '../src/game/movementEngine';
import { resolveTurn } from '../src/game/turnEngine';
import type { Fleet, GameState, Planet, Player, RouteVertex } from '../src/game/types';

function planet(id: string, x: number, y: number, owner: string, ships = 20): Planet {
  return {
    id,
    name: id,
    position: { x, y },
    class: 'A',
    owner,
    shipCount: ships,
    troopAccumulator: 0,
    buildings: [],
    buildingSlots: 2,
    productionSlider: 0.5,
    isHomePlanet: id === 'home-0' || id === 'home-1',
  };
}

function player(id: string, homePlanetId: string, techLevel = 0): Player {
  return {
    id,
    name: id,
    homePlanetId,
    techLevel,
    gold: 0,
    researchPoints: 0,
    isEliminated: false,
    isAI: false,
  };
}

function state(planets: Planet[], fleets: Fleet[], currentPlayerId: string, tech = 0): GameState {
  return {
    map: { width: 40, height: 40, planets },
    players: [player('player-0', 'home-0', tech), player('player-1', 'home-1', tech)],
    fleets,
    turnNumber: 1,
    roundNumber: 2,
    currentPlayerId,
    seed: 1,
    playMode: 'passAndPlay',
    flexibleMovement: 'on',
    status: 'active',
    winnerId: null,
    scheduledMovements: [],
  };
}

const home0 = planet('home-0', 0, 0, 'player-0');
const home1 = planet('home-1', 30, 30, 'player-1');
const far = planet('far', 11, 0, 'neutral', 0);

const launched = createFleet('player-0', 4, 'home-0', 'far', 3, 1, 0, 1);
const straight: Fleet = {
  ...launched,
  destinationPlanetId: 'far',
  course: {
    vertices: [
      { x: 0, y: 0, planetId: 'home-0' },
      { x: 11, y: 0, planetId: 'far' },
    ],
    distanceTraveled: 0,
  },
  fuelFraction: 1,
  orderRange: 11,
  orderSpeed: 5,
};

let step = advanceFleets([straight]);
assert.equal(step.arrived.length, 0);
assert.equal(step.inTransit[0].course?.distanceTraveled, 5);
assert.ok(Math.abs((step.inTransit[0].fuelFraction ?? 0) - (1 - 5 / 11)) < 1e-9);

step = advanceFleets(step.inTransit);
assert.equal(step.arrived.length, 0);
assert.equal(step.inTransit[0].course?.distanceTraveled, 10);

step = advanceFleets(step.inTransit);
assert.equal(step.arrived.length, 1);
assert.equal(step.inTransit.length, 0);
assert.equal(step.arrived[0].destinationPlanetId, 'far');

const bend: RouteVertex[] = [
  { x: 6, y: 4 },
  { x: 6, y: 0 },
];
assert.throws(
  () =>
    resolveTurn(state([home0, home1, far], [], 'player-0'), {
      playerId: 'player-0',
      actions: [
        { type: 'SEND_FLEET', fromPlanetId: 'home-0', toPlanetId: '', shipCount: 3, stops: bend },
        { type: 'END_TURN' },
      ],
    }),
  /fuel covers 11/,
);

const legal = resolveTurn(state([home0, home1, far], [], 'player-0'), {
  playerId: 'player-0',
  actions: [
    {
      type: 'SEND_FLEET',
      fromPlanetId: 'home-0',
      toPlanetId: '',
      shipCount: 3,
      stops: [{ x: 4, y: 3 }],
    },
    { type: 'END_TURN' },
  ],
});
assert.equal(legal.fleets.length, 1);
assert.equal(legal.fleets[0].fuelFraction, 1);
assert.equal(legal.map.planets.find((item) => item.id === 'home-0')?.shipCount, 17);
assert.ok((legal.fleets[0].course?.vertices.length ?? 0) >= 2);

const unmoved = legal.fleets[0];
const held = resolveTurn(state([home0, home1, far], [unmoved], 'player-0'), {
  playerId: 'player-0',
  actions: [{ type: 'HOLD_FLEET', fleetId: unmoved.id }, { type: 'END_TURN' }],
});
assert.equal(held.fleets.length, 0);
assert.equal(held.map.planets.find((item) => item.id === 'home-0')?.shipCount, 23);

const half: Fleet = {
  ...straight,
  id: 'half',
  course: {
    vertices: [{ x: 5, y: 0 }],
    distanceTraveled: 0,
  },
  fuelFraction: 0.5,
  holding: true,
  orderRange: 11,
  turnsRemaining: 1,
};
const redirected = resolveTurn(
  {
    ...state([home0, home1, far], [half], 'player-0', 1),
  },
  {
    playerId: 'player-0',
    actions: [
      { type: 'REDIRECT_FLEET', fleetId: 'half', stops: [{ x: 5, y: 6.5 }] },
      { type: 'END_TURN' },
    ],
  },
);
assert.equal(redirected.fleets[0].holding, false);
assert.equal(redirected.fleets[0].orderRange, 13);

assert.throws(
  () =>
    resolveTurn(state([home0, home1, far], [half], 'player-0', 1), {
      playerId: 'player-0',
      actions: [
        { type: 'REDIRECT_FLEET', fleetId: 'half', stops: [{ x: 5, y: 6.6 }] },
        { type: 'END_TURN' },
      ],
    }),
  /fuel covers/,
);

const classic = resolveTurn(
  { ...state([home0, home1, far], [], 'player-0'), flexibleMovement: 'off' },
  {
    playerId: 'player-0',
    actions: [
      { type: 'SEND_FLEET', fromPlanetId: 'home-0', toPlanetId: 'far', shipCount: 2 },
      { type: 'END_TURN' },
    ],
  },
);
assert.equal(classic.fleets[0].course, undefined);
assert.equal(classic.fleets[0].turnsRemaining, 3);

console.log('flexible movement checks passed');
