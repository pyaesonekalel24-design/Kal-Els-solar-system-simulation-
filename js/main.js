import { createScene } from "./scene.js";

// Update the loading bar
function updateLoading(percent) {
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("loading-text");
  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = `Loading ${percent}%`;
}

// Simple mode button switching
function setupModeButtons() {
  const buttons = document.querySelectorAll(".mode-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active from all
      buttons.forEach((b) => b.classList.remove("active"));
      // Add active to the clicked one
      btn.classList.add("active");

      console.log("Switched to mode:", btn.dataset.mode);
    });
  });
}

async function startGame() {
  // Show loading screen
  document.getElementById("start-screen").hidden = true;
  document.getElementById("loading-screen").hidden = false;

  // Fake loading progress (we will make it real later)
  for (let i = 0; i <= 100; i += 5) {
    updateLoading(i);
    await new Promise((r) => setTimeout(r, 30));
  }

  // Hide loading, show game UI
  document.getElementById("loading-screen").hidden = true;
  document.getElementById("top-bar").hidden = false;

  // Create the 3D scene
  const container = document.getElementById("canvas-container");
  const { scene, camera, renderer } = createScene(container);

  // Temporary camera position
  camera.position.set(0, 800, 2500);
  camera.lookAt(0, 0, 0);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Activate mode buttons
  setupModeButtons();

  console.log("Game started!");
}

// When the page loads
function init() {
  // Home screen is already visible
  // Just wait for the user to click START
  document.getElementById("start-button").addEventListener("click", startGame);
}

init();
