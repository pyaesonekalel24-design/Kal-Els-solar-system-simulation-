import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

let scene, camera, renderer;

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

  // 3. Renderer (lighter on mobile/iPad)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: isMobile ? "default" : "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.3 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(renderer.domElement);

  // 4. Soft light
  const hemi = new THREE.HemisphereLight(0x9bb8ff, 0x080810, 0.15);
  scene.add(hemi);

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

export function getScene() {
  return { scene, camera, renderer };
}
