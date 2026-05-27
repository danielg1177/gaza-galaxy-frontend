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

## Home Planets
- Each player starts with one designated home planet
- Losing your home planet means elimination
- Home planets start with better defenses (TBD)

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

## Fleet Movement
- Players dispatch fleets from one planet to another
- Transit takes turns proportional to distance (exact formula TBD)
- On arrival:
  - Neutral planet → captured immediately
  - Enemy planet → combat resolved

## Combat
- Automatic — no player decisions during battle
- Outcome based on: ship counts, tech levels, random variance
- Defense bonus for garrisoned ships (TBD)

## Victory
- Last player with an un-captured home planet wins

## Changelog
- 2026-05-27: Initial rules documented from project-spec.md.
