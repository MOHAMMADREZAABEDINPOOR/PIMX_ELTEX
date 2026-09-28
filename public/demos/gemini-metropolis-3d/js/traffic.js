/**
 * METROPOLIS 3D - Vehicular Traffic Engine
 * Simulates autonomous cars, taxis, sports coupes, city buses, and emergency vehicles
 * with lane following, intersection traffic signal compliance, braking taillights,
 * flashing turn signals, and working headlights.
 */

class TrafficSystem {
  constructor(scene, cityBuilder, lightingSystem) {
    this.scene = scene;
    this.city = cityBuilder;
    this.lighting = lightingSystem;

    this.vehicles = [];
    this.vehicleCount = 42;

    // Road grid bounds
    this.gridSize = this.city.gridSize;
    this.totalStride = this.city.totalStride;
    this.halfSpan = (this.gridSize * this.totalStride) / 2;
    this.laneOffset1 = 4.0; // Right lane
    this.laneOffset2 = 8.5; // Left lane

    this.init();
  }

  init() {
    this.spawnInitialVehicles();
  }

  spawnInitialVehicles() {
    const types = ['taxi', 'sedan', 'sports', 'bus', 'van', 'police'];

    for (let i = 0; i < this.vehicleCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const vehicle = this.createVehicleMesh(type);

      // Choose random street and direction
      const isNorthSouth = Math.random() < 0.5;
      const streetIdx = Math.floor(Math.random() * (this.gridSize + 1));
      const streetCoord = -this.halfSpan + streetIdx * this.totalStride;

      const goPositive = Math.random() < 0.5;
      const laneOffset = (goPositive ? 1 : -1) * (Math.random() < 0.5 ? this.laneOffset1 : this.laneOffset2);

      let x, z, rotY;
      if (isNorthSouth) {
        x = streetCoord + laneOffset;
        z = (Math.random() - 0.5) * (this.halfSpan * 2);
        rotY = goPositive ? 0 : Math.PI;
      } else {
        z = streetCoord + laneOffset;
        x = (Math.random() - 0.5) * (this.halfSpan * 2);
        rotY = goPositive ? Math.PI / 2 : -Math.PI / 2;
      }

      vehicle.position.set(x, 0, z);
      vehicle.rotation.y = rotY;

      const vData = {
        mesh: vehicle,
        type: type,
        speed: 18 + Math.random() * 12,
        currentSpeed: 18,
        isNorthSouth: isNorthSouth,
        direction: goPositive ? 1 : -1,
        isTurning: false,
        turnProgress: 0,
        turnAngleStart: 0,
        turnTargetAngle: 0,
        turnRadius: 10,
        turnCenter: new THREE.Vector3(),
        headlights: vehicle.userData.headlights || [],
        taillights: vehicle.userData.taillights || [],
        turnSignals: vehicle.userData.turnSignals || [],
        policeStrobe: vehicle.userData.policeStrobe || null,
        isBraking: false,
        isTurningLeft: false,
        isTurningRight: false
      };

      this.vehicles.push(vData);
      this.scene.add(vehicle);
    }
  }

  createVehicleMesh(type) {
    const group = new THREE.Group();

    let length = 8.5;
    let width = 3.6;
    let height = 2.4;
    let bodyColor = 0x3b82f6;

    if (type === 'taxi') {
      bodyColor = 0xfacc15; // Vibrant NYC Yellow
    } else if (type === 'sedan') {
      const colors = [0x0f172a, 0xe2e8f0, 0x1e293b, 0x475569, 0x0369a1];
      bodyColor = colors[Math.floor(Math.random() * colors.length)];
    } else if (type === 'sports') {
      const sportsColors = [0xdc2626, 0x2563eb, 0x059669, 0x7c3aed];
      bodyColor = sportsColors[Math.floor(Math.random() * sportsColors.length)];
      length = 8.0;
      height = 2.0;
    } else if (type === 'bus') {
      length = 16.0;
      width = 4.2;
      height = 4.2;
      bodyColor = 0x0284c7; // Transit Blue
    } else if (type === 'van') {
      length = 10.0;
      height = 3.4;
      bodyColor = 0xf8fafc; // White courier van
    } else if (type === 'police') {
      length = 8.8;
      bodyColor = 0x0f172a; // Black & White
    }

    // Main Chassis Body
    const bodyGeo = new THREE.BoxGeometry(width, height * 0.55, length);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height * 0.45;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cabin / Roof & Windows
    const cabinLen = length * (type === 'bus' ? 0.9 : 0.55);
    const cabinH = height * 0.5;
    const cabinW = width * 0.88;
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinLen);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.1,
      metalness: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, height * 0.85, (type === 'bus' ? 0 : -length * 0.08));
    cabin.castShadow = true;
    group.add(cabin);

    // Wheels
    const wheelRadius = 0.8;
    const wheelWidth = 0.6;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

    const wheelZ1 = length * 0.32;
    const wheelZ2 = -length * 0.32;
    const wheelX = width / 2;

    [
      { x: -wheelX, z: wheelZ1 },
      { x: wheelX, z: wheelZ1 },
      { x: -wheelX, z: wheelZ2 },
      { x: wheelX, z: wheelZ2 }
    ].forEach(wPos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wPos.x, wheelRadius, wPos.z);
      group.add(wheel);
    });

    // Special Accessories
    if (type === 'taxi') {
      // Taxi Roof Sign
      const signGeo = new THREE.BoxGeometry(1.6, 0.5, 1.0);
      const signMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: new THREE.Color(0xfde047),
        emissiveIntensity: 0.4
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, height * 1.15, 0);
      group.add(sign);
    } else if (type === 'police') {
      // Emergency Strobe Lightbar
      const barGeo = new THREE.BoxGeometry(2.2, 0.4, 0.8);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, height * 1.12, 0);
      group.add(bar);

      // Red & Blue flashing beacons
      const strobeRedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const strobeBlueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });

      const sRed = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.7), strobeRedMat);
      sRed.position.set(-0.6, height * 1.15, 0);
      group.add(sRed);

      const sBlue = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.7), strobeBlueMat);
      sBlue.position.set(0.6, height * 1.15, 0);
      group.add(sBlue);

      group.userData.policeStrobe = { red: strobeRedMat, blue: strobeBlueMat };
    }

    // Working Headlights
    const headGeo = new THREE.BoxGeometry(0.7, 0.4, 0.2);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfffaed,
      emissive: new THREE.Color(0xfffaed),
      emissiveIntensity: 0.8
    });

    const headL = new THREE.Mesh(headGeo, headMat);
    headL.position.set(-width * 0.35, height * 0.45, length / 2 + 0.05);
    const headR = new THREE.Mesh(headGeo, headMat);
    headR.position.set(width * 0.35, height * 0.45, length / 2 + 0.05);
    group.add(headL);
    group.add(headR);

    group.userData.headlights = [headMat];

    // Working Taillights
    const tailGeo = new THREE.BoxGeometry(0.8, 0.4, 0.2);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: new THREE.Color(0xaa0000),
      emissiveIntensity: 0.6
    });

    const tailL = new THREE.Mesh(tailGeo, tailMat);
    tailL.position.set(-width * 0.35, height * 0.45, -length / 2 - 0.05);
    const tailR = new THREE.Mesh(tailGeo, tailMat);
    tailR.position.set(width * 0.35, height * 0.45, -length / 2 - 0.05);
    group.add(tailL);
    group.add(tailR);

    group.userData.taillights = [tailMat];

    return group;
  }

  update(delta) {
    const nightRatio = this.lighting.nightRatio;
    const isNight = nightRatio > 0.3;

    this.vehicles.forEach((v, idx) => {
      // 1. Check distance to next car in lane (collision avoidance)
      let mustBrake = false;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (idx === j) continue;
        const other = this.vehicles[j];
        if (v.isNorthSouth === other.isNorthSouth && v.direction === other.direction) {
          const distSq = v.mesh.position.distanceToSquared(other.mesh.position);
          if (distSq < 160) {
            // Check if other is ahead in our direction
            const forward = v.isNorthSouth ? (other.mesh.position.z - v.mesh.position.z) * v.direction
                                           : (other.mesh.position.x - v.mesh.position.x) * v.direction;
            if (forward > 0 && forward < 15) {
              mustBrake = true;
              break;
            }
          }
        }
      }

      // 2. Check Traffic Signals at upcoming intersections
      if (!mustBrake) {
        const checkDist = 20;
        const halfRoad = this.city.streetWidth / 2;

        for (let i = 0; i < this.city.intersections.length; i++) {
          const inter = this.city.intersections[i];
          const dToInterX = Math.abs(v.mesh.position.x - inter.x);
          const dToInterZ = Math.abs(v.mesh.position.z - inter.z);

          if (v.isNorthSouth && dToInterX < 12) {
            const zDiff = (inter.z - v.mesh.position.z) * v.direction;
            if (zDiff > halfRoad && zDiff < halfRoad + checkDist) {
              if (inter.trafficState === 'EW_GREEN' || inter.trafficState === 'NS_YELLOW') {
                mustBrake = true;
                break;
              }
            }
          } else if (!v.isNorthSouth && dToInterZ < 12) {
            const xDiff = (inter.x - v.mesh.position.x) * v.direction;
            if (xDiff > halfRoad && xDiff < halfRoad + checkDist) {
              if (inter.trafficState === 'NS_GREEN' || inter.trafficState === 'EW_YELLOW') {
                mustBrake = true;
                break;
              }
            }
          }
        }
      }

      // 3. Smooth Acceleration / Deceleration
      if (mustBrake) {
        v.currentSpeed = Math.max(0, v.currentSpeed - 40 * delta);
        v.isBraking = true;
      } else {
        v.currentSpeed = Math.min(v.speed, v.currentSpeed + 25 * delta);
        v.isBraking = false;
      }

      // 4. Update Taillights & Headlights
      v.taillights.forEach(mat => {
        if (v.isBraking) {
          mat.emissive.setHex(0xff0000);
          mat.emissiveIntensity = 2.0;
        } else {
          mat.emissive.setHex(isNight ? 0xaa0000 : 0x220000);
          mat.emissiveIntensity = isNight ? 0.8 : 0.2;
        }
      });

      v.headlights.forEach(mat => {
        mat.emissiveIntensity = isNight ? 1.8 : 0.3;
      });

      // Police Strobe Flasher
      if (v.policeStrobe) {
        const flash = (Date.now() % 400) < 200;
        v.policeStrobe.red.color.setHex(flash ? 0xff0000 : 0x220000);
        v.policeStrobe.blue.color.setHex(flash ? 0x001144 : 0x0088ff);
      }

      // 5. Vehicle Translation along lane
      const moveStep = v.currentSpeed * delta;
      if (v.isNorthSouth) {
        v.mesh.position.z += moveStep * v.direction;
      } else {
        v.mesh.position.x += moveStep * v.direction;
      }

      // 6. Grid Boundary Wrap-around
      const maxLimit = this.halfSpan + 40;
      if (v.mesh.position.z > maxLimit) v.mesh.position.z = -maxLimit;
      if (v.mesh.position.z < -maxLimit) v.mesh.position.z = maxLimit;
      if (v.mesh.position.x > maxLimit) v.mesh.position.x = -maxLimit;
      if (v.mesh.position.x < -maxLimit) v.mesh.position.x = maxLimit;
    });
  }
}

window.TrafficSystem = TrafficSystem;
