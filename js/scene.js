import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

let scene, camera, renderer;
let sun;

export function createScene(container) {
  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(
    CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.NEAR,
    CONFIG.FAR
  );

  // 3. Renderer
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? "default" : "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.3 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(renderer.domElement);

  // 4. Soft ambient light
  const hemi = new THREE.HemisphereLight(0x9bb8ff, 0x080810, 0.12);
  scene.add(hemi);

  // 5. Create the Sun
  createSun();

  // 6. Set the starting camera position (far + high)
  setSpawnPosition();

  // Handle resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

function createSun() {
  const sunRadius = 696340 * CONFIG.GAME_UNITS_PER_KM * CONFIG.SOLAR_SYSTEM_SCALE;

  // Main sun sphere
  const geometry = new THREE.SphereGeometry(sunRadius, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa928
  });
  sun = new THREE.Mesh(geometry, material);
  scene.add(sun);

  // Soft glow
  const glowGeometry = new THREE.SphereGeometry(sunRadius * 1.15, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff9a27,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glow);

  // Real light coming from the Sun
  const sunLight = new THREE.PointLight(0xffd69a, 2.5, 0, 2);
  sun.add(sunLight);
}

function setSpawnPosition() {
  // Convert angle to radians
  const angle = THREE.MathUtils.degToRad(CONFIG.SPAWN_HEIGHT_ANGLE);

  // Slight randomness so it feels a bit different each time
  const randomAngle = Math.random() * Math.PI * 2;
  const distance = CONFIG.SPAWN_DISTANCE;

  const x = Math.cos(randomAngle) * distance * Math.cos(angle);
  const y = distance * Math.sin(angle);
  const z = Math.sin(randomAngle) * distance * Math.cos(angle);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0); // Look at the Sun
}

export function getScene() {
  return { scene, camera, renderer, sun };
}
