import assert from 'node:assert/strict';
import { generateMap } from '../src/game/mapGenerator';
import {
  assignOutputMultipliers,
  OUTPUT_MULTIPLIER_VALUES,
  planetOutputMultiplier,
} from '../src/game/planetMultipliers';
import {
  computeFactoryOutputs,
  runProduction,
  scaledBuildingCost,
} from '../src/game/productionEngine';
import type { GameState, Planet, Player } from '../src/game/types';
import { applyVisibility } from '../src/game/visibility';

function rngFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function planet(partial: Partial<Planet> & Pick<Planet, 'id' | 'position' | 'owner'>): Planet {
  return {
    name: partial.id,
    class: 'A',
    shipCount: 0,
    troopAccumulator: 0,
    buildings: [],
    buildingSlots: 2,
    productionSlider: 0.5,
    isHomePlanet: false,
    ...partial,
  };
}

const line = Array.from({ length: 20 }, (_, index) =>
  planet({ id: `p${index}`, position: { x: index * 10, y: 0 }, owner: 'neutral' }),
);
const marked = assignOutputMultipliers(line, rngFrom(7));
const chosen = marked.filter((item) => item.outputMultiplier !== undefined);
assert.equal(chosen.length, 2);
for (const item of chosen) {
  assert.ok(OUTPUT_MULTIPLIER_VALUES.includes(item.outputMultiplier!));
}
const gap = Math.abs(chosen[0].position.x - chosen[1].position.x);
assert.ok(gap >= 90, `marked planets should be spread apart, gap was ${gap}`);

const map = generateMap({
  seed: 42,
  width: 80,
  height: 80,
  planetCount: 30,
  playerCount: 2,
  galaxyShape: 'scattered',
});
const real = assignOutputMultipliers(map.planets, rngFrom(99));
const markedOnMap = real.filter((item) => item.outputMultiplier !== undefined);
assert.equal(markedOnMap.length, Math.round(map.planets.length / 10));
assert.ok(map.planets.length >= 30);

const boosted = planet({
  id: 'boost',
  position: { x: 0, y: 0 },
  owner: 'viewer',
  outputMultiplier: 1.5,
  productionSlider: 0,
  buildings: [
    { type: 'factory', builtOnRound: 0 },
    { type: 'researchLab', builtOnRound: 0 },
  ],
});
assert.equal(scaledBuildingCost('factory', boosted), 300);
assert.equal(scaledBuildingCost('researchLab', boosted), 375);
assert.equal(scaledBuildingCost('researchLab', { outputMultiplier: 1.25 }), 313);
assert.equal(scaledBuildingCost('factory', {}), 200);

const fullTroops = computeFactoryOutputs(1, 'A', 1, 1.25);
assert.equal(fullTroops.troops, 1.25);
assert.equal(fullTroops.gold, 0);
const plain = computeFactoryOutputs(1, 'A', 1);
assert.equal(plain.troops, 1);
assert.equal(plain.gold, 0);

const player: Player = {
  id: 'viewer',
  name: 'viewer',
  homePlanetId: 'boost',
  techLevel: 0,
  gold: 0,
  researchPoints: 10,
  isEliminated: false,
  isAI: false,
};
const produced = runProduction(
  { width: 10, height: 10, planets: [boosted] },
  [player],
  1,
);
assert.equal(produced.players[0].researchPoints, 11.5);
assert.equal(produced.players[0].gold, 75);

const secret = planet({
  id: 'secret',
  position: { x: 40, y: 0 },
  owner: 'enemy',
  outputMultiplier: 2,
  shipCount: 8,
});
const owned = planet({
  id: 'home',
  position: { x: 0, y: 0 },
  owner: 'viewer',
  outputMultiplier: 2,
});
const state: GameState = {
  map: { width: 80, height: 80, planets: [owned, secret] },
  players: [player, { ...player, id: 'enemy', name: 'enemy', isAI: true }],
  fleets: [],
  turnNumber: 1,
  roundNumber: 1,
  currentPlayerId: 'viewer',
  seed: 1,
  playMode: 'passAndPlay',
  visibility: 'classic',
  planetMultipliers: 'on',
  status: 'active',
  winnerId: null,
};
for (const mode of ['classic', 'fog'] as const) {
  const view = applyVisibility({ ...state, visibility: mode }, 'viewer');
  const hidden = view.map.planets.find((item) => item.id === 'secret');
  const kept = view.map.planets.find((item) => item.id === 'home');
  assert.equal(hidden?.outputMultiplier, undefined);
  assert.equal(kept?.outputMultiplier, 2);
  assert.equal(planetOutputMultiplier(hidden ?? secret), 1);
}

console.log('multiplier checks passed');
