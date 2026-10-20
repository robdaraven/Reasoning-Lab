const introMusic = document.getElementById("intro-music");
const introMusicButton = document.getElementById("intro-music-toggle");
if (introMusic && introMusicButton) {
  let musicEnabled = true;
  introMusic.volume = 0.65;
  function syncMusic() {
    const playing = !introMusic.paused;
    introMusicButton.textContent = playing ? "♫ MUSIC ON" : musicEnabled ? "♫ PLAY MUSIC" : "♫ MUSIC OFF";
    introMusicButton.setAttribute("aria-pressed", String(playing));
    introMusicButton.setAttribute("aria-label", playing ? "Pause Elysium by Jester" : "Play Elysium by Jester");
  }
  function startMusic() {
    if (!musicEnabled || !introMusic.paused) return;
    introMusic.play().then(syncMusic).catch(syncMusic);
  }
  function unlockMusic(event) {
    if (introMusicButton.contains(event.target)) return;
    if (event.type === "keydown" && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    startMusic();
  }
  introMusicButton.addEventListener("click", () => {
    if (!introMusic.paused) {
      musicEnabled = false;
      introMusic.pause();
    } else {
      musicEnabled = true;
      startMusic();
    }
    syncMusic();
  });
  introMusic.addEventListener("playing", syncMusic);
  introMusic.addEventListener("pause", syncMusic);
  introMusic.addEventListener("error", () => {
    introMusicButton.textContent = "♫ RETRY MUSIC";
  });
  document.addEventListener("pointerdown", unlockMusic, {passive: true});
  document.addEventListener("click", unlockMusic);
  document.addEventListener("touchend", unlockMusic, {passive: true});
  window.addEventListener("pageshow", () => { if (musicEnabled) startMusic(); });
  document.addEventListener("keydown", unlockMusic);
  syncMusic();
  startMusic();
}
