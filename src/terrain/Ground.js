import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { GROUPS } from '../core/collision.js';

// Flat test ground made of strips with different surfaces (dirt / grass / rock).
// Behind the spawn point is one dirt slab; ahead, strips follow CONFIG.world.stripPattern.
export class Ground {
  constructor(scene, physics) {
    const { groundSize, stripPattern } = CONFIG.world;
    const { RAPIER, world } = physics;
    const half = groundSize / 2;

    this.surfaceByCollider = new Map();

    const strips = [{ surface: 'dirt', z0: -half, z1: 0 }];
    let z = 0;
    let i = 0;
    while (z < half) {
      const s = stripPattern[i % stripPattern.length];
      const z1 = Math.min(z + s.length, half);
      strips.push({ surface: s.surface, z0: z, z1 });
      z = z1;
      i++;
    }

    for (const s of strips) {
      const len = s.z1 - s.z0;
      const midZ = (s.z0 + s.z1) / 2;
      const surf = CONFIG.surfaces[s.surface];

      const geo = new THREE.PlaneGeometry(groundSize, len);
      geo.rotateX(-Math.PI / 2);
      const color = new THREE.Color(surf.color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.97 }));
      mesh.position.set(0, 0, midZ);
      mesh.receiveShadow = true;
      scene.add(mesh);

      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, midZ));
      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(half, 0.5, len / 2).setFriction(0.8).setCollisionGroups(GROUPS.world),
        body,
      );
      this.surfaceByCollider.set(collider.handle, s.surface);
    }

    const grid = new THREE.GridHelper(groundSize, groundSize / 2, 0x000000, 0x000000);
    grid.position.y = 0.005;
    grid.material.transparent = true;
    grid.material.opacity = 0.12;
    scene.add(grid);
  }

  // Surface name for a collider, or null if it is not ground.
  surfaceOf(collider) {
    return this.surfaceByCollider.get(collider.handle) ?? null;
  }
}
