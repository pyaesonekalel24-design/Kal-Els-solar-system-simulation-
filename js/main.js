import { createScene } from "./scene.js";

// Update the loading bar
function updateLoading(percent) {
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("loading-text");
  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = `Loading ${percent}%`;
}

async function init() {
  // Simple loading animation for now
  for (let i = 0; i <= 100; i += 10) {
    updateLoading(i);
    await new Promise(r => setTimeout(r, 40));
  }

  // Hide loading screen, show start screen
  document.getElementById("loading-screen").hidden = true;
  document.getElementById("start-screen").hidden = false;

  // When user clicks the START button
  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("start-screen").hidden = true;
    document.getElementById("top-bar").hidden = false;

    // Create the 3D world
    const container = document.getElementById("canvas-container");
    const { scene, camera, renderer } = createScene(container);

    // Temporary camera position (we will improve the spawn later)
    camera.position.set(0, 800, 2500);
    camera.lookAt(0, 0, 0);

    // Start the animation loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    console.log("Scene created successfully!");
  });
}

init();
