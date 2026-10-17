import { CONFIG } from '../config.js';

// Fixed-timestep game loop. Physics advances in constant steps; rendering
// gets an interpolation factor `alpha` (0..1) between the last two states.
export class Loop {
  constructor({ fixedUpdate, update, render }) {
    this.fixedUpdate = fixedUpdate;
    this.update = update;
    this.render = render;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;
    requestAnimationFrame(this._tick);

    const { timestep, maxSubSteps } = CONFIG.physics;
    // Clamp long frames (tab switch, breakpoint) so physics doesn't explode.
    const frameDt = Math.min((now - this.lastTime) / 1000, timestep * maxSubSteps);
    this.lastTime = now;

    this.accumulator += frameDt;
    while (this.accumulator >= timestep) {
      this.fixedUpdate(timestep);
      this.accumulator -= timestep;
    }

    const alpha = this.accumulator / timestep;
    this.update(frameDt, alpha);
    this.render(alpha);
  }
}
