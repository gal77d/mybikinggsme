// All tuning numbers live here. Tweak the feel of the game from this one file.

export const CONFIG = {
  physics: {
    gravity: { x: 0, y: -9.81, z: 0 }, // m/s²
    timestep: 1 / 120, // fixed physics step (s)
    maxSubSteps: 8, // cap on steps per frame to avoid spiral of death
  },

  render: {
    maxPixelRatio: 2,
    clearColor: 0x9cc4e4,
    shadows: true,
    shadowMapSize: 2048,
  },

  world: {
    groundSize: 200, // m, side length of the flat test ground
    groundFriction: 0.9,
    groundColor: 0x5a6b3a,
    fogNear: 60,
    fogFar: 180,
  },

  lighting: {
    sunColor: 0xfff1d6,
    sunIntensity: 2.2,
    sunPosition: { x: 30, y: 50, z: 20 },
    skyColor: 0xbfd9ff,
    groundBounceColor: 0x4a4030,
    hemiIntensity: 0.9,
  },

  camera: {
    fov: 60,
    near: 0.1,
    far: 500,
    startPosition: { x: 6, y: 3, z: 8 },
    lookAt: { x: 0, y: 0.8, z: 0 },
  },

  ui: {
    fpsUpdateInterval: 0.5, // s between FPS readout refreshes
  },
};
