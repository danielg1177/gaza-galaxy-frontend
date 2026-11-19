import type { Planet, PlanetMultiplierMode } from './types';

/** One of these is assigned to about one planet in ten when the setting is on. */
export const OUTPUT_MULTIPLIER_VALUES = [1.25, 1.5, 1.75, 2] as const;

export type OutputMultiplier = (typeof OUTPUT_MULTIPLIER_VALUES)[number];

export function normalizePlanetMultipliers(
  value: string | undefined | null,
): PlanetMultiplierMode {
  return value === 'on' ? 'on' : 'off';
}

/** 1 when the planet has no multiplier. Invalid stored values are treated as none. */
export function planetOutputMultiplier(planet: { outputMultiplier?: number }): number {
  const value = planet.outputMultiplier;
  return value === 1.25 || value === 1.5 || value === 1.75 || value === 2 ? value : 1;
}

export function formatOutputMultiplier(multiplier: number): string {
  return `×${multiplier}`;
}

/** 10 stays "10", 1.5 stays "1.5", 1.25 stays "1.25". */
export function formatResearchAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0$/, '');
}

/**
 * Marks about one planet in ten, spread across the map. `rng` returns values in [0, 1).
 * Home worlds are included; the setting applies to every planet.
 */
export function assignOutputMultipliers(planets: Planet[], rng: () => number): Planet[] {
  const count = Math.round(planets.length / 10);
  if (count <= 0) return planets;
  const chosen = new Set(pickSpreadPlanets(planets, count, rng).map((planet) => planet.id));
  return planets.map((planet) => {
    if (!chosen.has(planet.id)) return planet;
    const multiplier =
      OUTPUT_MULTIPLIER_VALUES[Math.floor(rng() * OUTPUT_MULTIPLIER_VALUES.length)] ?? 1.25;
    return { ...planet, outputMultiplier: multiplier };
  });
}

/** Farthest-point sample so the marked worlds are not clustered. */
function pickSpreadPlanets(planets: Planet[], count: number, rng: () => number): Planet[] {
  if (count >= planets.length) return [...planets];
  const remaining = [...planets];
  for (let i = remaining.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = remaining[i];
    remaining[i] = remaining[j];
    remaining[j] = swap;
  }
  const first = remaining.pop();
  if (first == null) return [];
  const chosen: Planet[] = [first];
  while (chosen.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestDist = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      let nearest = Infinity;
      for (const picked of chosen) {
        const dx = remaining[i].position.x - picked.position.x;
        const dy = remaining[i].position.y - picked.position.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearest) nearest = dist;
      }
      if (nearest > bestDist) {
        bestDist = nearest;
        bestIndex = i;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0];
    if (next != null) chosen.push(next);
  }
  return chosen;
}
