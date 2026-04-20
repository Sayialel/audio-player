(function () {
  "use strict";

  const BAR_COUNT = 32;
  const SKIP_SEC  = 10;
  const DEMO_FREQ = 440;

  const vizBar       = document.getElementById("vizBar");
  const fileIn       = document.getElementById("fileIn");
  const uploadArea   = document.getElementById("uploadArea");
  const trackTitle   = document.getElementById("trackTitle");
  const trackSub     = document.getElementById("trackSub");
  const statusDot    = document.getElementById("statusDot");
  const progressWrap = document.getElementById("progressWrap");
  const progressFill = document.getElementById("progressFill");
  const progressThumb= document.getElementById("progressThumb");
  const timeCur      = document.getElementById("timeCur");
  const timeDur      = document.getElementById("timeDur");
  const btnPlay      = document.getElementById("btnPlay");
  const iconPlay     = document.getElementById("iconPlay");
  const iconPause    = document.getElementById("iconPause");
  const btnSkipBack  = document.getElementById("btnSkipBack");
  const btnSkipFwd   = document.getElementById("btnSkipFwd");
  const btnMute      = document.getElementById("btnMute");
  const iconVol      = document.getElementById("iconVol");
  const iconMute     = document.getElementById("iconMute");
  const btnLoop      = document.getElementById("btnLoop");
  const btnDemo      = document.getElementById("btnDemo");
  const volSlider    = document.getElementById("volSlider");
  const volVal       = document.getElementById("volVal");
  const speedSlider  = document.getElementById("speedSlider");
  const speedVal     = document.getElementById("speedVal");

  let audio      = null;
  let audioCtx   = null;
  let analyser   = null;
  let sourceNode = null;
  let demoOsc    = null;
  let demoGain   = null;

  let isPlaying  = false;
  let isMuted    = false;
  let isLoop     = false;
  let isDemoMode = false;

  let animFrame  = null;
  let idleHandle = null;

  for (let i = 0; i < BAR_COUNT; i++) {
    const span = document.createElement("span");
    span.style.height = "4px";
    vizBar.appendChild(span);
  }
  const bars = Array.from(vizBar.querySelectorAll("span"));

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function getVolume() {
    return parseInt(volSlider.value, 10) / 100;
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function setupAnalyser(srcNode) {
    ensureAudioContext();
    if (analyser) analyser.disconnect();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    srcNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function animViz() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    bars.forEach((bar, i) => {
      const idx = Math.floor((i * data.length) / BAR_COUNT);
      const val = data[idx] / 255;
      bar.style.height = Math.max(4, val * 44) + "px";
      bar.style.background =
        val > 0.6 ? "#534AB7" : val > 0.3 ? "#7F77DD" : "#AFA9EC";
    });

    animFrame = requestAnimationFrame(animViz);
  }

  function idleViz() {
    cancelAnimationFrame(animFrame);
    const t = Date.now() * 0.001;
    bars.forEach((bar, i) => {
      const h = 4 + Math.sin(i * 0.4) * 3 + Math.sin(i * 0.9 + t) * 2;
      bar.style.height = h + "px";
      bar.style.background = "#D3D1C7";
    });
  }

  function startIdleLoop() {
    idleViz();
    idleHandle = requestAnimationFrame(function loop() {
      if (!isPlaying) {
        idleViz();
        idleHandle = requestAnimationFrame(loop);
      }
    });
  }

  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width  = pct + "%";
    progressThumb.style.left  = pct + "%";
    timeCur.textContent = fmt(audio.currentTime);
    timeDur.textContent = fmt(audio.duration);
    if (isPlaying) requestAnimationFrame(updateProgress);
  }

  function setPlaying(playing) {
    isPlaying = playing;
    iconPlay.style.display  = playing ? "none" : "";
    iconPause.style.display = playing ? "" : "none";
    statusDot.className = "status-dot" + (playing ? " playing" : "");

    if (playing) {
      cancelAnimationFrame(idleHandle);
      animViz();
      updateProgress();
    } else {
      cancelAnimationFrame(animFrame);
      startIdleLoop();
    }
  }

  function loadFile(file) {
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    stopDemo();

    audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.volume       = getVolume();
    audio.playbackRate = parseFloat(speedSlider.value);
    audio.loop         = isLoop;

    ensureAudioContext();
    if (sourceNode) sourceNode.disconnect();
    sourceNode = audioCtx.createMediaElementSource(audio);
    setupAnalyser(sourceNode);

    trackTitle.textContent = file.name.replace(/\.[^.]+$/, "");
    trackSub.textContent   = file.name;
    timeCur.textContent    = "0:00";
    timeDur.textContent    = "0:00";

    audio.addEventListener("ended", () => {
      if (!isLoop) setPlaying(false);
    });

    audio.addEventListener("loadedmetadata", () => {
      timeDur.textContent = fmt(audio.duration);
    });

    setPlaying(false);
  }

  function stopDemo() {
    if (demoOsc) {
      try { demoOsc.stop(); } catch (_) {}
      demoOsc.disconnect();
      demoOsc = null;
    }
    if (demoGain) {
      demoGain.disconnect();
      demoGain = null;
    }
    isDemoMode = false;
  }

  function playDemo() {
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    stopDemo();
    ensureAudioContext();

    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.connect(audioCtx.destination);
    }

    demoGain = audioCtx.createGain();
    demoGain.gain.value = getVolume() * 0.3;

    demoOsc = audioCtx.createOscillator();
    demoOsc.type = "sine";
    demoOsc.frequency.value = DEMO_FREQ;
    demoOsc.connect(demoGain);
    demoGain.connect(analyser);

    demoOsc.start();
    isDemoMode = true;

    trackTitle.textContent = "Demo tone â€” A4 (440 Hz)";
    trackSub.textContent   = "Synthesised via Web Audio API";
    timeCur.textContent    = "0:00";
    timeDur.textContent    = "âˆž";

    setPlaying(true);
  }

  btnPlay.addEventListener("click", () => {
    if (isDemoMode) {
      if (isPlaying) { stopDemo(); setPlaying(false); }
      else { playDemo(); }
      return;
    }
    if (!audio) return;
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

    if (isPlaying) { audio.pause(); setPlaying(false); }
    else           { audio.play();  setPlaying(true);  }
  });

  btnDemo.addEventListener("click", () => {
    if (isDemoMode && isPlaying) { stopDemo(); setPlaying(false); return; }
    playDemo();
  });

  btnSkipBack.addEventListener("click", () => {
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - SKIP_SEC);
    updateProgress();
  });

  btnSkipFwd.addEventListener("click", () => {
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + SKIP_SEC);
    updateProgress();
  });

  btnMute.addEventListener("click", () => {
    isMuted = !isMuted;
    if (audio) audio.muted = isMuted;
    if (demoGain) demoGain.gain.value = isMuted ? 0 : getVolume() * 0.3;

    iconVol.style.display  = isMuted ? "none" : "";
    iconMute.style.display = isMuted ? "" : "none";
    btnMute.classList.toggle("active-state", isMuted);
  });

  btnLoop.addEventListener("click", () => {
    isLoop = !isLoop;
    if (audio) audio.loop = isLoop;
    btnLoop.classList.toggle("active-state", isLoop);
  });

  fileIn.addEventListener("change", (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });

  uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) loadFile(file);
  });

  volSlider.addEventListener("input", () => {
    const v = parseInt(volSlider.value, 10);
    volVal.textContent = v + "%";
    if (audio && !isMuted) audio.volume = v / 100;
    if (demoGain && !isMuted) demoGain.gain.value = (v / 100) * 0.3;
  });

  speedSlider.addEventListener("input", () => {
    const v = parseFloat(speedSlider.value);
    speedVal.textContent = v.toFixed(1) + "Ã—";
    if (audio) audio.playbackRate = v;
  });

  progressWrap.addEventListener("click", (e) => {
    if (!audio || !audio.duration) return;
    const rect = progressWrap.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(audio.duration, pct * audio.duration));
    updateProgress();
  });

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    switch (e.code || e.key) {
      case "Space":
        e.preventDefault();
        btnPlay.click();
        break;
      case "KeyM":
        btnMute.click();
        break;
      case "KeyL":
        btnLoop.click();
        break;
      case "ArrowLeft":
        e.preventDefault();
        btnSkipBack.click();
        break;
      case "ArrowRight":
        e.preventDefault();
        btnSkipFwd.click();
        break;
      case "ArrowUp":
        e.preventDefault();
        volSlider.value = Math.min(100, parseInt(volSlider.value, 10) + 5);
        volSlider.dispatchEvent(new Event("input"));
        break;
      case "ArrowDown":
        e.preventDefault();
        volSlider.value = Math.max(0, parseInt(volSlider.value, 10) - 5);
        volSlider.dispatchEvent(new Event("input"));
        break;
    }
  });

  startIdleLoop();

})();
