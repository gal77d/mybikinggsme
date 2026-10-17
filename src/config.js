// All tuning numbers live here. Tweak the feel of the game from this one file.
// Units: metres, kilograms, seconds, newtons, radians.

export const CONFIG = {
  physics: {
    gravity: { x: 0, y: -9.81, z: 0 }, // m/s²
    timestep: 1 / 240, // fixed physics step (s) — small for stiff tires/suspension
    maxSubSteps: 16, // cap on steps per frame to avoid spiral of death
    solverIterations: 8, // contact accuracy (bike joints are exact multibody joints)
  },

  render: {
    maxPixelRatio: 2,
    clearColor: 0x9cc4e4,
    shadows: true,
    shadowMapSize: 2048,
  },

  world: {
    groundSize: 400, // m, side length of the flat test ground
    groundColor: 0x5a6b3a,
    fogNear: 80,
    fogFar: 260,
    // Strips of different surfaces laid along the start direction (+Z).
    // Each strip: surface name, length along Z (m). Repeats until groundSize is covered.
    stripPattern: [
      { surface: 'dirt', length: 60 },
      { surface: 'grass', length: 40 },
      { surface: 'rock', length: 30 },
    ],
  },

  // Tire-ground grip per surface.
  // mu: peak friction, slideMu: friction when fully sliding (fraction of mu),
  // stiffness: how quickly grip builds with slip (higher = more direct),
  // rolling: rolling-resistance coefficient, color: debug ground colour.
  surfaces: {
    dirt: { mu: 0.95, slideMu: 0.7, stiffness: 9, rolling: 0.018, color: 0x7a5a3a },
    grass: { mu: 0.7, slideMu: 0.55, stiffness: 6, rolling: 0.035, color: 0x557a33 },
    rock: { mu: 1.1, slideMu: 0.6, stiffness: 14, rolling: 0.009, color: 0x8a8a86 },
  },

  bike: {
    spawnHeight: 0.04, // m above ground for the tire bottoms at spawn

    // Geometry (bike local frame: +Z forward, +Y up, +X left)
    wheelbase: 1.22,
    wheelRadius: 0.37, // 29" wheel
    tireWidth: 0.06,
    headAngle: 65 * (Math.PI / 180), // from horizontal
    forkOffset: 0.044, // perpendicular offset of axle ahead of steering axis
    forkLength: 0.56, // axle to crown along the steering axis (at full extension)
    bbHeight: 0.33, // bottom bracket height
    pivotPos: { y: 0.42, z: -0.12 }, // swingarm pivot relative to bike origin

    // Masses (kg)
    frameMass: 13,
    steererMass: 1.4, // bars + stem + fork crown/stanchions
    forkLowerMass: 1.2,
    swingarmMass: 2.2,
    wheelMass: 2.1,
    wheelInertiaFactor: 0.85, // spin inertia = factor · m · r² (most mass is at the rim)
    // The rider is a heavy mass riding on the frame (proper rider body comes later).
    riderMass: 75,
    riderCom: { y: 1.12, z: -0.12 }, // rider centre of mass relative to bike origin

    // Front fork (prismatic along steering axis)
    fork: {
      travel: 0.15, // m
      stiffness: 9000, // N/m
      preload: 0.012, // m of preload compression built into the spring
      damping: 650, // N·s/m compression
      reboundDamping: 800, // N·s/m rebound
      // Progressive ramp near the end of travel (air-spring style).
      progressiveStart: 0.7, // fraction of travel where ramp starts
      progressiveGain: 4.5, // extra stiffness multiplier at full travel
      bottomOutStiffness: 120000, // bumper stiffness in the last few mm
      bottomOutZone: 0.008, // m
      topOutStiffness: 150000, // N/m past full extension
    },

    // Rear suspension (rotational spring at swingarm pivot)
    rear: {
      travel: 0.145, // m at the axle
      stiffness: 2300, // N·m/rad
      preload: 0.03, // rad
      damping: 160, // N·m·s/rad compression
      reboundDamping: 200, // N·m·s/rad rebound
      progressiveStart: 0.7,
      progressiveGain: 3.5,
      bottomOutStiffness: 40000, // N·m/rad
      bottomOutZone: 0.02, // rad
      topOutStiffness: 40000, // N·m/rad past full extension
    },

    // Steering (rider's arms on the bars, modelled as a position motor on the head tube)
    steering: {
      maxAngle: 0.65, // rad, physical stop
      armStiffness: 600, // N·m/rad, how hard the rider holds the bars
      armDamping: 16, // N·m·s/rad
      stiffnessSpeedGain: 20, // extra stiffness per m/s (riders hold bars firmer at speed)
      stopStiffness: 2500, // N·m/rad steering stop bumper past maxAngle
    },

    // Drivetrain / pedaling
    pedal: {
      maxForce: 300, // N at the contact patch at very low speed
      maxPower: 380, // W sustained rider power
      topSpeed: 13.5, // m/s where pedaling fades out (spun out)
      rampUp: 3.0, // 1/s how fast effort builds
      rampDown: 5.0, // 1/s how fast effort fades
      gearRatio: 2.4, // wheel revs per crank rev
      strokePulse: 0.32, // 0..1 strength of the per-stroke torque pulse
    },

    // Brakes (torque at the hub)
    brakes: {
      frontMaxTorque: 420, // N·m
      rearMaxTorque: 340, // N·m
      rampUp: 2.2, // 1/s how fast lever pressure builds (taps stay gentle, holds build up)
      rampDown: 7.0, // 1/s release
      lockVelocity: 0.6, // rad/s, smoothing near zero wheel speed
      lockGuard: 0.7, // 0..1 max fraction of wheel spin the brake may cancel in one physics step
    },

    // Tire model
    tire: {
      slipRefSpeed: 1.2, // m/s, floor for slip-ratio denominators at low speed
      lateralGrip: 1.0, // multiplier on lateral force
      longitudinalGrip: 1.0, // multiplier on longitudinal force
      lateralEffMass: 22, // kg, used to keep explicit tire force stable
      longitudinalEffMass: 1.8, // kg (wheel inertia / r²)
      overshootGuard: 0.8, // 0..1 fraction of the "stop slip in one step" force allowed
      imperfection: 0.04, // random grip variation (fraction) for organic feel
      imperfectionRate: 3.0, // Hz of the grip noise
    },

    // Aero
    aero: {
      airDensity: 1.2, // kg/m³
      dragArea: 0.55, // Cd·A in m² (upright MTB rider)
    },
  },

  // Rider balance model (the rider steers and shifts weight to stay upright)
  balance: {
    maxLean: 0.62, // rad, maximum requested lean at speed
    leanSpeedFull: 6, // m/s at which full lean is available
    leanInputRate: 2.2, // 1/s smoothing of steering input
    // Steer-into-the-fall controller gains (steer angle per rad of lean error)
    leanGain: 1.1,
    leanRateGain: 0.28,
    maxHoldSteer: 0.45, // rad, cap on the steady-state turn steer
    speedRef: 4, // m/s, steering gains scale ~ (speedRef / speed)^exponent
    gainSpeedExponent: 1.0,
    minGainSpeed: 1.2, // m/s, below this the gain stops growing
    steerLimitSpeed: 5, // m/s, steering range shrinks as speed rises past this
    // Rider body English (hips) — a limited roll torque on the frame, mostly at low speed.
    hipTorque: 160, // N·m max
    hipGain: 1300, // N·m per rad lean error
    hipRateGain: 300, // N·m per rad/s
    hipFadeSpeed: 5, // m/s, hips matter less above this
    hipHighSpeedFactor: 0.25, // fraction of hip authority left at speed
    wobble: 0.07, // rad random lean target noise at low speed
    wobbleRate: 1.2, // Hz
    barWobble: 0.05, // rad random bar wiggle at low speed (imperfect rider control)
    barWobbleRate: 2.3, // Hz
  },

  input: {
    steerRate: 3.5, // 1/s how fast A/D input ramps
    pedalKey: 'KeyW',
    rearBrakeKey: 'KeyS',
    frontBrakeKey: 'Space',
    leftKey: 'KeyA',
    rightKey: 'KeyD',
    resetKey: 'KeyR',
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
    far: 600,
    startPosition: { x: 4, y: 2.5, z: -5 },
    lookAt: { x: 0, y: 0.8, z: 0 },
    followDistance: 4.6, // m behind the bike
    followHeight: 1.9, // m above the bike
    lookAhead: 1.5, // m ahead of the bike
    positionSmoothing: 3.2, // 1/s, higher = tighter follow
    lookSmoothing: 6.0,
    headingSmoothing: 2.4,
  },

  ui: {
    fpsUpdateInterval: 0.5, // s between FPS readout refreshes
    debugUpdateInterval: 0.08, // s between debug overlay refreshes
  },
};
