import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

export function createMiniSolarSystem(scene) {
  const planets = [];

  // ---------- SUN ----------
  const sunRadius = 35;
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffa928 })
  );
  scene.add(sun);

  // Glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius * 1.35, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff9a27,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    })
  );
  scene.add(glow);

  // Stronger light
  const light = new THREE.PointLight(0xffe0a0, 4, 0, 2);
  sun.add(light);

  // ---------- PLANETS (bigger + brighter) ----------
  const planetData = [
    { name: "Mercury", color: 0xcccccc, distance: 110, size: 5 },
    { name: "Venus",   color: 0xf0d080, distance: 160, size: 8 },
    { name: "Earth",   color: 0x4a9eff, distance: 220, size: 9 },
    { name: "Mars",    color: 0xe06030, distance: 290, size: 6.5 }
  ];

  planetData.forEach((data, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(data.size, 24, 24),
      new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.1
      })
    );

    const angle = (i / planetData.length) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * data.distance;
    mesh.position.z = Math.sin(angle) * data.distance;

    scene.add(mesh);

    planets.push({
      mesh,
      distance: data.distance,
      speed: 0.004 / (i + 1),
      angle
    });
  });

  return { sun, planets };
}
