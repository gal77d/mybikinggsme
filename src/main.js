import * as THREE from 'three';
import { Physics } from './core/physics.js';
import { Renderer } from './core/renderer.js';
import { Loop } from './core/loop.js';
import { Input } from './core/Input.js';
import { Ground } from './terrain/Ground.js';
import { Bike } from './bike/Bike.js';
import { BikeVisual } from './bike/BikeVisual.js';
import { CameraRig } from './camera/CameraRig.js';
import { FpsMeter } from './ui/FpsMeter.js';
import { DebugOverlay } from './ui/DebugOverlay.js';

async function main() {
  const container = document.getElementById('app');

  const physics = await Physics.create();
  const renderer = new Renderer(container);
  const cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
  const fps = new FpsMeter(container);
  const debug = new DebugOverlay(container);
  const input = new Input();

  const ground = new Ground(renderer.scene, physics);
  const bike = new Bike(physics, ground);
  const bikeVisual = new BikeVisual(renderer.scene);

  window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    cameraRig.setAspect(container.clientWidth / container.clientHeight);
  });

  const camTarget = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  const loop = new Loop({
    fixedUpdate: (dt) => {
      if (input.consumeReset()) bike.reset();
      input.fixedUpdate(dt);
      bike.fixedUpdate(dt, input);
      physics.step();
      bike.postStep();
    },
    update: (dt, alpha) => {
      bike.interpolated(0, alpha, camTarget, tmpQuat);
      cameraRig.update(dt, camTarget, bike.state.heading);
      fps.update(dt);
      debug.update(dt, bike);
    },
    render: (alpha) => {
      bikeVisual.sync(bike, alpha);
      renderer.render(cameraRig.camera);
    },
  });
  loop.start();

  // Exposed for debugging in the browser console.
  window.__game = { physics, renderer, cameraRig, loop, fps, bike, input };
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff;padding:16px">${err}</pre>`);
});
