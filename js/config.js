// Central configuration - easy to tune later

export const CONFIG = {
  // Scale
  AU: 149597870.7,               // km
  GAME_UNITS_PER_KM: 0.001,
  SOLAR_SYSTEM_SCALE: 2.8,

  // Camera
  FOV: 65,
  NEAR: 0.5,
  FAR: 80000000,

  // Speeds
  CHILL_SPEED: 180,
  SUPERMAN_SPEED: 920000,
  ACCELERATION: 380000,

  // Energy (Superman only)
  ENERGY_DRAIN: 9,
  ENERGY_RECHARGE: 16,

  // Spawn (far + high)
  SPAWN_DISTANCE: 14500,
  SPAWN_HEIGHT_ANGLE: 57,        // degrees
};
