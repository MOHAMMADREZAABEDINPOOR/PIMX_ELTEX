/**
 * METROPOLIS 3D - Cinematic Camera Director & Navigation Engine
 * Choreographed cinematic camera shots, smooth lerp interpolation,
 * Orbit inspection, Street Walker (WASD + mouse look), and Drone fly modes.
 */

class CameraDirector {
  constructor(camera, domElement, cityBuilder, trafficSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.city = cityBuilder;
    this.traffic = trafficSystem;

    // Modes: 'cinematic', 'orbit', 'walk', 'drone'
    this.mode = 'cinematic';

    // Cinematic sequence
    this.activeShotIndex = 0;
    this.autoAdvanceTour = true;
    this.shotTimer = 0;
    this.shotDuration = 10.0; // seconds per shot

    // Target positions and lookAts for smooth lerping
    this.currentCamPos = new THREE.Vector3();
    this.currentTargetPos = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();

    // Orbit Controls instance
    this.orbitControls = null;

    // Walk Mode controls
    this.walkPos = new THREE.Vector3(0, 1.8, 40);
    this.walkYaw = 0;
    this.walkPitch = 0;
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.isPointerLocked = false;

    this.initCinematicShots();
    this.initOrbitControls();
    this.initWalkControls();
  }

  initCinematicShots() {
    this.shots = [
      {
        id: 1,
        name: 'Skyline Vista',
        desc: 'Sweeping panoramic orbit of the entire metropolis horizon',
        update: (t) => {
          const r = 420;
          const speed = 0.08;
          const x = Math.sin(t * speed) * r;
          const z = Math.cos(t * speed) * r;
          const y = 220 + Math.sin(t * speed * 0.5) * 40;
          return {
            pos: new THREE.Vector3(x, y, z),
            lookAt: new THREE.Vector3(0, 70, 0)
          };
        }
      },
      {
        id: 2,
        name: 'Skyscraper Canyon',
        desc: 'Low-altitude glide down a bustling avenue between supertalls',
        update: (t) => {
          const z = -250 + (t * 22) % 500;
          const y = 35 + Math.sin(t * 0.3) * 12;
          return {
            pos: new THREE.Vector3(-18, y, z),
            lookAt: new THREE.Vector3(-18, 55, z + 80)
          };
        }
      },
      {
        id: 3,
        name: 'Intersection Pulse',
        desc: 'Ground-level view of 4-way traffic, pedestrians, and neon billboards',
        update: (t) => {
          const x = -30 + Math.sin(t * 0.2) * 5;
          const z = 30 + Math.cos(t * 0.2) * 5;
          return {
            pos: new THREE.Vector3(x, 4.5, z),
            lookAt: new THREE.Vector3(0, 30, 0)
          };
        }
      },
      {
        id: 4,
        name: 'Taxi Chase Cam',
        desc: 'Dynamic chase camera locked behind a yellow taxicab',
        update: (t) => {
          // Find first taxi
          const taxi = this.traffic.vehicles.find(v => v.type === 'taxi') || this.traffic.vehicles[0];
          if (taxi && taxi.mesh) {
            const tPos = taxi.mesh.position;
            const rotY = taxi.mesh.rotation.y;
            const behindDist = 18;
            const camX = tPos.x - Math.sin(rotY) * behindDist;
            const camZ = tPos.z - Math.cos(rotY) * behindDist;
            return {
              pos: new THREE.Vector3(camX, 6.5, camZ),
              lookAt: new THREE.Vector3(tPos.x, 3.2, tPos.z)
            };
          }
          return { pos: new THREE.Vector3(0, 15, 0), lookAt: new THREE.Vector3(0, 0, 50) };
        }
      },
      {
        id: 5,
        name: 'Central Park Promenade',
        desc: 'Intimate tracking shot past the fountain, trees, and benches',
        update: (t) => {
          const halfSpan = (this.city.gridSize * this.city.totalStride) / 2;
          const parkX = -halfSpan + 2 * this.city.totalStride + this.city.totalStride / 2;
          const parkZ = -halfSpan + 2.5 * this.city.totalStride + this.city.totalStride / 2;
          const z = parkZ - 50 + (t * 8) % 100;
          return {
            pos: new THREE.Vector3(parkX + 12, 3.2, z),
            lookAt: new THREE.Vector3(parkX, 4.0, z + 25)
          };
        }
      },
      {
        id: 6,
        name: 'Supertall Spire Overlook',
        desc: 'Perched high on the crystal spire looking down at ant-like traffic',
        update: (t) => {
          const angle = t * 0.12;
          const r = 45;
          return {
            pos: new THREE.Vector3(Math.cos(angle) * r, 295, Math.sin(angle) * r),
            lookAt: new THREE.Vector3(0, 20, 0)
          };
        }
      },
      {
        id: 7,
        name: 'Golden Hour Glide',
        desc: 'Diagonal high-speed flyby catching sun glints off glass facades',
        update: (t) => {
          const tNorm = (t * 18) % 450;
          const x = -200 + tNorm;
          const z = -200 + tNorm * 0.8;
          return {
            pos: new THREE.Vector3(x, 110, z),
            lookAt: new THREE.Vector3(x + 50, 60, z + 70)
          };
        }
      },
      {
        id: 8,
        name: 'Cyber Neon Boulevard',
        desc: 'Gliding past giant glowing animated LED billboards and storefronts',
        update: (t) => {
          const z = 60 - (t * 14) % 180;
          return {
            pos: new THREE.Vector3(-15, 48, z),
            lookAt: new THREE.Vector3(-42, 55, z - 20)
          };
        }
      }
    ];

    // Initial position
    const init = this.shots[0].update(0);
    this.currentCamPos.copy(init.pos);
    this.lookAtTarget.copy(init.lookAt);
    this.camera.position.copy(init.pos);
    this.camera.lookAt(init.lookAt);
  }

  initOrbitControls() {
    if (window.THREE && window.THREE.OrbitControls) {
      this.orbitControls = new THREE.OrbitControls(this.camera, this.domElement);
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.05;
      this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go below ground
      this.orbitControls.minDistance = 5;
      this.orbitControls.maxDistance = 900;
      this.orbitControls.enabled = false;
    }
  }

  initWalkControls() {
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'walk') return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
    });

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    this.domElement.addEventListener('mousedown', (e) => {
      if (this.mode === 'walk') {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.mode === 'walk' && isMouseDown) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        this.walkYaw -= dx * 0.003;
        this.walkPitch -= dy * 0.003;
        this.walkPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.walkPitch));
      }
    });
  }

  setMode(mode) {
    this.mode = mode;

    if (this.orbitControls) {
      this.orbitControls.enabled = (mode === 'orbit');
    }

    const walkHelper = document.getElementById('walk-instructions');
    if (walkHelper) {
      walkHelper.style.display = (mode === 'walk') ? 'flex' : 'none';
    }

    if (mode === 'walk') {
      this.walkPos.set(0, 2.0, 50);
      this.walkYaw = 0;
      this.walkPitch = 0;
    } else if (mode === 'orbit' && this.orbitControls) {
      this.orbitControls.target.set(0, 40, 0);
      this.orbitControls.update();
    }
  }

  setShot(index) {
    this.activeShotIndex = index % this.shots.length;
    this.shotTimer = 0;
    this.showCinematicBanner(this.shots[this.activeShotIndex].name);
  }

  showCinematicBanner(name) {
    const banner = document.getElementById('cinematic-banner');
    const label = document.getElementById('cinematic-name');
    if (banner && label) {
      label.textContent = name;
      banner.classList.add('show');
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        banner.classList.remove('show');
      }, 3500);
    }
  }

  update(delta) {
    if (this.mode === 'cinematic') {
      this.shotTimer += delta;

      // Auto cycle shots in tour mode
      if (this.autoAdvanceTour && this.shotTimer > this.shotDuration) {
        this.shotTimer = 0;
        this.activeShotIndex = (this.activeShotIndex + 1) % this.shots.length;
        this.showCinematicBanner(this.shots[this.activeShotIndex].name);

        // Update active class on shot buttons
        document.querySelectorAll('.shot-btn').forEach((btn, idx) => {
          btn.classList.toggle('active', idx === this.activeShotIndex);
        });
      }

      const activeShot = this.shots[this.activeShotIndex];
      const targetState = activeShot.update(this.shotTimer);

      // Smooth camera motion
      const lerpSpeed = Math.min(1.0, 4.0 * delta);
      this.currentCamPos.lerp(targetState.pos, lerpSpeed);
      this.lookAtTarget.lerp(targetState.lookAt, lerpSpeed);

      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.lookAtTarget);

    } else if (this.mode === 'orbit') {
      if (this.orbitControls) {
        this.orbitControls.update();
      }
    } else if (this.mode === 'walk') {
      // First-person sidewalk walking
      const walkSpeed = 16.0;
      const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      const moveZ = (this.keys.backward ? 1 : 0) - (this.keys.forward ? 1 : 0);

      const forward = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
      const right = new THREE.Vector3(Math.cos(this.walkYaw), 0, -Math.sin(this.walkYaw));

      if (moveZ !== 0) {
        this.walkPos.addScaledVector(forward, -moveZ * walkSpeed * delta);
      }
      if (moveX !== 0) {
        this.walkPos.addScaledVector(right, moveX * walkSpeed * delta);
      }

      this.walkPos.y = 2.0; // keep at human eye height

      this.camera.position.copy(this.walkPos);
      const lookDir = new THREE.Vector3(
        -Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
        Math.sin(this.walkPitch),
        -Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
      );
      this.camera.lookAt(this.walkPos.clone().add(lookDir));
    }
  }
}

window.CameraDirector = CameraDirector;
