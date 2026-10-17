import { CONFIG } from '../config.js';
import { SmoothNoise, approach, clamp, smoothstep } from '../core/noise.js';

// The rider's balance reflexes. The player asks for a lean (A/D); the rider gets there the
// way real riders do — by steering into the fall. Asking to lean left from upright first
// produces a small right steer (countersteer), then the bars settle into the turn.
// At low speed steering does little, so the rider also uses limited hip/body torque, plus a
// little noise: slow riding is wobbly.
export class RiderBalance {
  constructor() {
    this.targetLean = 0;
    this.steer = 0;
    this.hipTorque = 0;
    this.noise = new SmoothNoise(CONFIG.balance.wobbleRate);
    this.barNoise = new SmoothNoise(CONFIG.balance.barWobbleRate);
  }

  update(dt, time, input, state) {
    const c = CONFIG.balance;
    const bike = CONFIG.bike;
    const v = Math.max(state.speed, 0);

    // Requested lean: limited at low speed, noisy when slow.
    const leanAvail = c.maxLean * clamp(v / c.leanSpeedFull, 0.15, 1);
    const slowness = 1 - smoothstep(1, c.hipFadeSpeed, v);
    const desired = input.steer * leanAvail + c.wobble * slowness * this.noise.sample(time);
    this.targetLean += (desired - this.targetLean) * approach(c.leanInputRate, dt);

    const e = state.lean - this.targetLean; // + = leaning further left than wanted
    const gainScale = Math.pow(c.speedRef / Math.max(v, c.minGainSpeed), c.gainSpeedExponent);

    // Steer into the fall (feedback) + the steady-state steer that holds the target lean.
    const feedback = gainScale * (c.leanGain * e + c.leanRateGain * state.leanRate);
    let hold = 0;
    if (v > 0.5) {
      const groundSteer = Math.atan((bike.wheelbase * 9.81 * Math.tan(this.targetLean)) / Math.max(v * v, 1));
      hold = clamp(groundSteer / Math.sin(bike.headAngle), -c.maxHoldSteer, c.maxHoldSteer);
    }
    const maxSteer = bike.steering.maxAngle / (1 + v / c.steerLimitSpeed);
    const wiggle = c.barWobble * slowness * this.barNoise.sample(time);
    this.steer = clamp(hold + feedback + wiggle, -maxSteer, maxSteer);

    // Hips / body English: strong when slow, fades (not to zero) at speed.
    const fade = 1 - (1 - c.hipHighSpeedFactor) * smoothstep(0, c.hipFadeSpeed, v);
    this.hipTorque = clamp(c.hipGain * e + c.hipRateGain * state.leanRate, -c.hipTorque, c.hipTorque) * fade;

    return { steer: this.steer, hipTorque: this.hipTorque };
  }
}
