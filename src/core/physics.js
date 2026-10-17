import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../config.js';

// Owns the Rapier world. Must be created via the async factory because
// Rapier's WASM has to be initialised before any physics object exists.
export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World(CONFIG.physics.gravity);
    this.world.timestep = CONFIG.physics.timestep;
    this.world.numSolverIterations = CONFIG.physics.solverIterations;
  }

  step() {
    this.world.step();
  }
}
