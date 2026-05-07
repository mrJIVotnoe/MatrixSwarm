export const SIMULATION_CONFIG = {
  // Global simulation flag. If true, uses mock values. If false, requires real data from Swarm Core.
  IS_SIMULATION_MODE: true,

  // Default coordinate center for simulation
  BASE_LAT: 55.7558,
  BASE_LNG: 37.6173,
  
  // Coordinate delta bounds
  COORDINATE_SPREAD: 0.1,

  // Bluetooth/Local WiFi range simulation
  MAX_LOCAL_DISTANCE: 0.02,

  // PoW defaults
  DEFAULT_POW_DIFFICULTY: 4,

  // Test data values
  TEST_IPS: ["127.0.0.1", "10.0.0.1"],
};
