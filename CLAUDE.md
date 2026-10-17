# realistic-mtb

Physics-driven mountain bike game.
Stack: Vite + Three.js + Rapier (`@dimforge/rapier3d-compat`) + vanilla JS (ES modules). No frameworks.

## Permanent rules

1. **Complete files only.** Always give the user COMPLETE files, never partial snippets.
2. **Small steps.** Work in small steps. After each step: run the game (`npm run dev`), make sure there are no console errors, commit with a clear message, then tell the user exactly what to test.
3. **Real physics.** Movement comes from forces, mass, friction and suspension springs. Never fake movement by directly setting position/velocity, except for resets.
4. **Organic feel, not robotic.** Smooth interpolation, weight transfer, inertia, small imperfections. No instant snaps, no linear motion.
5. **Modular code.** Keep systems in their folders:
   - `src/bike` – frame, wheels, suspension, drivetrain
   - `src/terrain` – ground, trails, obstacles
   - `src/rider` – rider body, balance, input-to-body mapping
   - `src/tricks` – trick detection and execution
   - `src/audio` – sound
   - `src/ui` – HUD, overlays, menus
   - `src/camera` – camera rigs
   - `src/core` – renderer, physics world, game loop (engine plumbing)
6. **All tuning numbers live in `src/config.js`** so the feel can be tweaked in one place. No magic numbers elsewhere.

## Architecture notes

- Physics runs at a fixed timestep (`CONFIG.physics.timestep`) with an accumulator; rendering interpolates between the last two physics states.
- Rapier must be initialised (`await RAPIER.init()`) before any physics object is created — see `src/core/physics.js`.
- Deployed to GitHub Pages via `.github/workflows/deploy.yml`; `vite.config.js` uses `base: './'` so it works under any repo path.
