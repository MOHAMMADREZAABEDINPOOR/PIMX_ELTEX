/**
 * 3D Humanoid Player Controller & Vehicle Interaction
 * Supports walking, sprinting, jumping, procedural animations, and vehicle boarding.
 */
class PlayerController {
  constructor(scene, camera, physics, city) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;
    this.city = city;

    // Movement state
    this.position = new THREE.Vector3(0, 0, 10);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.walkSpeed = 4.8;
    this.sprintSpeed = 8.5;
    this.jumpForce = 8.0;
    this.gravity = 22.0;
    this.isGrounded = true;
    this.isSprinting = false;
    this.colliderRadius = 0.45;

    // Vehicle interaction state
    this.currentVehicle = null;
    this.nearbyVehicle = null;
    this.inVehicle = false;

    // Camera Modes: 0: Normal Chase, 1: Far Chase, 2: Bumper/Hood
    this.cameraMode = 0;
    this.cameraDistance = 5.5;
    this.cameraHeight = 2.4;
    this.cameraLookHeight = 1.4;
    this.currentCameraPos = new THREE.Vector3();
    this.currentCameraTarget = new THREE.Vector3();

    // Procedural Animation timers
    this.animTime = 0;
    this.isMoving = false;

    // Build stylized 3D character mesh
    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    this.mesh = new THREE.Group();

    // Stylized low-poly materials
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x242831, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a98b, roughness: 0.5 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x221812, roughness: 0.7 });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // 2. Head & Hair
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 1.55, 0);
    this.head.castShadow = true;
    this.mesh.add(this.head);

    const hairGeo = new THREE.BoxGeometry(0.35, 0.16, 0.35);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.14, -0.02);
    this.head.add(hair);

    // 3. Arms (Pivots at shoulder)
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.35, 1.3, 0);
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.y = -0.25;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    this.mesh.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.35, 1.3, 0);
    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.y = -0.25;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);
    this.mesh.add(this.rightArmPivot);

    // 4. Legs (Pivots at hip)
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.7, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -0.32;
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoesMat);
    leftShoe.position.set(0, -0.65, 0.05);
    this.leftLegPivot.add(leftShoe);
    this.mesh.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.7, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -0.32;
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoesMat);
    rightShoe.position.set(0, -0.65, 0.05);
    this.rightLegPivot.add(rightShoe);
    this.mesh.add(this.rightLegPivot);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(dt, input) {
    if (this.inVehicle) {
      this.updateInVehicle(dt, input);
    } else {
      this.updateOnFoot(dt, input);
    }
    this.updateCamera(dt);
  }

  updateOnFoot(dt, input) {
    // 1. Determine ground height (road = 0, sidewalk = 0.22)
    const groundY = this.checkSidewalkHeight(this.mesh.position.x, this.mesh.position.z);

    // 2. Sprint & Movement direction relative to camera
    this.isSprinting = input.shift;
    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Camera forward on horizontal XZ plane
    const camFwd = new THREE.Vector3();
    this.camera.getWorldDirection(camFwd);
    camFwd.y = 0;
    camFwd.normalize();

    const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);

    let moveX = 0;
    let moveZ = 0;

    if (input.up) { moveX += camFwd.x; moveZ += camFwd.z; }
    if (input.down) { moveX -= camFwd.x; moveZ -= camFwd.z; }
    if (input.left) { moveX -= camRight.x; moveZ -= camRight.z; }
    if (input.right) { moveX += camRight.x; moveZ += camRight.z; }

    const moveLen = Math.hypot(moveX, moveZ);
    this.isMoving = moveLen > 0.1;

    if (this.isMoving) {
      moveX /= moveLen;
      moveZ /= moveLen;

      // Rotate player to face movement direction smoothly
      const targetYaw = Math.atan2(-moveX, -moveZ);
      let diff = targetYaw - this.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 14);
      this.mesh.rotation.y = this.yaw;

      // Apply horizontal speed
      this.velocity.x = moveX * currentSpeed;
      this.velocity.z = moveZ * currentSpeed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 3. Jump and Gravity
    if (input.space && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // 4. Proposed position
    const nextPos = this.mesh.position.clone();
    nextPos.x += this.velocity.x * dt;
    nextPos.z += this.velocity.z * dt;
    nextPos.y += this.velocity.y * dt;

    // Ground landing check
    if (nextPos.y <= groundY) {
      nextPos.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 5. Static Building Collisions for Character
    this.resolveCharacterCollisions(nextPos);

    this.mesh.position.copy(nextPos);
    this.position.copy(nextPos);

    // 6. Procedural Walking / Running Animation
    this.animateHumanoid(dt);

    // 7. Check nearest vehicle for Enter prompt
    this.findNearbyVehicle();
  }

  animateHumanoid(dt) {
    if (!this.isGrounded) {
      // Jump pose
      this.leftLegPivot.rotation.x = -0.5;
      this.rightLegPivot.rotation.x = 0.3;
      this.leftArmPivot.rotation.x = 1.0;
      this.rightArmPivot.rotation.x = 1.0;
      return;
    }

    if (this.isMoving) {
      const animRate = this.isSprinting ? 15 : 10;
      this.animTime += dt * animRate;

      const stride = Math.sin(this.animTime);
      const armSwing = Math.sin(this.animTime);

      this.leftLegPivot.rotation.x = stride * (this.isSprinting ? 0.8 : 0.55);
      this.rightLegPivot.rotation.x = -stride * (this.isSprinting ? 0.8 : 0.55);

      this.leftArmPivot.rotation.x = -armSwing * (this.isSprinting ? 0.8 : 0.5);
      this.rightArmPivot.rotation.x = armSwing * (this.isSprinting ? 0.8 : 0.5);

      // Torso bobbing
      this.torso.position.y = 1.05 + Math.abs(Math.cos(this.animTime)) * 0.05;
    } else {
      // Idle breathing
      this.animTime += dt * 2.5;
      const breathe = Math.sin(this.animTime) * 0.02;

      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;
      this.leftArmPivot.rotation.x = breathe;
      this.rightArmPivot.rotation.x = -breathe;
      this.torso.position.y = 1.05 + breathe;
    }
  }

  resolveCharacterCollisions(pos) {
    const r = this.colliderRadius;
    const colliders = this.physics.colliders;

    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        pos.x + r > box.min.x && pos.x - r < box.max.x &&
        pos.z + r > box.min.z && pos.z - r < box.max.z
      ) {
        const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x));
        const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const dist = Math.hypot(dx, dz);
        if (dist < r && dist > 0.001) {
          pos.x += (dx / dist) * (r - dist);
          pos.z += (dz / dist) * (r - dist);
        }
      }
    }
  }

  checkSidewalkHeight(x, z) {
    const halfSpan = this.city.cityExtent;
    const step = this.city.stepSize;
    const block = this.city.blockSize;

    // Check if within any block footprint
    for (let gx = 0; gx < this.city.gridSize; gx++) {
      for (let gz = 0; gz < this.city.gridSize; gz++) {
        const bx = -halfSpan + (gx + 0.5) * step;
        const bz = -halfSpan + (gz + 0.5) * step;
        if (Math.abs(x - bx) < block / 2 && Math.abs(z - bz) < block / 2) {
          return 0.22; // Elevated sidewalk curb
        }
      }
    }
    return 0; // Road asphalt level
  }

  findNearbyVehicle() {
    const vehicles = this.physics.vehicles;
    let closest = null;
    let minDist = 4.2;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const dist = this.mesh.position.distanceTo(v.mesh.position);
      if (dist < minDist) {
        minDist = dist;
        closest = v;
      }
    }
    this.nearbyVehicle = closest;
  }

  /**
   * Enter Vehicle
   */
  enterVehicle(vehicle) {
    if (!vehicle) return;
    this.inVehicle = true;
    this.currentVehicle = vehicle;
    vehicle.isPlayerControlled = true;
    vehicle.occupant = this;

    // Hide character model while inside vehicle
    this.mesh.visible = false;

    // Audio notify
    window.soundEngine.init();
    window.soundEngine.resume();

    // Trigger crime if carjacking civilian car
    if (vehicle.type !== 'supercar' && window.game) {
      window.game.onCarjack(vehicle);
    }
  }

  /**
   * Exit Vehicle
   */
  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;
    const v = this.currentVehicle;

    // Place character just outside driver door (left side)
    const rightX = Math.cos(v.yaw);
    const rightZ = -Math.sin(v.yaw);
    const exitPos = new THREE.Vector3(
      v.mesh.position.x - rightX * 2.2,
      v.mesh.position.y + 0.1,
      v.mesh.position.z - rightZ * 2.2
    );

    this.mesh.position.copy(exitPos);
    this.position.copy(exitPos);
    this.yaw = v.yaw + Math.PI / 2;
    this.mesh.rotation.y = this.yaw;
    this.mesh.visible = true;

    // Reset vehicle state
    v.isPlayerControlled = false;
    v.occupant = null;
    v.setInputs(0, 0, false, false);

    this.currentVehicle = null;
    this.inVehicle = false;

    // Stop engine sound
    window.soundEngine.updateEngine(0, 0, false);
  }

  updateInVehicle(dt, input) {
    const v = this.currentVehicle;
    if (!v) return;

    // Map inputs to vehicle controls
    let throttle = 0;
    if (input.up) throttle += 1;
    if (input.down) throttle -= 1;

    let steer = 0;
    if (input.left) steer += 1;
    if (input.right) steer -= 1;

    const handbrake = input.space;
    const boost = input.shift;

    v.setInputs(throttle, steer, handbrake, boost);
    v.update(dt);

    // Update sound engine pitch with RPM and throttle
    const rpmRatio = (v.rpm - 1000) / 6500;
    window.soundEngine.updateEngine(rpmRatio, Math.abs(throttle), true);

    // Horn (H key)
    if (input.horn) {
      window.soundEngine.startHorn();
    } else {
      window.soundEngine.stopHorn();
    }

    // Keep player position synced with car
    this.position.copy(v.mesh.position);
    this.mesh.position.copy(v.mesh.position);
  }

  /**
   * Smooth Dynamic Camera
   */
  updateCamera(dt) {
    if (this.inVehicle && this.currentVehicle) {
      const v = this.currentVehicle;

      // Camera positions based on mode
      if (this.cameraMode === 0) {
        // Dynamic Chase Camera with velocity lag
        const speedRatio = Math.min(1, Math.abs(v.speed) / v.maxSpeed);
        const dist = 6.2 + speedRatio * 1.5;
        const height = 2.6 + speedRatio * 0.4;

        const fwdX = -Math.sin(v.yaw);
        const fwdZ = -Math.cos(v.yaw);

        const targetCamX = v.mesh.position.x - fwdX * dist;
        const targetCamZ = v.mesh.position.z - fwdZ * dist;
        const targetCamY = v.mesh.position.y + height;

        this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 8);
        this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, dt * 8);
        this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, dt * 8);

        const lookAt = new THREE.Vector3(
          v.mesh.position.x + fwdX * 4,
          v.mesh.position.y + 1.2,
          v.mesh.position.z + fwdZ * 4
        );
        this.camera.lookAt(lookAt);

        // Dynamic FOV punch during Nitro boost or high speed
        const targetFov = v.isBoosting ? 82 : (65 + speedRatio * 12);
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
        this.camera.updateProjectionMatrix();

      } else if (this.cameraMode === 1) {
        // Far Cinematic View
        const fwdX = -Math.sin(v.yaw);
        const fwdZ = -Math.cos(v.yaw);
        this.camera.position.set(
          v.mesh.position.x - fwdX * 11,
          v.mesh.position.y + 5.5,
          v.mesh.position.z - fwdZ * 11
        );
        this.camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1.5, v.mesh.position.z);
      } else {
        // Bumper / Hood Cam
        const fwdX = -Math.sin(v.yaw);
        const fwdZ = -Math.cos(v.yaw);
        this.camera.position.set(
          v.mesh.position.x + fwdX * 0.8,
          v.mesh.position.y + 1.25,
          v.mesh.position.z + fwdZ * 0.8
        );
        this.camera.lookAt(
          v.mesh.position.x + fwdX * 25,
          v.mesh.position.y + 1.2,
          v.mesh.position.z + fwdZ * 25
        );
      }
    } else {
      // On Foot Third-Person Follow Camera
      const dist = 5.0;
      const height = 2.4;

      const fwdX = -Math.sin(this.yaw);
      const fwdZ = -Math.cos(this.yaw);

      const targetCamX = this.mesh.position.x - fwdX * dist;
      const targetCamZ = this.mesh.position.z - fwdZ * dist;
      const targetCamY = this.mesh.position.y + height;

      this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 10);
      this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, dt * 10);
      this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, dt * 10);

      this.camera.lookAt(
        this.mesh.position.x,
        this.mesh.position.y + 1.4,
        this.mesh.position.z
      );

      this.camera.fov = 65;
      this.camera.updateProjectionMatrix();
    }
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 3;
  }
}
