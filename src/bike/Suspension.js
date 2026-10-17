import * as THREE from 'three';
import { smoothstep } from '../core/noise.js';

// Spring + damper + end stops, shared by fork (metres, N) and shock (radians, N·m).
// - linear spring with preload
// - progressive ramp near the end of travel (air-spring style)
// - stiff bottom-out bumper in the last few mm/rad, and a top-out bumper past full extension
// - rebound/compression damping
// Returns the force/torque that pushes toward extension (positive = extend).
function suspensionForce(x, v, travel, cfg) {
  const ramp = smoothstep(cfg.progressiveStart * travel, travel, x);
  let f = cfg.stiffness * (x + cfg.preload) * (1 + cfg.progressiveGain * ramp * ramp);
  const bumperStart = travel - cfg.bottomOutZone;
  if (x > bumperStart) f += cfg.bottomOutStiffness * (x - bumperStart);
  if (x < 0) f += cfg.topOutStiffness * x; // pulls back in past full extension
  f += (v > 0 ? cfg.damping : cfg.reboundDamping) * v;
  return f;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _u = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();

// Front fork: prismatic multibody joint between the steerer (crown/stanchions) and the lowers.
// x = compression along the fork axis (0 = topped out, travel = bottomed out).
export class ForkSuspension {
  constructor({ steerer, lower, axisLocal, restLocal, cfg }) {
    this.steerer = steerer;
    this.lower = lower;
    this.axisLocal = axisLocal.clone();
    this.restLocal = restLocal.clone();
    this.cfg = cfg;
    this.travel = cfg.travel;
    this.x = 0;
    this.velocity = 0;
    this.force = 0;
    this.bottomedOut = false;
  }

  get compression() {
    return Math.min(Math.max(this.x / this.travel, 0), 1);
  }

  update() {
    const sp = this.steerer.translation();
    const sr = this.steerer.rotation();
    const lp = this.lower.translation();
    _q.set(sr.x, sr.y, sr.z, sr.w);
    _qi.copy(_q).invert();

    _a.set(lp.x - sp.x, lp.y - sp.y, lp.z - sp.z).applyQuaternion(_qi);
    this.x = _a.sub(this.restLocal).dot(this.axisLocal);

    _u.copy(this.axisLocal).applyQuaternion(_q); // world fork axis (points up the fork)
    const lv = this.lower.linvel();
    const sv = this.steerer.velocityAtPoint(lp);
    this.velocity = _b.set(lv.x - sv.x, lv.y - sv.y, lv.z - sv.z).dot(_u);

    this.force = suspensionForce(this.x, this.velocity, this.travel, this.cfg);
    this.bottomedOut = this.x > this.travel - this.cfg.bottomOutZone;

    // Push the lowers down the fork and the crown up it (equal and opposite).
    const f = this.force;
    this.lower.addForce({ x: -_u.x * f, y: -_u.y * f, z: -_u.z * f }, true);
    this.steerer.addForce({ x: _u.x * f, y: _u.y * f, z: _u.z * f }, true);
  }
}

// Rear suspension: rotational spring-damper at the swingarm pivot. Compression is the
// swingarm rotating up about the pivot axis (+X in the bike frame). Travel is specified at
// the axle and converted to an angle using the swingarm length.
export class RearSuspension {
  constructor({ frame, swingarm, armLength, cfg }) {
    this.frame = frame;
    this.swingarm = swingarm;
    this.armLength = armLength;
    this.travel = cfg.travel / armLength; // rad
    this.cfg = cfg;
    this.angle = 0;
    this.velocity = 0;
    this.torque = 0;
    this.bottomedOut = false;
  }

  get compression() {
    return Math.min(Math.max(this.angle / this.travel, 0), 1);
  }

  update() {
    const fr = this.frame.rotation();
    const sr = this.swingarm.rotation();
    _q.set(fr.x, fr.y, fr.z, fr.w);
    _qi.copy(_q).invert().multiply(new THREE.Quaternion(sr.x, sr.y, sr.z, sr.w));
    this.angle = 2 * Math.atan2(_qi.x, _qi.w);

    const axle = _u.set(1, 0, 0).applyQuaternion(_q);
    const ws = this.swingarm.angvel();
    const wf = this.frame.angvel();
    this.velocity = (ws.x - wf.x) * axle.x + (ws.y - wf.y) * axle.y + (ws.z - wf.z) * axle.z;

    this.torque = suspensionForce(this.angle, this.velocity, this.travel, this.cfg);
    this.bottomedOut = this.angle > this.travel - this.cfg.bottomOutZone;

    const t = this.torque;
    this.swingarm.addTorque({ x: -axle.x * t, y: -axle.y * t, z: -axle.z * t }, true);
    this.frame.addTorque({ x: axle.x * t, y: axle.y * t, z: axle.z * t }, true);
  }
}
