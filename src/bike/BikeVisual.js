import * as THREE from 'three';
import { bikeGeometry } from './Bike.js';
import { CONFIG } from '../config.js';

const UP = new THREE.Vector3(0, 1, 0);

function tube(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

function wheelMesh(r, mats) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - 0.03, 0.03, 12, 48), mats.tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.012, 8, 48), mats.rim);
  for (const m of [tire, rim]) {
    m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    g.add(m);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 12), mats.metal);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  // Spokes (and one bright one so spin is visible).
  const n = 16;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const tip = new THREE.Vector3(0, Math.cos(ang), Math.sin(ang)).multiplyScalar(r - 0.07);
    const side = (i % 2 ? 1 : -1) * 0.03;
    g.add(tube(new THREE.Vector3(side, 0, 0), tip, i === 0 ? 0.006 : 0.0025, i === 0 ? mats.accent : mats.metal));
  }
  return g;
}

// Three.js meshes for each bike rigid body, drawn at interpolated physics transforms.
export class BikeVisual {
  constructor(scene) {
    const g = bikeGeometry();
    const mats = {
      frame: new THREE.MeshStandardMaterial({ color: 0xd8462b, roughness: 0.45, metalness: 0.3 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.6, metalness: 0.4 }),
      tire: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.95 }),
      rim: new THREE.MeshStandardMaterial({ color: 0x303236, roughness: 0.5, metalness: 0.6 }),
      accent: new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.5 }),
      rider: new THREE.MeshStandardMaterial({ color: 0x3a6ea5, roughness: 0.8, transparent: true, opacity: 0.55 }),
    };

    const local = (origin) => (v) => v.clone().sub(origin);

    // Frame (origin = framePos)
    const frame = new THREE.Group();
    {
      const L = local(g.framePos);
      const headTop = g.crown.clone().addScaledVector(g.u, 0.13);
      const headBottom = g.crown.clone().addScaledVector(g.u, -0.02);
      const seatTop = new THREE.Vector3(0, 0.98, -0.27);
      frame.add(tube(L(headBottom), L(g.bb), 0.026, mats.frame)); // down tube
      frame.add(tube(L(headTop), L(seatTop.clone().lerp(g.bb, 0.18)), 0.022, mats.frame)); // top tube
      frame.add(tube(L(g.bb), L(seatTop), 0.02, mats.frame)); // seat tube
      frame.add(tube(L(headBottom), L(headTop), 0.03, mats.frame)); // head tube
      frame.add(tube(L(seatTop), L(seatTop.clone().add(new THREE.Vector3(0, 0.03, -0.12))), 0.02, mats.dark)); // saddle
      const shockTop = g.bb.clone().lerp(headBottom, 0.45);
      frame.add(tube(L(shockTop), L(g.pivot.clone().add(new THREE.Vector3(0, 0.05, 0.08))), 0.018, mats.accent)); // shock
      const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 6, 12), mats.rider);
      rider.position.copy(L(g.riderCom));
      rider.castShadow = true;
      frame.add(rider);
    }

    // Steerer (origin = crown): stanchions, stem, bars
    const steerer = new THREE.Group();
    {
      const L = local(g.crown);
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(s * 0.055, 0, 0);
        steerer.add(tube(L(g.crown.clone().add(off)), L(g.crown.clone().add(off).addScaledVector(g.u, -0.3)), 0.017, mats.metal));
      }
      steerer.add(tube(L(g.crown.clone().add(new THREE.Vector3(-0.07, 0, 0))), L(g.crown.clone().add(new THREE.Vector3(0.07, 0, 0))), 0.022, mats.dark));
      const barCenter = g.crown.clone().addScaledVector(g.u, 0.2).add(new THREE.Vector3(0, 0, 0.02));
      steerer.add(tube(L(g.crown.clone().addScaledVector(g.u, 0.13)), L(barCenter), 0.018, mats.dark));
      steerer.add(tube(L(barCenter.clone().add(new THREE.Vector3(-0.39, 0.02, -0.02))), L(barCenter.clone().add(new THREE.Vector3(0.39, 0.02, -0.02))), 0.014, mats.dark));
    }

    // Fork lowers (origin = front axle)
    const forkLower = new THREE.Group();
    {
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(s * 0.055, 0, 0);
        forkLower.add(tube(off.clone(), off.clone().addScaledVector(g.u, 0.34), 0.024, mats.dark));
      }
    }

    // Swingarm (origin = pivot)
    const swingarm = new THREE.Group();
    {
      const axle = g.rearAxle.clone().sub(g.pivot);
      for (const s of [-1, 1]) {
        swingarm.add(tube(new THREE.Vector3(s * 0.03, 0, 0), axle.clone().add(new THREE.Vector3(s * 0.07, 0, 0)), 0.018, mats.frame));
      }
    }

    const frontWheel = wheelMesh(CONFIG.bike.wheelRadius, mats);
    const rearWheel = wheelMesh(CONFIG.bike.wheelRadius, mats);

    // Order must match Bike.bodyList: frame, steerer, forkLower, swingarm, frontWheel, rearWheel
    this.groups = [frame, steerer, forkLower, swingarm, frontWheel, rearWheel];
    for (const grp of this.groups) scene.add(grp);
  }

  sync(bike, alpha) {
    this.groups.forEach((grp, i) => bike.interpolated(i, alpha, grp.position, grp.quaternion));
  }
}
