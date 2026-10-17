import * as THREE from 'three';
import { CONFIG } from '../config.js';

// WebGL renderer + scene with basic outdoor lighting.
export class Renderer {
  constructor(container) {
    const r = CONFIG.render;
    const l = CONFIG.lighting;
    const w = CONFIG.world;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, r.maxPixelRatio));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(r.clearColor);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = r.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(r.clearColor, w.fogNear, w.fogFar);

    const hemi = new THREE.HemisphereLight(l.skyColor, l.groundBounceColor, l.hemiIntensity);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(l.sunColor, l.sunIntensity);
    sun.position.set(l.sunPosition.x, l.sunPosition.y, l.sunPosition.z);
    sun.castShadow = r.shadows;
    sun.shadow.mapSize.set(r.shadowMapSize, r.shadowMapSize);
    const s = 40;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 150 });
    this.scene.add(sun);
    this.sun = sun;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }
}
