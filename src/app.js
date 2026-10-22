const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d");
// Draw directly: canvas frames are presented together by the browser.
const bufferContext = context;
const scrollTrack = document.querySelector("#scrollTrack");
const logo = document.querySelector(".demo-logo");
const logoStage = document.querySelector(".logo-stage");
const orbitSpheres = [...document.querySelectorAll(".orbit-sphere")];
const atomBall = document.createElement("span");
atomBall.className = "atom-ball";
atomBall.setAttribute("aria-hidden", "true");
document.querySelector(".orbit-one").appendChild(atomBall);
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
let lastRenderTime = 0;
let animationId = 0, introReady = false;
let sphereHideRequested = false;
const SCROLL_PIXELS_PER_SECOND = 897.9227136;
let logoTravel = 0, logoLeftX = 0, logoRightX = 0;
let logoInkLeft = 0, logoInkRight = 1;
let flipClock = 0, flipStart = null, nextFlip = 30 + Math.random() * 30;
const flipReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let letterOffsets = [], trackWidth = 0, viewportWidth = 0, tickerBounds = null;

function createOrbitSpheres() {
  const palette = ["cyan", "violet", "lime", "orange"];
  // Keep solid sphere bodies above every visual effect, outside the logo's layer.
  const sphereLayer = document.createElement("div");
  sphereLayer.className = "sphere-layer";
  sphereLayer.setAttribute("aria-hidden", "true");
  document.querySelector(".demo-frame").appendChild(sphereLayer);
  orbitSpheres.forEach(sphere => sphereLayer.appendChild(sphere));
  for (let index = orbitSpheres.length; index < 5; index += 1) {
    const sphere = document.createElement("span");
    sphere.className = `orbit-sphere sphere-${palette[index % palette.length]}`;
    sphere.setAttribute("aria-hidden", "true");
    sphereLayer.appendChild(sphere);
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
    sphere.style.zIndex = "3";
    sphere.style.opacity = "1";
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
      if (state.sphere.style.display !== "block") state.sphere.style.display = "block";
    });
  } else if (spheresVisible && sphereTime >= sphereHideAt) {
    sphereHideRequested = true;
  }
  sphereStates.forEach((state) => {
    if (!spheresVisible) {
      if (state.sphere.style.display !== "none") state.sphere.style.display = "none";
      return;
    }
    state.sphere.style.display = "block";
    state.x += state.vx * delta;
    const upperLimit = window.innerHeight / 6 - state.radius;
    const lowerLimit = -window.innerHeight / 2 + state.radius;
    state.y = Math.max(lowerLimit, Math.min(upperLimit, state.baseY + Math.sin(frame * 0.028 + state.wavePhase) * state.waveAmplitude));
    if (state.x < -halfWidth - state.radius) state.exited = true;
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
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * scale;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function createStars() {
  stars.length = 0;
  const count = Math.min(520, Math.max(300, Math.floor(window.innerWidth * window.innerHeight / 2800)));
  for (let index = 0; index < count; index += 1) {
    stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, depth: Math.random(), speed: 0.7 + Math.random() * 2.4, twinkle: Math.random() * Math.PI * 2 });
  }
}

function drawStars(delta) {
  bufferContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

  nextStarTwist -= delta;
  if (nextStarTwist <= 0) {
    starTwistDirection = Math.random() > 0.5 ? 1 : -1;
    nextStarTwist = 150 + Math.random() * 260;
  }
  starTwist += starTwistDirection * 0.0018 * delta;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const cosTwist = Math.cos(starTwist);
  const sinTwist = Math.sin(starTwist);
  for (const star of stars) {
    star.depth -= star.speed * 0.006 * delta;
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
    let inkLeft = imageCanvas.width, inkRight = 0;
    for (let index = 0; index < data.length; index += 4) {
      const brightness = Math.max(data[index], data[index + 1], data[index + 2]);
      if (brightness < 18) data[index + 3] = 0;
      else {
        const x = (index / 4) % imageCanvas.width;
        inkLeft = Math.min(inkLeft, x);
        inkRight = Math.max(inkRight, x + 1);
      }
    }
    if (inkRight > inkLeft) {
      logoInkLeft = inkLeft / imageCanvas.width;
      logoInkRight = inkRight / imageCanvas.width;
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
  measureScroller();
}

function updateLogoFlip(delta) {
  flipClock += delta / 60;
  if (flipReducedMotion.matches) {
    flipStart = null;
    nextFlip = flipClock + 30 + Math.random() * 30;
    logo.style.transform = "none";
    return;
  }
  if (flipStart === null && flipClock >= nextFlip) {
    flipStart = flipClock;
    nextFlip = flipClock + 30 + Math.random() * 30;
  }
  if (flipStart === null) return;
  const progress = Math.min(1, (flipClock - flipStart) / 1.6);
  const eased = progress * progress * (3 - 2 * progress);
  logo.style.transform = `rotateX(${eased * 360}deg)`;
  if (progress === 1) {
    flipStart = null;
    logo.style.transform = "none";
  }
}

function animate(now) {
  animationId = 0;
  if (document.hidden || paused || !introReady) return;
  const delta = lastRenderTime ? Math.min((now - lastRenderTime) / (1000 / 60), 6) : 0;
  lastRenderTime = now;
  lastTime = now;
  if (!paused) {
    frame += delta;
    const atomPhase = flipReducedMotion.matches ? 0 : frame * Math.PI * 2 / 480;
    atomBall.style.left = `${50 + 50 * Math.cos(atomPhase)}%`;
    atomBall.style.top = `${50 + 50 * Math.sin(atomPhase)}%`;
    drawStars(delta);
    const travelProgress = (1 + Math.sin(frame * 0.01)) / 2;
    const horizontalBounce = logoLeftX + (logoRightX - logoLeftX) * travelProgress;
    const verticalBounce = Math.cos(frame * 0.032) * 18;
    logo.style.translate = `${horizontalBounce}px ${verticalBounce}px`;
    updateLogoFlip(delta);
    updateSpheres(delta);
    if (scrollWaitingUntil && performance.now() >= scrollWaitingUntil) {
      scrollPosition = viewportWidth;
      scrollWaitingUntil = 0;
    } else if (!scrollWaitingUntil) {
      scrollPosition -= SCROLL_PIXELS_PER_SECOND * delta / 60;
      if (scrollPosition < -trackWidth) {
        scrollPosition = -trackWidth;
        scrollWaitingUntil = performance.now() + 10000;
      }
    }
    scrollTrack.style.transform = `translate3d(${scrollPosition}px, 0, 0)`;
    // Animate only the letters crossing the viewport.
    let low = 0, high = letterOffsets.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (letterOffsets[middle] + scrollPosition < -320) low = middle + 1;
      else high = middle;
    }
    for (let index = low; index < scrollLetters.length; index += 1) {
      if (letterOffsets[index] + scrollPosition > viewportWidth + 320) break;
      const wave = Math.sin(frame * 0.075 + index * 0.34) * 50;
      scrollLetters[index].style.transform = `translate3d(0, ${wave}px, 0)`;
    }
  }
  animationId = requestAnimationFrame(animate);
}

function syncAnimation() {
  cancelAnimationFrame(animationId);
  animationId = 0;
  lastRenderTime = 0;
  if (introReady && !paused && !document.hidden) animationId = requestAnimationFrame(animate);
}

async function loadScrollText() {
  try {
    const response = await fetch("src/scrolltext.txt");
    if (!response.ok) throw new Error("Scroll text unavailable");
    setScrollText(`${(await response.text()).trim().replace(/\s+/g, " ")}     âœ¦     `);
    scrollPosition = scrollTrack.parentElement.offsetWidth;
  } catch {
    setScrollText("WELCOME TO THE MYSTIX DEMO     âœ¦     AMIGA 500 ON THE DESK, DISKS SPINNING, MONITOR HUMMING, WAITING FOR THE NEXT DEMO TO LOAD     âœ¦     GREETINGS TO THE CODERS, GRAPHICS ARTISTS, MUSICIANS, SWAPPERS, AND EVERYONE WHO MADE A SMALL COMPUTER FEEL LIKE A PORTAL     âœ¦     KEEP THE SCENE MOVING     ");
  }
}

function measureLogoTravel() {
  const viewportWidth = document.documentElement.clientWidth;
  const style = getComputedStyle(logo);
  const scaleX = parseFloat(style.scale) || 1;
  logo.style.maxWidth = `${Math.max(1, viewportWidth / scaleX)}px`;
  const rect = logo.getBoundingClientRect();
  const currentX = parseFloat(style.translate) || 0;
  const aspect = logo.naturalWidth && logo.naturalHeight ? logo.naturalWidth / logo.naturalHeight : 1;
  const contentWidth = Math.min(logo.clientWidth, logo.clientHeight * aspect) * scaleX;
  const contentLeft = rect.left - currentX + (rect.width - contentWidth) / 2;
  // Reverse when the visible lettering reaches the edge, ignoring empty padding.
  logoLeftX = -(contentLeft + contentWidth * logoInkLeft);
  logoRightX = viewportWidth - (contentLeft + contentWidth * logoInkRight);
  logoTravel = (logoRightX - logoLeftX) / 2;
}

function measureScroller() {
  viewportWidth = scrollTrack.parentElement.offsetWidth;
  trackWidth = scrollTrack.offsetWidth;
  const start = scrollTrack.getBoundingClientRect().left;
  letterOffsets = scrollLetters.map(letter => letter.getBoundingClientRect().left - start);
  tickerBounds = scrollTrack.parentElement.getBoundingClientRect();
}

function finishIntro() {
  window.setTimeout(() => {
    decompressionScreen.classList.add("is-complete");
    window.setTimeout(() => {
      decompressionScreen.hidden = true;
      introReady = true;
      syncAnimation();
    }, 100);
  }, 400); // 400ms decrunching + 100ms fade = 500ms total.
}

window.addEventListener("resize", () => { resizeCanvas(); createStars(); measureScroller(); measureLogoTravel(); });
document.fonts.ready.then(() => { measureScroller(); measureLogoTravel(); });
logo.addEventListener("load", measureLogoTravel);
document.addEventListener("visibilitychange", syncAnimation);
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  paused = !paused;
  syncAnimation();
});

resizeCanvas();
createStars();
createOrbitSpheres();
initializeSphereMotion();
removeLogoBackground();
loadScrollText();
finishIntro();

