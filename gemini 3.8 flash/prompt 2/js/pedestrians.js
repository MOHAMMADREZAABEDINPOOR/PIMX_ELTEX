/**
 * Pedestrian AI & Crowd Simulation
 * Autonomous citizens walking on sidewalks, crossing intersections, and reacting dynamically to traffic.
 */
class PedestrianManager {
  constructor(scene, city, physics) {
    this.scene = scene;
    this.city = city;
    this.physics = physics;

    this.pedestrians = [];
    this.maxPeds = 32;

    // Palette of clothing & skin styles
    this.shirtColors = [0x2c3e50, 0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf39c12, 0x1abc9c, 0xd35400];
    this.pantsColors = [0x1a252f, 0x34495e, 0x7f8c8d, 0x2c3e50];
    this.skinTones = [0xf5d0b5, 0xe0a98b, 0xbf825e, 0x8d5524, 0x51351e];
  }

  init() {
    for (let i = 0; i < this.maxPeds; i++) {
      this.spawnPedestrian();
    }
  }

  spawnPedestrian(nearPlayerPos = null) {
    if (this.pedestrians.length >= this.maxPeds) return;

    // Generate spawn position on sidewalks or Central Park
    let x, z;
    const halfSpan = this.city.cityExtent;
    const step = this.city.stepSize;
    const block = this.city.blockSize;

    if (Math.random() > 0.35 && this.city.parkBounds) {
      // Spawn in Central Park
      const pb = this.city.parkBounds;
      x = pb.minX + 4 + Math.random() * (pb.maxX - pb.minX - 8);
      z = pb.minZ + 4 + Math.random() * (pb.maxZ - pb.minZ - 8);
    } else {
      // Spawn along random block sidewalk perimeter
      const gx = Math.floor(Math.random() * this.city.gridSize);
      const gz = Math.floor(Math.random() * this.city.gridSize);
      const bx = -halfSpan + (gx + 0.5) * step;
      const bz = -halfSpan + (gz + 0.5) * step;

      const side = Math.floor(Math.random() * 4);
      const halfB = block / 2 - 1.5;

      if (side === 0) { x = bx + halfB; z = bz + (Math.random() - 0.5) * block; }
      else if (side === 1) { x = bx - halfB; z = bz + (Math.random() - 0.5) * block; }
      else if (side === 2) { x = bx + (Math.random() - 0.5) * block; z = bz + halfB; }
      else { x = bx + (Math.random() - 0.5) * block; z = bz - halfB; }
    }

    const pedMesh = this.buildPedestrianMesh();
    pedMesh.position.set(x, 0.22, z);
    this.scene.add(pedMesh);

    const ped = {
      mesh: pedMesh,
      targetPos: this.pickNewTarget(x, z),
      speed: 1.2 + Math.random() * 0.8,
      walkAnimTime: Math.random() * 10,
      state: 'WALKING', // 'WALKING', 'PANICKED', 'DOWN'
      panicTimer: 0,
      downTimer: 0,
      armL: pedMesh.userData.armL,
      armR: pedMesh.userData.armR,
      legL: pedMesh.userData.legL,
      legR: pedMesh.userData.legR
    };

    this.pedestrians.push(ped);
  }

  buildPedestrianMesh() {
    const group = new THREE.Group();

    const shirtColor = this.shirtColors[Math.floor(Math.random() * this.shirtColors.length)];
    const pantsColor = this.pantsColors[Math.floor(Math.random() * this.pantsColors.length)];
    const skinColor = this.skinTones[Math.floor(Math.random() * this.skinTones.length)];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.25), shirtMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), skinMat);
    head.position.y = 1.38;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.12, 0.48, 0.12);

    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.28, 1.15, 0);
    const armL = new THREE.Mesh(armGeo, shirtMat);
    armL.position.y = -0.22;
    armLPivot.add(armL);
    group.add(armLPivot);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.28, 1.15, 0);
    const armR = new THREE.Mesh(armGeo, shirtMat);
    armR.position.y = -0.22;
    armRPivot.add(armR);
    group.add(armRPivot);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);

    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.13, 0.65, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.y = -0.3;
    legLPivot.add(legL);
    group.add(legLPivot);

    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.13, 0.65, 0);
    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.y = -0.3;
    legRPivot.add(legR);
    group.add(legRPivot);

    group.userData = {
      armL: armLPivot,
      armR: armRPivot,
      legL: legLPivot,
      legR: legRPivot
    };

    return group;
  }

  pickNewTarget(curX, curZ) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 25;
    return new THREE.Vector3(curX + Math.cos(angle) * dist, 0.22, curZ + Math.sin(angle) * dist);
  }

  update(dt, playerPos, playerVehicle) {
    // Maintain crowd density near player
    if (this.pedestrians.length < this.maxPeds) {
      this.spawnPedestrian(playerPos);
    }

    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];

      // Recycle if too far from player
      const distToPlayer = ped.mesh.position.distanceTo(playerPos);
      if (distToPlayer > 180) {
        this.scene.remove(ped.mesh);
        this.pedestrians.splice(i, 1);
        continue;
      }

      this.updatePedestrian(ped, dt, playerPos, playerVehicle);
    }
  }

  updatePedestrian(ped, dt, playerPos, playerVehicle) {
    const pos = ped.mesh.position;

    // Check collision with player's car
    if (playerVehicle) {
      const vPos = playerVehicle.mesh.position;
      const distToCar = pos.distanceTo(vPos);

      // Reaction: Car honking or speeding near
      if (distToCar < 12 && Math.abs(playerVehicle.speed) > 10) {
        if (ped.state !== 'DOWN') {
          ped.state = 'PANICKED';
          ped.panicTimer = 4.0;
        }
      }

      // Hit by Car!
      if (distToCar < 2.0 && Math.abs(playerVehicle.speed) > 4) {
        if (ped.state !== 'DOWN') {
          ped.state = 'DOWN';
          ped.downTimer = 6.0;

          // Push pedestrian outward with impact
          const hitDir = new THREE.Vector3().subVectors(pos, vPos).normalize();
          pos.addScaledVector(hitDir, 2.5);
          ped.mesh.rotation.x = Math.PI / 2; // Fall down
          pos.y = 0.2;

          // Sound & Crime Event
          window.soundEngine.playCrash(0.8);
          if (window.game) {
            window.game.onPedestrianHit();
          }
        }
      }
    }

    // State Updates
    if (ped.state === 'DOWN') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        // Recover and get back up
        ped.state = 'PANICKED';
        ped.panicTimer = 5.0;
        ped.mesh.rotation.x = 0;
        pos.y = 0.22;
      }
      return;
    }

    // Movement Logic
    let curSpeed = ped.speed;
    let target = ped.targetPos;

    if (ped.state === 'PANICKED') {
      ped.panicTimer -= dt;
      if (ped.panicTimer <= 0) ped.state = 'WALKING';
      curSpeed = ped.speed * 2.8; // Fleeing run!
      // Run away from player
      const fleeDir = new THREE.Vector3().subVectors(pos, playerPos).normalize();
      target = new THREE.Vector3().copy(pos).addScaledVector(fleeDir, 30);
    }

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.5) {
      ped.targetPos = this.pickNewTarget(pos.x, pos.z);
    } else {
      const nx = dx / dist;
      const nz = dz / dist;

      pos.x += nx * curSpeed * dt;
      pos.z += nz * curSpeed * dt;

      // Rotate to face direction
      const targetYaw = Math.atan2(-nx, -nz);
      ped.mesh.rotation.y = targetYaw;

      // Procedural walking animation
      ped.walkAnimTime += dt * (curSpeed * 5);
      const stride = Math.sin(ped.walkAnimTime);

      ped.legL.rotation.x = stride * 0.6;
      ped.legR.rotation.x = -stride * 0.6;
      ped.armL.rotation.x = -stride * 0.5;
      ped.armR.rotation.x = stride * 0.5;
    }
  }
}
