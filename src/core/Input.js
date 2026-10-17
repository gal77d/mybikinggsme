import { CONFIG } from '../config.js';
import { approach } from './noise.js';

// Keyboard input. Steering is ramped (a thumb on a key is not an instant 100%);
// pedal and brake levels are ramped by the drivetrain itself.
export class Input {
  constructor() {
    this.keys = new Set();
    this.steer = 0; // -1 (right) .. +1 (left), smoothed
    this.pedal = 0; // 0/1 raw
    this.rearBrake = 0;
    this.frontBrake = 0;
    this.resetRequested = false;

    const c = CONFIG.input;
    const handled = new Set([c.pedalKey, c.rearBrakeKey, c.frontBrakeKey, c.leftKey, c.rightKey, c.resetKey]);

    window.addEventListener('keydown', (e) => {
      if (handled.has(e.code)) e.preventDefault();
      if (e.code === c.resetKey && !e.repeat) this.resetRequested = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  fixedUpdate(dt) {
    const c = CONFIG.input;
    const target = (this.keys.has(c.leftKey) ? 1 : 0) - (this.keys.has(c.rightKey) ? 1 : 0);
    this.steer += (target - this.steer) * approach(c.steerRate, dt);
    this.pedal = this.keys.has(c.pedalKey) ? 1 : 0;
    this.rearBrake = this.keys.has(c.rearBrakeKey) ? 1 : 0;
    this.frontBrake = this.keys.has(c.frontBrakeKey) ? 1 : 0;
  }

  consumeReset() {
    const r = this.resetRequested;
    this.resetRequested = false;
    return r;
  }
}
