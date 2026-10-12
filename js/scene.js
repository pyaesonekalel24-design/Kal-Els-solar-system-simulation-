import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";
import { createSolarSystem } from "./solarSystem.js";

let scene, camera, renderer;
let bodies = [];

export function createScene(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);

  camera = new THREE.PerspectiveCamera(
    CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.NEAR,
    CONFIG.FAR
  );
  camera.rotation.order = "YXZ";

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 900;

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? "default" : "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  container.appendChild(renderer.domElement);

  // Soft light
  scene.add(new THREE.HemisphereLight(0x8eb4ff, 0x0a0a12, 0.2));

  // Create solar system
  const solar = createSolarSystem(scene);
  bodies = solar.bodies;

  // Spawn far and high
  setInitialSpawn();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, bodies };
}

function setInitialSpawn() {
  const angle = THREE.MathUtils.degToRad(CONFIG.SPAWN_HEIGHT_ANGLE);
  const randomYaw = Math.random() * Math.PI * 2;
  const dist = CONFIG.SPAWN_DISTANCE;

  const x = Math.cos(randomYaw) * dist * Math.cos(angle);
  const y = dist * Math.sin(angle);
  const z = Math.sin(randomYaw) * dist * Math.cos(angle);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

export function getSceneObjects() {
  return { scene, camera, renderer, bodies };
}
