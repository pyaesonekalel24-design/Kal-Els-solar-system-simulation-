import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

let scene, camera, renderer;

export function createScene(container) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);

  // Camera
  camera = new THREE.PerspectiveCamera(
    CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.NEAR,
    CONFIG.FAR
  );
  camera.rotation.order = "YXZ";

  // Renderer (mobile-friendly)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                   window.innerWidth < 900;

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? "default" : "high-performance",
    alpha: false
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  container.appendChild(renderer.domElement);

  // Soft fill light
  const hemi = new THREE.HemisphereLight(0x8eb4ff, 0x0a0a12, 0.18);
  scene.add(hemi);

  // Resize handler
  window.addEventListener("resize", onResize);

  return { scene, camera, renderer };
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getSceneObjects() {
  return { scene, camera, renderer };
}

// Temporary spawn (will be improved when planets exist)
export function setInitialSpawn() {
  const angle = THREE.MathUtils.degToRad(CONFIG.SPAWN_HEIGHT_ANGLE);
  const randomYaw = Math.random() * Math.PI * 2;
  const dist = CONFIG.SPAWN_DISTANCE;

  const x = Math.cos(randomYaw) * dist * Math.cos(angle);
  const y = dist * Math.sin(angle);
  const z = Math.sin(randomYaw) * dist * Math.cos(angle);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}
