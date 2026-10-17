// Rapier collision groups: (membership << 16) | filter.
// World geometry collides with everything; bike parts only collide with the world,
// so the wheels, fork, swingarm, frame and rider never fight each other.
const WORLD = 0x0001;
const BIKE = 0x0002;

export const GROUPS = {
  world: (WORLD << 16) | 0xffff,
  bike: (BIKE << 16) | WORLD,
};
