/**
 * Procedural 3D City Generator
 * Constructs roads, sidewalks, multi-story buildings, traffic lights, signs, props, and Central Park.
 */
class CityBuilder {
  constructor(scene, physicsEngine) {
    this.scene = scene;
    this.physics = physicsEngine;

    // Grid parameters
    this.gridSize = 5; // 5x5 city blocks
    this.blockSize = 64; // Block size in meters
    this.roadWidth = 18; // Road + Sidewalks
    this.streetWidth = 12; // Asphalt road surface
    this.sidewalkWidth = 3;
    this.stepSize = this.blockSize + this.roadWidth; // 82m per block step
    this.cityExtent = (this.gridSize * this.stepSize) / 2;

    // Collections
    this.buildings = [];
    this.trafficLights = [];
    this.streetLights = [];
    this.ambientProps = [];
    this.parkBounds = null;

    // Road waypoints for traffic AI
    this.roadNetwork = {
      intersections: [],
      lanes: []
    };

    // Shared Materials for high performance
    this.initMaterials();
  }

  initMaterials() {
    // Asphalt road
    this.matRoad = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      roughness: 0.85,
      metalness: 0.1
    });

    // Sidewalk concrete
    this.matSidewalk = new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.9,
      metalness: 0.05
    });

    // Curb edge
    this.matCurb = new THREE.MeshStandardMaterial({
      color: 0x6e7682,
      roughness: 0.95
    });

    // Road markings (yellow & white)
    this.matMarkingYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.matMarkingWhite = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    // Grass
    this.matGrass = new THREE.MeshStandardMaterial({
      color: 0x2e6b30,
      roughness: 0.95,
      metalness: 0.0
    });

    // Building materials palette
    this.buildingMats = [
      new THREE.MeshStandardMaterial({ color: 0x252a34, roughness: 0.3, metalness: 0.7 }), // Sleek dark glass
      new THREE.MeshStandardMaterial({ color: 0x393e46, roughness: 0.4, metalness: 0.5 }), // Slate granite
      new THREE.MeshStandardMaterial({ color: 0x1f3c5b, roughness: 0.25, metalness: 0.8 }), // Modern blue mirror
      new THREE.MeshStandardMaterial({ color: 0x4a4737, roughness: 0.8, metalness: 0.1 }), // Warm concrete/stone
      new THREE.MeshStandardMaterial({ color: 0x1b262c, roughness: 0.2, metalness: 0.9 })  // High-tech skyscraper
    ];

    // Emissive lit windows material
    this.matLitWindow = new THREE.MeshBasicMaterial({
      color: 0xffe699
    });

    // Traffic light materials
    this.matLightRedOff = new THREE.MeshBasicMaterial({ color: 0x330000 });
    this.matLightRedOn = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    this.matLightYellowOff = new THREE.MeshBasicMaterial({ color: 0x332200 });
    this.matLightYellowOn = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
    this.matLightGreenOff = new THREE.MeshBasicMaterial({ color: 0x003311 });
    this.matLightGreenOn = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
  }

  buildCity() {
    this.createGround();
    this.createRoadGrid();
    this.createBlocks();
    this.createStreetFurniture();
    this.buildRoadNetworkWaypoints();
  }

  createGround() {
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x101318,
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createRoadGrid() {
    const halfSpan = this.cityExtent;
    const roadGroup = new THREE.Group();

    // 1. Base asphalt ground for the entire active city grid
    const cityBaseGeo = new THREE.PlaneGeometry(halfSpan * 2 + 60, halfSpan * 2 + 60);
    const cityBase = new THREE.Mesh(cityBaseGeo, this.matRoad);
    cityBase.rotation.x = -Math.PI / 2;
    cityBase.receiveShadow = true;
    roadGroup.add(cityBase);

    // 2. Road markings for avenues and cross streets
    for (let i = 0; i <= this.gridSize; i++) {
      const coord = -halfSpan + i * this.stepSize;

      // Horizontal road markings (along X axis)
      this.addRoadMarkings(roadGroup, 0, coord, halfSpan * 2, true);
      // Vertical road markings (along Z axis)
      this.addRoadMarkings(roadGroup, coord, 0, halfSpan * 2, false);

      // Intersection crosswalks and stop lines
      for (let j = 0; j <= this.gridSize; j++) {
        const crossZ = -halfSpan + j * this.stepSize;
        this.addIntersectionMarkings(roadGroup, coord, crossZ);
        this.createIntersectionTrafficLights(coord, crossZ);
      }
    }

    this.scene.add(roadGroup);
  }

  addRoadMarkings(group, x, z, length, isHorizontal) {
    const markingH = 0.02;

    // Double yellow center divider line
    const yellowGeo = new THREE.PlaneGeometry(isHorizontal ? length : 0.25, isHorizontal ? 0.25 : length);
    const yellow1 = new THREE.Mesh(yellowGeo, this.matMarkingYellow);
    yellow1.rotation.x = -Math.PI / 2;
    yellow1.position.set(x + (isHorizontal ? 0 : -0.25), markingH, z + (isHorizontal ? -0.25 : 0));
    group.add(yellow1);

    const yellow2 = new THREE.Mesh(yellowGeo, this.matMarkingYellow);
    yellow2.rotation.x = -Math.PI / 2;
    yellow2.position.set(x + (isHorizontal ? 0 : 0.25), markingH, z + (isHorizontal ? 0.25 : 0));
    group.add(yellow2);

    // White dashed lane markings
    const dashLength = 3.5;
    const dashGap = 4.5;
    const dashCount = Math.floor(length / (dashLength + dashGap));
    const laneOffset = 3.2; // 2 lanes each direction

    for (let dir = -1; dir <= 1; dir += 2) {
      for (let k = -dashCount / 2; k <= dashCount / 2; k++) {
        const offset = k * (dashLength + dashGap);
        const dashGeo = new THREE.PlaneGeometry(isHorizontal ? dashLength : 0.2, isHorizontal ? 0.2 : dashLength);
        const dash = new THREE.Mesh(dashGeo, this.matMarkingWhite);
        dash.rotation.x = -Math.PI / 2;
        if (isHorizontal) {
          dash.position.set(offset, markingH, z + dir * laneOffset);
        } else {
          dash.position.set(x + dir * laneOffset, markingH, offset);
        }
        group.add(dash);
      }
    }
  }

  addIntersectionMarkings(group, ix, iz) {
    const markingH = 0.025;
    const halfRoad = this.streetWidth / 2;

    // 4 Zebra crosswalks around intersection
    const zebraStripes = 6;
    const stripeWidth = 0.5;
    const stripeLen = 3.0;

    const crosswalkPositions = [
      { x: ix, z: iz - halfRoad - 2, horizontal: true },
      { x: ix, z: iz + halfRoad + 2, horizontal: true },
      { x: ix - halfRoad - 2, z: iz, horizontal: false },
      { x: ix + halfRoad + 2, z: iz, horizontal: false }
    ];

    crosswalkPositions.forEach(cw => {
      for (let s = -zebraStripes / 2; s <= zebraStripes / 2; s++) {
        const stripeGeo = new THREE.PlaneGeometry(cw.horizontal ? stripeLen : stripeWidth, cw.horizontal ? stripeWidth : stripeLen);
        const stripe = new THREE.Mesh(stripeGeo, this.matMarkingWhite);
        stripe.rotation.x = -Math.PI / 2;
        if (cw.horizontal) {
          stripe.position.set(cw.x + s * 1.4, markingH, cw.z);
        } else {
          stripe.position.set(cw.x, markingH, cw.z + s * 1.4);
        }
        group.add(stripe);
      }

      // Stop bar
      const stopBarGeo = new THREE.PlaneGeometry(cw.horizontal ? this.streetWidth * 0.45 : 0.6, cw.horizontal ? 0.6 : this.streetWidth * 0.45);
      const stopBar = new THREE.Mesh(stopBarGeo, this.matMarkingWhite);
      stopBar.rotation.x = -Math.PI / 2;
      const stopOffset = 3.2;
      stopBar.position.set(
        cw.x + (cw.horizontal ? 2.5 : (cw.x > ix ? stopOffset : -stopOffset)),
        markingH,
        cw.z + (!cw.horizontal ? 2.5 : (cw.z > iz ? stopOffset : -stopOffset))
      );
      group.add(stopBar);
    });
  }

  createBlocks() {
    const halfSpan = this.cityExtent;
    const centerIdx = Math.floor(this.gridSize / 2);

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        // Block center coordinate
        const bx = -halfSpan + (gx + 0.5) * this.stepSize;
        const bz = -halfSpan + (gz + 0.5) * this.stepSize;

        // Central Park in center block [2,2]
        if (gx === centerIdx && gz === centerIdx) {
          this.buildCentralPark(bx, bz);
        } else {
          this.buildCityBlock(bx, bz, gx, gz);
        }
      }
    }
  }

  buildCityBlock(bx, bz, gx, gz) {
    const blockGroup = new THREE.Group();

    // 1. Concrete Sidewalk base
    const swH = 0.22;
    const swGeo = new THREE.BoxGeometry(this.blockSize, swH, this.blockSize);
    const sidewalk = new THREE.Mesh(swGeo, this.matSidewalk);
    sidewalk.position.set(bx, swH / 2, bz);
    sidewalk.receiveShadow = true;
    blockGroup.add(sidewalk);

    // 2. Subdivide block into 2x2 or 4 distinct buildings
    const subSize = this.blockSize / 2 - 2;
    const offsets = [
      { x: -subSize / 2 - 1, z: -subSize / 2 - 1 },
      { x: subSize / 2 + 1, z: -subSize / 2 - 1 },
      { x: -subSize / 2 - 1, z: subSize / 2 + 1 },
      { x: subSize / 2 + 1, z: subSize / 2 + 1 }
    ];

    offsets.forEach((off, idx) => {
      // Determine height: taller near center (Downtown), lower near edges
      const distFromCenter = Math.hypot(gx - 2, gz - 2);
      const baseHeight = Math.max(22, 68 - distFromCenter * 16);
      const height = baseHeight + (Math.sin(gx * 5 + gz * 7 + idx) * 14) + Math.random() * 12;

      this.createSkyscraper(bx + off.x, bz + off.z, subSize, height, blockGroup);
    });

    this.scene.add(blockGroup);
  }

  createSkyscraper(x, z, width, height, parentGroup) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Randomize architectural style
    const style = Math.floor(Math.random() * 4);
    const matIndex = Math.floor(Math.random() * this.buildingMats.length);
    const mat = this.buildingMats[matIndex];

    if (style === 0) {
      // Standard Tower with decorative rooftop tier
      const mainGeo = new THREE.BoxGeometry(width, height, width);
      const mainMesh = new THREE.Mesh(mainGeo, mat);
      mainMesh.position.y = height / 2;
      mainMesh.castShadow = true;
      mainMesh.receiveShadow = true;
      group.add(mainMesh);

      // Rooftop tier
      const tierH = height * 0.18;
      const tierW = width * 0.65;
      const tierGeo = new THREE.BoxGeometry(tierW, tierH, tierW);
      const tierMesh = new THREE.Mesh(tierGeo, mat);
      tierMesh.position.y = height + tierH / 2;
      group.add(tierMesh);

      // Antenna spire
      const spireGeo = new THREE.CylinderGeometry(0.2, 0.4, 12, 6);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = height + tierH + 6;
      group.add(spire);

    } else if (style === 1) {
      // Stepped Wedding-Cake Art Deco Tower
      const t1H = height * 0.55;
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(width, t1H, width), mat);
      t1.position.y = t1H / 2;
      group.add(t1);

      const t2H = height * 0.3;
      const t2W = width * 0.78;
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(t2W, t2H, t2W), mat);
      t2.position.y = t1H + t2H / 2;
      group.add(t2);

      const t3H = height * 0.15;
      const t3W = width * 0.55;
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(t3W, t3H, t3W), mat);
      t3.position.y = t1H + t2H + t3H / 2;
      group.add(t3);

    } else if (style === 2) {
      // Cylindrical / Modern Curved Skyscraper
      const cylGeo = new THREE.CylinderGeometry(width * 0.48, width * 0.5, height, 16);
      const cylMesh = new THREE.Mesh(cylGeo, mat);
      cylMesh.position.y = height / 2;
      cylMesh.castShadow = true;
      cylMesh.receiveShadow = true;
      group.add(cylMesh);

      // Helipad on roof
      const heliGeo = new THREE.CylinderGeometry(width * 0.4, width * 0.4, 0.4, 16);
      const heliMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
      const helipad = new THREE.Mesh(heliGeo, heliMat);
      helipad.position.y = height + 0.2;
      group.add(helipad);

      // Helipad 'H' marking
      const hBarGeo = new THREE.PlaneGeometry(width * 0.1, width * 0.35);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const h1 = new THREE.Mesh(hBarGeo, hMat);
      h1.rotation.x = -Math.PI / 2;
      h1.position.set(-width * 0.1, height + 0.45, 0);
      group.add(h1);
      const h2 = new THREE.Mesh(hBarGeo, hMat);
      h2.rotation.x = -Math.PI / 2;
      h2.position.set(width * 0.1, height + 0.45, 0);
      group.add(h2);
      const hCross = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.22, width * 0.08), hMat);
      hCross.rotation.x = -Math.PI / 2;
      hCross.position.set(0, height + 0.45, 0);
      group.add(hCross);

    } else {
      // Commercial Complex with Lower Shopfronts & Rooftop HVAC Units
      const mainGeo = new THREE.BoxGeometry(width, height * 0.85, width);
      const mainMesh = new THREE.Mesh(mainGeo, mat);
      mainMesh.position.y = (height * 0.85) / 2;
      group.add(mainMesh);

      // Rooftop HVAC chillers
      for (let k = 0; k < 3; k++) {
        const hvac = new THREE.Mesh(
          new THREE.BoxGeometry(3, 2, 4),
          new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6 })
        );
        hvac.position.set((k - 1) * 5, height * 0.85 + 1, (k % 2 === 0 ? 3 : -3));
        group.add(hvac);
      }
    }

    // Add glowing Neon Commercial signs on facade
    if (Math.random() > 0.4) {
      this.addNeonSign(group, width);
    }

    // Procedural Window Grid with emissive night illumination
    this.addBuildingWindows(group, width, height);

    // Register Static Physics Collider
    const colliderBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, height / 2, z),
      new THREE.Vector3(width, height, width)
    );
    this.physics.addCollider(colliderBox);

    parentGroup.add(group);
    this.buildings.push(group);
  }

  addNeonSign(buildingGroup, width) {
    const signNames = ["APEX", "CYBER", "NEON", "METRO", "ZENITH", "NIGHTOWL", "HOTEL", "TITAN"];
    const colors = [0x00f0ff, 0xff0055, 0xffaa00, 0x00ff88, 0xaa00ff];
    const name = signNames[Math.floor(Math.random() * signNames.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const signGeo = new THREE.BoxGeometry(width * 0.6, 2.2, 0.4);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 6.5, width / 2 + 0.2);

    // Neon text bar
    const neonBarGeo = new THREE.PlaneGeometry(width * 0.55, 1.4);
    const neonMat = new THREE.MeshBasicMaterial({ color: color });
    const neonBar = new THREE.Mesh(neonBarGeo, neonMat);
    neonBar.position.z = 0.22;
    signMesh.add(neonBar);

    buildingGroup.add(signMesh);
  }

  addBuildingWindows(group, width, height) {
    const floors = Math.floor(height / 3.5);
    const cols = Math.floor(width / 3.5);
    if (floors <= 0 || cols <= 0) return;

    // Window mesh planes
    const winGeo = new THREE.PlaneGeometry(1.2, 1.8);
    const halfW = width / 2 + 0.05;

    // We selectively add clusters of lit windows to keep draw calls lightweight and fast
    const winGroup = new THREE.Group();
    for (let f = 2; f < floors; f += 2) {
      for (let c = 0; c < cols; c += 2) {
        if (Math.random() > 0.4) {
          const xOff = (c - cols / 2 + 0.5) * 3.2;
          const yOff = f * 3.5;

          // South face window
          const win1 = new THREE.Mesh(winGeo, this.matLitWindow);
          win1.position.set(xOff, yOff, halfW);
          winGroup.add(win1);

          // North face window
          const win2 = new THREE.Mesh(winGeo, this.matLitWindow);
          win2.rotation.y = Math.PI;
          win2.position.set(xOff, yOff, -halfW);
          winGroup.add(win2);
        }
      }
    }
    group.add(winGroup);
  }

  buildCentralPark(bx, bz) {
    const parkGroup = new THREE.Group();
    parkGroup.position.set(bx, 0, bz);

    this.parkBounds = {
      minX: bx - this.blockSize / 2,
      maxX: bx + this.blockSize / 2,
      minZ: bz - this.blockSize / 2,
      maxZ: bz + this.blockSize / 2
    };

    // 1. Lush Grass Lawn
    const grassGeo = new THREE.BoxGeometry(this.blockSize, 0.2, this.blockSize);
    const grass = new THREE.Mesh(grassGeo, this.matGrass);
    grass.position.y = 0.1;
    grass.receiveShadow = true;
    parkGroup.add(grass);

    // 2. Crosswalk pathways (stone paths)
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x999080, roughness: 0.9 });
    const pathGeoH = new THREE.BoxGeometry(this.blockSize - 2, 0.22, 6);
    const pathH = new THREE.Mesh(pathGeoH, pathMat);
    pathH.position.y = 0.11;
    parkGroup.add(pathH);

    const pathGeoV = new THREE.BoxGeometry(6, 0.22, this.blockSize - 2);
    const pathV = new THREE.Mesh(pathGeoV, pathMat);
    pathV.position.y = 0.11;
    parkGroup.add(pathV);

    // 3. Central Fountain
    const basinGeo = new THREE.CylinderGeometry(7, 7.5, 1.2, 20);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.7 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.position.y = 0.6;
    parkGroup.add(basin);

    // Fountain water
    const waterGeo = new THREE.CylinderGeometry(6.6, 6.6, 0.2, 20);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0099cc,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 1.1;
    parkGroup.add(water);

    // Tiered fountain column
    const colGeo = new THREE.CylinderGeometry(1.2, 1.8, 3.5, 12);
    const col = new THREE.Mesh(colGeo, basinMat);
    col.position.y = 2.2;
    parkGroup.add(col);

    // Register fountain collider
    const fountainBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(bx, 1.5, bz),
      new THREE.Vector3(14, 3, 14)
    );
    this.physics.addCollider(fountainBox);

    // 4. Park Trees
    const treePositions = [
      { x: -18, z: -18 }, { x: 18, z: -18 },
      { x: -18, z: 18 },  { x: 18, z: 18 },
      { x: -12, z: -22 }, { x: 12, z: -22 },
      { x: -22, z: 0 },   { x: 22, z: 0 },
      { x: 0, z: -22 },   { x: 0, z: 22 }
    ];

    treePositions.forEach(tp => {
      this.createTree(parkGroup, tp.x, tp.z);
    });

    // 5. Park Benches
    const benchPositions = [
      { x: -9, z: 5, rot: Math.PI / 2 },
      { x: 9, z: 5, rot: -Math.PI / 2 },
      { x: -9, z: -5, rot: Math.PI / 2 },
      { x: 9, z: -5, rot: -Math.PI / 2 }
    ];

    benchPositions.forEach(bp => {
      this.createBench(parkGroup, bp.x, bp.z, bp.rot);
    });

    this.scene.add(parkGroup);
  }

  createTree(parentGroup, x, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage Clusters
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x245a2b,
      roughness: 0.8
    });

    // 3 tiered spheres for stylized rich canopy
    const tiers = [
      { y: 3.8, r: 2.2 },
      { y: 5.2, r: 1.8 },
      { y: 6.4, r: 1.2 }
    ];

    tiers.forEach(t => {
      const folGeo = new THREE.SphereGeometry(t.r, 8, 8);
      const foliage = new THREE.Mesh(folGeo, foliageMat);
      foliage.position.y = t.y;
      foliage.castShadow = true;
      treeGroup.add(foliage);
    });

    parentGroup.add(treeGroup);
  }

  createBench(parentGroup, x, z, rot) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0.2, z);
    benchGroup.rotation.y = rot;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x734822, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.7), woodMat);
    seat.position.y = 0.45;
    benchGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.1), woodMat);
    back.position.set(0, 0.8, -0.3);
    benchGroup.add(back);

    // Legs
    for (let lx = -1; lx <= 1; lx += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.7), metalMat);
      leg.position.set(lx * 1.05, 0.22, 0);
      benchGroup.add(leg);
    }

    parentGroup.add(benchGroup);
  }

  createIntersectionTrafficLights(ix, iz) {
    const lightGroup = new THREE.Group();
    lightGroup.position.set(ix, 0, iz);

    const halfRoad = this.streetWidth / 2 + 1.2;

    // 4 corners of intersection
    const corners = [
      { x: -halfRoad, z: -halfRoad, rot: 0, isEW: false },
      { x: halfRoad, z: -halfRoad, rot: -Math.PI / 2, isEW: true },
      { x: halfRoad, z: halfRoad, rot: Math.PI, isEW: false },
      { x: -halfRoad, z: halfRoad, rot: Math.PI / 2, isEW: true }
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.7 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const cornerLights = [];

    corners.forEach(c => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6.5, 8), poleMat);
      pole.position.set(c.x, 3.25, c.z);
      lightGroup.add(pole);

      // Overhead horizontal arm extending over lane
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 8), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = c.rot;
      arm.position.set(c.x + Math.sin(c.rot) * 2.0, 6.2, c.z + Math.cos(c.rot) * 2.0);
      lightGroup.add(arm);

      // Traffic Signal Housing Box
      const sigBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.5), boxMat);
      sigBox.position.set(c.x + Math.sin(c.rot) * 3.6, 5.5, c.z + Math.cos(c.rot) * 3.6);
      sigBox.rotation.y = c.rot;
      lightGroup.add(sigBox);

      // Signal Lenses (Red, Yellow, Green)
      const lensGeo = new THREE.SphereGeometry(0.2, 8, 8);

      const redLens = new THREE.Mesh(lensGeo, this.matLightRedOff.clone());
      redLens.position.set(0, 0.55, 0.25);
      sigBox.add(redLens);

      const yelLens = new THREE.Mesh(lensGeo, this.matLightYellowOff.clone());
      yelLens.position.set(0, 0, 0.25);
      sigBox.add(yelLens);

      const grnLens = new THREE.Mesh(lensGeo, this.matLightGreenOff.clone());
      grnLens.position.set(0, -0.55, 0.25);
      sigBox.add(grnLens);

      cornerLights.push({
        isEW: c.isEW,
        redLens,
        yelLens,
        grnLens
      });
    });

    this.scene.add(lightGroup);

    // Register into traffic controller list
    this.trafficLights.push({
      x: ix,
      z: iz,
      lights: cornerLights,
      state: 'NS_GREEN', // 'NS_GREEN' -> 'NS_YELLOW' -> 'EW_GREEN' -> 'EW_YELLOW'
      timer: Math.random() * 8 // Desynchronize slightly for natural realism
    });
  }

  createStreetFurniture() {
    const halfSpan = this.cityExtent;

    // Modern Streetlights along every block edge
    for (let gx = 0; gx <= this.gridSize; gx++) {
      const rx = -halfSpan + gx * this.stepSize;
      for (let gz = 0; gz < this.gridSize; gz++) {
        const rz = -halfSpan + (gz + 0.5) * this.stepSize;
        this.addStreetlight(rx - this.streetWidth / 2 - 1.2, rz, 0);
        this.addStreetlight(rx + this.streetWidth / 2 + 1.2, rz, Math.PI);
      }
    }

    // Street Signs (STOP signs, Speed limits)
    for (let gx = 0; gx <= this.gridSize; gx++) {
      for (let gz = 0; gz <= this.gridSize; gz++) {
        const ix = -halfSpan + gx * this.stepSize;
        const iz = -halfSpan + gz * this.stepSize;
        this.addStopSign(ix + this.streetWidth / 2 + 2, iz - this.streetWidth / 2 - 2);
      }
    }

    // Fire hydrants & Bus stops
    for (let i = 0; i < 16; i++) {
      const hx = -halfSpan + (Math.floor(Math.random() * this.gridSize) + 0.5) * this.stepSize + (Math.random() - 0.5) * 40;
      const hz = -halfSpan + Math.floor(Math.random() * (this.gridSize + 1)) * this.stepSize + (Math.random() > 0.5 ? 7 : -7);
      this.addFireHydrant(hx, hz);
    }
  }

  addStreetlight(x, z, rot) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a404a, metalness: 0.8 });

    // Vertical pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8), metalMat);
    pole.position.y = 3.75;
    group.add(pole);

    // Overhanging lamp arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), metalMat);
    arm.position.set(0, 7.4, 1.0);
    group.add(arm);

    // Lamp fixture housing
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x15181f });
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.8), fixtureMat);
    fixture.position.set(0, 7.3, 2.0);
    group.add(fixture);

    // Emissive bulb lens
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.6), bulbMat);
    bulb.position.set(0, 7.18, 2.0);
    group.add(bulb);

    // Ground Spot/Point Light (activated dynamically at night)
    const lampLight = new THREE.PointLight(0xfffaed, 0, 22, 1.8);
    lampLight.position.set(0, 7.0, 2.0);
    group.add(lampLight);

    this.scene.add(group);
    this.streetLights.push({ group, bulb, lampLight });
  }

  addStopSign(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), poleMat);
    pole.position.y = 1.4;
    group.add(pole);

    // Red octagonal sign plate
    const octGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 8);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xdd1111 });
    const oct = new THREE.Mesh(octGeo, redMat);
    oct.rotation.x = Math.PI / 2;
    oct.position.y = 2.4;
    group.add(oct);

    // Inner white border
    const whiteBorderGeo = new THREE.RingGeometry(0.35, 0.4, 8);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(whiteBorderGeo, borderMat);
    ring.position.set(0, 2.4, 0.03);
    group.add(ring);

    this.scene.add(group);
  }

  addFireHydrant(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.2, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.7, 8), redMat);
    barrel.position.y = 0.35;
    group.add(barrel);

    // Cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), redMat);
    cap.position.y = 0.7;
    group.add(cap);

    // Side nozzles
    const noz1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), silverMat);
    noz1.rotation.z = Math.PI / 2;
    noz1.position.set(0.22, 0.4, 0);
    group.add(noz1);

    const noz2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), silverMat);
    noz2.rotation.z = Math.PI / 2;
    noz2.position.set(-0.22, 0.4, 0);
    group.add(noz2);

    this.scene.add(group);
  }

  /**
   * Builds road lane waypoints for autonomous traffic AI
   */
  buildRoadNetworkWaypoints() {
    const halfSpan = this.cityExtent;

    // Collect intersection center points
    for (let gx = 0; gx <= this.gridSize; gx++) {
      for (let gz = 0; gz <= this.gridSize; gz++) {
        const ix = -halfSpan + gx * this.stepSize;
        const iz = -halfSpan + gz * this.stepSize;
        this.roadNetwork.intersections.push({ x: ix, z: iz, gx, gz });
      }
    }

    // Build directed road lane paths
    const laneOffset = 2.8; // Distance from center divider
    for (let gx = 0; gx <= this.gridSize; gx++) {
      const rx = -halfSpan + gx * this.stepSize;
      // Northbound lane (Z increasing)
      this.roadNetwork.lanes.push({
        from: { x: rx + laneOffset, z: -halfSpan },
        to: { x: rx + laneOffset, z: halfSpan },
        dir: new THREE.Vector3(0, 0, 1),
        type: 'NS'
      });
      // Southbound lane (Z decreasing)
      this.roadNetwork.lanes.push({
        from: { x: rx - laneOffset, z: halfSpan },
        to: { x: rx - laneOffset, z: -halfSpan },
        dir: new THREE.Vector3(0, 0, -1),
        type: 'NS'
      });
    }

    for (let gz = 0; gz <= this.gridSize; gz++) {
      const rz = -halfSpan + gz * this.stepSize;
      // Eastbound lane (X increasing)
      this.roadNetwork.lanes.push({
        from: { x: -halfSpan, z: rz - laneOffset },
        to: { x: halfSpan, z: rz - laneOffset },
        dir: new THREE.Vector3(1, 0, 0),
        type: 'EW'
      });
      // Westbound lane (X decreasing)
      this.roadNetwork.lanes.push({
        from: { x: halfSpan, z: rz + laneOffset },
        to: { x: -halfSpan, z: rz + laneOffset },
        dir: new THREE.Vector3(-1, 0, 0),
        type: 'EW'
      });
    }
  }

  /**
   * Update Traffic Lights Cycles (Green -> Yellow -> Red -> Green)
   */
  updateTrafficLights(dt) {
    const greenTime = 12.0;
    const yellowTime = 3.0;

    for (let i = 0; i < this.trafficLights.length; i++) {
      const tl = this.trafficLights[i];
      tl.timer += dt;

      if (tl.state === 'NS_GREEN' && tl.timer > greenTime) {
        tl.state = 'NS_YELLOW';
        tl.timer = 0;
      } else if (tl.state === 'NS_YELLOW' && tl.timer > yellowTime) {
        tl.state = 'EW_GREEN';
        tl.timer = 0;
      } else if (tl.state === 'EW_GREEN' && tl.timer > greenTime) {
        tl.state = 'EW_YELLOW';
        tl.timer = 0;
      } else if (tl.state === 'EW_YELLOW' && tl.timer > yellowTime) {
        tl.state = 'NS_GREEN';
        tl.timer = 0;
      }

      // Update lamp materials
      const nsIsGreen = tl.state === 'NS_GREEN';
      const nsIsYellow = tl.state === 'NS_YELLOW';
      const ewIsGreen = tl.state === 'EW_GREEN';
      const ewIsYellow = tl.state === 'EW_YELLOW';

      for (let j = 0; j < tl.lights.length; j++) {
        const item = tl.lights[j];
        if (!item.isEW) {
          // North-South lights
          item.redLens.material = (!nsIsGreen && !nsIsYellow) ? this.matLightRedOn : this.matLightRedOff;
          item.yelLens.material = nsIsYellow ? this.matLightYellowOn : this.matLightYellowOff;
          item.grnLens.material = nsIsGreen ? this.matLightGreenOn : this.matLightGreenOff;
        } else {
          // East-West lights
          item.redLens.material = (!ewIsGreen && !ewIsYellow) ? this.matLightRedOn : this.matLightRedOff;
          item.yelLens.material = ewIsYellow ? this.matLightYellowOn : this.matLightYellowOff;
          item.grnLens.material = ewIsGreen ? this.matLightGreenOn : this.matLightGreenOff;
        }
      }
    }
  }

  /**
   * Day/Night lighting transitions for streetlights and windows
   */
  setNightIntensity(factor) {
    // factor: 0 (Day) -> 1 (Midnight)
    const bulbColor = factor > 0.35 ? 0xffeaad : 0x444444;
    const lightIntensity = Math.max(0, (factor - 0.25) * 1.5);

    this.streetLights.forEach(sl => {
      sl.bulb.material.color.setHex(bulbColor);
      sl.lampLight.intensity = lightIntensity * 1.4;
    });

    // Lit window emissive glow
    if (this.matLitWindow) {
      this.matLitWindow.color.setRGB(
        0.3 + factor * 0.7,
        0.25 + factor * 0.65,
        0.1 + factor * 0.4
      );
    }
  }
}
