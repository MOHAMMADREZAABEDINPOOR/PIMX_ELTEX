/**
 * Apex Metropolis - Core Game Engine
 * Master loop orchestrating Three.js, physics, traffic, pedestrians, police, weather, missions, and input.
 */
class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.container = document.getElementById('game-container');

    this.cash = 2500;
    this.lastTime = performance.now();

    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      horn: false
    };

    // Subsystems
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.physics = null;
    this.city = null;
    this.player = null;
    this.traffic = null;
    this.pedestrians = null;
    this.police = null;
    this.weather = null;
    this.missions = null;
    this.minimap = null;
    this.ui = null;

    this.init();
  }

  init() {
    // 1. Setup Three.js Renderer
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    this.camera.position.set(0, 10, 20);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 2. Initialize Subsystems
    this.physics = new PhysicsEngine(this.scene);
    this.city = new CityBuilder(this.scene, this.physics);
    this.city.buildCity();

    // 3. Spawn Initial Player Vehicle (Exotic Sports Supercar)
    this.initialCar = new Vehicle(this.scene, this.physics, 'supercar', {
      pos: new THREE.Vector3(5, 0, 10),
      yaw: 0,
      color: 0x00d4ff
    });

    // 4. Spawn Player Character
    this.player = new PlayerController(this.scene, this.camera, this.physics, this.city);
    this.player.position.set(0, 0.22, 10);
    this.player.mesh.position.copy(this.player.position);

    // 5. Initialize Traffic, Crowd, Police, Weather, Missions, UI
    this.traffic = new TrafficManager(this.scene, this.physics, this.city);
    this.traffic.init();

    this.pedestrians = new PedestrianManager(this.scene, this.city, this.physics);
    this.pedestrians.init();

    this.police = new PoliceManager(this.scene, this.physics, this.city);
    this.weather = new WeatherSystem(this.scene, this.city, this.camera);
    this.missions = new MissionManager(this.scene, this.city);
    this.minimap = new Minimap('minimap-canvas', this.city);
    this.ui = new UIManager();

    // Initial HUD Cash
    this.ui.updateCash(this.cash);

    // 6. Setup Inputs and Window Events
    this.setupInputListeners();
    window.addEventListener('resize', () => this.onWindowResize());

    // 7. Auto-start first mission prompt after 3s
    setTimeout(() => {
      this.ui.showNotification("Apex Metropolis Active! Press [M] to accept Courier Mission.");
    }, 2500);

    // 8. Start Main Loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      // Audio resume on interaction
      window.soundEngine.init();
      window.soundEngine.resume();

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.input.up = true;
      if (key === 's' || key === 'arrowdown') this.input.down = true;
      if (key === 'a' || key === 'arrowleft') this.input.left = true;
      if (key === 'd' || key === 'arrowright') this.input.right = true;
      if (e.code === 'Space') { this.input.space = true; e.preventDefault(); }
      if (e.shiftKey) this.input.shift = true;
      if (key === 'h') this.input.horn = true;

      // Key Actions
      if (key === 'f' || key === 'e') {
        this.handleVehicleInteract();
      }
      if (key === 'v') {
        this.player.cycleCamera();
      }
      if (key === 'l') {
        if (this.player.inVehicle && this.player.currentVehicle) {
          this.player.currentVehicle.toggleHeadlights();
        }
      }
      if (key === 'r') {
        const station = window.soundEngine.cycleRadio();
        this.ui.updateRadio(station);
      }
      if (key === 'm') {
        if (!this.missions.activeMission) {
          this.missions.startNextMission();
        }
      }
      if (key === 'c') {
        this.ui.toggleControlsModal();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.input.up = false;
      if (key === 's' || key === 'arrowdown') this.input.down = false;
      if (key === 'a' || key === 'arrowleft') this.input.left = false;
      if (key === 'd' || key === 'arrowright') this.input.right = false;
      if (e.code === 'Space') this.input.space = false;
      if (!e.shiftKey) this.input.shift = false;
      if (key === 'h') this.input.horn = false;
    });

    // Pointer click anywhere resumes audio
    window.addEventListener('pointerdown', () => {
      window.soundEngine.init();
      window.soundEngine.resume();
    });
  }

  handleVehicleInteract() {
    if (this.player.inVehicle) {
      // Exit Vehicle (if driving at manageable speed)
      if (Math.abs(this.player.currentVehicle.speed) < 8) {
        this.player.exitVehicle();
        this.ui.showNotification("Exited vehicle.");
      } else {
        this.ui.showNotification("Slow down to exit vehicle!");
      }
    } else {
      // Enter Nearest Vehicle
      if (this.player.nearbyVehicle) {
        this.player.enterVehicle(this.player.nearbyVehicle);
        this.ui.showNotification(`Entered ${this.player.nearbyVehicle.type.toUpperCase()}`);
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addCash(amount) {
    this.cash += amount;
    this.ui.updateCash(this.cash);
  }

  /* ---------------- CRIME EVENTS ---------------- */
  onCarjack(vehicle) {
    // Stealing a civilian vehicle
    this.police.addCrime(1, "Vehicle Theft");
  }

  onPedestrianHit() {
    // Hitting a pedestrian
    this.police.addCrime(2, "Vehicular Assault");
  }

  onVehicleHitVehicle(v1, v2, speed) {
    // Check if one is a police cruiser
    if (v1.type === 'police' || v2.type === 'police') {
      if (this.police.wantedLevel < 3) {
        this.police.addCrime(1, "Ramming Police Unit");
      }
    }
  }

  onCollisionCrime(speed) {
    if (speed > 24) {
      this.police.addCrime(1, "Reckless Endangerment");
    }
  }

  /* ---------------- MAIN GAME LOOP ---------------- */
  gameLoop(now) {
    requestAnimationFrame((t) => this.gameLoop(t));

    // Calculate clamped delta time
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // 1. Update Physics Engine
    this.physics.update(dt);

    // 2. Update City Traffic Signals
    this.city.updateTrafficLights(dt);

    // 3. Update Player Controller & Camera
    this.player.update(dt, this.input);

    const playerPos = this.player.position;
    const playerVehicle = this.player.currentVehicle;

    // 4. Update Traffic AI
    this.traffic.update(dt, playerPos);

    // 5. Update Pedestrians Crowd AI
    this.pedestrians.update(dt, playerPos, playerVehicle);

    // 6. Update Police Wanted & Pursuit System
    this.police.update(dt, playerPos, playerVehicle);

    // 7. Update Weather & Day/Night Cycle
    this.weather.update(dt, playerPos);

    // 8. Update Missions
    this.missions.update(dt, playerPos);

    // 9. Update Circular Radar Minimap
    this.minimap.update(
      playerPos,
      this.player.inVehicle && playerVehicle ? playerVehicle.yaw : this.player.yaw,
      this.traffic.cars,
      this.police.policeUnits,
      this.missions.getActiveWaypoint(),
      this.police.isEvading
    );

    // 10. Update HUD Speedometer & Prompts
    this.ui.updateSpeedometer(playerVehicle, this.player.inVehicle);

    if (this.player.inVehicle) {
      this.ui.showActionPrompt('F', 'EXIT VEHICLE');
    } else if (this.player.nearbyVehicle) {
      this.ui.showActionPrompt('F', `ENTER ${this.player.nearbyVehicle.type.toUpperCase()}`);
    } else if (!this.missions.activeMission) {
      this.ui.showActionPrompt('M', 'START MISSION');
    } else {
      this.ui.hideActionPrompt();
    }

    // 11. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Global Game Entry on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameEngine();
});
