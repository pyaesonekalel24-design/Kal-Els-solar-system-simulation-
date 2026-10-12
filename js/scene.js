import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";
import { createMiniSolarSystem } from "./solarSystem.js";

let scene, camera, renderer;
let planets = [];

export function createScene(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);

  camera = new THREE.PerspectiveCamera(
    CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.NEAR,
    CONFIG.FAR
  );

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? "default" : "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.3 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Soft light
  scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x080810, 0.2));

  // Create the mini solar system
  const solar = createMiniSolarSystem(scene);
  planets = solar.planets;

  // Far + high spawn
  setSpawnPosition();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, planets };
}

function setSpawnPosition() {
  const angle = THREE.MathUtils.degToRad(CONFIG.SPAWN_HEIGHT_ANGLE);
  const randomAngle = Math.random() * Math.PI * 2;
  const distance = CONFIG.SPAWN_DISTANCE;

  const x = Math.cos(randomAngle) * distance * Math.cos(angle);
  const y = distance * Math.sin(angle);
  const z = Math.sin(randomAngle) * distance * Math.cos(angle);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

export function getScene() {
  return { scene, camera, renderer, planets };
}
