// Smooth 1D noise (sum of incommensurate sines with random phases), range ~[-1, 1].
// Used for small organic imperfections: grip variation, rider wobble.
export class SmoothNoise {
  constructor(frequency = 1) {
    this.frequency = frequency;
    this.phases = [Math.random(), Math.random(), Math.random()].map((p) => p * Math.PI * 2);
  }

  sample(time) {
    const t = time * this.frequency * Math.PI * 2;
    const [a, b, c] = this.phases;
    return (Math.sin(t + a) * 0.5 + Math.sin(t * 1.73 + b) * 0.3 + Math.sin(t * 2.91 + c) * 0.2);
  }
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

export function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

// Frame-rate independent exponential approach factor.
export function approach(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}
