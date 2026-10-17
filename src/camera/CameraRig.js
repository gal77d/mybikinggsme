import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { approach } from '../core/noise.js';

// Smoothed chase camera: lags behind the bike's heading and position so motion feels weighty.
export class CameraRig {
  constructor(aspect) {
    const c = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, aspect, c.near, c.far);
    this.camera.position.set(c.startPosition.x, c.startPosition.y, c.startPosition.z);
    this.lookTarget = new THREE.Vector3(c.lookAt.x, c.lookAt.y, c.lookAt.z);
    this.heading = 0;
    this.camera.lookAt(this.lookTarget);
    this._desired = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // targetPos: interpolated bike frame position; heading: bike heading (rad, 0 = +Z).
  update(dt, targetPos, heading) {
    const c = CONFIG.camera;
    if (!targetPos) return;

    let dh = heading - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.heading += dh * approach(c.headingSmoothing, dt);

    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    this._desired.set(targetPos.x - fx * c.followDistance, targetPos.y + c.followHeight, targetPos.z - fz * c.followDistance);
    this.camera.position.lerp(this._desired, approach(c.positionSmoothing, dt));

    this._look.set(targetPos.x + fx * c.lookAhead, targetPos.y + 0.2, targetPos.z + fz * c.lookAhead);
    this.lookTarget.lerp(this._look, approach(c.lookSmoothing, dt));
    this.camera.lookAt(this.lookTarget);
  }
}
