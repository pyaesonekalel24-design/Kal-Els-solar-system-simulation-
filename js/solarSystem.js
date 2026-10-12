import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG } from "./config.js";

export function createSolarSystem(scene) {
  const bodies = [];

  // ===================== SUN =====================
  const sunRadius = 696340 * CONFIG.GAME_UNITS_PER_KM * CONFIG.SOLAR_SYSTEM_SCALE * 0.15; // scaled for visibility

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa928 })
  );
  scene.add(sun);

  // Glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius * 1.25, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff9a27,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    })
  );
  scene.add(glow);

  // Real light
  const sunLight = new THREE.PointLight(0xffd69a, 3.5, 0, 2);
  sun.add(sunLight);

  bodies.push({ name: "Sun", mesh: sun, isSun: true });

  // ===================== PLANETS (simple for now) =====================
  const planetList = [
    { name: "Mercury", color: 0xb5b5b5, dist: 0.39, size: 0.38 },
    { name: "Venus",   color: 0xe6c88a, dist: 0.72, size: 0.95 },
    { name: "Earth",   color: 0x4a9eff, dist: 1.00, size: 1.00 },
    { name: "Mars",    color: 0xc1440e, dist: 1.52, size: 0.53 },
    { name: "Jupiter", color: 0xd8b48a, dist: 5.20, size: 11.2 },
    { name: "Saturn",  color: 0xf0d9a0, dist: 9.58, size: 9.4 }
  ];

  const baseDist = 280; // game units for 1 AU in this mini scale

  planetList.forEach((p, i) => {
    const radius = p.size * 6;
    const distance = p.dist * baseDist;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.75,
        metalness: 0.05
      })
    );

    // Starting position
    const angle = (i / planetList.length) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * distance;
    mesh.position.z = Math.sin(angle) * distance;

    scene.add(mesh);

    bodies.push({
      name: p.name,
      mesh,
      distance,
      angle,
      speed: 0.0018 / (p.dist + 0.3)
    });
  });

  return { sun, bodies };
}
