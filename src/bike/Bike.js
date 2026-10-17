import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { GROUPS } from '../core/collision.js';
import { ForkSuspension, RearSuspension } from './Suspension.js';
import { Tire } from './Tire.js';
import { Drivetrain } from './Drivetrain.js';
import { RiderBalance } from '../rider/RiderBalance.js';

// Bike geometry in the bike's local frame (+Z forward, +Y up, +X left), origin on the
// ground midway between the axles, suspension fully extended.
export function bikeGeometry() {
  const b = CONFIG.bike;
  const r = b.wheelRadius;
  const ha = b.headAngle;
  const u = new THREE.Vector3(0, Math.sin(ha), -Math.cos(ha)); // steering axis, pointing up
  const perp = new THREE.Vector3(0, Math.cos(ha), Math.sin(ha)); // ⟂ to axis, forward-ish
  const frontAxle = new THREE.Vector3(0, r, b.wheelbase / 2);
  const rearAxle = new THREE.Vector3(0, r, -b.wheelbase / 2);
  const axisPoint = frontAxle.clone().addScaledVector(perp, -b.forkOffset);
  const crown = axisPoint.clone().addScaledVector(u, b.forkLength);
  const pivot = new THREE.Vector3(0, b.pivotPos.y, b.pivotPos.z);
  const framePos = new THREE.Vector3(0, 0.62, 0);
  const bb = new THREE.Vector3(0, b.bbHeight, -0.03);
  const riderCom = new THREE.Vector3(0, b.riderCom.y, b.riderCom.z);
  return { u, perp, frontAxle, rearAxle, axisPoint, crown, pivot, framePos, bb, riderCom, r };
}


function quat(body) {
  const r = body.rotation();
  return new THREE.Quaternion(r.x, r.y, r.z, r.w);
}

export class Bike {
  constructor(physics, ground) {
    this.physics = physics;
    this.ground = ground;
    this.time = 0;
    this.state = { speed: 0, lean: 0, leanRate: 0, steer: 0, yawRate: 0, heading: 0, position: new THREE.Vector3() };
    this.build();
  }

  build() {
    const { RAPIER, world } = this.physics;
    const b = CONFIG.bike;
    const g = bikeGeometry();
    this.geometry = g;
    const lift = new THREE.Vector3(0, b.spawnHeight, 0);

    const makeBody = (pos) =>
      world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(pos.x + lift.x, pos.y + lift.y, pos.z + lift.z)
          .setCanSleep(false),
      );
    const withGroups = (desc) => desc.setCollisionGroups(GROUPS.bike).setFriction(0.6);

    // Frame + rider mass (the rider is a heavy, high mass riding on the frame for now).
    const frame = makeBody(g.framePos);
    world.createCollider(withGroups(RAPIER.ColliderDesc.cuboid(0.05, 0.16, 0.42)).setMass(b.frameMass), frame);
    const riderLocal = g.riderCom.clone().sub(g.framePos);
    world.createCollider(
      withGroups(RAPIER.ColliderDesc.capsule(0.3, 0.2))
        .setTranslation(riderLocal.x, riderLocal.y, riderLocal.z)
        .setMass(b.riderMass),
      frame,
    );

    // Steerer (bars, stem, crown, stanchions) rotates about the head tube.
    const steerer = makeBody(g.crown);
    world.createCollider(withGroups(RAPIER.ColliderDesc.cuboid(0.3, 0.03, 0.03)).setMass(b.steererMass), steerer);

    // Fork lowers slide on the stanchions; their origin is the front axle.
    const forkLower = makeBody(g.frontAxle);
    world.createCollider(withGroups(RAPIER.ColliderDesc.cuboid(0.06, 0.04, 0.04)).setMass(b.forkLowerMass), forkLower);

    // Swingarm pivots on the frame; its origin is the pivot.
    const swingarm = makeBody(g.pivot);
    const armVec = g.rearAxle.clone().sub(g.pivot);
    const armMid = armVec.clone().multiplyScalar(0.5);
    world.createCollider(
      withGroups(RAPIER.ColliderDesc.cuboid(0.07, 0.03, armVec.length() / 2))
        .setTranslation(armMid.x, armMid.y, armMid.z)
        .setMass(b.swingarmMass),
      swingarm,
    );

    // Wheels: zero-friction balls (the tire model provides grip) with ring-like inertia.
    const makeWheel = (pos) => {
      const body = makeBody(pos);
      const m = b.wheelMass;
      const r2 = g.r * g.r;
      const collider = world.createCollider(
        RAPIER.ColliderDesc.ball(g.r)
          .setCollisionGroups(GROUPS.bike)
          .setFriction(0)
          .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
          .setRestitution(0)
          .setMassProperties(m, { x: 0, y: 0, z: 0 }, { x: b.wheelInertiaFactor * m * r2, y: 0.45 * m * r2, z: 0.45 * m * r2 }, { x: 0, y: 0, z: 0, w: 1 }),
        body,
      );
      return { body, collider };
    };
    const front = makeWheel(g.frontAxle);
    const rear = makeWheel(g.rearAxle);

    // --- Joints ---
    const vec = (v) => ({ x: v.x, y: v.y, z: v.z });
    const X = { x: 1, y: 0, z: 0 };
    const zero = { x: 0, y: 0, z: 0 };

    // Multibody (reduced-coordinate) joints: the frame is the root and each part is an exact
    // child joint, so the light fork/wheels can't drift out of alignment under the heavy frame.
    // All springs, damping, steering and end stops are explicit equal-and-opposite forces.
    const joint = (data, parent, child) => world.createMultibodyJoint(data, parent, child, true);
    const headJoint = joint(RAPIER.JointData.revolute(vec(g.crown.clone().sub(g.framePos)), zero, vec(g.u)), frame, steerer);
    const forkJoint = joint(RAPIER.JointData.prismatic(vec(g.frontAxle.clone().sub(g.crown)), zero, vec(g.u)), steerer, forkLower);
    const frontHub = joint(RAPIER.JointData.revolute(zero, zero, X), forkLower, front.body);
    const pivotJoint = joint(RAPIER.JointData.revolute(vec(g.pivot.clone().sub(g.framePos)), zero, X), frame, swingarm);
    const rearHub = joint(RAPIER.JointData.revolute(vec(armVec), zero, X), swingarm, rear.body);

    this.bodies = { frame, steerer, forkLower, swingarm, frontWheel: front.body, rearWheel: rear.body };
    this.joints = { headJoint, forkJoint, frontHub, pivotJoint, rearHub };

    this.fork = new ForkSuspension({
      steerer,
      lower: forkLower,
      axisLocal: g.u,
      restLocal: g.frontAxle.clone().sub(g.crown),
      cfg: b.fork,
    });
    this.rearShock = new RearSuspension({ frame, swingarm, armLength: Math.abs(armVec.z), cfg: b.rear });

    this.frontTire = new Tire('front', front.body, front.collider, g.r);
    this.rearTire = new Tire('rear', rear.body, rear.collider, g.r);
    this.drivetrain = new Drivetrain();
    this.balance = new RiderBalance();

    this.bodyList = Object.values(this.bodies);
    this.prev = this.bodyList.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }));
    this.curr = this.bodyList.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }));
    this.snapshot(this.curr);
    this.snapshot(this.prev);
  }

  reset() {
    const { world } = this.physics;
    for (const body of this.bodyList) world.removeRigidBody(body);
    this.build();
  }

  snapshot(target) {
    this.bodyList.forEach((body, i) => {
      const p = body.translation();
      const r = body.rotation();
      target[i].p.set(p.x, p.y, p.z);
      target[i].q.set(r.x, r.y, r.z, r.w);
    });
  }

  // Measure the bike's state from the frame body.
  measure() {
    const frame = this.bodies.frame;
    const q = quat(frame);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const fwdH = new THREE.Vector3(fwd.x, 0, fwd.z);
    if (fwdH.lengthSq() < 1e-6) fwdH.set(0, 0, 1);
    fwdH.normalize();
    const leftH = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), fwdH);

    const lv = frame.linvel();
    const w = frame.angvel();
    const s = this.state;
    s.speed = lv.x * fwdH.x + lv.z * fwdH.z;
    s.lean = Math.atan2(up.dot(leftH), up.y);
    s.leanRate = -(w.x * fwdH.x + w.z * fwdH.z);
    s.yawRate = w.y;
    s.heading = Math.atan2(fwdH.x, fwdH.z);
    s.forwardH = fwdH;
    s.velocity = new THREE.Vector3(lv.x, lv.y, lv.z);
    const p = frame.translation();
    s.position.set(p.x, p.y, p.z);

    // Steering angle and rate: steerer relative to the frame about the head-tube axis.
    const qrel = q.clone().invert().multiply(quat(this.bodies.steerer));
    const u = this.geometry.u;
    s.steer = 2 * Math.atan2(qrel.x * u.x + qrel.y * u.y + qrel.z * u.z, qrel.w);
    s.headAxis = u.clone().applyQuaternion(q);
    const ws = this.bodies.steerer.angvel();
    s.steerRate = (ws.x - w.x) * s.headAxis.x + (ws.y - w.y) * s.headAxis.y + (ws.z - w.z) * s.headAxis.z;
  }

  // The rider's arms on the bars: a spring-damper pulling the bars toward the balance
  // controller's target, plus a stiff stop at the steering lock. Applied as a torque pair
  // between steerer and frame about the head-tube axis.
  applySteering(target) {
    const st = CONFIG.bike.steering;
    const s = this.state;
    const v = Math.max(s.speed, 0);
    let t = (st.armStiffness + st.stiffnessSpeedGain * v) * (target - s.steer) - st.armDamping * s.steerRate;
    const over = Math.abs(s.steer) - st.maxAngle;
    if (over > 0) t -= Math.sign(s.steer) * st.stopStiffness * over;
    const a = s.headAxis;
    this.bodies.steerer.addTorque({ x: a.x * t, y: a.y * t, z: a.z * t }, true);
    this.bodies.frame.addTorque({ x: -a.x * t, y: -a.y * t, z: -a.z * t }, true);
  }

  fixedUpdate(dt, input) {
    const { world } = this.physics;
    this.time += dt;
    this.snapshot(this.prev);

    for (const body of this.bodyList) {
      body.resetForces(true);
      body.resetTorques(true);
    }

    this.measure();

    // Rider: balance reflexes → bar angle (arms as a spring on the bars) + hip torque.
    const { steer, hipTorque } = this.balance.update(dt, this.time, input, this.state);
    this.applySteering(steer);
    const f = this.state.forwardH;
    this.bodies.frame.addTorque({ x: f.x * hipTorque, y: 0, z: f.z * hipTorque }, true);

    this.fork.update();
    this.rearShock.update();
    this.frontTire.update(world, this.ground, dt, this.time);
    this.rearTire.update(world, this.ground, dt, this.time);
    this.drivetrain.update(dt, input, this);

    // Aerodynamic drag on the rider + bike.
    const a = CONFIG.bike.aero;
    const vel = this.state.velocity;
    const speed = vel.length();
    const k = -0.5 * a.airDensity * a.dragArea * speed;
    this.bodies.frame.addForce({ x: vel.x * k, y: vel.y * k, z: vel.z * k }, true);
  }

  postStep() {
    this.snapshot(this.curr);
  }

  // Interpolated transform of body i for rendering.
  interpolated(i, alpha, outPos, outQuat) {
    outPos.lerpVectors(this.prev[i].p, this.curr[i].p, alpha);
    outQuat.slerpQuaternions(this.prev[i].q, this.curr[i].q, alpha);
  }
}
