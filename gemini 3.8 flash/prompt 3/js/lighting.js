/**
 * METROPOLIS 3D - Realistic Lighting & Day/Night Celestial Engine
 * Calculates physical sun/moon arcs, atmospheric color gradients,
 * dynamic shadows, environment reflections, and city nocturnal illumination.
 */

class LightingSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Time of day in hours (0.00 to 24.00)
    // Default to Golden Hour / Sunset (18.2) for maximum immediate visual impact!
    this.timeOfDay = 17.8;
    this.isAutoCycling = false;
    this.cycleSpeed = 0.05; // hours per second

    // Sky Dome & Horizon
    this.skyMesh = null;
    this.envTexture = null;

    // Core Lights
    this.sunLight = null;
    this.hemiLight = null;
    this.ambientLight = null;

    // Visual elements
    this.sunOrb = null;
    this.moonOrb = null;
    this.starField = null;

    // Callbacks for night-lighting triggers (streetlights, building emissives)
    this.nightRatio = 0; // 0 = full daylight, 1 = midnight
    this.onLightingUpdate = null;

    this.init();
  }

  init() {
    // Configure renderer shadow parameters
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Hemisphere light for atmospheric ambient
    this.hemiLight = new THREE.HemisphereLight(0xbadfff, 0x3d352e, 0.6);
    this.scene.add(this.hemiLight);

    // Directional celestial light (Sun / Moon)
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1600;
    this.sunLight.shadow.bias = -0.0003;

    // Shadow frustum covering the core metropolitan area
    const shadowDist = 420;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(this.sunLight);

    // Additional subtle ambient fill
    this.ambientLight = new THREE.AmbientLight(0x223344, 0.25);
    this.scene.add(this.ambientLight);

    this.createSkyDome();
    this.createCelestialOrbs();
    this.createStarField();

    this.updateTime(this.timeOfDay);
  }

  createSkyDome() {
    // Large hemisphere sky dome with custom gradient canvas
    const skyGeo = new THREE.SphereGeometry(1800, 32, 24);
    
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 1024;
    this.skyCanvas.height = 512;
    this.skyCtx = this.skyCanvas.getContext('2d');

    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.mapping = THREE.EquirectangularReflectionMapping;

    const skyMat = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    // Also use this texture for scene reflections on glass windows!
    this.scene.environment = this.skyTexture;
  }

  createCelestialOrbs() {
    // Glowing Sun Disc
    const sunGeo = new THREE.SphereGeometry(22, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    this.sunOrb = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunOrb);

    // Glowing Moon Disc
    const moonGeo = new THREE.SphereGeometry(16, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddedff });
    this.moonOrb = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonOrb);
  }

  createStarField() {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars over the upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.1); // upper hemisphere
      const radius = 1750;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.5,
      transparent: true,
      opacity: 0
    });

    this.starField = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starField);
  }

  /**
   * Updates time of day (0 to 24)
   */
  updateTime(hours) {
    this.timeOfDay = ((hours % 24) + 24) % 24;

    // Calculate solar elevation angle (-1 to 1)
    // Noon at 12:00 -> angle 1.0; Midnight at 0:00 -> angle -1.0
    // Sunrise ~ 6:00, Sunset ~ 18:00
    const timeNorm = (this.timeOfDay - 6) / 12; // 0 at 6am, 1 at 6pm
    const solarAngle = Math.sin(timeNorm * Math.PI);
    const azimuth = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;

    const sunDistance = 1100;
    const sunX = Math.cos(azimuth) * sunDistance;
    const sunY = Math.sin(solarAngle) * sunDistance;
    const sunZ = Math.sin(azimuth) * 450; // slight angle to grid

    // Position Sun and Moon
    this.sunOrb.position.set(sunX, Math.max(sunY, -300), sunZ);
    this.moonOrb.position.set(-sunX, Math.max(-sunY, -300), -sunZ);

    // Calculate night ratio (0 = full day, 1 = full night)
    if (this.timeOfDay >= 6.5 && this.timeOfDay <= 17.5) {
      this.nightRatio = 0; // Pure day
    } else if (this.timeOfDay >= 19.5 || this.timeOfDay <= 4.5) {
      this.nightRatio = 1; // Pure night
    } else if (this.timeOfDay > 17.5 && this.timeOfDay < 19.5) {
      this.nightRatio = (this.timeOfDay - 17.5) / 2.0; // Sunset transition
    } else {
      this.nightRatio = 1 - (this.timeOfDay - 4.5) / 2.0; // Sunrise transition
    }

    // Dynamic celestial light adjustments
    const isDay = sunY > 0;

    if (isDay) {
      this.sunLight.position.set(sunX, sunY, sunZ);
      this.sunLight.visible = true;

      // Color interpolation: Sunrise (gold/orange) -> Noon (bright warm white) -> Sunset (fiery coral)
      if (this.timeOfDay < 9) {
        // Sunrise
        const t = (this.timeOfDay - 5.5) / 3.5;
        this.sunLight.color.setRGB(1.0, 0.65 + t * 0.3, 0.35 + t * 0.6);
        this.sunLight.intensity = 1.2 + t * 0.6;
        this.hemiLight.color.setRGB(0.9, 0.7, 0.6);
        this.hemiLight.groundColor.setRGB(0.2, 0.15, 0.15);
      } else if (this.timeOfDay > 16.5) {
        // Sunset / Golden Hour
        const t = (this.timeOfDay - 16.5) / 2.5;
        this.sunLight.color.setRGB(1.0, 0.95 - t * 0.55, 0.9 - t * 0.8);
        this.sunLight.intensity = 1.8 - t * 0.8;
        this.hemiLight.color.setRGB(0.95 - t * 0.4, 0.7 - t * 0.4, 0.55);
        this.hemiLight.groundColor.setRGB(0.25 - t * 0.15, 0.18 - t * 0.1, 0.18);
      } else {
        // Midday Crisp Sunlight
        this.sunLight.color.setRGB(1.0, 0.98, 0.94);
        this.sunLight.intensity = 1.85;
        this.hemiLight.color.setRGB(0.72, 0.85, 1.0);
        this.hemiLight.groundColor.setRGB(0.22, 0.2, 0.18);
      }
      this.ambientLight.intensity = 0.25;
    } else {
      // Moon / Night Mode
      this.sunLight.position.set(-sunX, -sunY, -sunZ);
      this.sunLight.color.setRGB(0.35, 0.48, 0.75); // Pale moonlight
      this.sunLight.intensity = 0.35;
      this.hemiLight.color.setRGB(0.08, 0.12, 0.2);
      this.hemiLight.groundColor.setRGB(0.02, 0.03, 0.05);
      this.ambientLight.intensity = 0.35;
    }

    // Stars visibility
    this.starMat.opacity = Math.pow(this.nightRatio, 1.8) * 0.95;

    // Orbs visibility
    this.sunOrb.visible = sunY > -50;
    this.moonOrb.visible = -sunY > -50;

    // Redraw sky dome gradient
    this.renderSkyGradient();

    // Trigger update callback for building windows, street lamps, and vehicle headlights
    if (this.onLightingUpdate) {
      this.onLightingUpdate(this.nightRatio, this.timeOfDay);
    }
  }

  renderSkyGradient() {
    const ctx = this.skyCtx;
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);

    if (this.timeOfDay >= 10 && this.timeOfDay <= 16) {
      // Midday Sky
      grad.addColorStop(0.0, '#1052a0'); // Deep blue zenith
      grad.addColorStop(0.45, '#3a8ee6'); // Azure mid
      grad.addColorStop(0.65, '#99cbfb'); // Light horizon
      grad.addColorStop(0.85, '#dbeafe'); // Warm haze
      grad.addColorStop(1.0, '#475569'); // Ground horizon blend
    } else if (this.timeOfDay > 16 && this.timeOfDay <= 19.5) {
      // Sunset / Golden hour / Twilight
      const t = (this.timeOfDay - 16) / 3.5;
      grad.addColorStop(0.0, this.lerpColor('#1e1b4b', '#090d1a', t)); // Twilight violet
      grad.addColorStop(0.3, this.lerpColor('#4338ca', '#1e1b4b', t));
      grad.addColorStop(0.55, this.lerpColor('#f43f5e', '#6d28d9', t)); // Crimson / magenta
      grad.addColorStop(0.72, this.lerpColor('#fb923c', '#d97706', t)); // Golden orange
      grad.addColorStop(0.85, this.lerpColor('#fde047', '#b45309', t)); // Sun haze
      grad.addColorStop(1.0, '#1e293b');
    } else if (this.timeOfDay >= 5 && this.timeOfDay < 10) {
      // Sunrise / Dawn
      const t = (this.timeOfDay - 5) / 5.0;
      grad.addColorStop(0.0, this.lerpColor('#090d1a', '#1052a0', t));
      grad.addColorStop(0.3, this.lerpColor('#1e1b4b', '#3a8ee6', t));
      grad.addColorStop(0.6, this.lerpColor('#db2777', '#7dd3fc', t));
      grad.addColorStop(0.75, this.lerpColor('#f97316', '#bae6fd', t));
      grad.addColorStop(0.88, this.lerpColor('#fde047', '#fef08a', t));
      grad.addColorStop(1.0, '#334155');
    } else {
      // Midnight / Nocturnal
      grad.addColorStop(0.0, '#020308'); // Deep space
      grad.addColorStop(0.5, '#050a16'); // Dark blue atmosphere
      grad.addColorStop(0.75, '#0a1426'); // Distant city light pollution horizon
      grad.addColorStop(0.9, '#0d1d36');
      grad.addColorStop(1.0, '#020617');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle atmospheric clouds
    if (this.timeOfDay > 5 && this.timeOfDay < 20) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.45, 180, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.5, 260, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.skyTexture.needsUpdate = true;
  }

  lerpColor(a, b, amount) {
    const ah = parseInt(a.replace(/#/g, ''), 16);
    const ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const bh = parseInt(b.replace(/#/g, ''), 16);
    const br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + amount * (br - ar));
    const rg = Math.round(ag + amount * (bg - ag));
    const rb = Math.round(ab + amount * (bb - ab));
    return `rgb(${rr},${rg},${rb})`;
  }

  setPreset(preset) {
    switch (preset) {
      case 'sunrise':
        this.updateTime(6.6);
        break;
      case 'day':
        this.updateTime(13.5);
        break;
      case 'sunset':
        this.updateTime(18.2);
        break;
      case 'night':
        this.updateTime(22.8);
        break;
    }
  }

  update(delta) {
    if (this.isAutoCycling) {
      this.updateTime(this.timeOfDay + delta * this.cycleSpeed);
    }
  }
}

window.LightingSystem = LightingSystem;
