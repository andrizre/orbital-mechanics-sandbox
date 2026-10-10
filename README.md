# Orbital Mechanics Sandbox

An interactive N-body gravity playground in the browser — plain JavaScript, no dependencies, no build step.

## Concept

Simulate dozens of gravitationally interacting bodies with a Velocity Verlet integrator (softened Newtonian gravity, `O(n²)` pairwise forces). Bodies can be launched by dragging, orbits form naturally, and collisions merge bodies conserving momentum. Five presets demonstrate classic dynamics:

- **Sun System** — fixed central star with stable orbiting planets
- **Binary + Belt** — two fixed stars with a circulating debris belt
- **Cluster** — 70 random bodies around a heavy core (accretion in action)
- **Figure-8** — the Chenciner–Montgomery figure-eight three-body choreography
- **Chaos** — five comparable masses slinging each other chaotically

## Run

Open `index.html` in any modern browser (double-click, or `python3 -m http.server` in this folder and visit http://localhost:8000).

## Controls

| Action | Input |
|---|---|
| Launch a body | Drag on canvas (velocity = drag vector) |
| Pan / zoom | Right-drag or Space+drag / mouse wheel |
| Presets | Keys `1`–`5` or buttons |
| Pause / trails / vectors / clear | `P` / `T` / `V` / `C` / `F` |

Energy behavior is stable over long runs thanks to Velocity Verlet; speed slider scales time up to 4×.
