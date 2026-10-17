import { Physics } from './core/physics.js';
import { Renderer } from './core/renderer.js';
import { Loop } from './core/loop.js';
import { Ground } from './terrain/Ground.js';
import { CameraRig } from './camera/CameraRig.js';
import { FpsMeter } from './ui/FpsMeter.js';

async function main() {
  const container = document.getElementById('app');

  const physics = await Physics.create();
  const renderer = new Renderer(container);
  const cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
  const fps = new FpsMeter(container);

  new Ground(renderer.scene, physics);

  window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    cameraRig.setAspect(container.clientWidth / container.clientHeight);
  });

  const loop = new Loop({
    fixedUpdate: () => physics.step(),
    update: (dt) => {
      cameraRig.update(dt);
      fps.update(dt);
    },
    render: () => renderer.render(cameraRig.camera),
  });
  loop.start();

  // Exposed for debugging in the browser console.
  window.__game = { physics, renderer, cameraRig, loop, fps };
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff;padding:16px">${err}</pre>`);
});
