/**
 * 3D Vehicle Models & Interactive Car Mechanics
 * Supports Supercar, Muscle Car, Police Cruiser, Taxi, and Sedan types.
 */
class Vehicle {
  constructor(scene, physics, type = 'supercar', options = {}) {
    this.scene = scene;
    this.physics = physics;
    this.type = type;

    // Dynamics parameters
    this.isPlayerControlled = false;
    this.isPhysicsActive = true;
    this.occupant = null; // Reference to Player or NPC driver

    // Tuning specs based on vehicle archetype
    this.setupSpecs(type);

    // Dynamic State
    this.speed = 0;
    this.velX = 0;
    this.velZ = 0;
    this.yaw = options.yaw || 0;
    this.throttle = 0; // -1 to +1
    this.targetSteer = 0; // -1 to +1
    this.steerAngle = 0;
    this.handbrake = false;
    this.isBoosting = false;
    this.nitroFuel = 100;
    this.maxNitro = 100;
    this.damage = 0;
    this.maxDamage = 100;

    // Lighting & visual state
    this.headlightsOn = true;
    this.isBraking = false;
    this.isReversing = false;
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Meshes & nodes
    this.mesh = new THREE.Group();
    this.chassisMesh = null;
    this.wheels = [];
    this.frontLeftWheel = null;
    this.frontRightWheel = null;
    this.headlights = [];
    this.taillightLenses = [];
    this.policeLightbar = null;
    this.exhaustFlames = [];

    // Build 3D vehicle hierarchy
    this.buildModel(options.color);

    // Initial position
    if (options.pos) {
      this.mesh.position.copy(options.pos);
    }
    this.mesh.rotation.y = this.yaw;

    this.scene.add(this.mesh);
    this.physics.registerVehicle(this);
  }

  setupSpecs(type) {
    switch (type) {
      case 'supercar':
        this.maxSpeed = 48; // ~107 mph
        this.maxReverseSpeed = 15;
        this.acceleration = 24;
        this.reverseAcceleration = 12;
        this.brakeForce = 34;
        this.friction = 4.5;
        this.baseGrip = 0.95;
        this.colliderRadius = 1.7;
        this.bodyDimensions = { w: 2.1, h: 1.15, l: 4.4 };
        break;

      case 'police':
        this.maxSpeed = 44; // ~98 mph
        this.maxReverseSpeed = 14;
        this.acceleration = 22;
        this.reverseAcceleration = 10;
        this.brakeForce = 32;
        this.friction = 4.2;
        this.baseGrip = 0.92;
        this.colliderRadius = 1.8;
        this.bodyDimensions = { w: 2.15, h: 1.35, l: 4.6 };
        break;

      case 'muscle':
        this.maxSpeed = 42; // ~94 mph
        this.maxReverseSpeed = 14;
        this.acceleration = 26; // High initial torque
        this.reverseAcceleration = 11;
        this.brakeForce = 30;
        this.friction = 4.0;
        this.baseGrip = 0.85; // Tail-happy drift prone
        this.colliderRadius = 1.8;
        this.bodyDimensions = { w: 2.2, h: 1.28, l: 4.7 };
        break;

      case 'taxi':
        this.maxSpeed = 36; // ~80 mph
        this.maxReverseSpeed = 12;
        this.acceleration = 18;
        this.reverseAcceleration = 9;
        this.brakeForce = 28;
        this.friction = 4.0;
        this.baseGrip = 0.90;
        this.colliderRadius = 1.75;
        this.bodyDimensions = { w: 2.05, h: 1.35, l: 4.5 };
        break;

      case 'sedan':
      default:
        this.maxSpeed = 34;
        this.maxReverseSpeed = 12;
        this.acceleration = 16;
        this.reverseAcceleration = 8;
        this.brakeForce = 26;
        this.friction = 4.0;
        this.baseGrip = 0.88;
        this.colliderRadius = 1.7;
        this.bodyDimensions = { w: 2.0, h: 1.3, l: 4.4 };
        break;
    }
  }

  buildModel(paintColor) {
    const defaultColors = {
      supercar: 0x00d4ff,
      muscle: 0xff3b30,
      police: 0x111111,
      taxi: 0xffcc00,
      sedan: 0x4a6572
    };
    const bodyColor = paintColor || defaultColors[this.type] || 0x336699;

    // Chassis Group (receives suspension pitch & roll)
    this.chassisMesh = new THREE.Group();
    this.mesh.add(this.chassisMesh);

    // Shared Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.65
    });
    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x15181c,
      roughness: 0.5,
      metalness: 0.3
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111822,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85
    });

    const dim = this.bodyDimensions;

    // 1. Lower Body Shell
    const lowerBodyGeo = new THREE.BoxGeometry(dim.w, dim.h * 0.55, dim.l);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMat);
    lowerBody.position.y = 0.55 + (dim.h * 0.55) / 2;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisMesh.add(lowerBody);

    // 2. Cabin / Greenhouse
    const cabinH = dim.h * 0.45;
    const cabinW = dim.w * 0.82;
    const cabinL = dim.l * 0.52;
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, lowerBody.position.y + (dim.h * 0.55) / 2 + cabinH / 2 - 0.05, -dim.l * 0.04);
    cabin.castShadow = true;
    this.chassisMesh.add(cabin);

    // Roof cap
    const roofGeo = new THREE.BoxGeometry(cabinW * 0.96, 0.08, cabinL * 0.9);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, cabin.position.y + cabinH / 2 + 0.04, cabin.position.z);
    this.chassisMesh.add(roof);

    // Front Bumper & Grill
    const grillGeo = new THREE.BoxGeometry(dim.w * 0.8, 0.3, 0.15);
    const grill = new THREE.Mesh(grillGeo, blackTrimMat);
    grill.position.set(0, 0.6, -dim.l / 2 - 0.08);
    this.chassisMesh.add(grill);

    // 3. Type-Specific Customizations
    if (this.type === 'supercar') {
      // Rear Wing / Spoiler
      const wingGeo = new THREE.BoxGeometry(dim.w * 0.9, 0.06, 0.4);
      const wing = new THREE.Mesh(wingGeo, blackTrimMat);
      wing.position.set(0, lowerBody.position.y + 0.5, dim.l / 2 - 0.2);
      this.chassisMesh.add(wing);

      // Wing Struts
      for (let s = -0.6; s <= 0.6; s += 1.2) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.15), blackTrimMat);
        strut.position.set(s, lowerBody.position.y + 0.25, dim.l / 2 - 0.2);
        this.chassisMesh.add(strut);
      }
    } else if (this.type === 'police') {
      // White Doors Livery
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      for (let side = -1; side <= 1; side += 2) {
        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, dim.h * 0.48, dim.l * 0.38), doorMat);
        doorPanel.position.set(side * (dim.w / 2 + 0.02), lowerBody.position.y, 0);
        this.chassisMesh.add(doorPanel);
      }

      // Police Roof Emergency Lightbar
      this.buildPoliceLightbar(roof.position.y);

      // Front Push Bullbar
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(dim.w * 0.6, 0.6, 0.2), blackTrimMat);
      bullbar.position.set(0, 0.65, -dim.l / 2 - 0.16);
      this.chassisMesh.add(bullbar);
    } else if (this.type === 'taxi') {
      // Chequered side decals
      const cheqMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      for (let side = -1; side <= 1; side += 2) {
        const decal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, dim.l * 0.7), cheqMat);
        decal.position.set(side * (dim.w / 2 + 0.02), lowerBody.position.y, 0);
        this.chassisMesh.add(decal);
      }
      // Roof Taxi Sign
      const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      signBox.position.set(0, roof.position.y + 0.18, 0);
      this.chassisMesh.add(signBox);
    } else if (this.type === 'muscle') {
      // Hood Scoop / Supercharger blower
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.9), blackTrimMat);
      scoop.position.set(0, lowerBody.position.y + (dim.h * 0.55) / 2 + 0.1, -dim.l * 0.25);
      this.chassisMesh.add(scoop);
    }

    // 4. Headlights & Taillights
    this.buildLights(dim);

    // 5. Exhaust Pipes & Turbo Jet Flames
    this.buildExhausts(dim);

    // 6. Wheels & Tires
    this.buildWheels(dim);
  }

  buildPoliceLightbar(roofY) {
    const barGroup = new THREE.Group();
    barGroup.position.set(0, roofY + 0.14, -0.15);

    const baseGeo = new THREE.BoxGeometry(1.2, 0.1, 0.25);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    barGroup.add(base);

    // Red lens (left)
    const redGeo = new THREE.BoxGeometry(0.5, 0.16, 0.22);
    this.matPoliceRed = new THREE.MeshBasicMaterial({ color: 0x440000 });
    const redMesh = new THREE.Mesh(redGeo, this.matPoliceRed);
    redMesh.position.x = -0.32;
    barGroup.add(redMesh);

    // Blue lens (right)
    const blueGeo = new THREE.BoxGeometry(0.5, 0.16, 0.22);
    this.matPoliceBlue = new THREE.MeshBasicMaterial({ color: 0x000044 });
    const blueMesh = new THREE.Mesh(blueGeo, this.matPoliceBlue);
    blueMesh.position.x = 0.32;
    barGroup.add(blueMesh);

    // Real strobe point lights
    this.strobeLightRed = new THREE.PointLight(0xff0033, 0, 30, 2);
    this.strobeLightRed.position.set(-0.35, 0.2, 0);
    barGroup.add(this.strobeLightRed);

    this.strobeLightBlue = new THREE.PointLight(0x0066ff, 0, 30, 2);
    this.strobeLightBlue.position.set(0.35, 0.2, 0);
    barGroup.add(this.strobeLightBlue);

    this.chassisMesh.add(barGroup);
    this.policeLightbar = barGroup;
  }

  buildLights(dim) {
    const halfW = dim.w / 2 - 0.25;
    const frontZ = -dim.l / 2 - 0.05;
    const rearZ = dim.l / 2 + 0.05;
    const lightY = 0.72;

    // Headlight Lens Material
    this.matHeadlightOn = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lensGeo = new THREE.BoxGeometry(0.35, 0.18, 0.05);

    [-halfW, halfW].forEach(x => {
      // 3D Lens mesh
      const lens = new THREE.Mesh(lensGeo, this.matHeadlightOn);
      lens.position.set(x, lightY, frontZ);
      this.chassisMesh.add(lens);

      // Real Spotlight beam on the road
      const spot = new THREE.SpotLight(0xfff5e0, 2.5, 55, Math.PI / 6, 0.4, 1.2);
      spot.position.set(x, lightY, frontZ);
      // Target pointing ahead
      const target = new THREE.Object3D();
      target.position.set(x, 0, frontZ - 30);
      this.scene.add(target);
      spot.target = target;
      this.scene.add(spot);
      this.headlights.push({ spot, target, lens });
    });

    // Taillights
    this.matTaillightOff = new THREE.MeshBasicMaterial({ color: 0x660000 });
    this.matTaillightOn = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const tailGeo = new THREE.BoxGeometry(0.38, 0.16, 0.05);

    [-halfW, halfW].forEach(x => {
      const tailLens = new THREE.Mesh(tailGeo, this.matTaillightOff.clone());
      tailLens.position.set(x, lightY, rearZ);
      this.chassisMesh.add(tailLens);
      this.taillightLenses.push(tailLens);
    });
  }

  buildExhausts(dim) {
    const rearZ = dim.l / 2 + 0.02;
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9 });

    [-0.5, 0.5].forEach(x => {
      const pipe = new THREE.Mesh(pipeGeo, chromeMat);
      pipe.position.set(x, 0.38, rearZ);
      this.chassisMesh.add(pipe);

      // Nitro thrust flame cone
      const flameGeo = new THREE.ConeGeometry(0.14, 0.8, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, 0.38, rearZ + 0.45);
      flame.visible = false;
      this.chassisMesh.add(flame);
      this.exhaustFlames.push(flame);
    });
  }

  buildWheels(dim) {
    const wheelR = 0.4;
    const wheelW = 0.32;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.85, roughness: 0.2 });

    const wheelX = dim.w / 2 - 0.05;
    const wheelY = wheelR;
    const frontZ = -dim.l * 0.32;
    const rearZ = dim.l * 0.32;

    const wheelData = [
      { x: -wheelX, y: wheelY, z: frontZ, isFront: true, isLeft: true },
      { x: wheelX, y: wheelY, z: frontZ, isFront: true, isLeft: false },
      { x: -wheelX, y: wheelY, z: rearZ, isFront: false, isLeft: true },
      { x: wheelX, y: wheelY, z: rearZ, isFront: false, isLeft: false }
    ];

    wheelData.forEach(wd => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wd.x, wd.y, wd.z);

      // Wheel assembly
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;

      // Rim spokes
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.65, wheelR * 0.65, wheelW + 0.02, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      tire.add(rim);

      steerPivot.add(tire);
      this.mesh.add(steerPivot);

      const wheelObj = { pivot: steerPivot, mesh: tire, isFront: wd.isFront };
      this.wheels.push(wheelObj);

      if (wd.isFront) {
        if (wd.isLeft) this.frontLeftWheel = steerPivot;
        else this.frontRightWheel = steerPivot;
      }
    });
  }

  /**
   * Per-Frame Vehicle Visual Updates
   */
  update(dt) {
    // 1. Front Wheel Steering angle
    if (this.frontLeftWheel) this.frontLeftWheel.rotation.y = this.steerAngle;
    if (this.frontRightWheel) this.frontRightWheel.rotation.y = this.steerAngle;

    // 2. Wheel spin rotation based on forward distance travelled
    const wheelCircumference = 2 * Math.PI * 0.4;
    const spinAngle = (this.speed * dt) / wheelCircumference * Math.PI * 2;
    this.wheels.forEach(w => {
      w.mesh.rotation.x -= spinAngle;
    });

    // 3. Update Headlights position in world space
    this.headlights.forEach(hl => {
      hl.spot.visible = this.headlightsOn;
      hl.lens.material.color.setHex(this.headlightsOn ? 0xffffff : 0x333333);
      if (this.headlightsOn) {
        const worldPos = new THREE.Vector3();
        hl.lens.getWorldPosition(worldPos);
        hl.spot.position.copy(worldPos);

        const fwdX = -Math.sin(this.yaw);
        const fwdZ = -Math.cos(this.yaw);
        hl.target.position.set(worldPos.x + fwdX * 25, 0, worldPos.z + fwdZ * 25);
      }
    });

    // 4. Taillight brightness (Braking vs Normal vs Reversing)
    const braking = (this.throttle < 0 && this.speed > 0.5) || this.handbrake;
    const reversing = this.speed < -0.5;

    this.taillightLenses.forEach(tl => {
      if (braking) {
        tl.material.color.setHex(0xff0022); // Bright brake red
      } else if (reversing) {
        tl.material.color.setHex(0xffffff); // White reverse
      } else {
        tl.material.color.setHex(0x550000); // Dim tail marker
      }
    });

    // 5. Police Siren Strobes
    if (this.type === 'police' && this.sirenActive) {
      this.sirenTimer += dt * 9;
      const phase = Math.floor(this.sirenTimer) % 2;
      if (phase === 0) {
        this.matPoliceRed.color.setHex(0xff1122);
        this.matPoliceBlue.color.setHex(0x000033);
        this.strobeLightRed.intensity = 3.5;
        this.strobeLightBlue.intensity = 0;
      } else {
        this.matPoliceRed.color.setHex(0x330000);
        this.matPoliceBlue.color.setHex(0x0077ff);
        this.strobeLightRed.intensity = 0;
        this.strobeLightBlue.intensity = 3.5;
      }
    } else if (this.type === 'police') {
      if (this.matPoliceRed) {
        this.matPoliceRed.color.setHex(0x330000);
        this.matPoliceBlue.color.setHex(0x000033);
        this.strobeLightRed.intensity = 0;
        this.strobeLightBlue.intensity = 0;
      }
    }

    // 6. Exhaust Nitro Flames
    this.exhaustFlames.forEach(flame => {
      flame.visible = this.isBoosting && this.speed > 8;
      if (flame.visible) {
        const pulse = 0.8 + Math.random() * 0.4;
        flame.scale.set(pulse, pulse * 1.3, pulse);
      }
    });

    // 7. Nitro recharge / depletion
    if (this.isBoosting) {
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 28);
      if (this.nitroFuel <= 0) this.isBoosting = false;
    } else {
      this.nitroFuel = Math.min(this.maxNitro, this.nitroFuel + dt * 10);
    }
  }

  setInputs(throttle, steer, handbrake, boost) {
    this.throttle = throttle;
    this.targetSteer = steer;
    this.handbrake = handbrake;
    this.isBoosting = boost && this.nitroFuel > 10;
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
  }

  destroy() {
    this.physics.unregisterVehicle(this);
    this.headlights.forEach(hl => {
      this.scene.remove(hl.spot);
      this.scene.remove(hl.target);
    });
    this.scene.remove(this.mesh);
  }
}
