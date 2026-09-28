/**
 * METROPOLIS 3D - Pedestrian Simulation Engine
 * Procedural humanoid pedestrians with natural swinging walk cycles,
 * varied attire, sidewalk navigation, crosswalk crossing, and dynamic umbrellas during rain.
 */

class PedestrianSystem {
  constructor(scene, cityBuilder, weatherSystem) {
    this.scene = scene;
    this.city = cityBuilder;
    this.weather = weatherSystem;

    this.pedestrians = [];
    this.pedestrianCount = 65;

    this.init();
  }

  init() {
    this.spawnPedestrians();
  }

  spawnPedestrians() {
    const halfSpan = (this.city.gridSize * this.city.totalStride) / 2;

    for (let i = 0; i < this.pedestrianCount; i++) {
      const ped = this.createPedestrianMesh();

      // Distribute some in Central Park, most along sidewalks
      let x, z, dirX = 0, dirZ = 0;

      if (i < 20) {
        // Central Park strolling
        const parkX = -halfSpan + 2 * this.city.totalStride + this.city.totalStride / 2;
        const parkZ = -halfSpan + 2.5 * this.city.totalStride + this.city.totalStride / 2;
        x = parkX + (Math.random() - 0.5) * 60;
        z = parkZ + (Math.random() - 0.5) * 120;
        const angle = Math.random() * Math.PI * 2;
        dirX = Math.cos(angle);
        dirZ = Math.sin(angle);
      } else {
        // Sidewalk strolling along blocks
        const gx = Math.floor(Math.random() * this.city.gridSize);
        const gz = Math.floor(Math.random() * this.city.gridSize);
        const bx = -halfSpan + gx * this.city.totalStride + this.city.totalStride / 2;
        const bz = -halfSpan + gz * this.city.totalStride + this.city.totalStride / 2;
        const halfB = this.city.blockSize / 2;

        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // North sidewalk
          x = bx + (Math.random() - 0.5) * (this.city.blockSize - 8);
          z = bz - halfB + 2.5;
          dirX = Math.random() < 0.5 ? 1 : -1;
        } else if (side === 1) { // South sidewalk
          x = bx + (Math.random() - 0.5) * (this.city.blockSize - 8);
          z = bz + halfB - 2.5;
          dirX = Math.random() < 0.5 ? 1 : -1;
        } else if (side === 2) { // West sidewalk
          x = bx - halfB + 2.5;
          z = bz + (Math.random() - 0.5) * (this.city.blockSize - 8);
          dirZ = Math.random() < 0.5 ? 1 : -1;
        } else { // East sidewalk
          x = bx + halfB - 2.5;
          z = bz + (Math.random() - 0.5) * (this.city.blockSize - 8);
          dirZ = Math.random() < 0.5 ? 1 : -1;
        }
      }

      ped.mesh.position.set(x, 0.45, z);
      this.scene.add(ped.mesh);

      this.pedestrians.push({
        mesh: ped.mesh,
        leftLeg: ped.leftLeg,
        rightLeg: ped.rightLeg,
        leftArm: ped.leftArm,
        rightArm: ped.rightArm,
        umbrella: ped.umbrella,
        dirX: dirX,
        dirZ: dirZ,
        speed: 2.8 + Math.random() * 1.6,
        walkCycle: Math.random() * 10,
        turnTimer: 5 + Math.random() * 10
      });
    }
  }

  createPedestrianMesh() {
    const group = new THREE.Group();

    // Random colors
    const clothingColors = [
      0x1e3a8a, 0xb91c1c, 0x047857, 0x4338ca, 0x0f172a,
      0xd97706, 0x475569, 0xbe185d, 0x0284c7
    ];
    const pantsColors = [0x1e293b, 0x334155, 0x172554, 0x4b5563];
    const skinTones = [0xfbcfe8, 0xfcd34d, 0xd97706, 0x78350f];

    const shirtMat = new THREE.MeshStandardMaterial({
      color: clothingColors[Math.floor(Math.random() * clothingColors.length)],
      roughness: 0.8
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColors[Math.floor(Math.random() * pantsColors.length)],
      roughness: 0.85
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTones[Math.floor(Math.random() * skinTones.length)],
      roughness: 0.7
    });

    // Torso / Jacket
    const torsoGeo = new THREE.BoxGeometry(0.75, 1.0, 0.45);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.6;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.32, 10, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.45;
    head.castShadow = true;
    group.add(head);

    // Left Leg
    const legGeo = new THREE.BoxGeometry(0.28, 1.1, 0.3);
    legGeo.translate(0, -0.55, 0); // pivot at hip
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.2, 1.1, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.2, 1.1, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.2, 0.9, 0.22);
    armGeo.translate(0, -0.45, 0); // pivot at shoulder
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.5, 2.05, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.5, 2.05, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Umbrella (Opens in rain/storm)
    const umbrellaGroup = new THREE.Group();
    const canopyGeo = new THREE.ConeGeometry(1.4, 0.5, 12, 1, true);
    canopyGeo.rotateX(Math.PI);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: clothingColors[Math.floor(Math.random() * clothingColors.length)],
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 1.3;
    umbrellaGroup.add(canopy);

    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.65;
    umbrellaGroup.add(shaft);

    umbrellaGroup.position.set(0.4, 1.5, 0.2);
    umbrellaGroup.visible = false;
    group.add(umbrellaGroup);

    return {
      mesh: group,
      leftLeg: leftLeg,
      rightLeg: rightLeg,
      leftArm: leftArm,
      rightArm: rightArm,
      umbrella: umbrellaGroup
    };
  }

  update(delta) {
    const isRaining = this.weather.currentWeather === 'rain' || this.weather.currentWeather === 'storm';

    this.pedestrians.forEach(p => {
      // Umbrella toggle
      if (p.umbrella.visible !== isRaining) {
        p.umbrella.visible = isRaining;
      }

      // Walking locomotion
      p.walkCycle += delta * p.speed * 2.2;
      const legAngle = Math.sin(p.walkCycle) * 0.45;
      const armAngle = Math.cos(p.walkCycle) * 0.45;

      p.leftLeg.rotation.x = legAngle;
      p.rightLeg.rotation.x = -legAngle;
      p.leftArm.rotation.x = -armAngle;

      if (!isRaining) {
        p.rightArm.rotation.x = armAngle;
      } else {
        // Holding umbrella up
        p.rightArm.rotation.x = -1.2;
      }

      // Move pedestrian
      p.mesh.position.x += p.dirX * p.speed * delta;
      p.mesh.position.z += p.dirZ * p.speed * delta;

      // Face direction of movement
      if (Math.abs(p.dirX) > 0.01 || Math.abs(p.dirZ) > 0.01) {
        p.mesh.rotation.y = Math.atan2(p.dirX, p.dirZ);
      }

      // Turn around when hitting grid boundary or timer
      p.turnTimer -= delta;
      const bound = (this.city.gridSize * this.city.totalStride) / 2 + 10;
      if (Math.abs(p.mesh.position.x) > bound || Math.abs(p.mesh.position.z) > bound || p.turnTimer <= 0) {
        p.dirX = -p.dirX;
        p.dirZ = -p.dirZ;
        p.turnTimer = 8 + Math.random() * 12;
      }
    });
  }
}

window.PedestrianSystem = PedestrianSystem;
