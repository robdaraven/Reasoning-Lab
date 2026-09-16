const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d");
const bufferCanvas = document.createElement("canvas");
const bufferContext = bufferCanvas.getContext("2d");
const scrollTrack = document.querySelector("#scrollTrack");
const logo = document.querySelector(".demo-logo");
const logoStage = document.querySelector(".logo-stage");
const orbitSpheres = [...document.querySelectorAll(".orbit-sphere")];
const sphereStates = [];
const stars = [];
const decompressionScreen = document.querySelector("#decompressionScreen");
let scrollLetters = [];
let frame = 0;
let paused = false;
let scrollPosition = 0;
let scrollWaitingUntil = 0;
let lastTime = 0;
let starTwist = 0;
let starTwistDirection = 1;
let nextStarTwist = 0;
let sphereMode = "random";
let randomSceneTime = 0;
let sphereTime = 0;
let spheresVisible = false;
let nextSphereShow = 10000 + Math.random() * 10000;
let sphereHideAt = 0;
let targetFps = 60;
let frameInterval = 1000 / targetFps;
let lastRenderTime = 0;
let refreshProbeStart = 0;
let refreshProbeFrames = 0;
let sphereHideRequested = false;
let ambientAudioContext = null;

function createOrbitSpheres() {
  const palette = ["cyan", "violet", "lime", "orange"];
  for (let index = orbitSpheres.length; index < 5; index += 1) {
    const sphere = document.createElement("span");
    sphere.className = `orbit-sphere sphere-${palette[index % palette.length]}`;
    sphere.setAttribute("aria-hidden", "true");
    logoStage.appendChild(sphere);
    orbitSpheres.push(sphere);
  }
}

function initializeSphereMotion() {
  sphereStates.length = 0;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scrollerLetterSize = parseFloat(getComputedStyle(scrollTrack).fontSize) || 120;
  orbitSpheres.forEach((sphere, index) => {
    const radius = Math.max(19, scrollerLetterSize * (0.352 - index * 0.0096));
    sphere.style.width = `${radius * 2}px`;
    sphere.style.height = `${radius * 2}px`;
    sphere.style.backgroundSize = `${radius}px ${radius}px`;
    const baseY = Math.random() * (height * (2 / 3) - radius * 2) - height / 2 + radius;
    sphereStates.push({
      x: Math.random() * width - width / 2,
      y: baseY,
      baseY,
      wavePhase: Math.random() * Math.PI * 2,
      waveAmplitude: 10 + Math.random() * 26,
      vx: -(0.64 + Math.random() * 1.92),
      vy: 0,
      targetVx: (Math.random() - 0.5) * 2.6,
      targetVy: (Math.random() - 0.5) * 2.6,
      nextTurn: 900 + Math.random() * 2200,
      nextDepth: 0,
      front: false,
      depthMode: "behind",
      radius,
      exited: false,
      sphere
    });
  });
}

function updateSpheres(delta) {
  const halfWidth = window.innerWidth / 2;
  sphereTime += delta * 16.67;
  if (!spheresVisible && sphereTime >= nextSphereShow) {
    spheresVisible = true;
    sphereHideAt = sphereTime + 5000 + Math.random() * 5000;
    sphereHideRequested = false;
    sphereStates.forEach((state) => {
      state.x = halfWidth + state.radius + Math.random() * window.innerWidth * 0.35;
      state.exited = false;
      state.sphere.style.display = "block";
    });
  } else if (spheresVisible && sphereTime >= sphereHideAt) {
    sphereHideRequested = true;
  }
  sphereStates.forEach((state) => {
    if (!spheresVisible) {
      state.sphere.style.display = "none";
      return;
    }
    state.sphere.style.display = "block";
    state.x += state.vx * delta;
    const upperLimit = window.innerHeight / 6 - state.radius;
    const lowerLimit = -window.innerHeight / 2 + state.radius;
    state.y = Math.max(lowerLimit, Math.min(upperLimit, state.baseY + Math.sin(frame * 0.028 + state.wavePhase) * state.waveAmplitude));
    if (state.x < -halfWidth - state.radius) state.exited = true;
    state.sphere.style.width = `${state.radius * 2}px`;
    state.sphere.style.height = `${state.radius * 2}px`;
    state.sphere.style.backgroundSize = `${state.radius}px ${state.radius}px`;
    state.sphere.style.zIndex = "0";
    state.sphere.style.opacity = "1";
    state.sphere.style.backgroundPosition = `${state.x * 0.25}px ${state.y * 0.25}px`;
    state.sphere.style.transform = `translate3d(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px), 0)`;
  });
  if (sphereHideRequested && sphereStates.every((state) => state.exited)) {
    spheresVisible = false;
    sphereHideRequested = false;
    nextSphereShow = sphereTime + 10000 + Math.random() * 10000;
  }
}

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * scale;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  bufferCanvas.width = window.innerWidth * scale;
  bufferCanvas.height = window.innerHeight * scale;
  bufferContext.setTransform(scale, 0, 0, scale, 0, 0);
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function createStars() {
  stars.length = 0;
  const count = Math.min(520, Math.max(300, Math.floor(window.innerWidth * window.innerHeight / 2800)));
  for (let index = 0; index < count; index += 1) {
    stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, depth: Math.random(), speed: 0.7 + Math.random() * 2.4, twinkle: Math.random() * Math.PI * 2 });
  }
}

function drawStars() {
  bufferContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawRasterField();
  nextStarTwist -= 1;
  if (nextStarTwist <= 0) {
    starTwistDirection = Math.random() > 0.5 ? 1 : -1;
    nextStarTwist = 150 + Math.random() * 260;
  }
  starTwist += starTwistDirection * 0.0018;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const cosTwist = Math.cos(starTwist);
  const sinTwist = Math.sin(starTwist);
  for (const star of stars) {
    star.depth -= star.speed * 0.006;
    if (star.depth < 0.04) {
      star.depth = 1;
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
    }
    const perspective = 0.18 / star.depth;
    const rotatedX = star.x * cosTwist - star.y * sinTwist;
    const rotatedY = star.x * sinTwist + star.y * cosTwist;
    const x = centerX + rotatedX * window.innerWidth * perspective;
    const y = centerY + rotatedY * window.innerHeight * perspective;
    const alpha = Math.min(1, 0.3 + perspective * 0.48) * (0.72 + Math.sin(frame * 0.025 + star.twinkle) * 0.2);
    const size = Math.min(0.9, 0.25 + perspective * 0.55);
    const hue = (205 + frame * 0.08 + star.twinkle * 18) % 360;
    if (x < -20 || x > window.innerWidth + 20 || y < -20 || y > window.innerHeight + 20) {
      star.depth = 1;
      continue;
    }
    if (size > 1.2) {
      const glow = bufferContext.createRadialGradient(x, y, 0, x, y, size * 5);
      glow.addColorStop(0, `hsla(${hue}, 100%, 72%, ${alpha * 0.82})`);
      glow.addColorStop(1, `hsla(${hue}, 100%, 52%, 0)`);
      bufferContext.fillStyle = glow;
      bufferContext.fillRect(x - size * 5, y - size * 5, size * 10, size * 10);
    }
    bufferContext.fillStyle = `hsla(${hue}, 100%, 66%, ${alpha})`;
    bufferContext.fillRect(x, y, size, size);
  }
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.drawImage(bufferCanvas, 0, 0, window.innerWidth, window.innerHeight);
}

function drawRasterField() {
  const ticker = document.querySelector(".scroll-window");
  const tickerBounds = ticker.getBoundingClientRect();
  const width = window.innerWidth;
  const bands = 8;
  for (let band = 0; band < bands; band += 1) {
    const baseY = tickerBounds.top + tickerBounds.height * (0.08 + band * 0.12);
    const wave = Math.sin(frame * 0.06 + band * 0.9) * 5;
    const hue = 190 + ((band * 24 + frame * 0.35) % 170);
    const gradient = bufferContext.createLinearGradient(0, baseY - 8, width, baseY + 8);
    gradient.addColorStop(0, `hsla(${hue}, 100%, 62%, 0)`);
    gradient.addColorStop(0.18, `hsla(${hue}, 100%, 62%, .26)`);
    gradient.addColorStop(.5, `hsla(${hue + 22}, 100%, 72%, .82)`);
    gradient.addColorStop(.82, `hsla(${hue}, 100%, 62%, .26)`);
    gradient.addColorStop(1, `hsla(${hue}, 100%, 62%, 0)`);
    bufferContext.save();
    bufferContext.translate(0, wave);
    bufferContext.fillStyle = gradient;
    bufferContext.shadowBlur = 22;
    bufferContext.shadowColor = `hsl(${hue}, 100%, 62%)`;
    bufferContext.fillRect(0, baseY, width, 7);
    bufferContext.restore();
  }
}

function removeLogoBackground() {
  const source = new Image();
  source.src = "src/logo.jpeg";
  source.onload = () => {
    const imageCanvas = document.createElement("canvas");
    const imageContext = imageCanvas.getContext("2d");
    imageCanvas.width = source.naturalWidth;
    imageCanvas.height = source.naturalHeight;
    imageContext.drawImage(source, 0, 0);
    const pixels = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const { data } = pixels;
    for (let index = 0; index < data.length; index += 4) {
      const brightness = Math.max(data[index], data[index + 1], data[index + 2]);
      if (brightness < 18) data[index + 3] = 0;
    }
    imageContext.putImageData(pixels, 0, 0);
    const transparentLogo = imageCanvas.toDataURL("image/png");
    document.querySelectorAll(".demo-logo, .logo-color-slices img").forEach((image) => {
      image.src = transparentLogo;
    });
  };
}

function setScrollText(text) {
  scrollTrack.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const character of text) {
    const letter = document.createElement("span");
    letter.className = "scroll-letter";
    letter.textContent = character === " " ? "\u00a0" : character;
    fragment.appendChild(letter);
  }
  scrollTrack.appendChild(fragment);
  scrollLetters = [...scrollTrack.children];
}

function animate(now) {
  if (!refreshProbeStart) refreshProbeStart = now;
  refreshProbeFrames += 1;
  if (now - refreshProbeStart >= 1000) {
    const measuredFps = refreshProbeFrames * 1000 / (now - refreshProbeStart);
    targetFps = [24, 30, 60, 90, 128].reduce((selected, option) => option <= measuredFps + 4 ? option : selected, 24);
    frameInterval = 1000 / targetFps;
    refreshProbeStart = now;
    refreshProbeFrames = 0;
  }
  if (lastRenderTime && now - lastRenderTime < frameInterval) {
    requestAnimationFrame(animate);
    return;
  }
  const delta = lastRenderTime ? Math.min((now - lastRenderTime) / 16.67, 2) : 1;
  lastRenderTime = now;
  lastTime = now;
  if (!paused) {
    frame += 1;
    drawStars();
    const horizontalBounce = Math.sin(frame * 0.024) * 12;
    const verticalBounce = Math.cos(frame * 0.032) * 4;
    logo.style.transform = `translate3d(${horizontalBounce}px, ${verticalBounce}px, 0) rotate(${Math.sin(frame * 0.01) * 0.12}deg)`;
    updateSpheres(delta);
    if (scrollWaitingUntil && performance.now() >= scrollWaitingUntil) {
      scrollPosition = scrollTrack.parentElement.offsetWidth;
      scrollWaitingUntil = 0;
    } else if (!scrollWaitingUntil) {
      scrollPosition -= 5.28;
      if (scrollPosition < -scrollTrack.offsetWidth) {
        scrollPosition = -scrollTrack.offsetWidth;
        scrollWaitingUntil = performance.now() + 10000;
      }
    }
    scrollTrack.style.transform = `translateX(${scrollPosition}px)`;
    scrollLetters.forEach((letter, index) => {
      const wave = Math.sin(frame * 0.075 + index * 0.34) * 50;
      letter.style.transform = `translateY(${wave}px)`;
    });
  }
  requestAnimationFrame(animate);
}

async function loadScrollText() {
  try {
    const response = await fetch("src/scrolltext.txt");
    if (!response.ok) throw new Error("Scroll text unavailable");
    setScrollText(`${(await response.text()).trim().replace(/\s+/g, " ")}     ✦     `);
    scrollPosition = scrollTrack.parentElement.offsetWidth;
  } catch {
    setScrollText("WELCOME TO THE MYSTIX DEMO     ✦     AMIGA 500 ON THE DESK, DISKS SPINNING, MONITOR HUMMING, WAITING FOR THE NEXT DEMO TO LOAD     ✦     GREETINGS TO THE CODERS, GRAPHICS ARTISTS, MUSICIANS, SWAPPERS, AND EVERYONE WHO MADE A SMALL COMPUTER FEEL LIKE A PORTAL     ✦     KEEP THE SCENE MOVING     ");
  }
}

function runPerformanceCheck() {
  return new Promise((resolve) => {
    const sampleStart = performance.now();
    let samples = 0;
    const sample = (now) => {
      samples += 1;
      if (now - sampleStart < 8400) {
        requestAnimationFrame(sample);
        return;
      }
      const measuredFps = samples * 1000 / (now - sampleStart);
      targetFps = [24, 30, 60, 90, 128].reduce((selected, option) => option <= measuredFps + 4 ? option : selected, 24);
      frameInterval = 1000 / targetFps;
      refreshProbeStart = now;
      refreshProbeFrames = 0;
      decompressionScreen.classList.add("is-complete");
      window.setTimeout(() => {
        decompressionScreen.hidden = true;
        resolve();
      }, 600);
    };
    requestAnimationFrame(sample);
  });
}

function startAmbientAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const audioContext = new AudioContext();
    ambientAudioContext = audioContext;
    const master = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    master.gain.value = 0.12;
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.connect(audioContext.destination);
    master.connect(compressor);
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) noiseData[index] = Math.random() * 2 - 1;
    const playNoise = (time, duration, frequency, volume, type = "bandpass") => {
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      source.buffer = noiseBuffer;
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = type === "highpass" ? 0.7 : 1.2;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      source.connect(filter).connect(gain).connect(master);
      source.start(time);
      source.stop(time + duration + 0.02);
    };
    const playTone = (time, frequency, duration, volume, type = "square") => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);
    };
    const playLead = (time, frequency, duration) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const vibrato = audioContext.createOscillator();
      const vibratoGain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency * 0.92, time);
      oscillator.frequency.linearRampToValueAtTime(frequency * 1.08, time + duration * 0.42);
      oscillator.frequency.linearRampToValueAtTime(frequency * 0.86, time + duration);
      vibrato.type = "sine";
      vibrato.frequency.value = 7.2;
      vibratoGain.gain.setValueAtTime(frequency * 0.045, time);
      vibrato.connect(vibratoGain).connect(oscillator.frequency);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.075, time + duration * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      oscillator.connect(gain).connect(master);
      vibrato.start(time);
      oscillator.start(time);
      vibrato.stop(time + duration + 0.03);
      oscillator.stop(time + duration + 0.03);
    };
    const bassPattern = [55, 55, 73.42, 82.41, 55, 65.41, 73.42, 98, 55, 55, 73.42, 82.41, 110, 98, 73.42, 65.41, 65.41, 65.41, 82.41, 98, 65.41, 73.42, 82.41, 110, 73.42, 73.42, 98, 110, 73.42, 82.41, 98, 123.47];
    const leadPattern = [220, 0, 261.63, 293.66, 0, 329.63, 293.66, 0, 220, 246.94, 0, 293.66, 329.63, 0, 261.63, 0, 196, 0, 246.94, 293.66, 0, 369.99, 329.63, 0, 261.63, 293.66, 0, 392, 329.63, 0, 293.66, 0];
    const padChords = [[110, 130.81, 164.81], [98, 123.47, 146.83], [82.41, 103.83, 123.47], [123.47, 146.83, 185]];
    const stepLength = 60 / 112 / 4;
    let nextStepTime = audioContext.currentTime + 0.08;
    let step = 0;
    const schedule = () => {
      while (nextStepTime < audioContext.currentTime + 0.12) {
        if (step % 16 === 0 || step % 16 === 7 || step % 16 === 10) {
          const kick = audioContext.createOscillator();
          const kickGain = audioContext.createGain();
          kick.type = "sine";
          kick.frequency.setValueAtTime(145, nextStepTime);
          kick.frequency.exponentialRampToValueAtTime(48, nextStepTime + 0.16);
          kickGain.gain.setValueAtTime(0.7, nextStepTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, nextStepTime + 0.22);
          kick.connect(kickGain).connect(master);
          kick.start(nextStepTime);
          kick.stop(nextStepTime + 0.24);
        }
        if (step % 16 === 4 || step % 16 === 12) playNoise(nextStepTime, 0.16, 1700, 0.32);
        if (step % 2 === 1 || step % 16 === 10) playNoise(nextStepTime, step % 4 === 3 ? 0.055 : 0.035, 6500, 0.12, "highpass");
        if (step % 16 === 0) {
          padChords[Math.floor(step / 16) % padChords.length].forEach((frequency, chordIndex) => {
            playTone(nextStepTime, frequency, stepLength * 15, 0.022 - chordIndex * 0.003, "triangle");
          });
        }
        playTone(nextStepTime, bassPattern[step % 32], step % 4 === 3 ? stepLength * 1.7 : stepLength * 0.72, 0.16, "sawtooth");
        if (leadPattern[step % 32]) playLead(nextStepTime + stepLength * 0.08, leadPattern[step % 32], step % 8 === 2 ? stepLength * 1.35 : stepLength * 0.55);
        step += 1;
        nextStepTime += stepLength;
      }
    };
    window.setInterval(schedule, 25);
    schedule();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch {
    // Autoplay or audio output may be unavailable; the visual demo still runs.
  }
}

function resumeAmbientAudio() {
  if (ambientAudioContext?.state === "suspended") ambientAudioContext.resume().catch(() => {});
}

window.addEventListener("resize", () => { resizeCanvas(); createStars(); });
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  paused = !paused;
  resumeAmbientAudio();
});
window.addEventListener("pointerdown", resumeAmbientAudio, { passive: true });
window.addEventListener("touchstart", resumeAmbientAudio, { passive: true });

resizeCanvas();
createStars();
createOrbitSpheres();
initializeSphereMotion();
removeLogoBackground();
loadScrollText();
startAmbientAudio();
runPerformanceCheck().then(() => requestAnimationFrame(animate));
