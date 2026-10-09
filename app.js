import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const $ = (id) => document.getElementById(id);

const loadingScreen = $("loading-screen");
const startScreen = $("start-screen");
const errorScreen = $("error-screen");
const errorMessage = $("error-message");
const startButton = $("start-button");
const gameUI = $("game-ui");
const gameElement = $("game");
const uiToggle = $("ui-toggle");
const northButton = $("north-button");
const labelLayer = $("planet-label-layer");

/* =========================================================
   THREE.JS STATE
   ========================================================= */
let scene, camera, renderer;
let solarSystemRoot = null;
let solarPlanets = [];
let moonPivot = null;
let moonMesh = null;
let stars = null;
let sunSprite = null;
let sunLight = null;
let sunMesh = null;
let sunGlow = null;
let gameStarted = false;

/* =========================================================
   UI STATE
   ========================================================= */
let uiMenuVisible = false;
let planetLabelsVisible = true;
let orbitLinesVisible = true;
let distanceVisible = true;
let cinematicMode = false;
let currentSpeedMode = "chill";

/* =========================================================
   FLOATING ORIGIN + CAMERA
   ========================================================= */
const FLOATING_ORIGIN_THRESHOLD = 5000;
let yaw = 0;
let pitch = -0.08;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
const lookSensitivity = 0.0035;

/* =========================================================
   CREATOR PINCH
   ========================================================= */
let activeTouchPointers = new Map();
let creatorPinching = false;
let pinchStartDistance = 0;
let pinchStartFov = 70;
const CREATOR_MIN_FOV = 35;
const CREATOR_MAX_FOV = 90;
const CREATOR_PINCH_SENSITIVITY = 0.12;

function getPointerDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function beginCreatorPinch() {
  if (currentSpeedMode !== "creator") return;
  const pointers = Array.from(activeTouchPointers.values());
  if (pointers.length !== 2) return;
  creatorPinching = true;
  dragging = false;
  pinchStartDistance = getPointerDistance(pointers[0], pointers[1]);
  pinchStartFov = camera.fov;
}

function updateCreatorPinch() {
  if (!creatorPinching || currentSpeedMode !== "creator") return;
  const pointers = Array.from(activeTouchPointers.values());
  if (pointers.length !== 2) return;
  const currentDistance = getPointerDistance(pointers[0], pointers[1]);
  const distanceChange = currentDistance - pinchStartDistance;
  camera.fov = THREE.MathUtils.clamp(
    pinchStartFov - distanceChange * CREATOR_PINCH_SENSITIVITY,
    CREATOR_MIN_FOV,
    CREATOR_MAX_FOV
  );
  camera.updateProjectionMatrix();
}

function endCreatorPinch() {
  if (activeTouchPointers.size < 2) creatorPinching = false;
}

function resetCreatorPinch() {
  activeTouchPointers.clear();
  creatorPinching = false;
  dragging = false;
}

/* =========================================================
   ENERGY + SPEED
   ========================================================= */
let energy = 100;
const ENERGY_RECHARGE_RATE = 18;
const CHILL_SPEED = 120;
const SUPERMAN_SPEED = 750000;
const SPEED_ACCELERATION = 450000;

const speedModes = {
  chill: { speed: CHILL_SPEED, drainRate: 0 },
  superman: { speed: SUPERMAN_SPEED, drainRate: 10 },
  creator: { speed: CHILL_SPEED, drainRate: 0 }
};

let currentMovementSpeed = CHILL_SPEED;
const pressedControls = new Set();
const pressedKeys = new Set();

const controlKeys = {
  forward: ["w", "arrowup"],
  back: ["s", "arrowdown"],
  left: ["a", "arrowleft"],
  right: ["d", "arrowright"],
  up: [" ", "space"],
  down: ["shift", "control"]
};

const clock = new THREE.Clock();

/* =========================================================
   REUSABLE VECTORS
   ========================================================= */
const sunPosition = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempWorld = new THREE.Vector3();
const tempProjected = new THREE.Vector3();
const tempToSun = new THREE.Vector3();
const tempShift = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const raycaster = new THREE.Raycaster();
const sunOccluders = [];

const collisionStart = new THREE.Vector3();
const collisionDelta = new THREE.Vector3();
const collisionCenter = new THREE.Vector3();
const collisionClosest = new THREE.Vector3();
const collisionPush = new THREE.Vector3();
const collisionRemaining = new THREE.Vector3();
const collisionNormal = new THREE.Vector3();
const collisionContact = new THREE.Vector3();
const COLLISION_MARGIN = 1.5;

/* =========================================================
   TEXTURES
   ========================================================= */
const textureLoader = new THREE.TextureLoader();

const TEXTURE_URLS = {
  earth: [
    "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
    "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/2k_earth_daymap.jpg"
  ],
  earthClouds: [
    "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg",
    "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/2k_earth_clouds.jpg"
  ],
  jupiter: [
    "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg",
    "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/2k_jupiter.jpg"
  ],
  saturn: [
    "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg",
    "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/2k_saturn.jpg"
  ],
  saturnRing: [
    "https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png",
    "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/2k_saturn_ring_alpha.png"
  ]
};

function configureLoadedTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer
    ? Math.min(4, renderer.capabilities.getMaxAnisotropy())
    : 1;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function loadTextureWithFallback(urls, onLoad) {
  let attemptIndex = 0;
  const attempt = () => {
    if (attemptIndex >= urls.length) return;
    const url = urls[attemptIndex];
    textureLoader.load(
      url,
      (texture) => {
        configureLoadedTexture(texture);
        onLoad(texture);
      },
      undefined,
      () => {
        attemptIndex += 1;
        attempt();
      }
    );
  };
  attempt();
}

/* =========================================================
   ASTRONOMICAL SCALE
   ========================================================= */
const KM_PER_AU = 149597870.7;
const GAME_UNITS_PER_KM = 0.001;
const GAME_UNITS_PER_AU = KM_PER_AU * GAME_UNITS_PER_KM;
const SOLAR_SYSTEM_SCALE = 3;
const SECONDS_PER_DAY = 86400;
const SIMULATION_TIME_MULTIPLIER = 1;

const SUN_RADIUS_KM = 696340;
const EARTH_RADIUS_KM = 6371;
const MOON_RADIUS_KM = 1737.4;

const SUN_RADIUS = SUN_RADIUS_KM * GAME_UNITS_PER_KM * SOLAR_SYSTEM_SCALE;
const EARTH_GAME_RADIUS = EARTH_RADIUS_KM * GAME_UNITS_PER_KM * SOLAR_SYSTEM_SCALE;
const MOON_RADIUS = MOON_RADIUS_KM * GAME_UNITS_PER_KM * SOLAR_SYSTEM_SCALE;
const MOON_ORBIT_RADIUS = 384400 * GAME_UNITS_PER_KM * SOLAR_SYSTEM_SCALE;
const MOON_ORBIT_PERIOD_DAYS = 27.322;

/* =========================================================
   DATE / MOON CONSTANTS
   ========================================================= */
const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DAY_MS = 86400000;
const JULIAN_CENTURY_DAYS = 36525;

const MOON_EARTH_RADIUS_RATIO = 60.2666;
const MOON_ECCENTRICITY = 0.0549;
const MOON_INCLINATION_DEGREES = 5.1454;
const MOON_NODE_AT_J2000_DEGREES = 125.1228;
const MOON_NODE_RATE_DEGREES_PER_DAY = -0.0529538083;
const MOON_PERIGEE_AT_J2000_DEGREES = 318.0634;
const MOON_PERIGEE_RATE_DEGREES_PER_DAY = 0.1643573223;
const MOON_MEAN_ANOMALY_AT_J2000_DEGREES = 115.3654;
const MOON_MEAN_MOTION_DEGREES_PER_DAY = 13.0649929509;

const NEW_MOON_BASE_JD = 2451550.09765;
const SYNODIC_MONTH_DAYS = 29.530588853;

function julianDateFromDate(date) {
  return 2440587.5 + date.getTime() / DAY_MS;
}

function dateFromJulianDate(julianDate) {
  return new Date((julianDate - 2440587.5) * DAY_MS);
}

function getMeeusNewMoonJulianDate(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T2 * T2;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  const M = THREE.MathUtils.degToRad(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3);
  const MPrime = THREE.MathUtils.degToRad(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4);
  const F = THREE.MathUtils.degToRad(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
  const Omega = THREE.MathUtils.degToRad(124.7746 - 1.5637558 * k + 0.0020672 * T2 + 0.00000215 * T3);

  const correction =
    -0.4072 * Math.sin(MPrime) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * MPrime) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(MPrime - M) -
    0.00514 * E * Math.sin(MPrime + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(MPrime - 2 * F) -
    0.00057 * Math.sin(MPrime + 2 * F) +
    0.00056 * E * Math.sin(2 * MPrime + M) -
    0.00042 * Math.sin(3 * MPrime) -
    0.00042 * E * Math.sin(M + 2 * F) -
    0.00038 * E * Math.sin(M - 2 * F) +
    0.00024 * E * Math.sin(2 * MPrime - M) -
    0.00017 * Math.sin(Omega) -
    0.00007 * Math.sin(MPrime + 2 * M) +
    0.00004 * Math.sin(2 * MPrime - 2 * F) +
    0.00004 * Math.sin(3 * M) +
    0.00003 * Math.sin(MPrime + M - 2 * F) +
    0.00003 * Math.sin(2 * MPrime + 2 * F) -
    0.00003 * Math.sin(MPrime + M + 2 * F) +
    0.00003 * Math.sin(MPrime - M + 2 * F) -
    0.00002 * Math.sin(MPrime - M - 2 * F) -
    0.00002 * Math.sin(3 * MPrime + M) +
    0.00002 * Math.sin(4 * MPrime);

  return NEW_MOON_BASE_JD + SYNODIC_MONTH_DAYS * k + 0.0001337 * T2 - 0.00000015 * T3 + 0.00000000073 * T4 + correction;
}

function getLunarPhaseState(date) {
  const julianDate = julianDateFromDate(date);
  let previousK = Math.floor((julianDate - NEW_MOON_BASE_JD) / SYNODIC_MONTH_DAYS);
  let nextK = previousK + 1;
  let previousNewMoonJD = getMeeusNewMoonJulianDate(previousK);
  let nextNewMoonJD = getMeeusNewMoonJulianDate(nextK);

  while (previousNewMoonJD > julianDate) {
    previousK -= 1;
    previousNewMoonJD = getMeeusNewMoonJulianDate(previousK);
  }
  while (nextNewMoonJD <= julianDate) {
    nextK += 1;
    nextNewMoonJD = getMeeusNewMoonJulianDate(nextK);
  }

  const cycleFraction = THREE.MathUtils.clamp(
    (julianDate - previousNewMoonJD) / (nextNewMoonJD - previousNewMoonJD),
    0, 1
  );
  const phaseAngle = cycleFraction * Math.PI * 2;

  return {
    phaseAngle,
    illuminationFraction: (1 - Math.cos(phaseAngle)) * 0.5,
    previousNewMoon: dateFromJulianDate(previousNewMoonJD),
    nextNewMoon: dateFromJulianDate(nextNewMoonJD)
  };
}

let astronomicalDate = new Date();
let moonOrbitalPosition = new THREE.Vector3();
let moonSunDirection = new THREE.Vector3();
let moonPhaseAngle = 0;
let moonIlluminationFraction = 1;

function getAstronomicalDays(date = new Date()) {
  return (date.getTime() - J2000_EPOCH_MS) / DAY_MS;
}

function normalizeRadians(angle) {
  const fullTurn = Math.PI * 2;
  angle %= fullTurn;
  if (angle < 0) angle += fullTurn;
  return angle;
}

function normalizeDegrees(angle) {
  angle %= 360;
  if (angle < 0) angle += 360;
  return angle;
}

function getGreenwichSiderealTimeDegrees(date) {
  const julianDate = julianDateFromDate(date);
  const centuries = (julianDate - 2451545.0) / JULIAN_CENTURY_DAYS;
  const gmst =
    280.46061837 +
    360.98564736629 * (julianDate - 2451545.0) +
    0.000387933 * centuries * centuries -
    (centuries * centuries * centuries) / 38710000;
  return normalizeDegrees(gmst);
}

function getEarthRotationAngleRadians(date) {
  const siderealDegrees = getGreenwichSiderealTimeDegrees(date);
  return normalizeRadians(THREE.MathUtils.degToRad(siderealDegrees + 90));
}

function getPlanetMeanAnomalyAtDate(data, date) {
  const days = getAstronomicalDays(date);
  const startingMeanAnomaly = THREE.MathUtils.degToRad(data.startMeanAnomalyDegrees);
  const meanMotionPerDay = (Math.PI * 2) / data.orbitalPeriodDays;
  return normalizeRadians(startingMeanAnomaly + meanMotionPerDay * days);
}

function solveKeplerMeanAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 10; i++) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  return solveKeplerMeanAnomaly(meanAnomaly, eccentricity);
}

function getEllipsePosition(semiMajorAxis, eccentricity, eccentricAnomaly) {
  const x = semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const y = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly);
  return new THREE.Vector3(x, 0, -y);
}

function getMoonEclipticPosition(daysSinceJ2000, phaseAngle, sunEclipticLongitude) {
  const ascendingNode = THREE.MathUtils.degToRad(
    normalizeDegrees(MOON_NODE_AT_J2000_DEGREES + MOON_NODE_RATE_DEGREES_PER_DAY * daysSinceJ2000)
  );
  const argumentOfPerigee = THREE.MathUtils.degToRad(
    normalizeDegrees(MOON_PERIGEE_AT_J2000_DEGREES + MOON_PERIGEE_RATE_DEGREES_PER_DAY * daysSinceJ2000)
  );
  const meanAnomaly = THREE.MathUtils.degToRad(
    normalizeDegrees(MOON_MEAN_ANOMALY_AT_J2000_DEGREES + MOON_MEAN_MOTION_DEGREES_PER_DAY * daysSinceJ2000)
  );
  const eccentricAnomaly = solveKeplerMeanAnomaly(meanAnomaly, MOON_ECCENTRICITY);
  const semiMajorAxis = MOON_EARTH_RADIUS_RATIO;

  const xOrbital = semiMajorAxis * (Math.cos(eccentricAnomaly) - MOON_ECCENTRICITY);
  const yOrbital = semiMajorAxis * Math.sqrt(1 - MOON_ECCENTRICITY * MOON_ECCENTRICITY) * Math.sin(eccentricAnomaly);

  const xPerifocal = xOrbital * Math.cos(argumentOfPerigee) - yOrbital * Math.sin(argumentOfPerigee);
  const yPerifocal = xOrbital * Math.sin(argumentOfPerigee) + yOrbital * Math.cos(argumentOfPerigee);

  const cosNode = Math.cos(ascendingNode);
  const sinNode = Math.sin(ascendingNode);
  const cosInclination = Math.cos(THREE.MathUtils.degToRad(MOON_INCLINATION_DEGREES));
  const sinInclination = Math.sin(THREE.MathUtils.degToRad(MOON_INCLINATION_DEGREES));

  const rawX = xPerifocal * cosNode - yPerifocal * sinNode * cosInclination;
  const rawY = yPerifocal * sinInclination;
  const rawZ = xPerifocal * sinNode + yPerifocal * cosNode * cosInclination;

  const rawDistance = Math.sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ);
  const rawLatitude = Math.asin(THREE.MathUtils.clamp(rawY / rawDistance, -1, 1));
  const targetLongitude = sunEclipticLongitude + phaseAngle;
  const distance = rawDistance * EARTH_GAME_RADIUS;

  return new THREE.Vector3(
    distance * Math.cos(rawLatitude) * Math.cos(targetLongitude),
    distance * Math.sin(rawLatitude),
    distance * Math.cos(rawLatitude) * Math.sin(targetLongitude)
  );
}

function updateAstronomicalClock() {
  astronomicalDate = new Date();
  return getAstronomicalDays(astronomicalDate);
}

/* =========================================================
   PLANET DATA
   ========================================================= */
const planetDataList = [
  {
    name: "Mercury", color: 0x96928c, orbitColor: 0xa7a7a7,
    semiMajorAxisAU: 0.387098, eccentricity: 0.20564, orbitalPeriodDays: 87.969,
    radiusKm: 2439.7, rotationPeriodHours: 1407.6, axialTiltDegrees: 0.03,
    orbitalInclinationDegrees: 7.005, longitudeOfAscendingNodeDegrees: 48.331,
    argumentOfPeriapsisDegrees: 29.124, startMeanAnomalyDegrees: 174.796
  },
  {
    name: "Venus", color: 0xd8bd83, orbitColor: 0xcab98d,
    semiMajorAxisAU: 0.723336, eccentricity: 0.006776, orbitalPeriodDays: 224.701,
    radiusKm: 6051.8, rotationPeriodHours: -5832.5, axialTiltDegrees: 177.36,
    orbitalInclinationDegrees: 3.394, longitudeOfAscendingNodeDegrees: 76.68,
    argumentOfPeriapsisDegrees: 54.891, startMeanAnomalyDegrees: 50.115
  },
  {
    name: "Earth", color: 0x347fe0, orbitColor: 0x63a9ff,
    semiMajorAxisAU: 1, eccentricity: 0.01671, orbitalPeriodDays: 365.256,
    radiusKm: 6371, rotationPeriodHours: 23.934, axialTiltDegrees: 23.44,
    orbitalInclinationDegrees: 0, longitudeOfAscendingNodeDegrees: 0,
    argumentOfPeriapsisDegrees: 102.937, startMeanAnomalyDegrees: 357.529,
    hasMoon: true
  },
  {
    name: "Mars", color: 0xc9563d, orbitColor: 0xe07860,
    semiMajorAxisAU: 1.523679, eccentricity: 0.0934, orbitalPeriodDays: 686.98,
    radiusKm: 3389.5, rotationPeriodHours: 24.623, axialTiltDegrees: 25.19,
    orbitalInclinationDegrees: 1.85, longitudeOfAscendingNodeDegrees: 49.558,
    argumentOfPeriapsisDegrees: 286.502, startMeanAnomalyDegrees: 19.373
  },
  {
    name: "Jupiter", color: 0xc58e5a, orbitColor: 0xd1a477,
    semiMajorAxisAU: 5.2028, eccentricity: 0.0489, orbitalPeriodDays: 4332.59,
    radiusKm: 69911, rotationPeriodHours: 9.925, axialTiltDegrees: 3.13,
    orbitalInclinationDegrees: 1.304, longitudeOfAscendingNodeDegrees: 100.454,
    argumentOfPeriapsisDegrees: 273.877, startMeanAnomalyDegrees: 20.02
  },
  {
    name: "Saturn", color: 0xd4c18a, orbitColor: 0xe0d2a6,
    semiMajorAxisAU: 9.537, eccentricity: 0.0565, orbitalPeriodDays: 10755.7,
    radiusKm: 58232, rotationPeriodHours: 10.656, axialTiltDegrees: 26.73,
    orbitalInclinationDegrees: 2.486, longitudeOfAscendingNodeDegrees: 113.663,
    argumentOfPeriapsisDegrees: 339.392, startMeanAnomalyDegrees: 317.021,
    hasRings: true
  },
  {
    name: "Uranus", color: 0x79d6dd, orbitColor: 0x91e8ed,
    semiMajorAxisAU: 19.1914, eccentricity: 0.0472, orbitalPeriodDays: 30688.5,
    radiusKm: 25362, rotationPeriodHours: -17.24, axialTiltDegrees: 97.77,
    orbitalInclinationDegrees: 0.773, longitudeOfAscendingNodeDegrees: 74,
    argumentOfPeriapsisDegrees: 96.661, startMeanAnomalyDegrees: 141.05
  },
  {
    name: "Neptune", color: 0x3c68d8, orbitColor: 0x7794ff,
    semiMajorAxisAU: 30.0611, eccentricity: 0.0086, orbitalPeriodDays: 60182,
    radiusKm: 24622, rotationPeriodHours: 16.11, axialTiltDegrees: 28.32,
    orbitalInclinationDegrees: 1.77, longitudeOfAscendingNodeDegrees: 131.781,
    argumentOfPeriapsisDegrees: 272.846, startMeanAnomalyDegrees: 256.228
  }
];

/* =========================================================
   ERROR + FLOATING ORIGIN
   ========================================================= */
function showError(message) {
  loadingScreen.hidden = true;
  startScreen.hidden = true;
  gameUI.hidden = true;
  errorMessage.textContent = message;
  errorScreen.hidden = false;
}

function updateSunWorldPosition() {
  if (!solarSystemRoot) {
    sunPosition.set(0, 0, 0);
    return;
  }
  sunPosition.copy(solarSystemRoot.position);
}

function rebaseSolarSystemIfNeeded() {
  if (!camera || !solarSystemRoot) return;
  if (camera.position.length() < FLOATING_ORIGIN_THRESHOLD) return;
  tempShift.copy(camera.position);
  solarSystemRoot.position.sub(tempShift);
  camera.position.sub(tempShift);
  updateSunWorldPosition();
}

/* =========================================================
   SPEED + ENERGY UI
   ========================================================= */
function updateSpeedButtons() {
  document.querySelectorAll("[data-speed]").forEach((button) => {
    const selected = button.dataset.speed === currentSpeedMode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  gameUI.classList.toggle("superman-mode", currentSpeedMode === "superman");
  updateCreatorLabelMode();
}

function setSpeedMode(mode) {
  if (!speedModes[mode]) return;
  if (energy <= 0 && mode === "superman") mode = "chill";
  currentSpeedMode = mode;
  if (mode === "chill" || mode === "creator") currentMovementSpeed = CHILL_SPEED;
  updateSpeedButtons();
  updateEnergyDisplay();
}

function updateCreatorLabelMode() {
  labelLayer.classList.toggle(
    "creator-enabled",
    planetLabelsVisible && currentSpeedMode === "creator" && !cinematicMode
  );
}

function updateEnergyDisplay() {
  const displayed = Math.round(energy);
  $("energy-fill").style.width = `${energy}%`;
  $("energy-percent").textContent = `${displayed}%`;
  $("energy-bar").setAttribute("aria-valuenow", String(displayed));

  if (energy <= 25) $("energy-fill").style.backgroundColor = "#ff665f";
  else if (energy <= 55) $("energy-fill").style.backgroundColor = "#ffd15c";
  else $("energy-fill").style.backgroundColor = "#65e68a";

  gameUI.classList.toggle("superman-low-energy", currentSpeedMode === "superman" && energy < 20);
}

function updateMovementSpeed(deltaTime) {
  const mode = speedModes[currentSpeedMode] || speedModes.chill;
  if (currentSpeedMode === "chill" || currentSpeedMode === "creator") {
    currentMovementSpeed = CHILL_SPEED;
    return;
  }
  const difference = mode.speed - currentMovementSpeed;
  const maxChange = SPEED_ACCELERATION * deltaTime;
  if (Math.abs(difference) <= maxChange) {
    currentMovementSpeed = mode.speed;
  } else {
    currentMovementSpeed += Math.sign(difference) * maxChange;
  }
}

/* =========================================================
   VISUAL TOGGLES
   ========================================================= */
function updateVisualToggleButtons() {
  const setToggle = (id, value) => {
    const btn = $(id);
    if (!btn) return;
    btn.querySelector(".toggle-state").textContent = value ? "ON" : "OFF";
    btn.setAttribute("aria-pressed", String(value));
  };
  setToggle("labels-toggle", planetLabelsVisible);
  setToggle("orbits-toggle", orbitLinesVisible);
  setToggle("distance-toggle", distanceVisible);
  setToggle("cinematic-toggle", cinematicMode);
}

function setPlanetLabelsVisible(visible) {
  planetLabelsVisible = visible;
  updateVisualToggleButtons();
  updateCreatorLabelMode();
}

function setOrbitLinesVisible(visible) {
  orbitLinesVisible = visible;
  for (const p of solarPlanets) {
    if (p.orbitLine) p.orbitLine.visible = orbitLinesVisible && !cinematicMode;
  }
  updateVisualToggleButtons();
}

function setDistanceVisible(visible) {
  distanceVisible = visible;
  for (const p of solarPlanets) {
    if (p.labelDistance) p.labelDistance.style.display = distanceVisible ? "" : "none";
  }
  updateVisualToggleButtons();
}

function setCinematicMode(enabled) {
  cinematicMode = enabled;
  if (cinematicMode) {
    uiMenuVisible = false;
    $("visual-panel").hidden = true;
    uiToggle.setAttribute("aria-expanded", "false");
  }
  for (const p of solarPlanets) {
    if (p.orbitLine) p.orbitLine.visible = orbitLinesVisible && !cinematicMode;
  }
  gameUI.classList.toggle("cinematic-mode", cinematicMode);
  labelLayer.classList.toggle("cinematic-hidden", cinematicMode);
  updateVisualToggleButtons();
  updateCreatorLabelMode();
}

function setUIMenuVisible(visible) {
  if (cinematicMode && visible) setCinematicMode(false);
  uiMenuVisible = visible;
  $("visual-panel").hidden = !uiMenuVisible;
  uiToggle.setAttribute("aria-expanded", String(uiMenuVisible));
}

function setNorthHeading() {
  if (!camera) return;
  yaw = 0;
  pitch = 0;
  camera.rotation.set(pitch, yaw, 0);
}

/* =========================================================
   STAR FIELD + SUN SPRITE
   ========================================================= */
function createStarField() {
  const starCount = 2600;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const distance = 7000000 + Math.random() * 5000000;
    positions[i * 3] = dir.x * distance;
    positions[i * 3 + 1] = dir.y * distance;
    positions[i * 3 + 2] = dir.z * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 900,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    })
  );
  scene.add(stars);
}

function createSunSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,220,1)");
  gradient.addColorStop(0.18, "rgba(255,225,94,1)");
  gradient.addColorStop(0.55, "rgba(255,162,35,0.72)");
  gradient.addColorStop(1, "rgba(255,145,25,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    })
  );
  sunSprite.scale.set(1, 1, 1);
  scene.add(sunSprite);
}

/* =========================================================
   ORBIT LINE + LABEL
   ========================================================= */
function createOrbitLine(semiMajorAxis, eccentricity, color) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const ecc = solveEccentricAnomaly(angle, eccentricity);
    points.push(getEllipsePosition(semiMajorAxis, eccentricity, ecc));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3
  });
  return new THREE.LineLoop(geometry, material);
}

function formatDistance(distance) {
  if (distance >= GAME_UNITS_PER_AU) return (distance / GAME_UNITS_PER_AU).toFixed(2) + " AU";
  if (distance >= 1000) return (distance / 1000).toFixed(1) + "k";
  return Math.round(distance) + " u";
}

function createLabel(name, planetData) {
  const label = document.createElement("div");
  label.className = "planet-label";

  const nameEl = document.createElement("span");
  nameEl.className = "planet-label-name";
  nameEl.textContent = name;

  const distEl = document.createElement("span");
  distEl.className = "planet-label-distance";

  label.appendChild(nameEl);
  label.appendChild(distEl);

  label.addEventListener("pointerdown", (e) => {
    if (currentSpeedMode !== "creator") return;
    e.preventDefault();
    e.stopPropagation();
  });

  label.addEventListener("click", (e) => {
    if (currentSpeedMode !== "creator") return;
    e.preventDefault();
    e.stopPropagation();
    teleportToPlanet(planetData);
  });

  labelLayer.appendChild(label);
  planetData.labelDistance = distEl;
  return label;
}

/* =========================================================
   PLANET CREATION (simplified rings for this version)
   ========================================================= */
function createPlanet(data) {
  const semiMajorAxis = data.semiMajorAxisAU * GAME_UNITS_PER_AU * SOLAR_SYSTEM_SCALE;
  const planetRadius = data.radiusKm * GAME_UNITS_PER_KM * SOLAR_SYSTEM_SCALE;

  const ascendingNodeGroup = new THREE.Group();
  ascendingNodeGroup.rotation.y = THREE.MathUtils.degToRad(data.longitudeOfAscendingNodeDegrees);

  const inclinationGroup = new THREE.Group();
  inclinationGroup.rotation.x = THREE.MathUtils.degToRad(data.orbitalInclinationDegrees);

  const periapsisGroup = new THREE.Group();
  periapsisGroup.rotation.y = THREE.MathUtils.degToRad(data.argumentOfPeriapsisDegrees);

  ascendingNodeGroup.add(inclinationGroup);
  inclinationGroup.add(periapsisGroup);
  solarSystemRoot.add(ascendingNodeGroup);

  const orbitLine = createOrbitLine(semiMajorAxis, data.eccentricity, data.orbitColor);
  orbitLine.visible = orbitLinesVisible;
  periapsisGroup.add(orbitLine);

  const orbitalBodyGroup = new THREE.Group();
  periapsisGroup.add(orbitalBodyGroup);

  const axialTiltGroup = new THREE.Group();
  axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDegrees);
  orbitalBodyGroup.add(axialTiltGroup);

  const material = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: data.name === "Earth" ? 0.7 : 0.9,
    metalness: 0.02
  });

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(planetRadius, 48, 32),
    material
  );
  axialTiltGroup.add(planet);
  sunOccluders.push(planet);

  let cloudMesh = null;
  if (data.name === "Earth") {
    cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius * 1.01, 48, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      })
    );
    axialTiltGroup.add(cloudMesh);
  }

  // Moon
  if (data.hasMoon) {
    moonPivot = new THREE.Group();
    axialTiltGroup.add(moonPivot);

    moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(MOON_RADIUS, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xbfc4cf, roughness: 1 })
    );
    moonMesh.position.set(MOON_ORBIT_RADIUS, 0, 0);
    moonPivot.add(moonMesh);
    sunOccluders.push(moonMesh);
  }

  // Initial orbit position
  const startingMeanAnomaly = getPlanetMeanAnomalyAtDate(data, astronomicalDate);
  const initialEcc = solveEccentricAnomaly(startingMeanAnomaly, data.eccentricity);
  orbitalBodyGroup.position.copy(getEllipsePosition(semiMajorAxis, data.eccentricity, initialEcc));

  const orbitalPeriodSeconds = data.orbitalPeriodDays * SECONDS_PER_DAY;
  const meanMotion = ((Math.PI * 2) / orbitalPeriodSeconds) * SIMULATION_TIME_MULTIPLIER;
  const rotationPeriodSeconds = Math.abs(data.rotationPeriodHours) * 3600;
  const spinSpeed =
    ((Math.PI * 2) / rotationPeriodSeconds) *
    (Math.sign(data.rotationPeriodHours) || 1) *
    SIMULATION_TIME_MULTIPLIER;

  const elapsedSeconds = getAstronomicalDays(astronomicalDate) * SECONDS_PER_DAY;

  if (data.name === "Earth") {
    planet.rotation.y = getEarthRotationAngleRadians(astronomicalDate);
  } else {
    planet.rotation.y = normalizeRadians(spinSpeed * elapsedSeconds);
  }

  const record = {
    name: data.name,
    sourceData: data,
    semiMajorAxis,
    eccentricity: data.eccentricity,
    meanAnomaly: startingMeanAnomaly,
    meanMotion,
    spinSpeed,
    orbitalBodyGroup,
    planet,
    orbitLine,
    cloudMesh,
    label: null,
    labelDistance: null,
    radius: planetRadius
  };

  record.label = createLabel(data.name, record);
  solarPlanets.push(record);
}

/* =========================================================
   CREATE SOLAR SYSTEM
   ========================================================= */
function createSolarSystem() {
  updateAstronomicalClock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);

  solarSystemRoot = new THREE.Group();
  scene.add(solarSystemRoot);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 60000000);
  camera.rotation.order = "YXZ";
  camera.rotation.set(pitch, yaw, 0);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0x8ea6d4, 0x16111c, 0.08));

  sunLight = new THREE.PointLight(0xffd69a, 2.0e12, 0, 2);
  sunLight.position.set(0, 0, 0);
  solarSystemRoot.add(sunLight);

  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffa928 })
  );
  solarSystemRoot.add(sunMesh);

  sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS * 1.08, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff9a27,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
  solarSystemRoot.add(sunGlow);

  createSunSprite();

  const sunRecord = {
    name: "Sun",
    semiMajorAxis: 0,
    eccentricity: 0,
    meanAnomaly: 0,
    meanMotion: 0,
    spinSpeed: 0,
    orbitalBodyGroup: null,
    planet: sunMesh,
    orbitLine: null,
    cloudMesh: null,
    label: null,
    labelDistance: null,
    radius: SUN_RADIUS,
    isSun: true
  };
  sunRecord.label = createLabel("Sun", sunRecord);
  solarPlanets.push(sunRecord);

  createStarField();

  for (const data of planetDataList) {
    createPlanet(data);
  }

  // ===== iPad-friendly renderer =====
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 900;

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: false,
    powerPreference: isMobile ? "default" : "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  gameElement.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "Interactive 3D Solar System");
  renderer.domElement.setAttribute("role", "application");

  // Prevent blue selection on the canvas itself
  renderer.domElement.style.userSelect = "none";
  renderer.domElement.style.webkitUserSelect = "none";
  renderer.domElement.style.touchAction = "none";

  const earthData = solarPlanets.find((p) => p.name === "Earth");
  if (earthData) {
    earthData.planet.getWorldPosition(tempWorld);
    camera.position.copy(tempWorld);
    camera.position.z += 140 * SOLAR_SYSTEM_SCALE;
  }

  updateSunWorldPosition();
  updateSpeedButtons();
  updateVisualToggleButtons();
  updateEnergyDisplay();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* =========================================================
   SUN VISIBILITY + ENERGY
   ========================================================= */
function getSunVisibilityState() {
  tempToSun.subVectors(sunPosition, camera.position);
  const distance = tempToSun.length();
  if (distance <= 0.001) return { visible: true, pixels: 100 };

  tempToSun.normalize();
  raycaster.set(camera.position, tempToSun);
  const hits = raycaster.intersectObjects(sunOccluders, false);
  const visible = hits.length === 0;

  tempProjected.copy(sunPosition).project(camera);
  const onScreen =
    tempProjected.z > -1 && tempProjected.z < 1 &&
    tempProjected.x > -1 && tempProjected.x < 1 &&
    tempProjected.y > -1 && tempProjected.y < 1;

  const pixels = onScreen ? (SUN_RADIUS / distance) * window.innerHeight * 0.5 : 0;
  return { visible: visible && onScreen, pixels };
}

function updateSunAndEnergy(deltaTime) {
  const state = getSunVisibilityState();

  if (sunSprite) {
    if (state.visible) {
      const distance = camera.position.distanceTo(sunPosition);
      const targetPixels = Math.max(2.5, Math.min(180, (SUN_RADIUS / distance) * window.innerHeight * 0.72));
      sunSprite.scale.set(targetPixels, targetPixels, 1);
      sunSprite.material.opacity = state.pixels < 2.5 ? 0.95 : 0.32;
    } else {
      sunSprite.material.opacity = 0;
    }
  }

  if (currentSpeedMode === "superman" && state.visible) {
    energy = Math.min(100, energy + ENERGY_RECHARGE_RATE * deltaTime);
  }
  updateEnergyDisplay();
}

function updateEnergy(deltaTime, isMoving) {
  if (!gameStarted || !isMoving || currentSpeedMode !== "superman") return;
  energy = Math.max(0, energy - speedModes.superman.drainRate * deltaTime);
  if (energy === 0) setSpeedMode("chill");
}

/* =========================================================
   MOVEMENT + COLLISION
   ========================================================= */
function isControlPressed(name) {
  const keys = controlKeys[name];
  if (!keys) return false;
  for (const key of keys) {
    if (pressedControls.has(name) || pressedKeys.has(key)) return true;
  }
  return false;
}

function getCollisionBodies() {
  const bodies = [];
  for (const p of solarPlanets) {
    if (!p.planet || !p.radius) continue;
    bodies.push({ mesh: p.planet, radius: p.radius });
  }
  if (moonMesh) bodies.push({ mesh: moonMesh, radius: MOON_RADIUS });
  return bodies;
}

function resolveBodyCollisions(previousPosition, proposedPosition) {
  const bodies = getCollisionBodies();
  collisionStart.copy(previousPosition);
  collisionDelta.subVectors(proposedPosition, previousPosition);

  for (const body of bodies) {
    body.mesh.getWorldPosition(collisionCenter);
    const radius = body.radius + COLLISION_MARGIN;
    const movementLengthSq = collisionDelta.lengthSq();
    if (movementLengthSq < 0.000001) break;

    const movementLength = Math.sqrt(movementLengthSq);
    collisionPush.subVectors(collisionStart, collisionCenter);
    const startDistance = collisionPush.length();

    if (startDistance <= radius) {
      if (startDistance > 0.000001) {
        collisionNormal.copy(collisionPush).divideScalar(startDistance);
      } else {
        collisionNormal.copy(collisionDelta).multiplyScalar(-1);
        if (collisionNormal.lengthSq() < 0.000001) collisionNormal.set(0, 0, 1);
        else collisionNormal.normalize();
      }
      collisionContact.copy(collisionCenter).addScaledVector(collisionNormal, radius);
      const inward = collisionDelta.dot(collisionNormal);
      if (inward < 0) collisionDelta.addScaledVector(collisionNormal, -inward);
      collisionStart.copy(collisionContact);
      proposedPosition.copy(collisionStart).add(collisionDelta);
      continue;
    }

    const toCenter = new THREE.Vector3().subVectors(collisionCenter, collisionStart);
    const t = THREE.MathUtils.clamp(toCenter.dot(collisionDelta) / movementLengthSq, 0, 1);
    collisionClosest.copy(collisionStart).addScaledVector(collisionDelta, t);
    const closestDistance = collisionClosest.distanceTo(collisionCenter);
    if (closestDistance > radius) continue;

    collisionPush.subVectors(collisionClosest, collisionCenter);
    if (collisionPush.lengthSq() < 0.000001) {
      collisionPush.copy(collisionStart).sub(collisionCenter);
      if (collisionPush.lengthSq() < 0.000001) {
        collisionPush.copy(collisionDelta).multiplyScalar(-1);
      }
    }
    collisionNormal.copy(collisionPush).normalize();

    const safeT = Math.max(0, t - radius / movementLength);
    collisionContact.copy(collisionStart).addScaledVector(collisionDelta, safeT);
    collisionContact.sub(collisionCenter).normalize().multiplyScalar(radius).add(collisionCenter);

    collisionRemaining.copy(proposedPosition).sub(collisionContact);
    const remainingInward = collisionRemaining.dot(collisionNormal);
    if (remainingInward < 0) collisionRemaining.addScaledVector(collisionNormal, -remainingInward);

    proposedPosition.copy(collisionContact).add(collisionRemaining);
    collisionStart.copy(collisionContact);
    collisionDelta.subVectors(proposedPosition, collisionStart);
  }
}

function updateMovement(deltaTime) {
  updateMovementSpeed(deltaTime);
  if (!gameStarted) return false;

  tempDirection.set(0, 0, 0);
  camera.getWorldDirection(tempDirection);
  tempRight.crossVectors(tempDirection, worldUp).normalize();

  const movingForward = isControlPressed("forward");
  const movingBack = isControlPressed("back");
  const movingLeft = isControlPressed("left");
  const movingRight = isControlPressed("right");
  const movingUp = isControlPressed("up");
  const movingDown = isControlPressed("down");

  if (!movingForward && !movingBack && !movingLeft && !movingRight && !movingUp && !movingDown) {
    return false;
  }

  const previousPosition = camera.position.clone();
  const proposedPosition = camera.position.clone();

  if (movingForward) proposedPosition.addScaledVector(tempDirection, currentMovementSpeed * deltaTime);
  if (movingBack) proposedPosition.addScaledVector(tempDirection, -currentMovementSpeed * deltaTime);
  if (movingRight) proposedPosition.addScaledVector(tempRight, currentMovementSpeed * deltaTime);
  if (movingLeft) proposedPosition.addScaledVector(tempRight, -currentMovementSpeed * deltaTime);
  if (movingUp) proposedPosition.addScaledVector(worldUp, currentMovementSpeed * deltaTime);
  if (movingDown) proposedPosition.addScaledVector(worldUp, -currentMovementSpeed * deltaTime);

  resolveBodyCollisions(previousPosition, proposedPosition);
  camera.position.copy(proposedPosition);
  return true;
}

/* =========================================================
   ORBITS + MOON
   ========================================================= */
function updateOrbits(deltaTime) {
  const daysSinceJ2000 = updateAstronomicalClock();

  for (const planetData of solarPlanets) {
    if (planetData.isSun) continue;

    planetData.meanAnomaly = getPlanetMeanAnomalyAtDate(planetData.sourceData, astronomicalDate);
    const eccentricAnomaly = solveEccentricAnomaly(planetData.meanAnomaly, planetData.eccentricity);
    planetData.orbitalBodyGroup.position.copy(
      getEllipsePosition(planetData.semiMajorAxis, planetData.eccentricity, eccentricAnomaly)
    );

    const elapsedSeconds = daysSinceJ2000 * SECONDS_PER_DAY;

    if (planetData.name === "Earth") {
      planetData.planet.rotation.y = getEarthRotationAngleRadians(astronomicalDate);
    } else {
      planetData.planet.rotation.y = normalizeRadians(planetData.spinSpeed * elapsedSeconds);
    }

    if (planetData.cloudMesh) {
      if (planetData.name === "Earth") {
        planetData.cloudMesh.rotation.y = normalizeRadians(
          getEarthRotationAngleRadians(astronomicalDate) * 0.999
        );
      } else {
        planetData.cloudMesh.rotation.y = normalizeRadians(planetData.spinSpeed * 0.94 * elapsedSeconds);
      }
    }
  }

  // Moon
  if (moonPivot && moonMesh) {
    const phaseState = getLunarPhaseState(astronomicalDate);
    moonPhaseAngle = phaseState.phaseAngle;
    moonIlluminationFraction = phaseState.illuminationFraction;

    const earthRecord = solarPlanets.find((p) => p.name === "Earth");
    let sunEclipticLongitude = 0;
    if (earthRecord) {
      earthRecord.orbitalBodyGroup.getWorldPosition(collisionCenter);
      const sunFromEarthX = -collisionCenter.x;
      const sunFromEarthZ = -collisionCenter.z;
      sunEclipticLongitude = Math.atan2(-sunFromEarthZ, sunFromEarthX);
    }

    moonOrbitalPosition.copy(
      getMoonEclipticPosition(daysSinceJ2000, moonPhaseAngle, sunEclipticLongitude)
    );
    moonMesh.position.set(moonOrbitalPosition.x, moonOrbitalPosition.y, -moonOrbitalPosition.z);

    const moonWorldPosition = moonMesh.getWorldPosition(tempWorld);
    moonMesh.rotation.y = Math.atan2(-moonMesh.position.x, -moonMesh.position.z);

    moonSunDirection.subVectors(sunPosition, moonWorldPosition).normalize();
  }
}

/* =========================================================
   CREATOR TELEPORT + LABELS
   ========================================================= */
function teleportToPlanet(planetData) {
  if (currentSpeedMode !== "creator") return;
  planetData.planet.getWorldPosition(tempWorld);

  const away = new THREE.Vector3().subVectors(camera.position, tempWorld);
  if (away.lengthSq() < 0.001) away.set(0, 1, 0);
  else away.normalize();

  const standOff = Math.max(planetData.radius * 3.5, 30);
  camera.position.copy(tempWorld).addScaledVector(away, standOff);

  tempDirection.subVectors(tempWorld, camera.position).normalize();
  yaw = Math.atan2(-tempDirection.x, -tempDirection.z);
  pitch = Math.asin(THREE.MathUtils.clamp(tempDirection.y, -1, 1));
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  camera.rotation.set(pitch, yaw, 0);
  rebaseSolarSystemIfNeeded();
}

function updateLabels() {
  for (const planetData of solarPlanets) {
    if (!planetLabelsVisible || cinematicMode) {
      planetData.label.style.opacity = "0";
      continue;
    }

    planetData.planet.getWorldPosition(tempWorld);
    const distanceFromCamera = camera.position.distanceTo(tempWorld);

    if (planetData.labelDistance) {
      planetData.labelDistance.textContent = formatDistance(distanceFromCamera);
      planetData.labelDistance.style.display = distanceVisible ? "" : "none";
    }

    tempProjected.copy(tempWorld).project(camera);
    const visible =
      tempProjected.z > -1 && tempProjected.z < 1 &&
      tempProjected.x > -1.1 && tempProjected.x < 1.1 &&
      tempProjected.y > -1.1 && tempProjected.y < 1.1;

    if (!visible) {
      planetData.label.style.opacity = "0";
      continue;
    }

    planetData.label.style.left = `${(tempProjected.x * 0.5 + 0.5) * window.innerWidth}px`;
    planetData.label.style.top = `${(-tempProjected.y * 0.5 + 0.5) * window.innerHeight}px`;
    planetData.label.style.opacity = "1";
  }
}

/* =========================================================
   ANIMATION LOOP
   ========================================================= */
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.05);

  updateOrbits(deltaTime);
  const isMoving = updateMovement(deltaTime);
  rebaseSolarSystemIfNeeded();
  updateEnergy(deltaTime, isMoving);
  updateSunAndEnergy(deltaTime);
  updateLabels();

  if (stars) stars.position.copy(camera.position);
  if (renderer) renderer.render(scene, camera);
}

/* =========================================================
   START GAME
   ========================================================= */
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  startScreen.hidden = true;
  gameUI.hidden = false;
  renderer.domElement.focus();
}

/* =========================================================
   CONTROLS  (with iPad blue-selection fix)
   ========================================================= */
function setupControls() {
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.webkitUserSelect = "none";

  // Block the blue selection / context menu everywhere
  const blockSelection = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  canvas.addEventListener("contextmenu", blockSelection);
  document.addEventListener("selectstart", blockSelection);

  const controlButtons = document.querySelectorAll("[data-control]");
  const speedButtons = document.querySelectorAll("[data-speed]");

  for (const button of speedButtons) {
    button.addEventListener("click", () => setSpeedMode(button.dataset.speed));
  }

  uiToggle.addEventListener("click", () => {
    if (cinematicMode) {
      setCinematicMode(false);
      setUIMenuVisible(true);
      return;
    }
    setUIMenuVisible(!uiMenuVisible);
  });

  northButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setNorthHeading();
  });

  $("labels-toggle").addEventListener("click", () => setPlanetLabelsVisible(!planetLabelsVisible));
  $("orbits-toggle").addEventListener("click", () => setOrbitLinesVisible(!orbitLinesVisible));
  $("distance-toggle").addEventListener("click", () => setDistanceVisible(!distanceVisible));
  $("cinematic-toggle").addEventListener("click", () => setCinematicMode(!cinematicMode));

  // Flight buttons – strong iPad protection
  for (const button of controlButtons) {
    const controlName = button.dataset.control;

    const release = (e) => {
      e.preventDefault();
      e.stopPropagation();
      pressedControls.delete(controlName);
      button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      pressedControls.add(controlName);
      button.classList.add("is-pressed");
      try { button.setPointerCapture(e.pointerId); } catch {}
    });

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      pressedControls.delete(controlName);
      button.classList.remove("is-pressed");
    });
    button.addEventListener("contextmenu", blockSelection);
  }

  // Camera look + pinch
  canvas.addEventListener("pointerdown", (e) => {
    if (!gameStarted || (e.pointerType === "mouse" && e.button !== 0)) return;

    if (e.pointerType === "touch") {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size === 2 && currentSpeedMode === "creator") {
        beginCreatorPinch();
        return;
      }
      if (activeTouchPointers.size > 1) {
        dragging = false;
        return;
      }
    }

    if (creatorPinching) return;

    dragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && activeTouchPointers.has(e.pointerId)) {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size === 2 && currentSpeedMode === "creator") {
        updateCreatorPinch();
        return;
      }
    }

    if (!dragging || !gameStarted || creatorPinching) return;

    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    yaw -= dx * lookSensitivity;
    pitch -= dy * lookSensitivity;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    camera.rotation.set(pitch, yaw, 0);
  });

  const stopDragging = (e) => {
    if (e && e.pointerType === "touch") {
      activeTouchPointers.delete(e.pointerId);
      if (activeTouchPointers.size < 2) endCreatorPinch();
    }
    if (activeTouchPointers.size === 0) dragging = false;
  };

  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("lostpointercapture", stopDragging);

  // Keyboard
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const allKeys = Object.values(controlKeys).flat();
    if (allKeys.includes(key)) {
      e.preventDefault();
      pressedKeys.add(key);
    }
  });

  window.addEventListener("keyup", (e) => {
    pressedKeys.delete(e.key.toLowerCase());
  });

  window.addEventListener("blur", () => {
    pressedControls.clear();
    pressedKeys.clear();
    controlButtons.forEach((b) => b.classList.remove("is-pressed"));
    resetCreatorPinch();
  });
}

/* =========================================================
   STARTUP
   ========================================================= */
startButton.addEventListener("click", startGame);

try {
  createSolarSystem();
  loadingScreen.hidden = true;
  startScreen.hidden = false;
} catch (error) {
  console.error("Could not initialize the Solar System game:", error);
  showError("The 3D scene could not be initialized. Please check that WebGL is available and reload the page.\n\n" + error.message);
}

setupControls();
animate();
