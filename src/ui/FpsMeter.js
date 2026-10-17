import { CONFIG } from '../config.js';

// Small corner overlay showing averaged FPS and frame time.
export class FpsMeter {
  constructor(container) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      padding: '4px 8px',
      font: '12px/1.4 ui-monospace, Consolas, monospace',
      color: '#fff',
      background: 'rgba(0,0,0,0.45)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '10',
    });
    this.el.textContent = '-- fps';
    container.appendChild(this.el);

    this.frames = 0;
    this.elapsed = 0;
    this.fps = 0;
  }

  update(dt) {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed >= CONFIG.ui.fpsUpdateInterval) {
      this.fps = this.frames / this.elapsed;
      const ms = (this.elapsed / this.frames) * 1000;
      this.el.textContent = `${this.fps.toFixed(0)} fps · ${ms.toFixed(1)} ms`;
      this.frames = 0;
      this.elapsed = 0;
    }
  }
}
