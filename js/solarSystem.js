import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

export function createMiniSolarSystem(scene) {
  const planets = [];

  // ---------- SUN ----------
  const sunRadius = 40; // much smaller for mini version (game-friendly size)
  const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffa928 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sun);

  // Soft glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius * 1.3, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff9a27,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide
    })
  );
  scene.add(glow);

  // Light from the Sun
  const light = new THREE.PointLight(0xffd69a, 3, 0, 2);
  sun.add(light);

  // ---------- SIMPLE PLANETS ----------
  const planetData = [
    { name: "Mercury", color: 0xb5b5b5, distance: 120, size: 3.5 },
    { name: "Venus",   color: 0xe6c07b, distance: 170, size: 5.5 },
    { name: "Earth",   color: 0x4a9eff, distance: 230, size: 6.0 },
    { name: "Mars",    color: 0xc1440e, distance: 300, size: 4.2 }
  ];

  planetData.forEach((data, index) => {
    const geo = new THREE.SphereGeometry(data.size, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Start position on the orbit
    const angle = (index / planetData.length) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * data.distance;
    mesh.position.z = Math.sin(angle) * data.distance;

    scene.add(mesh);

    planets.push({
      mesh,
      distance: data.distance,
      speed: 0.003 / (index + 1), // slower for outer planets
      angle
    });
  });

  return { sun, planets };
}
