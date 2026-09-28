/**
 * Civilian Traffic AI System
 * Manages autonomous vehicles navigating road grid, obeying traffic lights, and obstacle avoidance.
 */
class TrafficManager {
  constructor(scene, physics, city) {
    this.scene = scene;
    this.physics = physics;
    this.city = city;

    this.cars = [];
    this.maxCars = 14;
    this.spawnTimer = 0;

    // Palette of civilian vehicle paint colors
    this.colors = [
      0xd9534f, 0x5bc0de, 0x5cb85c, 0xf0ad4e, 0x292b2c,
      0x6f42c1, 0xe83e8c, 0x20c997, 0x17a2b8, 0xffc107
    ];
  }

  init() {
    // Initial spawn across different lanes
    for (let i = 0; i < this.maxCars; i++) {
      this.spawnCar();
    }
  }

  spawnCar() {
    if (this.cars.length >= this.maxCars) return;

    // Pick random directed lane
    const lanes = this.city.roadNetwork.lanes;
    if (!lanes || lanes.length === 0) return;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Random position along lane
    const t = 0.1 + Math.random() * 0.8;
    const spawnX = lane.from.x + (lane.to.x - lane.from.x) * t;
    const spawnZ = lane.from.z + (lane.to.z - lane.from.z) * t;

    // Don't spawn on top of existing vehicle
    for (let i = 0; i < this.physics.vehicles.length; i++) {
      const v = this.physics.vehicles[i];
      if (Math.hypot(v.mesh.position.x - spawnX, v.mesh.position.z - spawnZ) < 12) {
        return; // Too close, skip this frame
      }
    }

    // Vehicle Type
    const types = ['sedan', 'sedan', 'taxi', 'muscle'];
    const type = types[Math.floor(Math.random() * types.length)];
    const color = type === 'taxi' ? 0xffcc00 : this.colors[Math.floor(Math.random() * this.colors.length)];

    // Initial heading
    const yaw = Math.atan2(-lane.dir.x, -lane.dir.z);

    const vehicle = new Vehicle(this.scene, this.physics, type, {
      pos: new THREE.Vector3(spawnX, 0, spawnZ),
      yaw: yaw,
      color: color
    });

    const aiCar = {
      vehicle: vehicle,
      currentLane: lane,
      targetSpeed: 10 + Math.random() * 6, // 22 - 35 mph cruising
      state: 'CRUISING', // 'CRUISING', 'STOPPED_LIGHT', 'STOPPED_OBSTACLE'
      isCivilianAI: true
    };

    this.cars.push(aiCar);
  }

  update(dt, playerPos) {
    // Periodic car spawner
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.0) {
      this.spawnTimer = 0;
      if (this.cars.length < this.maxCars) {
        this.spawnCar();
      }
    }

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const ai = this.cars[i];
      const v = ai.vehicle;

      // If player jacked this car, remove from AI traffic list
      if (v.isPlayerControlled) {
        this.cars.splice(i, 1);
        continue;
      }

      // Check distance from player; recycle if too far (> 220m)
      const distToPlayer = Math.hypot(v.mesh.position.x - playerPos.x, v.mesh.position.z - playerPos.z);
      if (distToPlayer > 240) {
        v.destroy();
        this.cars.splice(i, 1);
        continue;
      }

      this.updateAICar(ai, dt);
    }
  }

  updateAICar(ai, dt) {
    const v = ai.vehicle;
    const lane = ai.currentLane;

    // 1. Steering to stay centered in lane
    const fwdX = -Math.sin(v.yaw);
    const fwdZ = -Math.cos(v.yaw);

    // Lateral distance from lane line
    let targetSteer = 0;
    if (lane.type === 'NS') {
      const targetX = lane.from.x;
      const errorX = targetX - v.mesh.position.x;
      const desiredYaw = lane.dir.z > 0 ? 0 : Math.PI;
      let yawDiff = desiredYaw - v.yaw;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      targetSteer = THREE.MathUtils.clamp(yawDiff * 2.0 + errorX * 0.4 * (lane.dir.z > 0 ? 1 : -1), -0.7, 0.7);
    } else {
      const targetZ = lane.from.z;
      const errorZ = targetZ - v.mesh.position.z;
      const desiredYaw = lane.dir.x > 0 ? -Math.PI / 2 : Math.PI / 2;
      let yawDiff = desiredYaw - v.yaw;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      targetSteer = THREE.MathUtils.clamp(yawDiff * 2.0 + errorZ * 0.4 * (lane.dir.x > 0 ? -1 : 1), -0.7, 0.7);
    }

    // 2. Intersection detection & Traffic Lights
    let shouldStopForLight = false;
    const upcomingTL = this.findApproachingTrafficLight(v, lane);

    if (upcomingTL) {
      const isEW = lane.type === 'EW';
      const isRedOrYellow = isEW
        ? (upcomingTL.state === 'NS_GREEN' || upcomingTL.state === 'EW_YELLOW')
        : (upcomingTL.state === 'EW_GREEN' || upcomingTL.state === 'NS_YELLOW');

      if (isRedOrYellow) {
        shouldStopForLight = true;
      }
    }

    // 3. Obstacle avoidance ahead (cars, player, pedestrians)
    const obstacleDist = this.detectObstacleAhead(v);
    let shouldStopForObstacle = obstacleDist < 10;

    // 4. Throttle / Brake decisions
    let throttle = 0;
    let handbrake = false;

    if (shouldStopForLight || shouldStopForObstacle) {
      ai.state = shouldStopForLight ? 'STOPPED_LIGHT' : 'STOPPED_OBSTACLE';
      if (v.speed > 0.5) {
        throttle = -0.8; // Brake smoothly
      } else {
        throttle = 0;
        v.speed = 0;
      }
    } else {
      ai.state = 'CRUISING';
      if (v.speed < ai.targetSpeed) {
        throttle = 0.65;
      } else {
        throttle = 0.1;
      }
    }

    v.setInputs(throttle, targetSteer, handbrake, false);
    v.update(dt);

    // 5. Wrap lane or switch at intersection end
    this.checkLaneTransitions(ai);
  }

  findApproachingTrafficLight(v, lane) {
    const lights = this.city.trafficLights;
    const fwdX = -Math.sin(v.yaw);
    const fwdZ = -Math.cos(v.yaw);

    for (let i = 0; i < lights.length; i++) {
      const tl = lights[i];
      const dx = tl.x - v.mesh.position.x;
      const dz = tl.z - v.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      // In front between 6m and 18m
      if (dist > 6 && dist < 20) {
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        if (dot > 0.8) {
          return tl;
        }
      }
    }
    return null;
  }

  detectObstacleAhead(v) {
    const fwdX = -Math.sin(v.yaw);
    const fwdZ = -Math.cos(v.yaw);
    let minDist = 999;

    // Check against all vehicles in physics world
    for (let i = 0; i < this.physics.vehicles.length; i++) {
      const other = this.physics.vehicles[i];
      if (other === v) continue;

      const dx = other.mesh.position.x - v.mesh.position.x;
      const dz = other.mesh.position.z - v.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 22) {
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        // Directly in path cone
        if (dot > 0.75) {
          if (dist < minDist) minDist = dist;
        }
      }
    }
    return minDist;
  }

  checkLaneTransitions(ai) {
    const v = ai.vehicle;
    const lane = ai.currentLane;
    const halfSpan = this.city.cityExtent;

    // Reached boundary of city, turn around or swap lane
    if (Math.abs(v.mesh.position.x) > halfSpan - 5 || Math.abs(v.mesh.position.z) > halfSpan - 5) {
      // Pick another random lane
      const lanes = this.city.roadNetwork.lanes;
      ai.currentLane = lanes[Math.floor(Math.random() * lanes.length)];
      v.mesh.position.set(ai.currentLane.from.x, 0, ai.currentLane.from.z);
      v.yaw = Math.atan2(-ai.currentLane.dir.x, -ai.currentLane.dir.z);
      v.speed = 0;
    }
  }
}
