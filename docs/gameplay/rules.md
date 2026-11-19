# Game Rules

## Objective
Capture all enemy home planets. The last surviving player wins.

## Elimination
When a player's home planet is captured:
- That player is eliminated
- All of their other planets become neutral (unowned)

## Turn Structure
- Asynchronous: each player takes their turn independently
- Only the active player may interact with the game state during their turn
- Other players see only the last committed state

## Planets
Each planet has:
- A position on the galaxy map
- An owner (player id or neutral)
- A planet class (A–E) determining production quality
- A ship count (garrisoned ships)
- Buildings: Manufacturing Facility, Research Facility
- A manufacturing allocation (slider: ships vs resources)

## Visibility
Each new game chooses **Classic** or **Fog**. Older games with no setting play as Classic.

### Classic
- Full details (troop count, buildings, production slider) are visible only on planets you own
- Neutral and enemy planets show only position, name, and class on the map
- Enemy fleets in transit are hidden; you see only your own fleets

### Fog
- Full details are still visible only on planets you own
- A planet's **class** is visible only if you own it, or it lies within one turn of travel of a planet you own
- One turn is your current fleet speed (`5 + tech level` clicks), and sight stops growing at **15 clicks** (tech 10 and above)
- A planet within that distance also shows whether it is taken, who holds it, and how many troops are there. Buildings, slots, and the production slider stay hidden
- Planets farther away keep their position and name. Their class shows as unknown, and ownership and troop count stay hidden
- Enemy fleets are visible, with owner and troop count, when the fleet's current position is within one turn of one of your planets. Your own fleets are always visible

## Multipliers
Each new game can turn **Multipliers** on. Older games, and games left off, keep normal costs and output.

When it is on, about one planet in ten is marked, spread across the map. Each marked world randomly gets **×1.25**, **×1.5**, **×1.75**, or **×2**. Factory and research lab prices on that world are multiplied by that number, and so are the gold, troops, and research points it produces. A lab normally adds 1 research point per turn; a lab on a ×1.5 world adds 1.5.

Players who do not own the planet cannot see that it has a multiplier. After you take it, the map and the planet window show the mark.

## Planet Classes
| Class | Production Quality |
|-------|--------------------|
| A     | Highest            |
| B     | High               |
| C     | Medium             |
| D     | Low                |
| E     | Lowest             |

Research speed is NOT affected by planet class.

## Buildings
### Manufacturing Facility
- Produces ships and/or resources
- Controlled by an allocation slider (ships ↔ resources)

### Research Facility
- Increases tech level progression
- Tech level improves combat effectiveness (and possibly movement speed — TBD)

Owned planets with a building queued this turn show a blue wrench on the map until that player's next turn.

## Fleet Movement
- Players dispatch fleets from one planet to another
- Transit takes turns proportional to distance (exact formula TBD)
- On arrival:
  - Neutral planet → captured immediately
  - Enemy planet → combat resolved
- A send can be scheduled to repeat every turn (fixed count or all remaining ships). It fires at the start of that player's later turns. Capturing the origin planet cancels the schedule; taking the planet back does not restore it. If too few ships are present for a fixed count, whatever is there is sent.

## Combat
- Automatic — no player decisions during battle
- Outcome based on: ship counts, tech levels, random variance
- Defense bonus for garrisoned ships (TBD)

## Victory
- Last player with an un-captured home planet wins

## Changelog
- 2026-11-18: Optional Multipliers setting. About one planet in ten gets a hidden ×1.25, ×1.5, ×1.75, or ×2 on build cost and on gold, troops, and research output. The mark appears only after you own the planet.
- 2026-11-18: Fog sight is capped at 15 clicks. Fleet speed can still exceed that.
- 2026-11-18: Visibility setting. Classic keeps the original fog. Fog reveals class, owner, and troops only within one turn of an owned planet, and reveals nearby enemy fleets.
- 2026-09-11: Same-turn build wrench on owned planets; scheduled repeating orders use dotted map routes (planet ⟳ badge removed).
- 2026-09-10: Scheduled repeating fleet orders (fixed count or all remaining ships; cancel on origin capture).
- 2026-06-05: Added Fog of War section; removed standalone Home Planets section (covered under Objective, Elimination, and Victory).
- 2026-05-27: Initial rules documented from project-spec.md.
