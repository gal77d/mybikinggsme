import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SmoothNoise, smoothstep } from '../core/noise.js';

// Grip curve: builds quickly with slip, peaks, then falls toward the sliding level.
function gripCurve(s, surf) {
  const build = Math.tanh(surf.stiffness * s);
  const peak = 1.5 / surf.stiffness;
  const slide = smoothstep(peak, peak + 0.6, s);
  return build * (1 - (1 - surf.slideMu) * slide);
}

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _axle = new THREE.Vector3();
const _f = new THREE.Vector3();
const _l = new THREE.Vector3();
const _q = new THREE.Quaternion();

// Simplified tire model. Rapier provides the normal contact (wheel colliders have zero
// friction); this class reads the normal load from the contact impulses and applies the
// longitudinal and lateral tire forces at the contact patch.
export class Tire {
  constructor(name, body, collider, radius) {
    this.name = name;
    this.body = body;
    this.collider = collider;
    this.radius = radius;
    this.noise = new SmoothNoise(CONFIG.bike.tire.imperfectionRate);

    this.grounded = false;
    this.surface = null;
    this.load = 0;
    this.slipRatio = 0;
    this.slipAngle = 0;
    this.fx = 0;
    this.fy = 0;
    this.spin = 0; // rad/s about axle
  }

  update(world, ground, dt, time) {
    const cfg = CONFIG.bike.tire;
    let impulse = 0;
    let hasPoint = false;
    let surfaceName = null;

    world.contactPairsWith(this.collider, (other) => {
      const s = ground.surfaceOf(other);
      if (!s) return;
      world.contactPair(this.collider, other, (m) => {
        for (let i = 0; i < m.numContacts(); i++) impulse += m.contactImpulse(i);
        if (m.numSolverContacts() > 0 && !hasPoint) {
          const p = m.solverContactPoint(0);
          if (p) {
            _p.set(p.x, p.y, p.z);
            hasPoint = true;
            surfaceName = s;
          }
        }
      });
    });

    const r = this.body.rotation();
    _q.set(r.x, r.y, r.z, r.w);
    _axle.set(1, 0, 0).applyQuaternion(_q);
    const w = this.body.angvel();
    this.spin = w.x * _axle.x + w.y * _axle.y + w.z * _axle.z;

    if (!hasPoint || impulse <= 0) {
      this.grounded = false;
      this.load = 0;
      this.fx = this.fy = 0;
      this.slipRatio *= 0.9;
      this.slipAngle *= 0.9;
      return;
    }

    this.grounded = true;
    this.surface = surfaceName;
    const N = Math.min(impulse / dt, 8000);
    this.load = N;

    // Contact frame: for a round wheel the normal points from the patch to the hub.
    const c = this.body.translation();
    _n.set(c.x - _p.x, c.y - _p.y, c.z - _p.z).normalize();
    _f.crossVectors(_axle, _n).normalize(); // rolling direction
    _l.crossVectors(_n, _f); // lateral (toward the bike's left)

    const vc = this.body.velocityAtPoint(_p);
    const vLong = vc.x * _f.x + vc.y * _f.y + vc.z * _f.z; // patch slip, longitudinal
    const vLat = vc.x * _l.x + vc.y * _l.y + vc.z * _l.z; // patch slip, lateral
    const lv = this.body.linvel();
    const vx = lv.x * _f.x + lv.y * _f.y + lv.z * _f.z; // hub speed along rolling dir

    const surf = CONFIG.surfaces[surfaceName];
    const mu = surf.mu * (1 + cfg.imperfection * this.noise.sample(time));
    const denom = Math.max(Math.abs(vx), cfg.slipRefSpeed);

    this.slipRatio = -vLong / denom; // + = wheelspin (driving), - = braking skid
    this.slipAngle = Math.atan2(vLat, denom);

    let fx = Math.sign(this.slipRatio) * mu * N * gripCurve(Math.abs(this.slipRatio), surf) * cfg.longitudinalGrip;
    let fy = -Math.sign(vLat) * mu * N * gripCurve(Math.abs(vLat) / denom, surf) * cfg.lateralGrip;

    // Friction circle: combined grip can't exceed mu·N.
    const mag = Math.hypot(fx, fy);
    const limit = mu * N;
    if (mag > limit) {
      fx *= limit / mag;
      fy *= limit / mag;
    }

    // Keep the explicit force from overshooting zero slip within one step.
    const maxFx = (cfg.overshootGuard * Math.abs(vLong) * cfg.longitudinalEffMass) / dt;
    const maxFy = (cfg.overshootGuard * Math.abs(vLat) * cfg.lateralEffMass) / dt;
    fx = Math.max(-maxFx, Math.min(maxFx, fx));
    fy = Math.max(-maxFy, Math.min(maxFy, fy));

    this.fx = fx;
    this.fy = fy;

    this.body.addForceAtPoint(
      { x: _f.x * fx + _l.x * fy, y: _f.y * fx + _l.y * fy, z: _f.z * fx + _l.z * fy },
      { x: _p.x, y: _p.y, z: _p.z },
      true,
    );

    // Rolling resistance: tire deformation losses as a torque against the spin.
    const rr = surf.rolling * N * this.radius * Math.tanh(this.spin / 1.0);
    this.body.addTorque({ x: -_axle.x * rr, y: -_axle.y * rr, z: -_axle.z * rr }, true);
  }
}
