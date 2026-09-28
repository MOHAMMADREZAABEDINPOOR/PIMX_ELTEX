/**
 * Dynamic Day/Night Cycle & Atmospheric Weather System
 * Features sun/moon orbits, rain particle systems, lightning flashes, fog, and dynamic shadows.
 */
class WeatherSystem {
  constructor(scene, city, camera) {
    this.scene = scene;
    this.city = city;
    this.camera = camera;

    // Time of day (0.0 to 24.0 hours)
    this.timeOfDay = 14.0; // Starts at 2:00 PM
    this.timeSpeed = 0.05; // ~8 minutes for full 24h cycle
    this.isTimePaused = false;

    // Weather states: 'CLEAR', 'SUNSET', 'NIGHT', 'STORM'
    this.currentWeather = 'CLEAR';

    // Lighting setup
    this.setupLighting();

    // Rain Particle System
    this.setupRainSystem();

    // Storm & Lightning state
    this.lightningTimer = 0;
    this.lightningOverlay = document.getElementById('lightning-flash');

    // Sky background
    this.scene.background = new THREE.Color(0x70a0e0);
    this.scene.fog = new THREE.FogExp2(0x70a0e0, 0.0035);
  }

  setupLighting() {
    // 1. Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x202225, 0.5);
    this.scene.add(this.hemiLight);

    // 3. Directional Sunlight / Moonlight
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;

    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
  }

  setupRainSystem() {
    const rainCount = 2400;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      velocities[i] = 35 + Math.random() * 20; // Fall speed
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainVelocities = velocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.28,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setPreset(preset) {
    switch (preset) {
      case 'NOON':
        this.timeOfDay = 12.0;
        this.currentWeather = 'CLEAR';
        break;
      case 'SUNSET':
        this.timeOfDay = 18.5;
        this.currentWeather = 'SUNSET';
        break;
      case 'NIGHT':
        this.timeOfDay = 23.5;
        this.currentWeather = 'NIGHT';
        break;
      case 'STORM':
        this.timeOfDay = 16.0;
        this.currentWeather = 'STORM';
        break;
    }
  }

  update(dt, playerPos) {
    // 1. Advance time of day
    if (!this.isTimePaused) {
      this.timeOfDay = (this.timeOfDay + dt * this.timeSpeed) % 24;
    }

    // 2. Celestial Coordinates (Sun angle)
    // 6.0 = Sunrise, 12.0 = Noon, 18.0 = Sunset, 24.0 = Midnight
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDist = 200;

    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 80;

    this.sunLight.position.set(playerPos.x + sunX, Math.max(sunY, -20), playerPos.z + sunZ);
    this.sunLight.target.position.copy(playerPos);

    // 3. Lighting Color & Night Intensity
    const isNight = this.timeOfDay < 5.5 || this.timeOfDay > 19.5;
    const isSunset = (this.timeOfDay >= 17.5 && this.timeOfDay <= 19.5) || (this.timeOfDay >= 5.0 && this.timeOfDay <= 6.5);
    const isStorm = this.currentWeather === 'STORM';

    let skyColor, fogColor, sunColor, ambientIntensity;

    if (isStorm) {
      skyColor = new THREE.Color(0x2a323d);
      fogColor = new THREE.Color(0x222830);
      sunColor = new THREE.Color(0x778899);
      ambientIntensity = 0.35;
      this.city.setNightIntensity(0.85); // Turn on streetlights & windows during storm
    } else if (isNight) {
      // Midnight Neon
      skyColor = new THREE.Color(0x06080e);
      fogColor = new THREE.Color(0x0a0e18);
      sunColor = new THREE.Color(0x334466); // Moonlight
      ambientIntensity = 0.2;
      this.city.setNightIntensity(1.0);
    } else if (isSunset) {
      // Golden / Fiery Sunset
      skyColor = new THREE.Color(0xda5535);
      fogColor = new THREE.Color(0x994433);
      sunColor = new THREE.Color(0xff8844);
      ambientIntensity = 0.65;
      this.city.setNightIntensity(0.5);
    } else {
      // Crisp Bright Day
      skyColor = new THREE.Color(0x6ba4e8);
      fogColor = new THREE.Color(0x7fb1ee);
      sunColor = new THREE.Color(0xffffff);
      ambientIntensity = 0.75;
      this.city.setNightIntensity(0.0);
    }

    // Apply colors smoothly
    this.scene.background.lerp(skyColor, dt * 2);
    this.scene.fog.color.lerp(fogColor, dt * 2);
    this.scene.fog.density = isStorm ? 0.009 : (isNight ? 0.005 : 0.0035);
    this.sunLight.color.lerp(sunColor, dt * 2);
    this.ambientLight.intensity = ambientIntensity;

    // 4. Rain Particles and Audio
    if (isStorm) {
      this.rainParticles.visible = true;
      window.soundEngine.setRainIntensity(1.0);
      this.updateRainParticles(dt, playerPos);
      this.handleLightning(dt);
    } else {
      this.rainParticles.visible = false;
      window.soundEngine.setRainIntensity(0.0);
    }

    // Update HUD Clock
    if (window.game && window.game.ui) {
      window.game.ui.updateEnvironment(this.timeOfDay, this.currentWeather);
    }
  }

  updateRainParticles(dt, playerPos) {
    const posAttr = this.rainParticles.geometry.attributes.position;
    const arr = posAttr.array;
    const count = arr.length / 3;

    // Follow player center
    this.rainParticles.position.set(playerPos.x, 0, playerPos.z);

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= this.rainVelocities[i] * dt;
      // Wrap when hitting ground
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 45 + Math.random() * 10;
        arr[i * 3] = (Math.random() - 0.5) * 120;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
    }
    posAttr.needsUpdate = true;
  }

  handleLightning(dt) {
    this.lightningTimer += dt;
    if (this.lightningTimer > 8.0 + Math.random() * 10.0) {
      this.lightningTimer = 0;
      this.flashLightning();
    }
  }

  flashLightning() {
    if (!this.lightningOverlay) return;
    // Screen flash
    this.lightningOverlay.style.opacity = '0.9';
    setTimeout(() => {
      if (this.lightningOverlay) this.lightningOverlay.style.opacity = '0';
    }, 80);
    setTimeout(() => {
      if (this.lightningOverlay) this.lightningOverlay.style.opacity = '0.6';
    }, 140);
    setTimeout(() => {
      if (this.lightningOverlay) this.lightningOverlay.style.opacity = '0';
    }, 220);

    // Audio thunder boom
    window.soundEngine.playThunder();
  }
}
