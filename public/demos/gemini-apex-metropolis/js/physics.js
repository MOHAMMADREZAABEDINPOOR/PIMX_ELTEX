/**
 * 3D Vehicle Physics & Collision System
 * Arcade-responsive dynamics with realistic drifting, suspension lean, and collision response.
 */
class PhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Static colliders (buildings, props)
    this.vehicles = [];  // Dynamic vehicle bodies
    this.skidMarks = []; // Active skid mark segments
    this.smokeParticles = [];

    // Setup procedural skid mark material
    this.skidMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    // Particle pool for tire smoke
    this.setupParticleSystem();
  }

  setupParticleSystem() {
    const pGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    this.smokePool = [];
    for (let i = 0; i < 80; i++) {
      const p = new THREE.Mesh(pGeo, pMat.clone());
      p.visible = false;
      p.rotation.x = -Math.PI / 2;
      this.scene.add(p);
      this.smokePool.push({
        mesh: p,
        active: false,
        life: 0,
        maxLife: 0.6,
        vel: new THREE.Vector3(),
        rotSpeed: 0
      });
    }
  }

  spawnSmoke(pos, intensity = 1) {
    const p = this.smokePool.find(item => !item.active);
    if (!p) return;
    p.active = true;
    p.life = 0;
    p.maxLife = 0.4 + Math.random() * 0.3;
    p.mesh.position.copy(pos);
    p.mesh.position.y += 0.15;
    p.mesh.scale.set(0.4, 0.4, 0.4);
    p.mesh.material.opacity = 0.35 * intensity;
    p.mesh.visible = true;
    p.vel.set((Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 1.5);
    p.rotSpeed = (Math.random() - 0.5) * 4;
  }

  updateParticles(dt) {
    this.smokePool.forEach(p => {
      if (!p.active) return;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        return;
      }
      const progress = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.vel, dt);
      const scale = 0.4 + progress * 1.6;
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.material.opacity = (1 - progress) * 0.35;
      p.mesh.rotation.z += p.rotSpeed * dt;
    });
  }

  addCollider(box3) {
    this.colliders.push(box3);
  }

  registerVehicle(vehicle) {
    this.vehicles.push(vehicle);
  }

  unregisterVehicle(vehicle) {
    const idx = this.vehicles.indexOf(vehicle);
    if (idx !== -1) this.vehicles.splice(idx, 1);
  }

  /**
   * Main physics step
   */
  update(dt) {
    this.updateParticles(dt);

    // Update each vehicle's physical state
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPhysicsActive) {
        this.stepVehicle(v, dt);
      }
    }

    // Vehicle-to-Vehicle Collisions
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        this.resolveVehicleCollision(this.vehicles[i], this.vehicles[j]);
      }
    }
  }

  /**
   * Vehicle Dynamics Simulation
   */
  stepVehicle(v, dt) {
    // 1. Steering & Handbrake
    const speed = v.speed;
    const absSpeed = Math.abs(speed);

    // Steer angle responsiveness scales inversely with speed for high-speed stability
    const steerLimit = v.handbrake ? 0.75 : Math.max(0.28, 0.65 - absSpeed * 0.008);
    v.steerAngle += (v.targetSteer * steerLimit - v.steerAngle) * Math.min(1, dt * 10);

    // 2. Acceleration / Braking
    let accel = 0;
    const topSpeed = v.isBoosting ? v.maxSpeed * 1.35 : v.maxSpeed;

    if (v.throttle > 0) {
      if (speed < -0.5) {
        // Braking in reverse
        accel = v.brakeForce;
      } else if (speed < topSpeed) {
        let driveForce = v.acceleration;
        if (v.isBoosting) driveForce *= 1.8;
        accel = driveForce * (1 - speed / topSpeed);
      }
    } else if (v.throttle < 0) {
      if (speed > 0.5) {
        // Braking forward
        accel = -v.brakeForce;
      } else if (speed > -v.maxReverseSpeed) {
        accel = -v.reverseAcceleration;
      }
    } else {
      // Natural rolling friction / engine drag
      accel = -Math.sign(speed) * Math.min(Math.abs(speed), v.friction);
    }

    // Handbrake physics
    let lateralGrip = v.baseGrip;
    if (v.handbrake) {
      accel += -Math.sign(speed) * v.brakeForce * 1.3;
      lateralGrip *= 0.28; // Lose lateral traction for drifting
    }

    v.speed += accel * dt;

    // 3. Turning & Yaw Rate
    if (absSpeed > 0.2) {
      const turnDir = speed >= 0 ? 1 : -1;
      const driftMultiplier = v.handbrake ? 1.9 : 1.1;
      const yawRate = (v.steerAngle * (speed / 12) * turnDir) * driftMultiplier;
      v.yaw += yawRate * dt;
    }

    // 4. Direction Vectors & Drift Calculation
    const forwardX = -Math.sin(v.yaw);
    const forwardZ = -Math.cos(v.yaw);
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);

    // Forward vs Lateral velocity
    const targetVelX = forwardX * v.speed;
    const targetVelZ = forwardZ * v.speed;

    // Drift / Slip
    v.velX += (targetVelX - v.velX) * Math.min(1, dt * (lateralGrip * 14));
    v.velZ += (targetVelZ - v.velZ) * Math.min(1, dt * (lateralGrip * 14));

    // Slip angle intensity
    const totalSpeed = Math.hypot(v.velX, v.velZ);
    const dotForward = (v.velX * forwardX + v.velZ * forwardZ) / (totalSpeed || 1);
    const slipRatio = totalSpeed > 4 ? Math.max(0, 1 - dotForward) : 0;
    v.slipRatio = slipRatio;

    // Trigger tire screech & smoke if drifting or hard braking
    if (v.isPlayerControlled) {
      const screechVal = (v.handbrake && absSpeed > 5) ? 0.8 : (slipRatio > 0.15 && absSpeed > 8 ? slipRatio * 1.5 : 0);
      window.soundEngine.setTireScreech(screechVal);

      if (screechVal > 0.2) {
        // Spawn tire smoke at rear wheels
        const rearDist = -1.2;
        const wheelOffset = 0.8;
        const rearLeft = new THREE.Vector3(
          v.mesh.position.x + forwardX * rearDist - rightX * wheelOffset,
          v.mesh.position.y,
          v.mesh.position.z + forwardZ * rearDist - rightZ * wheelOffset
        );
        const rearRight = new THREE.Vector3(
          v.mesh.position.x + forwardX * rearDist + rightX * wheelOffset,
          v.mesh.position.y,
          v.mesh.position.z + forwardZ * rearDist + rightZ * wheelOffset
        );
        this.spawnSmoke(rearLeft, screechVal);
        this.spawnSmoke(rearRight, screechVal);
      }
    }

    // 5. Position Integration
    v.mesh.position.x += v.velX * dt;
    v.mesh.position.z += v.velZ * dt;
    v.mesh.rotation.y = v.yaw;

    // Suspension Lean (Pitch and Roll)
    const targetPitch = (accel / 20) * 0.05; // Lean back on accel, dive on brake
    const targetRoll = (v.steerAngle * (speed / 18)) * 0.08; // Lean outward on turn
    if (v.chassisMesh) {
      v.chassisMesh.rotation.x += (targetPitch - v.chassisMesh.rotation.x) * dt * 8;
      v.chassisMesh.rotation.z += (targetRoll - v.chassisMesh.rotation.z) * dt * 8;
    }

    // 6. Static Obstacle Collisions (Buildings, Walls)
    this.checkStaticCollisions(v);

    // 7. World Bounds Containment (-235 to 235m)
    const mapLimit = 230;
    if (Math.abs(v.mesh.position.x) > mapLimit) {
      v.mesh.position.x = Math.sign(v.mesh.position.x) * mapLimit;
      v.velX = -v.velX * 0.5;
      v.speed *= -0.5;
    }
    if (Math.abs(v.mesh.position.z) > mapLimit) {
      v.mesh.position.z = Math.sign(v.mesh.position.z) * mapLimit;
      v.velZ = -v.velZ * 0.5;
      v.speed *= -0.5;
    }

    // 8. Gear and RPM calculation
    this.calculateGearAndRPM(v);
  }

  checkStaticCollisions(v) {
    const vRadius = v.colliderRadius || 1.8;
    const vPos = v.mesh.position;

    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      // Quick bounding check
      if (
        vPos.x + vRadius > box.min.x && vPos.x - vRadius < box.max.x &&
        vPos.z + vRadius > box.min.z && vPos.z - vRadius < box.max.z
      ) {
        // Find closest point on box
        const closestX = Math.max(box.min.x, Math.min(vPos.x, box.max.x));
        const closestZ = Math.max(box.min.z, Math.min(vPos.z, box.max.z));

        const diffX = vPos.x - closestX;
        const diffZ = vPos.z - closestZ;
        const distSq = diffX * diffX + diffZ * diffZ;

        if (distSq < vRadius * vRadius && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = vRadius - dist;
          const normalX = diffX / dist;
          const normalZ = diffZ / dist;

          // Push vehicle out
          vPos.x += normalX * overlap;
          vPos.z += normalZ * overlap;

          // Impact response
          const impactSpeed = Math.abs(v.speed);
          if (impactSpeed > 4 && v.isPlayerControlled) {
            window.soundEngine.playCrash(impactSpeed / 25);
            v.damage += impactSpeed * 0.3;
            // High speed crash triggers minor crime if observed
            if (impactSpeed > 22 && window.game) {
              window.game.onCollisionCrime(impactSpeed);
            }
          }

          // Bounce reflection
          v.velX = normalX * (impactSpeed * 0.35);
          v.velZ = normalZ * (impactSpeed * 0.35);
          v.speed *= -0.3;
        }
      }
    }
  }

  resolveVehicleCollision(v1, v2) {
    const r1 = v1.colliderRadius || 1.8;
    const r2 = v2.colliderRadius || 1.8;
    const dx = v2.mesh.position.x - v1.mesh.position.x;
    const dz = v2.mesh.position.z - v1.mesh.position.z;
    const distSq = dx * dx + dz * dz;
    const minDist = r1 + r2;

    if (distSq < minDist * minDist && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const overlap = (minDist - dist) * 0.5;
      const nx = dx / dist;
      const nz = dz / dist;

      // Displace vehicles
      v1.mesh.position.x -= nx * overlap;
      v1.mesh.position.z -= nz * overlap;
      v2.mesh.position.x += nx * overlap;
      v2.mesh.position.z += nz * overlap;

      // Momentum transfer
      const relSpeed = Math.hypot(v1.velX - v2.velX, v1.velZ - v2.velZ);
      if (relSpeed > 3 && (v1.isPlayerControlled || v2.isPlayerControlled)) {
        window.soundEngine.playCrash(relSpeed / 20);
        if (window.game) {
          window.game.onVehicleHitVehicle(v1, v2, relSpeed);
        }
      }

      const impulse = relSpeed * 0.45;
      v1.velX -= nx * impulse;
      v1.velZ -= nz * impulse;
      v2.velX += nx * impulse;
      v2.velZ += nz * impulse;

      v1.speed *= 0.5;
      v2.speed *= 0.5;
    }
  }

  calculateGearAndRPM(v) {
    const speedMph = Math.abs(v.speed * 2.237); // m/s to mph
    v.speedMph = speedMph;

    if (v.speed < -0.5) {
      v.currentGear = 'R';
      v.rpm = 1500 + (Math.abs(v.speed) / v.maxReverseSpeed) * 4500;
    } else if (speedMph < 1) {
      v.currentGear = '1';
      v.rpm = 1000 + (v.throttle > 0 ? 2500 : 0);
    } else if (speedMph < 25) {
      v.currentGear = '1';
      v.rpm = 1800 + (speedMph / 25) * 5200;
    } else if (speedMph < 50) {
      v.currentGear = '2';
      v.rpm = 2200 + ((speedMph - 25) / 25) * 4800;
    } else if (speedMph < 80) {
      v.currentGear = '3';
      v.rpm = 2400 + ((speedMph - 50) / 30) * 4600;
    } else if (speedMph < 115) {
      v.currentGear = '4';
      v.rpm = 2800 + ((speedMph - 80) / 35) * 4400;
    } else {
      v.currentGear = '5';
      v.rpm = 3200 + ((speedMph - 115) / 45) * 4200;
    }
    v.rpm = Math.min(7500, Math.max(1000, v.rpm));
  }
}
