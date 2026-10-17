import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Camera owner. For now a static view; later this becomes a smoothed chase rig.
export class CameraRig {
  constructor(aspect) {
    const c = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, aspect, c.near, c.far);
    this.camera.position.set(c.startPosition.x, c.startPosition.y, c.startPosition.z);
    this.camera.lookAt(c.lookAt.x, c.lookAt.y, c.lookAt.z);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(_dt) {}
}
