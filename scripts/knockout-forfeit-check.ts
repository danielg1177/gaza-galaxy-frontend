import assert from 'node:assert/strict';
import { createFleet } from '../src/game/movementEngine';
import { resolveTurn } from '../src/game/turnEngine';
import type { Fleet, GameState, Planet, Player } from '../src/game/types';

function planet(
  id: string,
  x: number,
  y: number,
  owner: string,
  ships: number,
  isHomePlanet: boolean,
): Planet {
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
    isHomePlanet,
  };
}

function player(id: string, homePlanetId: string): Player {
  return {
    id,
    name: id,
    homePlanetId,
    techLevel: 0,
    gold: 0,
    researchPoints: 0,
    isEliminated: false,
    isAI: false,
  };
}

function arrivingFleet(
  ownerId: string,
  shipCount: number,
  originPlanetId: string,
  destinationPlanetId: string,
  fleetIndex: number,
): Fleet {
  return {
    ...createFleet(
      ownerId,
      shipCount,
      originPlanetId,
      destinationPlanetId,
      0,
      1,
      fleetIndex,
      1,
    ),
    turnsRemaining: 0,
    totalTurns: 1,
    dispatchedInRound: 1,
  };
}

function baseState(fleets: Fleet[]): GameState {
  return {
    map: {
      width: 40,
      height: 40,
      planets: [
        planet('home-0', 0, 0, 'player-0', 20, true),
        planet('home-1', 10, 0, 'player-1', 1, true),
        planet('colony', 20, 0, 'player-0', 1, false),
      ],
    },
    players: [player('player-0', 'home-0'), player('player-1', 'home-1')],
    fleets,
    turnNumber: 1,
    roundNumber: 2,
    currentPlayerId: 'player-0',
    seed: 1,
    playMode: 'passAndPlay',
    status: 'active',
    winnerId: null,
    scheduledMovements: [],
  };
}

function endTurn(state: GameState): GameState {
  return resolveTurn(state, {
    playerId: 'player-0',
    actions: [{ type: 'END_TURN' }],
  });
}

function assertEliminatedClean(
  result: GameState,
  colonyOwner: string,
  colonyShips: number,
): void {
  const player1 = result.players.find((entry) => entry.id === 'player-1');
  assert.equal(player1?.isEliminated, true);

  const homeAfter = result.map.planets.find((entry) => entry.id === 'home-1');
  assert.equal(homeAfter?.owner, 'player-0');

  const colonyAfter = result.map.planets.find((entry) => entry.id === 'colony');
  assert.equal(colonyAfter?.owner, colonyOwner);
  assert.equal(colonyAfter?.shipCount, colonyShips);

  assert.equal(
    result.fleets.some((fleet) => fleet.ownerId === 'player-1'),
    false,
  );
}

const aTakesHome = arrivingFleet('player-0', 40, 'home-0', 'home-1', 0);
const bTakesColony = arrivingFleet('player-1', 40, 'home-1', 'colony', 1);

// Home first: B's later arrival is discarded; colony stays with A.
assertEliminatedClean(
  endTurn(baseState([aTakesHome, bTakesColony])),
  'player-0',
  1,
);

// Colony first: B captures, then A takes home; forfeit sweep clears the zombie.
assertEliminatedClean(
  endTurn(baseState([bTakesColony, aTakesHome])),
  'neutral',
  0,
);

console.log('knockout forfeit checks passed');
