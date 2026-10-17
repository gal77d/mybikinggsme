import { CONFIG } from '../config.js';

const DEG = 180 / Math.PI;

function bar(fraction, width = 12) {
  const n = Math.round(Math.min(Math.max(fraction, 0), 1) * width);
  return '█'.repeat(n) + '·'.repeat(width - n);
}

// Live readout of the bike physics: speed, suspension, tire slip, inputs.
export class DebugOverlay {
  constructor(container) {
    this.el = document.createElement('pre');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '36px',
      left: '8px',
      margin: '0',
      padding: '8px 10px',
      font: '12px/1.45 ui-monospace, Consolas, monospace',
      color: '#e8f0e8',
      background: 'rgba(0,0,0,0.5)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '10',
      whiteSpace: 'pre',
    });
    container.appendChild(this.el);

    const help = document.createElement('div');
    Object.assign(help.style, {
      position: 'fixed',
      bottom: '8px',
      left: '8px',
      padding: '4px 8px',
      font: '12px/1.4 ui-monospace, Consolas, monospace',
      color: '#fff',
      background: 'rgba(0,0,0,0.45)',
      borderRadius: '4px',
      pointerEvents: 'none',
    });
    help.textContent = 'W pedal · A/D lean/steer · S rear brake · Space front brake · R reset';
    container.appendChild(help);

    this.timer = 0;
  }

  update(dt, bike) {
    this.timer += dt;
    if (this.timer < CONFIG.ui.debugUpdateInterval) return;
    this.timer = 0;

    const s = bike.state;
    const d = bike.drivetrain;
    const ft = bike.frontTire;
    const rt = bike.rearTire;
    const tireLine = (t) =>
      t.grounded
        ? `${t.surface.padEnd(5)} load ${t.load.toFixed(0).padStart(4)}N  slip ${(t.slipRatio * 100).toFixed(0).padStart(4)}%  angle ${(t.slipAngle * DEG).toFixed(1).padStart(5)}°`
        : 'airborne';

    this.el.textContent = [
      `speed   ${(s.speed * 3.6).toFixed(1).padStart(5)} km/h`,
      `lean    ${(s.lean * DEG).toFixed(1).padStart(5)}°   steer ${(s.steer * DEG).toFixed(1).padStart(5)}°`,
      '',
      `fork    ${bar(bike.fork.compression)} ${(bike.fork.compression * 100).toFixed(0).padStart(3)}%${bike.fork.bottomedOut ? '  BOTTOM' : ''}`,
      `shock   ${bar(bike.rearShock.compression)} ${(bike.rearShock.compression * 100).toFixed(0).padStart(3)}%${bike.rearShock.bottomedOut ? '  BOTTOM' : ''}`,
      '',
      `front   ${tireLine(ft)}`,
      `rear    ${tireLine(rt)}`,
      '',
      `pedal   ${bar(d.effort)}  ${d.driveTorque.toFixed(0)} N·m`,
      `brake F ${bar(d.frontLever)}  R ${bar(d.rearLever)}`,
    ].join('\n');
  }
}
