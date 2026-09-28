/**
 * LATE NIGHT CODER - MASTER SVG WORKBENCH
 * Vanilla JS logic for Pan/Zoom, SVG/PNG Export, Lighting Themes, Audio Atmosphere
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const viewportFrame = document.getElementById('viewport-frame');
  const svgWrapper = document.getElementById('svg-wrapper');
  const svgElement = document.getElementById('programmer-scene-svg');
  const zoomIndicator = document.getElementById('zoom-val');
  const inspectTooltip = document.getElementById('inspect-tooltip');
  const toastContainer = document.getElementById('toast-container');

  // State
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let inspectMode = true;
  let animationsEnabled = true;
  let lampEnabled = true;
  let screenGlowEnabled = true;
  let currentTheme = 'midnight';

  // Web Audio Context for synthesized ambiance
  let audioCtx = null;
  let isAudioPlaying = false;
  let rainNoiseNode = null;
  let rainGainNode = null;
  let keyboardInterval = null;

  // ========================================================
  // 1. PAN & ZOOM CONTROLS
  // ========================================================
  function updateTransform() {
    svgWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomIndicator.textContent = `${Math.round(zoom * 100)}%`;
  }

  function setZoom(newZoom, centerX = null, centerY = null) {
    const clampedZoom = Math.min(Math.max(newZoom, 0.5), 4.0);
    if (clampedZoom === zoom) return;

    if (centerX !== null && centerY !== null) {
      const rect = viewportFrame.getBoundingClientRect();
      const mouseX = centerX - rect.left - rect.width / 2;
      const mouseY = centerY - rect.top - rect.height / 2;
      const ratio = clampedZoom / zoom;
      panX = mouseX - (mouseX - panX) * ratio;
      panY = mouseY - (mouseY - panY) * ratio;
    }
    zoom = clampedZoom;
    updateTransform();
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
    showToast('View reset to 100%');
  }

  function fitView() {
    const frameRect = viewportFrame.getBoundingClientRect();
    const aspect = 1600 / 1000;
    const frameAspect = frameRect.width / frameRect.height;
    if (frameAspect > aspect) {
      zoom = frameRect.height / 1000;
    } else {
      zoom = frameRect.width / 1600;
    }
    panX = 0;
    panY = 0;
    updateTransform();
    showToast('Fit to screen');
  }

  // Mouse wheel zoom
  viewportFrame.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setZoom(zoom + delta, e.clientX, e.clientY);
  }, { passive: false });

  // Pan via drag
  viewportFrame.addEventListener('mousedown', (e) => {
    // Only drag with left mouse button
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewportFrame.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      viewportFrame.style.cursor = 'grab';
    }
  });

  // Touch Pan/Pinch Zoom support for touch screens
  let initialTouchDist = null;
  let initialTouchZoom = 1;

  viewportFrame.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      initialTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchZoom = zoom;
    }
  }, { passive: true });

  viewportFrame.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      updateTransform();
    } else if (e.touches.length === 2 && initialTouchDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDist;
      setZoom(initialTouchZoom * ratio);
    }
  }, { passive: true });

  viewportFrame.addEventListener('touchend', () => {
    isDragging = false;
    initialTouchDist = null;
  });

  // Zoom Button Handlers
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(zoom + 0.25));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(zoom - 0.25));
  document.getElementById('btn-zoom-reset')?.addEventListener('click', resetView);
  document.getElementById('btn-zoom-fit')?.addEventListener('click', fitView);

  // Fullscreen toggle
  const btnFullscreen = document.getElementById('btn-fullscreen');
  btnFullscreen?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      viewportFrame.requestFullscreen().catch(err => {
        // Fallback CSS fullscreen
        viewportFrame.classList.toggle('fullscreen');
      });
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      btnFullscreen.classList.add('active');
    } else {
      btnFullscreen.classList.remove('active');
    }
    setTimeout(fitView, 100);
  });

  // ========================================================
  // 2. LAYER HOVER INSPECTION TOOLTIP
  // ========================================================
  const inspectElements = [
    { id: 'primary-monitor', title: 'Ultrawide Curved Monitor', desc: 'Tokyo Night dark IDE with Rust async pipeline & blinking cursor' },
    { id: 'secondary-monitor', title: 'Portrait Analytics Display', desc: 'Live CPU gauges, thread telemetry & event stream' },
    { id: 'mechanical-keyboard', title: 'Custom 65% Mechanical Keyboard', desc: 'RGB backlight, sculpted keycaps & coiled aviator cable' },
    { id: 'layer-programmer', title: 'Full-Stack Developer', desc: 'Seated in focused flow state with noise-canceling headphones' },
    { id: 'desk-lamp', title: 'Architect Balanced-Arm Lamp', desc: 'Warm 3000K amber glow illuminating desk workspace' },
    { id: 'coffee-mug', title: 'Hot Ceramic Coffee Mug', desc: 'Fresh brew with gently drifting steam' },
    { id: 'pc-workstation', title: 'Liquid-Cooled Workstation', desc: 'Tempered glass chassis, RGB fans & RTX GPU' },
    { id: 'layer-office-chair', title: 'Ergonomic Mesh Task Chair', desc: 'Pneumatic gas cylinder, 5-star base & contoured lumbar' },
    { id: 'layer-floor-plant', title: 'Monstera Deliciosa', desc: 'Ceramic planter with fenestrated leaves on wooden stand' },
    { id: 'layer-window', title: 'Night City Panorama', desc: 'Skyscrapers with glowing windows, red radio beacons & crescent moon' },
    { id: 'wall-art', title: 'Retro Synthwave Art', desc: 'Framed neon perspective grid and sunset artwork' },
    { id: 'nixie-clock', title: 'Digital LED Clock', desc: 'Indicating 02:47 AM late night coding session' }
  ];

  const inspectBtn = document.getElementById('btn-inspect-toggle');
  inspectBtn?.addEventListener('click', () => {
    inspectMode = !inspectMode;
    inspectBtn.classList.toggle('active', inspectMode);
    if (!inspectMode) {
      inspectTooltip.style.display = 'none';
    }
    showToast(inspectMode ? 'Inspector Mode: ON' : 'Inspector Mode: OFF');
  });

  inspectElements.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;

    el.style.cursor = 'crosshair';

    el.addEventListener('mouseenter', (e) => {
      if (!inspectMode) return;
      inspectTooltip.innerHTML = `
        <div class="title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          ${item.title}
        </div>
        <div class="desc">${item.desc}</div>
      `;
      inspectTooltip.style.display = 'block';
    });

    el.addEventListener('mousemove', (e) => {
      if (!inspectMode) return;
      const frameRect = viewportFrame.getBoundingClientRect();
      const x = e.clientX - frameRect.left;
      const y = e.clientY - frameRect.top;
      inspectTooltip.style.left = `${x}px`;
      inspectTooltip.style.top = `${y}px`;
    });

    el.addEventListener('mouseleave', () => {
      inspectTooltip.style.display = 'none';
    });
  });

  // ========================================================
  // 3. LIGHTING THEMES & PRESETS
  // ========================================================
  const themes = {
    midnight: {
      name: 'Midnight Flow',
      monitorGlow1: '#38bdf8',
      monitorGlow2: '#818cf8',
      lampColor1: '#fef08a',
      lampColor2: '#f59e0b',
      skyTop: '#040711',
      skyMid: '#0a122c',
      skyBot: '#261b47',
      wallColor: '#121829',
      cursorColor: '#38bdf8'
    },
    cyberpunk: {
      name: 'Neon Cyberpunk',
      monitorGlow1: '#ec4899',
      monitorGlow2: '#06b6d4',
      lampColor1: '#f43f5e',
      lampColor2: '#d946ef',
      skyTop: '#0d021f',
      skyMid: '#240046',
      skyBot: '#ff007f',
      wallColor: '#1a0b2e',
      cursorColor: '#f43f5e'
    },
    warm: {
      name: 'Cozy Lofi Study',
      monitorGlow1: '#fdba74',
      monitorGlow2: '#f59e0b',
      lampColor1: '#fffbeb',
      lampColor2: '#ea580c',
      skyTop: '#08080f',
      skyMid: '#1a162b',
      skyBot: '#3b1d28',
      wallColor: '#1c161f',
      cursorColor: '#fbbf24'
    },
    sunset: {
      name: 'Golden Hour Sunset',
      monitorGlow1: '#f472b6',
      monitorGlow2: '#fb923c',
      lampColor1: '#fed7aa',
      lampColor2: '#d97706',
      skyTop: '#1e1b4b',
      skyMid: '#c026d3',
      skyBot: '#f97316',
      wallColor: '#1f1a28',
      cursorColor: '#f97316'
    },
    matrix: {
      name: 'Matrix Terminal',
      monitorGlow1: '#22c55e',
      monitorGlow2: '#10b981',
      lampColor1: '#86efac',
      lampColor2: '#059669',
      skyTop: '#010f05',
      skyMid: '#03260c',
      skyBot: '#053813',
      wallColor: '#091c0e',
      cursorColor: '#4ade80'
    }
  };

  function applyTheme(themeKey) {
    const t = themes[themeKey];
    if (!t) return;
    currentTheme = themeKey;

    // Update Monitor Glow stops
    const monRad = document.getElementById('monitor-glow-rad');
    if (monRad) {
      monRad.children[0]?.setAttribute('stop-color', t.monitorGlow1);
      monRad.children[1]?.setAttribute('stop-color', t.monitorGlow2);
    }

    // Update Lamp cone stops
    const lampBeam = document.getElementById('lamp-cone-beam');
    if (lampBeam) {
      lampBeam.children[0]?.setAttribute('stop-color', t.lampColor1);
      lampBeam.children[1]?.setAttribute('stop-color', t.lampColor2);
    }

    // Update Sky Gradient stops
    const skyGrad = document.getElementById('sky-gradient');
    if (skyGrad) {
      skyGrad.children[0]?.setAttribute('stop-color', t.skyTop);
      skyGrad.children[1]?.setAttribute('stop-color', t.skyMid);
      skyGrad.children[3]?.setAttribute('stop-color', t.skyBot);
    }

    // Update blinking cursor
    const cursors = document.querySelectorAll('.blinking-cursor');
    cursors.forEach(c => {
      c.setAttribute('fill', t.cursorColor);
    });

    // Update active UI chip
    document.querySelectorAll('.theme-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.theme === themeKey);
    });

    showToast(`Lighting: ${t.name}`);
  }

  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyTheme(chip.dataset.theme);
    });
  });

  // ========================================================
  // 4. QUICK TOGGLES (LAMP, MONITOR GLOW, ANIMATIONS)
  // ========================================================
  // Desk Lamp Toggle
  const toggleLampBtn = document.getElementById('toggle-lamp');
  toggleLampBtn?.addEventListener('click', () => {
    lampEnabled = !lampEnabled;
    toggleLampBtn.classList.toggle('active', lampEnabled);
    const beam = document.querySelector('#desk-lamp polygon');
    const bulbGlow = document.querySelector('#desk-lamp ellipse[rx="140"]');
    if (beam) beam.style.display = lampEnabled ? 'block' : 'none';
    if (bulbGlow) bulbGlow.style.display = lampEnabled ? 'block' : 'none';
    showToast(lampEnabled ? 'Desk Lamp: ON' : 'Desk Lamp: OFF');
  });

  // Screen Ambient Glow Toggle
  const toggleGlowBtn = document.getElementById('toggle-screen-glow');
  toggleGlowBtn?.addEventListener('click', () => {
    screenGlowEnabled = !screenGlowEnabled;
    toggleGlowBtn.classList.toggle('active', screenGlowEnabled);
    const ambientOverlay = document.getElementById('layer-ambient-overlay');
    const screenSpill = document.querySelector('.screen-ambient-pulse');
    if (ambientOverlay) ambientOverlay.style.display = screenGlowEnabled ? 'block' : 'none';
    if (screenSpill) screenSpill.style.display = screenGlowEnabled ? 'block' : 'none';
    showToast(screenGlowEnabled ? 'Monitor Ambient Glow: ON' : 'Monitor Ambient Glow: OFF');
  });

  // Animations Toggle
  const toggleAnimBtn = document.getElementById('toggle-animations');
  toggleAnimBtn?.addEventListener('click', () => {
    animationsEnabled = !animationsEnabled;
    toggleAnimBtn.classList.toggle('active', animationsEnabled);
    const svgStyles = svgElement.querySelector('style');
    if (svgStyles) {
      if (!animationsEnabled) {
        svgStyles.dataset.original = svgStyles.textContent;
        svgStyles.textContent = `* { animation-play-state: paused !important; }`;
      } else {
        svgStyles.textContent = svgStyles.dataset.original || '';
      }
    }
    showToast(animationsEnabled ? 'SVG Animations: Playing' : 'SVG Animations: Paused');
  });

  // ========================================================
  // 5. SYNTHESIZED LO-FI AUDIO ATMOSPHERE (PURE WEB AUDIO API)
  // ========================================================
  // Generates soothing gentle rain noise + realistic soft mechanical keyboard clicks
  function initAudioAtmosphere() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // 1. Synthesize Pink Noise for Soft Rain Atmosphere
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    rainNoiseNode = audioCtx.createBufferSource();
    rainNoiseNode.buffer = noiseBuffer;
    rainNoiseNode.loop = true;

    // Filter to make it sound like gentle rain outside the window
    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 850;

    rainGainNode = audioCtx.createGain();
    rainGainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
    rainGainNode.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 1.5);

    rainNoiseNode.connect(rainFilter);
    rainFilter.connect(rainGainNode);
    rainGainNode.connect(audioCtx.destination);
    rainNoiseNode.start(0);

    // 2. Synthesize subtle gentle mechanical keyboard clicks at natural typing intervals
    keyboardInterval = setInterval(() => {
      if (!isAudioPlaying) return;
      if (Math.random() < 0.7) {
        playKeyboardClick();
      }
    }, 180);
  }

  function playKeyboardClick() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freq = 120 + Math.random() * 80;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  }

  function stopAudioAtmosphere() {
    if (rainGainNode && audioCtx) {
      rainGainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      setTimeout(() => {
        try { rainNoiseNode?.stop(); } catch (e) {}
      }, 800);
    }
    if (keyboardInterval) {
      clearInterval(keyboardInterval);
      keyboardInterval = null;
    }
  }

  const toggleSoundBtn = document.getElementById('toggle-sound');
  toggleSoundBtn?.addEventListener('click', () => {
    isAudioPlaying = !isAudioPlaying;
    toggleSoundBtn.classList.toggle('active', isAudioPlaying);

    if (isAudioPlaying) {
      initAudioAtmosphere();
      showToast('Lofi Rain & Typing Ambiance: Playing');
    } else {
      stopAudioAtmosphere();
      showToast('Lofi Ambiance: Muted');
    }
  });

  // ========================================================
  // 6. SVG EXPORT & DOWNLOAD
  // ========================================================
  function downloadSvg() {
    // Clone SVG to ensure standalone XML correctness
    const clone = svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    // Add XML declaration
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `programmer-room-${currentTheme}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Vector SVG downloaded successfully!');
  }

  document.getElementById('btn-download-svg')?.addEventListener('click', downloadSvg);
  document.getElementById('btn-download-svg-top')?.addEventListener('click', downloadSvg);

  // ========================================================
  // 7. ULTRA-HD PNG EXPORT (CANVAS RENDER)
  // ========================================================
  function downloadPng() {
    showToast('Generating 3200x2000 Ultra-HD PNG...');

    const clone = svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      // Create high-res canvas (2x retina: 3200x2000)
      const canvas = document.createElement('canvas');
      canvas.width = 3200;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d');

      // Draw dark background fallback
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, 3200, 2000);

      canvas.toBlob((pngBlob) => {
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `programmer-room-${currentTheme}-3200x2000.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);

        showToast('Ultra-HD Wallpaper PNG exported!');
      }, 'image/png');
    };
    img.src = url;
  }

  document.getElementById('btn-download-png')?.addEventListener('click', downloadPng);

  // ========================================================
  // 8. VIEW & COPY SVG CODE MODAL
  // ========================================================
  const modalOverlay = document.getElementById('modal-svg-code');
  const svgCodePre = document.getElementById('svg-code-content');
  const btnViewCode = document.getElementById('btn-view-code');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCopyModal = document.getElementById('btn-copy-code-modal');

  function openCodeModal() {
    const clone = svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    const code = serializer.serializeToString(clone);
    svgCodePre.textContent = code;
    modalOverlay.classList.add('open');
  }

  function closeCodeModal() {
    modalOverlay.classList.remove('open');
  }

  btnViewCode?.addEventListener('click', openCodeModal);
  btnCloseModal?.addEventListener('click', closeCodeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeCodeModal();
  });

  btnCopyModal?.addEventListener('click', () => {
    navigator.clipboard.writeText(svgCodePre.textContent).then(() => {
      showToast('SVG Markup copied to clipboard!');
      closeCodeModal();
    });
  });

  // ========================================================
  // 9. TOAST NOTIFICATION HELPER
  // ========================================================
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Initial welcome toast
  setTimeout(() => {
    showToast('Detailed SVG Loaded: 1600 × 1000px Vector Canvas');
  }, 400);
});
