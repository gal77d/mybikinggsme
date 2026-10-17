import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Flat test ground: a visual plane plus a fixed Rapier cuboid collider.
export class Ground {
  constructor(scene, physics) {
    const { groundSize, groundFriction, groundColor } = CONFIG.world;
    const { RAPIER, world } = physics;

    const geo = new THREE.PlaneGeometry(groundSize, groundSize);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.95 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    const grid = new THREE.GridHelper(groundSize, groundSize / 2, 0x3c4a26, 0x4c5a30);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);

    const half = groundSize / 2;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(half, 0.5, half).setFriction(groundFriction), body);
    this.body = body;
  }
}
