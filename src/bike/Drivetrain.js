import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { approach, smoothstep } from '../core/noise.js';

const _q = new THREE.Quaternion();
const _axle = new THREE.Vector3();

function axleOf(body) {
  const r = body.rotation();
  _q.set(r.x, r.y, r.z, r.w);
  return _axle.set(1, 0, 0).applyQuaternion(_q).clone();
}

function relSpin(wheel, carrier, axle) {
  const a = wheel.angvel();
  const b = carrier.angvel();
  return (a.x - b.x) * axle.x + (a.y - b.y) * axle.y + (a.z - b.z) * axle.z;
}

// Brake torque: friction that opposes the wheel's spin relative to its carrier. Capped so it
// can bring the spin to zero but never reverse it within one step (a real pad just grips).
function brakeTorque(lever, maxTorque, spin, dt) {
  const b = CONFIG.bike.brakes;
  const bike = CONFIG.bike;
  const inertia = bike.wheelInertiaFactor * bike.wheelMass * bike.wheelRadius * bike.wheelRadius;
  const t = lever * maxTorque * Math.tanh(spin / b.lockVelocity);
  const cap = (b.lockGuard * Math.abs(spin) * inertia) / dt;
  return Math.max(-cap, Math.min(cap, t));
}

function addAxleTorque(body, axle, t) {
  body.addTorque({ x: axle.x * t, y: axle.y * t, z: axle.z * t }, true);
}

// Pedaling and brakes. Every torque is applied as an equal-and-opposite pair
// (wheel vs. the part that pushes on it), so reactions like squat and brake dive emerge.
export class Drivetrain {
  constructor() {
    this.effort = 0; // 0..1 how hard the rider is pushing
    this.crank = 0; // crank angle (rad)
    this.driveTorque = 0;
    this.frontLever = 0;
    this.rearLever = 0;
    this.frontBrakeTorque = 0;
    this.rearBrakeTorque = 0;
  }

  update(dt, input, bike) {
    const p = CONFIG.bike.pedal;
    const b = CONFIG.bike.brakes;
    const { frame, swingarm, rearWheel, frontWheel, forkLower } = bike.bodies;
    const r = CONFIG.bike.wheelRadius;

    // --- Pedaling ---
    const pedalTarget = input.pedal;
    this.effort += (pedalTarget - this.effort) * approach(pedalTarget > this.effort ? p.rampUp : p.rampDown, dt);

    const rearAxle = axleOf(rearWheel);
    const rearSpin = relSpin(rearWheel, swingarm, rearAxle);
    if (rearSpin > 0) this.crank += (rearSpin / p.gearRatio) * dt; // freehub: cranks only turn forward

    const v = Math.max(bike.state.speed, 0);
    const force = Math.min(p.maxForce, p.maxPower / Math.max(v, 0.5)) * (1 - smoothstep(0.8 * p.topSpeed, p.topSpeed, v));
    const pulse = 1 + p.strokePulse * Math.cos(2 * this.crank); // two power strokes per crank rev
    this.driveTorque = rearSpin > -1 ? force * r * this.effort * pulse : 0;

    addAxleTorque(rearWheel, rearAxle, this.driveTorque);
    addAxleTorque(frame, rearAxle, -this.driveTorque);

    // --- Brakes ---
    this.frontLever += (input.frontBrake - this.frontLever) * approach(input.frontBrake > this.frontLever ? b.rampUp : b.rampDown, dt);
    this.rearLever += (input.rearBrake - this.rearLever) * approach(input.rearBrake > this.rearLever ? b.rampUp : b.rampDown, dt);

    const frontAxle = axleOf(frontWheel);
    const frontSpin = relSpin(frontWheel, forkLower, frontAxle);
    this.frontBrakeTorque = brakeTorque(this.frontLever, b.frontMaxTorque, frontSpin, dt);
    addAxleTorque(frontWheel, frontAxle, -this.frontBrakeTorque);
    addAxleTorque(forkLower, frontAxle, this.frontBrakeTorque);

    this.rearBrakeTorque = brakeTorque(this.rearLever, b.rearMaxTorque, rearSpin, dt);
    addAxleTorque(rearWheel, rearAxle, -this.rearBrakeTorque);
    addAxleTorque(swingarm, rearAxle, this.rearBrakeTorque);
  }
}
