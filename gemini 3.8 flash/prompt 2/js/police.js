/**
 * Wanted Level & Police Pursuit AI System
 * Manages crime detection, 0-5 star wanted ratings, police cruiser spawning, siren audio, and pursuit tactics.
 */
class PoliceManager {
  constructor(scene, physics, city) {
    this.scene = scene;
    this.physics = physics;
    this.city = city;

    this.wantedLevel = 0; // 0 to 5 stars
    this.policeUnits = [];
    this.maxUnits = 4;

    // Evasion & Cooldown state
    this.isEvading = false;
    this.evadeTimer = 0;
    this.evadeDuration = 12.0; // Seconds to clear wanted level
    this.searchRadius = 75; // Metres within which police maintain visual contact

    this.spawnCooldown = 0;
  }

  setWantedLevel(stars) {
    const clamped = Math.min(5, Math.max(0, stars));
    const previous = this.wantedLevel;
    this.wantedLevel = clamped;

    if (this.wantedLevel > 0) {
      this.isEvading = false;
      this.evadeTimer = 0;
      window.soundEngine.startSiren(0.8);
      if (this.wantedLevel > previous) {
        window.soundEngine.playWantedAlert();
      }
    } else {
      this.isEvading = false;
      window.soundEngine.stopSiren();
      this.removeAllPolice();
    }

    if (window.game && window.game.ui) {
      window.game.ui.updateWantedStars(this.wantedLevel, this.isEvading);
    }
  }

  addCrime(starsDelta, reason = "Crime committed") {
    if (this.wantedLevel < 5) {
      this.setWantedLevel(Math.min(5, Math.max(this.wantedLevel + starsDelta, 1)));
      if (window.game && window.game.ui) {
        window.game.ui.showNotification(`WANTED: ${reason.toUpperCase()}!`);
      }
    }
  }

  update(dt, playerPos, playerVehicle) {
    if (this.wantedLevel <= 0) return;

    // Determine target amount of police cruisers based on stars
    const targetCruisers = Math.min(this.wantedLevel, this.maxUnits);

    // Maintain cruiser count
    this.spawnCooldown -= dt;
    if (this.policeUnits.length < targetCruisers && this.spawnCooldown <= 0) {
      this.spawnPoliceCruiser(playerPos);
      this.spawnCooldown = 3.5;
    }

    // Check if any police cruiser has eyes on player
    let hasVisualContact = false;
    let closestDist = 999;

    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const unit = this.policeUnits[i];
      const dist = unit.vehicle.mesh.position.distanceTo(playerPos);
      if (dist < closestDist) closestDist = dist;

      // Despawn if stuck or absurdly far (> 260m)
      if (dist > 260) {
        unit.vehicle.destroy();
        this.policeUnits.splice(i, 1);
        continue;
      }

      if (dist < this.searchRadius) {
        hasVisualContact = true;
      }

      // Execute Pursuit AI
      this.updatePursuitAI(unit, dt, playerPos, playerVehicle);
    }

    // Modulate siren volume based on closest cruiser
    window.soundEngine.updateSirenVolume(closestDist);

    // Evasion Cooldown Logic
    if (!hasVisualContact && this.wantedLevel > 0) {
      if (!this.isEvading) {
        this.isEvading = true;
        this.evadeTimer = this.evadeDuration;
      }

      this.evadeTimer -= dt;
      if (this.evadeTimer <= 0) {
        // Successfully shook off the cops!
        this.setWantedLevel(0);
        window.soundEngine.playMissionChime(true);
        if (window.game && window.game.ui) {
          window.game.ui.showNotification("POLICE EVADED! WANTED LEVEL CLEARED");
        }
      }
    } else {
      this.isEvading = false;
    }

    // Refresh UI stars state (flashing if evading)
    if (window.game && window.game.ui) {
      window.game.ui.updateWantedStars(this.wantedLevel, this.isEvading);
    }
  }

  spawnPoliceCruiser(playerPos) {
    const halfSpan = this.city.cityExtent;
    const step = this.city.stepSize;

    // Spawn ~70-90m away along an intersecting street
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 65 + Math.random() * 25;
    let spawnX = THREE.MathUtils.clamp(playerPos.x + Math.cos(angle) * spawnDist, -halfSpan + 10, halfSpan - 10);
    let spawnZ = THREE.MathUtils.clamp(playerPos.z + Math.sin(angle) * spawnDist, -halfSpan + 10, halfSpan - 10);

    // Snap to nearest road lane
    const lanes = this.city.roadNetwork.lanes;
    let bestLane = lanes[0];
    let minD = 999;
    lanes.forEach(l => {
      const d = Math.hypot(spawnX - l.from.x, spawnZ - l.from.z);
      if (d < minD) {
        minD = d;
        bestLane = l;
      }
    });

    spawnX = bestLane.from.x;
    spawnZ = bestLane.from.z;

    const yaw = Math.atan2(playerPos.x - spawnX, playerPos.z - spawnZ);

    const vehicle = new Vehicle(this.scene, this.physics, 'police', {
      pos: new THREE.Vector3(spawnX, 0, spawnZ),
      yaw: yaw,
      color: 0x111111
    });

    vehicle.sirenActive = true;

    const unit = {
      vehicle: vehicle,
      ramTimer: 0
    };

    this.policeUnits.push(unit);
  }

  updatePursuitAI(unit, dt, playerPos, playerVehicle) {
    const v = unit.vehicle;
    const pos = v.mesh.position;

    // Vector towards target (intercept point)
    let targetX = playerPos.x;
    let targetZ = playerPos.z;

    // Lead the target if player is driving fast
    if (playerVehicle && Math.abs(playerVehicle.speed) > 5) {
      const fwdX = -Math.sin(playerVehicle.yaw);
      const fwdZ = -Math.cos(playerVehicle.yaw);
      const leadFactor = Math.min(20, playerVehicle.speed * 0.8);
      targetX += fwdX * leadFactor;
      targetZ += fwdZ * leadFactor;
    }

    const dx = targetX - pos.x;
    const dz = targetZ - pos.z;
    const distToTarget = Math.hypot(dx, dz);

    // Desired heading
    const desiredYaw = Math.atan2(-dx, -dz);
    let yawDiff = desiredYaw - v.yaw;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;

    // Steer towards target
    const targetSteer = THREE.MathUtils.clamp(yawDiff * 2.2, -0.85, 0.85);

    // Pursuit throttle based on wanted aggression
    let throttle = 0.9;
    let handbrake = false;

    // Sharp turn drift assist for police cruisers
    if (Math.abs(yawDiff) > 1.2 && v.speed > 16) {
      handbrake = true;
      throttle = 0.4;
    }

    // Braking if right on player's tail to ram into them repeatedly
    if (distToTarget < 3.5) {
      throttle = 1.0; // Ram hard!
    }

    v.setInputs(throttle, targetSteer, handbrake, false);
    v.update(dt);
  }

  removeAllPolice() {
    this.policeUnits.forEach(u => u.vehicle.destroy());
    this.policeUnits = [];
  }
}
