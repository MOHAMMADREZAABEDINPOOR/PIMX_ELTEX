/**
 * METROPOLIS 3D - Main Application Coordinator
 * Bootstraps Three.js scene, coordinates all subsystems, manages render loop,
 * binds HUD controls, and displays live performance telemetry.
 */

class MetropolisApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.canvas = document.getElementById('city-canvas');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Systems
    this.audio = null;
    this.lighting = null;
    this.weather = null;
    this.city = null;
    this.traffic = null;
    this.pedestrians = null;
    this.cameraDirector = null;

    // Telemetry
    this.fpsCounter = document.getElementById('fps-metric');
    this.vehicleMetric = document.getElementById('vehicles-metric');
    this.timeMetric = document.getElementById('time-metric');
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();

    this.init();
  }

  init() {
    // 1. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      2500
    );

    // 2. WebGL Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Initialize Audio
    this.audio = new CityAudio();

    // 4. Initialize Lighting Engine
    this.lighting = new LightingSystem(this.scene, this.renderer);

    // 5. Initialize Weather Engine
    this.weather = new WeatherSystem(this.scene, this.lighting, this.audio);

    // 6. Initialize City Builder
    this.city = new CityBuilder(this.scene, this.lighting, this.weather);

    // 7. Initialize Traffic & Pedestrian Engines
    this.traffic = new TrafficSystem(this.scene, this.city, this.lighting);
    this.pedestrians = new PedestrianSystem(this.scene, this.city, this.weather);

    // 8. Initialize Camera Director
    this.cameraDirector = new CameraDirector(this.camera, this.canvas, this.city, this.traffic);

    // 9. Bind UI Controls
    this.bindUI();

    // 10. Handle Window Resizing
    window.addEventListener('resize', () => this.onResize());

    // 11. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // 12. Dismiss Loading Screen
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.classList.add('fade-out');
      }
      this.cameraDirector.showCinematicBanner('Metropolis Skyline Vista');
    }, 600);
  }

  bindUI() {
    // Time of Day Presets
    const timeBtns = document.querySelectorAll('[data-time]');
    const timeSlider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-slider-val');

    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.dataset.time;
        this.lighting.setPreset(preset);
        if (timeSlider) {
          timeSlider.value = this.lighting.timeOfDay;
          this.updateTimeDisplay(this.lighting.timeOfDay);
        }
      });
    });

    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.lighting.updateTime(val);
        this.updateTimeDisplay(val);
        timeBtns.forEach(b => b.classList.remove('active'));
      });
    }

    // Weather Buttons
    const weatherBtns = document.querySelectorAll('[data-weather]');
    weatherBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        weatherBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const weather = btn.dataset.weather;
        this.weather.setWeather(weather);
      });
    });

    // Camera Mode Buttons
    const camBtns = document.querySelectorAll('[data-cam]');
    camBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        camBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.cam;
        this.cameraDirector.setMode(mode);
      });
    });

    // Cinematic Shot Carousel Buttons
    const shotBtns = document.querySelectorAll('.shot-btn');
    shotBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        shotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cameraDirector.setShot(idx);
        // Switch to cinematic mode if not already
        if (this.cameraDirector.mode !== 'cinematic') {
          this.cameraDirector.setMode('cinematic');
          camBtns.forEach(b => b.classList.toggle('active', b.dataset.cam === 'cinematic'));
        }
      });
    });

    // Audio Mute/Unmute Toggle
    const audioBtn = document.getElementById('audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isSoundOn = this.audio.toggleMute();
        audioBtn.classList.toggle('active', isSoundOn);
      });
    }

    // Hide UI Toggle (or 'H' key)
    const toggleUiBtn = document.getElementById('toggle-ui');
    const uiLayer = document.getElementById('ui-layer');
    if (toggleUiBtn && uiLayer) {
      toggleUiBtn.addEventListener('click', () => {
        uiLayer.classList.toggle('hidden');
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && this.cameraDirector.mode !== 'walk') {
        if (uiLayer) uiLayer.classList.toggle('hidden');
      }
      if (e.code === 'KeyC') {
        // Cycle next cinematic shot
        this.cameraDirector.setShot(this.cameraDirector.activeShotIndex + 1);
      }
    });

    // Fullscreen Toggle
    const fsBtn = document.getElementById('fullscreen-toggle');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  updateTimeDisplay(hours) {
    const timeDisplay = document.getElementById('time-slider-val');
    if (!timeDisplay) return;
    const h = Math.floor(hours);
    const m = Math.floor((hours % 1) * 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    timeDisplay.textContent = `${hh}:${mm}`;

    if (this.timeMetric) {
      this.timeMetric.textContent = `${hh}:${mm}`;
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update Systems
    this.lighting.update(delta);
    this.weather.update(delta);
    this.city.update(delta);
    this.traffic.update(delta);
    this.pedestrians.update(delta);
    this.cameraDirector.update(delta);

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Performance telemetry
    this.updateTelemetry();
  }

  updateTelemetry() {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `${fps} FPS`;
      }
      if (this.vehicleMetric) {
        this.vehicleMetric.textContent = `${this.traffic.vehicles.length} CARS`;
      }
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MetropolisApp();
});
