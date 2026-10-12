import { createScene } from "./scene.js";

function updateLoading(percent) {
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("loading-text");
  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = `Loading ${percent}%`;
}

function setupModeButtons() {
  const buttons = document.querySelectorAll(".mode-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

async function startGame() {
  document.getElementById("start-screen").hidden = true;
  document.getElementById("loading-screen").hidden = false;

  for (let i = 0; i <= 100; i += 5) {
    updateLoading(i);
    await new Promise((r) => setTimeout(r, 25));
  }

  document.getElementById("loading-screen").hidden = true;
  document.getElementById("top-bar").hidden = false;

  const container = document.getElementById("canvas-container");
  const { scene, camera, renderer, planets } = createScene(container);

  // Very simple mouse look (temporary)
  let isDragging = false;
  let previousMouse = { x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;

  container.addEventListener("pointerdown", (e) => {
    isDragging = true;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - previousMouse.x;
    const dy = e.clientY - previousMouse.y;
    previousMouse.x = e.clientX;
    previousMouse.y = e.clientY;

    yaw -= dx * 0.005;
    pitch -= dy * 0.005;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });

  // Animation loop + simple planet movement
  function animate() {
    requestAnimationFrame(animate);

    // Move planets slowly
    planets.forEach((p) => {
      p.angle += p.speed;
      p.mesh.position.x = Math.cos(p.angle) * p.distance;
      p.mesh.position.z = Math.sin(p.angle) * p.distance;
    });

    renderer.render(scene, camera);
  }
  animate();

  setupModeButtons();
  console.log("Mini solar system running");
}

function init() {
  document.getElementById("start-button").addEventListener("click", startGame);
}

init();
