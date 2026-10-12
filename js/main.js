import { createScene, setInitialSpawn } from "./scene.js";

function updateLoading(percent) {
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("loading-text");
  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = Math.floor(percent) + "%";
}

function setupModeButtons() {
  const buttons = document.querySelectorAll(".mode-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      console.log("Mode:", btn.dataset.mode);
      // Real mode logic will be added later
    });
  });
}

async function startGame() {
  // Show loading
  document.getElementById("start-screen").hidden = true;
  document.getElementById("loading-screen").hidden = false;

  // Fake progress for now (will become real loading later)
  for (let i = 0; i <= 100; i += 4) {
    updateLoading(i);
    await new Promise(r => setTimeout(r, 22));
  }

  // Hide loading, show UI
  document.getElementById("loading-screen").hidden = true;
  document.getElementById("top-bar").hidden = false;

  // Create 3D world
  const container = document.getElementById("canvas-container");
  const { scene, camera, renderer } = createScene(container);

  // Set far high spawn
  setInitialSpawn();

  // Basic animation loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  setupModeButtons();
  console.log("Kal El's Solar System - core started");
}

function init() {
  document.getElementById("start-button").addEventListener("click", startGame);
}

init();
