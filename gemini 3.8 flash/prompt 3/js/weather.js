/**
 * METROPOLIS 3D - Weather System
 * Realistic atmospheric effects: Fog, Rain particle dynamics,
 * Wet ground specular reflections, Lightning strikes & Thunder rumbles.
 */

class WeatherSystem {
  constructor(scene, lightingSystem, audioSystem) {
    this.scene = scene;
    this.lighting = lightingSystem;
    this.audio = audioSystem;

    this.currentWeather = 'clear'; // 'clear', 'fog', 'rain', 'storm'

    // Fog references
    this.fog = null;

    // Rain particles
    this.rainMesh = null;
    this.rainCount = 16000;
    this.rainPositions = null;
    this.rainVelocities = null;

    // Road materials list to toggle wet puddle reflections
    this.wetMaterials = [];

    // Lightning dynamics
    this.lightningLight = null;
    this.lightningTimer = 0;
    this.isFlashing = false;

    this.init();
  }

  init() {
    // Setup scene fog
    this.fog = new THREE.FogExp2(0x94a9bf, 0.0008);
    this.scene.fog = this.fog;

    // Lightning directional burst light
    this.lightningLight = new THREE.DirectionalLight(0xdcf0ff, 0);
    this.lightningLight.position.set(200, 800, 200);
    this.scene.add(this.lightningLight);

    this.createRainParticles();
    this.setWeather('clear');
  }

  registerWetMaterial(mat) {
    if (mat && !this.wetMaterials.includes(mat)) {
      this.wetMaterials.push(mat);
    }
  }

  createRainParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const velocities = new Float32Array(this.rainCount);

    const rangeX = 650;
    const rangeZ = 650;
    const heightY = 450;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * rangeX;
      positions[i * 3 + 1] = Math.random() * heightY;
      positions[i * 3 + 2] = (Math.random() - 0.5) * rangeZ;

      velocities[i] = 180 + Math.random() * 90; // Fall speed
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainPositions = positions;
    this.rainVelocities = velocities;

    // Rain material - translucent cyan/white streaks
    const mat = new THREE.PointsMaterial({
      color: 0xcee7fe,
      size: 1.6,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.rainMesh = new THREE.Points(geo, mat);
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
  }

  setWeather(type) {
    this.currentWeather = type;

    // Update audio
    if (this.audio) {
      this.audio.setWeather(type);
    }

    const lensOverlay = document.getElementById('lens-overlay');

    if (type === 'clear') {
      this.fog.density = 0.0007;
      this.rainMesh.material.opacity = 0.0;
      this.rainMesh.visible = false;
      this.setWetness(0.0);
      if (lensOverlay) lensOverlay.classList.remove('rain-active');
    } else if (type === 'fog') {
      this.fog.density = 0.0042; // Dense atmospheric mist
      this.rainMesh.material.opacity = 0.0;
      this.rainMesh.visible = false;
      this.setWetness(0.2);
      if (lensOverlay) lensOverlay.classList.remove('rain-active');
    } else if (type === 'rain') {
      this.fog.density = 0.0022;
      this.rainMesh.material.opacity = 0.55;
      this.rainMesh.visible = true;
      this.setWetness(0.88); // Highly reflective wet asphalt
      if (lensOverlay) lensOverlay.classList.add('rain-active');
    } else if (type === 'storm') {
      this.fog.density = 0.0035;
      this.rainMesh.material.opacity = 0.85;
      this.rainMesh.visible = true;
      this.setWetness(1.0); // Maximum slick puddle sheen
      if (lensOverlay) lensOverlay.classList.add('rain-active');
      this.lightningTimer = 3 + Math.random() * 4;
    }
  }

  setWetness(ratio) {
    // Modify registered materials for realistic wet pavement & asphalt reflection
    this.wetMaterials.forEach(mat => {
      if (mat) {
        if (!mat._originalRoughness) {
          mat._originalRoughness = mat.roughness !== undefined ? mat.roughness : 0.8;
          mat._originalMetalness = mat.metalness !== undefined ? mat.metalness : 0.1;
        }
        mat.roughness = THREE.MathUtils.lerp(mat._originalRoughness, 0.08, ratio);
        mat.metalness = THREE.MathUtils.lerp(mat._originalMetalness, 0.65, ratio);
        mat.needsUpdate = true;
      }
    });
  }

  update(delta) {
    // Dynamic Fog Color synced with time of day
    if (this.fog) {
      if (this.currentWeather === 'storm') {
        this.fog.color.setHex(0x131924);
      } else {
        const nr = this.lighting.nightRatio;
        if (nr < 0.2) {
          // Daytime haze
          this.fog.color.setHex(0xbad2e8);
        } else if (nr < 0.7) {
          // Golden hour haze
          this.fog.color.setHex(0xc97b5e);
        } else {
          // Night fog
          this.fog.color.setHex(0x0a101d);
        }
      }
    }

    // Update Rain Particles
    if (this.rainMesh && this.rainMesh.visible) {
      const positions = this.rainMesh.geometry.attributes.position.array;
      const count = this.rainCount;
      const heightY = 420;
      const windSlant = (this.currentWeather === 'storm' ? 35 : 12) * delta;

      for (let i = 0; i < count; i++) {
        // Fall downwards
        positions[i * 3 + 1] -= this.rainVelocities[i] * delta * (this.currentWeather === 'storm' ? 1.5 : 1.0);
        // Slight wind angle
        positions[i * 3] += windSlant;

        // Reset to top when passing below ground
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = heightY + Math.random() * 40;
          positions[i * 3] = (Math.random() - 0.5) * 650;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 650;
        }
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Lightning Flash Dynamics
    if (this.currentWeather === 'storm') {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.triggerLightning();
        this.lightningTimer = 4 + Math.random() * 7;
      }

      if (this.isFlashing) {
        this.flashDuration -= delta;
        if (this.flashDuration <= 0) {
          this.lightningLight.intensity = 0;
          this.isFlashing = false;
        }
      }
    } else {
      if (this.lightningLight.intensity > 0) {
        this.lightningLight.intensity = 0;
      }
    }
  }

  triggerLightning() {
    this.isFlashing = true;
    this.flashDuration = 0.15;
    this.lightningLight.intensity = 4.2;

    // Secondary flicker
    setTimeout(() => {
      if (this.currentWeather === 'storm') {
        this.lightningLight.intensity = 2.5;
        setTimeout(() => {
          this.lightningLight.intensity = 0;
        }, 60);
      }
    }, 90);

    // Audio thunder effect
    if (this.audio) {
      setTimeout(() => {
        this.audio.playThunder();
      }, 400 + Math.random() * 500); // realistic sound delay
    }
  }
}

window.WeatherSystem = WeatherSystem;
