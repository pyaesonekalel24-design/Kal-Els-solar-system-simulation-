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
    });
  });
}

async function startGame() {
  console.log("START clicked");

  // Force hide start screen
  const startScreen = document.getElementById("start-screen");
  startScreen.style.display = "none";
  startScreen.hidden = true;

  // Force show loading
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen.style.display = "flex";
  loadingScreen.hidden = false;

  // Loading progress
  for (let i = 0; i <= 100; i += 5) {
    updateLoading(i);
    await new Promise(r => setTimeout(r, 30));
  }

  // Hide loading
  loadingScreen.style.display = "none";
  loadingScreen.hidden = true;

  // Show top bar
  const topBar = document.getElementById("top-bar");
  topBar.style.display = "flex";
  topBar.hidden = false;

  // Create 3D scene
  const container = document.getElementById("canvas-container");
  const { scene, camera, renderer, bodies } = createScene(container);
  setInitialSpawn();

   function animate() {
    requestAnimationFrame(animate);

    // Move planets
    bodies.forEach(b => {
      if (b.isSun) return;
      b.angle += b.speed;
      b.mesh.position.x = Math.cos(b.angle) * b.distance;
      b.mesh.position.z = Math.sin(b.angle) * b.distance;
    });

    renderer.render(scene, camera);
  }
  
  animate();

  setupModeButtons();
  console.log("Game fully started");
}

function init() {
  const btn = document.getElementById("start-button");
  if (btn) {
    btn.addEventListener("click", startGame);
    console.log("Start button ready");
  } else {
    console.error("Start button not found!");
  }
}

init();
