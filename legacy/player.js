(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  const title = params.get("title") || "Legacy simulation";
  const width = Math.max(320, Number(params.get("w")) || 960);
  const height = Math.max(240, Number(params.get("h")) || 600);

  const playerShell = document.querySelector("#player");
  const meta = document.querySelector("#meta");
  const titleElement = document.querySelector("#title");

  document.title = title;
  titleElement.textContent = title;

  function showError(message) {
    playerShell.innerHTML = `<p class="error">${message}</p>`;
  }

  if (!src || (!src.startsWith("/flashdev2/") && !src.startsWith("/tt/"))) {
    showError("Missing or invalid simulation path.");
    return;
  }

  meta.textContent = `${src} · ${width}×${height}`;

  const stage = document.createElement("div");
  stage.className = "player-stage";
  stage.style.aspectRatio = `${width} / ${height}`;
  stage.style.maxHeight = `min(78vh, calc(100vw * ${height} / ${width}))`;

  const hint = document.createElement("p");
  hint.className = "player-hint";
  hint.textContent = "Pinch to zoom the page if controls are hard to tap. Rotate for a wider view on phones.";

  playerShell.append(stage, hint);

  function mountPlayer() {
    if (!window.RufflePlayer) {
      showError("Ruffle player failed to load. Check your connection and try again.");
      return;
    }

    window.RufflePlayer.config = {
      autoplay: "on",
      letterbox: "on",
      unmuteOverlay: "visible",
      splashScreen: false
    };

    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();
    player.style.width = "100%";
    player.style.height = "100%";
    stage.append(player);
    player.load(src);
  }

  if (window.RufflePlayer) {
    mountPlayer();
  } else {
    window.addEventListener("load", mountPlayer, { once: true });
  }
})();
