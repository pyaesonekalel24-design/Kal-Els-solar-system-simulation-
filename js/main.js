import { createScene } from "./scene.js";

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
  const startScreen = document.getElementById("start-screen");
  const loadingScreen = document.getElementById("loading-screen");
  const topBar = document.getElementById("top-bar");

  startScreen.style.display = "none";
  startScreen.hidden = true;

  loadingScreen.style.display = "flex";
  loadingScreen.hidden = false;

  for (let i = 0; i <= 100; i += 5) {
    updateLoading(i);
    await new Promise(r => setTimeout(r, 25));
  }

  loadingScreen.style.display = "none";
  loadingScreen.hidden = true;

  topBar.style.display = "flex";
  topBar.hidden = false;

  const container = document.getElementById("canvas-container");
  const { scene, camera, renderer, bodies } = createScene(container);

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
  console.log("Game started");
}

function init() {
  document.getElementById("start-button").addEventListener("click", startGame);
}

init();
