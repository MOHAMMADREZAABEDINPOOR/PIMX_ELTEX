/**
 * METROPOLIS 3D - Procedural City Architecture & Urban Detail Engine
 * Generates skyscrapers, avenues, sidewalks, intersections, Central Park,
 * street furniture, animated digital billboards, and window reflection maps.
 */

class CityBuilder {
  constructor(scene, lightingSystem, weatherSystem) {
    this.scene = scene;
    this.lighting = lightingSystem;
    this.weather = weatherSystem;

    // City Grid Dimensions
    this.gridSize = 6; // 6x6 blocks = 36 zones
    this.blockSize = 92; // unit size of a city block
    this.streetWidth = 26; // width of 4-lane roads
    this.sidewalkWidth = 5.5; // width of pedestrian sidewalk
    this.totalStride = this.blockSize + this.streetWidth; // ~118 units per block step

    // Tracking collections
    this.buildings = [];
    this.windowMaterials = [];
    this.streetLamps = [];
    this.trafficLights = [];
    this.billboardCanvases = [];
    this.animatedBillboards = [];
    this.hazardLights = [];
    this.parkTrees = [];
    this.intersections = [];

    // Shared Materials & Textures
    this.textures = {};
    this.materials = {};

    this.init();
  }

  init() {
    this.createProceduralTextures();
    this.createMaterials();
    this.buildCityGroundAndStreets();
    this.buildCityBlocks();
    this.buildCentralPark();
    this.buildStreetFurniture();
    this.buildAnimatedBillboards();

    // Hook lighting updates to window emissives and streetlights
    if (this.lighting) {
      this.lighting.onLightingUpdate = (nightRatio, timeOfDay) => {
        this.updateNightLighting(nightRatio, timeOfDay);
      };
    }
  }

  /* ==========================================================================
     Procedural Textures Generation (Zero external image dependencies)
     ========================================================================== */
  createProceduralTextures() {
    // 1. Asphalt Road Texture with lane markings
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const rCtx = roadCanvas.getContext('2d');

    // Dark asphalt base with grain
    rCtx.fillStyle = '#1c1f26';
    rCtx.fillRect(0, 0, 1024, 1024);

    // Asphalt subtle grain noise
    for (let i = 0; i < 20000; i++) {
      const g = Math.floor(Math.random() * 20 + 20);
      rCtx.fillStyle = `rgb(${g},${g},${g})`;
      rCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    // Double yellow center divider lines
    rCtx.fillStyle = '#f59e0b';
    rCtx.fillRect(506, 0, 4, 1024);
    rCtx.fillRect(514, 0, 4, 1024);

    // Dashed white lane lines
    rCtx.fillStyle = '#e2e8f0';
    rCtx.setLineDash([40, 30]);
    rCtx.lineWidth = 4;

    rCtx.beginPath();
    rCtx.moveTo(256, 0);
    rCtx.lineTo(256, 1024);
    rCtx.stroke();

    rCtx.beginPath();
    rCtx.moveTo(768, 0);
    rCtx.lineTo(768, 1024);
    rCtx.stroke();

    // Solid white shoulder lines
    rCtx.setLineDash([]);
    rCtx.lineWidth = 5;
    rCtx.beginPath();
    rCtx.moveTo(35, 0);
    rCtx.lineTo(35, 1024);
    rCtx.moveTo(989, 0);
    rCtx.lineTo(989, 1024);
    rCtx.stroke();

    this.textures.road = new THREE.CanvasTexture(roadCanvas);
    this.textures.road.wrapS = THREE.RepeatWrapping;
    this.textures.road.wrapT = THREE.RepeatWrapping;

    // 2. Concrete Sidewalk Texture with slabs and expansion joints
    const swCanvas = document.createElement('canvas');
    swCanvas.width = 512;
    swCanvas.height = 512;
    const swCtx = swCanvas.getContext('2d');

    swCtx.fillStyle = '#64748b';
    swCtx.fillRect(0, 0, 512, 512);

    // Concrete noise
    for (let i = 0; i < 15000; i++) {
      const v = Math.floor(Math.random() * 30 + 100);
      swCtx.fillStyle = `rgb(${v},${v},${v})`;
      swCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Grid joints
    swCtx.strokeStyle = '#334155';
    swCtx.lineWidth = 3;
    const step = 64;
    for (let x = 0; x <= 512; x += step) {
      swCtx.beginPath();
      swCtx.moveTo(x, 0);
      swCtx.lineTo(x, 512);
      swCtx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      swCtx.beginPath();
      swCtx.moveTo(0, y);
      swCtx.lineTo(512, y);
      swCtx.stroke();
    }

    this.textures.sidewalk = new THREE.CanvasTexture(swCanvas);
    this.textures.sidewalk.wrapS = THREE.RepeatWrapping;
    this.textures.sidewalk.wrapT = THREE.RepeatWrapping;

    // 3. Skyscraper Windows Day Texture & Night Emissive Texture
    this.createWindowTextures();

    // 4. Zebra Crosswalk Texture
    const cwCanvas = document.createElement('canvas');
    cwCanvas.width = 256;
    cwCanvas.height = 256;
    const cwCtx = cwCanvas.getContext('2d');
    cwCtx.fillStyle = '#1c1f26';
    cwCtx.fillRect(0, 0, 256, 256);
    cwCtx.fillStyle = '#f1f5f9';
    for (let y = 16; y < 256; y += 48) {
      cwCtx.fillRect(10, y, 236, 24);
    }
    this.textures.crosswalk = new THREE.CanvasTexture(cwCanvas);

    // 5. Helipad H Markings
    const heliCanvas = document.createElement('canvas');
    heliCanvas.width = 512;
    heliCanvas.height = 512;
    const hCtx = heliCanvas.getContext('2d');
    hCtx.fillStyle = '#1e293b';
    hCtx.fillRect(0, 0, 512, 512);

    // Outer circle
    hCtx.strokeStyle = '#facc15';
    hCtx.lineWidth = 18;
    hCtx.beginPath();
    hCtx.arc(256, 256, 210, 0, Math.PI * 2);
    hCtx.stroke();

    // Red inner ring
    hCtx.strokeStyle = '#ef4444';
    hCtx.lineWidth = 8;
    hCtx.beginPath();
    hCtx.arc(256, 256, 180, 0, Math.PI * 2);
    hCtx.stroke();

    // Big Yellow "H"
    hCtx.fillStyle = '#facc15';
    hCtx.font = 'bold 220px sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('H', 256, 256);

    this.textures.helipad = new THREE.CanvasTexture(heliCanvas);
  }

  createWindowTextures() {
    // Diffuse / Specular Window Canvas
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 512;
    winCanvas.height = 512;
    const wCtx = winCanvas.getContext('2d');

    // Emissive Canvas (Night lights)
    const emCanvas = document.createElement('canvas');
    emCanvas.width = 512;
    emCanvas.height = 512;
    const eCtx = emCanvas.getContext('2d');

    // Dark frames base
    wCtx.fillStyle = '#0a101d';
    wCtx.fillRect(0, 0, 512, 512);
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    const cols = 16;
    const rows = 16;
    const cellW = 512 / cols;
    const cellH = 512 / rows;
    const pad = 3;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + pad;
        const y = r * cellH + pad;
        const w = cellW - pad * 2;
        const h = cellH - pad * 2;

        // Daytime reflective glass tint (azure/cyan tinted glass)
        const glassTint = Math.random() < 0.5 ? '#172554' : '#0f172a';
        wCtx.fillStyle = glassTint;
        wCtx.fillRect(x, y, w, h);

        // Randomly illuminate windows for night
        if (Math.random() < 0.62) {
          // Warm amber, soft white, or cyber cyan office lights
          const lightType = Math.random();
          let lightColor = '#fef08a'; // warm amber default
          if (lightType < 0.4) {
            lightColor = '#fffbeb'; // soft white
          } else if (lightType < 0.7) {
            lightColor = '#fde047'; // amber
          } else if (lightType < 0.88) {
            lightColor = '#bae6fd'; // cool fluorescent office
          } else {
            lightColor = '#f43f5e'; // decorative red/pink interior
          }

          eCtx.fillStyle = lightColor;
          eCtx.fillRect(x, y, w, h);

          // Office blinds or silhouettes
          if (Math.random() < 0.4) {
            eCtx.fillStyle = 'rgba(0,0,0,0.45)';
            eCtx.fillRect(x, y, w, h * 0.4);
          }
        }
      }
    }

    this.textures.window = new THREE.CanvasTexture(winCanvas);
    this.textures.window.wrapS = THREE.RepeatWrapping;
    this.textures.window.wrapT = THREE.RepeatWrapping;

    this.textures.windowEmissive = new THREE.CanvasTexture(emCanvas);
    this.textures.windowEmissive.wrapS = THREE.RepeatWrapping;
    this.textures.windowEmissive.wrapT = THREE.RepeatWrapping;
  }

  createMaterials() {
    // Road Material
    this.materials.road = new THREE.MeshStandardMaterial({
      map: this.textures.road,
      roughness: 0.78,
      metalness: 0.12
    });
    this.weather.registerWetMaterial(this.materials.road);

    // Sidewalk Material
    this.materials.sidewalk = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalk,
      roughness: 0.85,
      metalness: 0.08
    });
    this.weather.registerWetMaterial(this.materials.sidewalk);

    // Curb Stone Material
    this.materials.curb = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.05
    });

    // Skyscraper Glass Material (High reflectivity with environment map)
    this.materials.glass = new THREE.MeshStandardMaterial({
      map: this.textures.window,
      emissiveMap: this.textures.windowEmissive,
      emissive: new THREE.Color(0x000000),
      roughness: 0.06, // Crisp mirror reflections!
      metalness: 0.88,
      envMapIntensity: 1.6
    });
    this.windowMaterials.push(this.materials.glass);

    // Dark Steel / Frame Material
    this.materials.steel = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.8
    });

    // Art Deco Granite / Limestone Material
    this.materials.limestone = new THREE.MeshStandardMaterial({
      color: 0xc4b5a4,
      map: this.textures.window,
      emissiveMap: this.textures.windowEmissive,
      emissive: new THREE.Color(0x000000),
      roughness: 0.4,
      metalness: 0.3
    });
    this.windowMaterials.push(this.materials.limestone);

    // Brushed Aluminum / Titanium Trim
    this.materials.aluminum = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.95
    });

    // Bronze / Copper Accent
    this.materials.bronze = new THREE.MeshStandardMaterial({
      color: 0xca8a04,
      roughness: 0.3,
      metalness: 0.75
    });

    // Park Grass Material
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 256;
    grassCanvas.height = 256;
    const gCtx = grassCanvas.getContext('2d');
    gCtx.fillStyle = '#166534';
    gCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      gCtx.fillStyle = Math.random() < 0.5 ? '#15803d' : '#14532d';
      gCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(8, 8);

    this.materials.grass = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.95,
      metalness: 0.05
    });

    // Park Water Fountain Material
    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.02,
      metalness: 0.92,
      transparent: true,
      opacity: 0.85
    });
  }

  /* ==========================================================================
     Ground & Street Infrastructure
     ========================================================================== */
  buildCityGroundAndStreets() {
    const halfSpan = (this.gridSize * this.totalStride) / 2;
    const totalArea = halfSpan * 2 + 100;

    // Foundation Base
    const baseGeo = new THREE.PlaneGeometry(totalArea + 200, totalArea + 200);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = -0.1;
    baseMesh.receiveShadow = true;
    this.scene.add(baseMesh);

    // Build Intersecting Streets and Avenues Grid
    for (let i = 0; i <= this.gridSize; i++) {
      const coord = -halfSpan + i * this.totalStride;

      // North-South Avenues
      const roadGeoZ = new THREE.PlaneGeometry(this.streetWidth, totalArea);
      const roadMeshZ = new THREE.Mesh(roadGeoZ, this.materials.road);
      roadMeshZ.rotation.x = -Math.PI / 2;
      roadMeshZ.position.set(coord, 0.05, 0);
      roadMeshZ.receiveShadow = true;
      this.scene.add(roadMeshZ);

      // East-West Streets
      const roadGeoX = new THREE.PlaneGeometry(totalArea, this.streetWidth);
      const roadMeshX = new THREE.Mesh(roadGeoX, this.materials.road);
      roadMeshX.rotation.x = -Math.PI / 2;
      roadMeshX.rotation.z = Math.PI / 2;
      roadMeshX.position.set(0, 0.06, coord);
      roadMeshX.receiveShadow = true;
      this.scene.add(roadMeshX);
    }

    // Build Intersections and Zebra Crosswalks
    for (let gx = 0; gx <= this.gridSize; gx++) {
      const ix = -halfSpan + gx * this.totalStride;
      for (let gz = 0; gz <= this.gridSize; gz++) {
        const iz = -halfSpan + gz * this.totalStride;

        this.intersections.push({
          x: ix,
          z: iz,
          trafficState: (gx + gz) % 2 === 0 ? 'NS_GREEN' : 'EW_GREEN',
          timer: Math.random() * 8,
          lights: []
        });

        // Add 4 pedestrian crosswalks around each intersection
        const halfRoad = this.streetWidth / 2;
        const cwWidth = 18;
        const cwLength = 6.5;

        // North crosswalk
        this.addCrosswalk(ix, iz - halfRoad - cwLength / 2, cwWidth, cwLength, 0);
        // South crosswalk
        this.addCrosswalk(ix, iz + halfRoad + cwLength / 2, cwWidth, cwLength, 0);
        // East crosswalk
        this.addCrosswalk(ix + halfRoad + cwLength / 2, iz, cwLength, cwWidth, Math.PI / 2);
        // West crosswalk
        this.addCrosswalk(ix - halfRoad - cwLength / 2, iz, cwLength, cwWidth, Math.PI / 2);
      }
    }
  }

  addCrosswalk(x, z, width, depth, rotation) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mat = new THREE.MeshStandardMaterial({
      map: this.textures.crosswalk,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    this.weather.registerWetMaterial(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotation;
    mesh.position.set(x, 0.08, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  /* ==========================================================================
     City Blocks & Skyscrapers Generator
     ========================================================================== */
  buildCityBlocks() {
    const halfSpan = (this.gridSize * this.totalStride) / 2;

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        // Reserve center blocks for Central Park & Civic Plaza!
        if (gx === 2 && gz === 2) {
          continue; // Central Park North
        }
        if (gx === 2 && gz === 3) {
          continue; // Central Park South
        }

        const blockCenterX = -halfSpan + gx * this.totalStride + this.totalStride / 2;
        const blockCenterZ = -halfSpan + gz * this.totalStride + this.totalStride / 2;

        this.buildBlockSidewalk(blockCenterX, blockCenterZ);
        this.populateBlockWithSkyscrapers(blockCenterX, blockCenterZ, gx, gz);
      }
    }
  }

  buildBlockSidewalk(cx, cz) {
    const swSize = this.blockSize;
    const swHeight = 0.45;

    // Elevated concrete sidewalk slab
    const swGeo = new THREE.BoxGeometry(swSize, swHeight, swSize);
    const swMesh = new THREE.Mesh(swGeo, this.materials.sidewalk);
    swMesh.position.set(cx, swHeight / 2, cz);
    swMesh.receiveShadow = true;
    swMesh.castShadow = true;
    this.scene.add(swMesh);
  }

  populateBlockWithSkyscrapers(cx, cz, gx, gz) {
    // Decide layout of the block:
    // Some blocks have 1 supertall skyscraper, others have 2-4 mid/high-rises
    const isFinancialCore = (gx === 3 && gz === 2) || (gx === 3 && gz === 3) || (gx === 1 && gz === 2);
    const distFromCenter = Math.hypot(gx - 2.5, gz - 2.5);

    if (isFinancialCore) {
      // Mega Supertall Skyscraper (Type 1 or Type 3)
      if (Math.random() < 0.5) {
        this.createCrystalSupertall(cx, cz);
      } else {
        this.createSkybridgeTwinTowers(cx, cz);
      }
    } else if (distFromCenter < 2.0) {
      // High-Rise Avenue: 1-2 major towers + 2 mid-rise buildings
      if (Math.random() < 0.6) {
        this.createArtDecoTower(cx - 16, cz - 16);
        this.createModernCommercialTower(cx + 18, cz + 18, 140);
        this.createLoftBuilding(cx - 18, cz + 18, 55);
        this.createLoftBuilding(cx + 18, cz - 18, 70);
      } else {
        this.createTerracedResidentialTower(cx, cz);
      }
    } else {
      // Perimeter blocks: 4 varied mid-rises & commercial lofts
      const offsets = [
        { x: -20, z: -20, h: 90 + Math.random() * 40 },
        { x: 20, z: -20, h: 80 + Math.random() * 50 },
        { x: -20, z: 20, h: 70 + Math.random() * 45 },
        { x: 20, z: 20, h: 105 + Math.random() * 40 }
      ];

      offsets.forEach(off => {
        if (Math.random() < 0.45) {
          this.createModernCommercialTower(cx + off.x, cz + off.z, off.h);
        } else {
          this.createLoftBuilding(cx + off.x, cz + off.z, off.h);
        }
      });
    }
  }

  /* ==========================================================================
     Skyscraper Style 1: The Crystal Obelisk Supertall
     ========================================================================== */
  createCrystalSupertall(x, z) {
    const group = new THREE.Group();
    const height = 280;
    const baseW = 44;
    const topW = 24;

    // Tapered glass monolithic tower
    const towerGeo = new THREE.CylinderGeometry(topW / 2, baseW / 2, height, 4, 1);
    // Rotate 45 deg for square cross section
    towerGeo.rotateY(Math.PI / 4);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.glass);
    towerMesh.position.y = height / 2;
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    group.add(towerMesh);

    // Diagrid exterior structural steel braces
    const braceGeo = new THREE.BoxGeometry(baseW + 0.5, 3.5, baseW + 0.5);
    for (let h = 40; h < height; h += 45) {
      const scale = (height - h) / height * 0.45 + 0.55;
      const ring = new THREE.Mesh(braceGeo, this.materials.steel);
      ring.position.y = h;
      ring.scale.set(scale, 1, scale);
      ring.castShadow = true;
      group.add(ring);
    }

    // Top Observation Deck & Crown
    const crownGeo = new THREE.BoxGeometry(topW + 2, 8, topW + 2);
    const crown = new THREE.Mesh(crownGeo, this.materials.aluminum);
    crown.position.y = height + 4;
    crown.castShadow = true;
    group.add(crown);

    // Helipad on Rooftop
    const heliGeo = new THREE.CylinderGeometry(11, 11, 1.2, 24);
    const heliMat = new THREE.MeshStandardMaterial({
      map: this.textures.helipad,
      roughness: 0.6,
      metalness: 0.2
    });
    const helipad = new THREE.Mesh(heliGeo, heliMat);
    helipad.position.y = height + 8.5;
    helipad.castShadow = true;
    group.add(helipad);

    // Red Aviation Hazard Light on top of spire
    const spireGeo = new THREE.ConeGeometry(0.8, 28, 8);
    const spire = new THREE.Mesh(spireGeo, this.materials.steel);
    spire.position.y = height + 22;
    spire.castShadow = true;
    group.add(spire);

    const beaconGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = height + 36;
    group.add(beacon);
    this.hazardLights.push(beaconMat);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Skyscraper Style 2: Stepped Art Deco Spire Tower
     ========================================================================== */
  createArtDecoTower(x, z) {
    const group = new THREE.Group();
    const tiers = [
      { w: 34, d: 34, h: 70, y: 35 },
      { w: 26, d: 26, h: 55, y: 70 + 27.5 },
      { w: 20, d: 20, h: 45, y: 125 + 22.5 },
      { w: 14, d: 14, h: 35, y: 170 + 17.5 },
      { w: 8, d: 8, h: 25, y: 205 + 12.5 }
    ];

    tiers.forEach((t, idx) => {
      const geo = new THREE.BoxGeometry(t.w, t.h, t.d);
      const mesh = new THREE.Mesh(geo, this.materials.limestone);
      mesh.position.y = t.y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Bronze crown border per tier
      const trimGeo = new THREE.BoxGeometry(t.w + 0.8, 1.8, t.d + 0.8);
      const trim = new THREE.Mesh(trimGeo, this.materials.bronze);
      trim.position.y = t.y + t.h / 2;
      group.add(trim);
    });

    // Art Deco Needle Spire
    const spireGeo = new THREE.CylinderGeometry(0.3, 3.5, 45, 8);
    const spire = new THREE.Mesh(spireGeo, this.materials.aluminum);
    spire.position.y = 217.5 + 22.5;
    spire.castShadow = true;
    group.add(spire);

    // Hazard light
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1144 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), beaconMat);
    beacon.position.y = 263;
    group.add(beacon);
    this.hazardLights.push(beaconMat);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Skyscraper Style 3: Twin Cyber Towers with Skybridge
     ========================================================================== */
  createSkybridgeTwinTowers(x, z) {
    const group = new THREE.Group();
    const towerH = 220;
    const towerW = 20;
    const towerD = 32;
    const spacing = 18;

    // Tower A (West)
    const geoA = new THREE.BoxGeometry(towerW, towerH, towerD);
    const meshA = new THREE.Mesh(geoA, this.materials.glass);
    meshA.position.set(-spacing, towerH / 2, 0);
    meshA.castShadow = true;
    meshA.receiveShadow = true;
    group.add(meshA);

    // Tower B (East)
    const meshB = new THREE.Mesh(geoA, this.materials.glass);
    meshB.position.set(spacing, towerH / 2, 0);
    meshB.castShadow = true;
    meshB.receiveShadow = true;
    group.add(meshB);

    // Skybridge connecting both towers at 150m height
    const bridgeGeo = new THREE.BoxGeometry(spacing * 2 - 2, 10, 14);
    const bridge = new THREE.Mesh(bridgeGeo, this.materials.glass);
    bridge.position.set(0, 155, 0);
    bridge.castShadow = true;
    group.add(bridge);

    // Structural skybridge truss support
    const trussGeo = new THREE.BoxGeometry(spacing * 2 - 2, 1.5, 15);
    const truss1 = new THREE.Mesh(trussGeo, this.materials.steel);
    truss1.position.set(0, 150, 0);
    const truss2 = new THREE.Mesh(trussGeo, this.materials.steel);
    truss2.position.set(0, 160, 0);
    group.add(truss1);
    group.add(truss2);

    // Rooftop Satellite Arrays & HVAC
    [-spacing, spacing].forEach(tx => {
      const hvacGeo = new THREE.BoxGeometry(10, 6, 12);
      const hvac = new THREE.Mesh(hvacGeo, this.materials.steel);
      hvac.position.set(tx, towerH + 3, 0);
      group.add(hvac);

      // Hazard beacon
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), beaconMat);
      bMesh.position.set(tx, towerH + 7, 0);
      group.add(bMesh);
      this.hazardLights.push(beaconMat);
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Skyscraper Style 4: Terraced Residential Tower with Balconies
     ========================================================================== */
  createTerracedResidentialTower(x, z) {
    const group = new THREE.Group();
    const height = 180;
    const size = 36;

    // Core glass building
    const coreGeo = new THREE.BoxGeometry(size, height, size);
    const core = new THREE.Mesh(coreGeo, this.materials.glass);
    core.position.y = height / 2;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    // Wrap-around balconies every 3 floors
    const balconyGeo = new THREE.BoxGeometry(size + 4, 1.2, size + 4);
    for (let h = 18; h < height; h += 14) {
      const bal = new THREE.Mesh(balconyGeo, this.materials.aluminum);
      bal.position.y = h;
      bal.castShadow = true;
      group.add(bal);
    }

    // Penthouse Roof Garden Pavilion
    const pentGeo = new THREE.BoxGeometry(22, 12, 22);
    const pent = new THREE.Mesh(pentGeo, this.materials.aluminum);
    pent.position.y = height + 6;
    group.add(pent);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Skyscraper Style 5: Modern Commercial Tower with Retail Base
     ========================================================================== */
  createModernCommercialTower(x, z, height) {
    const group = new THREE.Group();
    const w = 32;
    const d = 32;

    const geo = new THREE.BoxGeometry(w, height, d);
    const mesh = new THREE.Mesh(geo, this.materials.glass);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Rooftop Elevator Penthouse & Mechanical Room
    const mechGeo = new THREE.BoxGeometry(14, 8, 14);
    const mech = new THREE.Mesh(mechGeo, this.materials.steel);
    mech.position.y = height + 4;
    group.add(mech);

    // Rooftop Communications Antenna Mast
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.6, 22, 6);
    const mast = new THREE.Mesh(mastGeo, this.materials.steel);
    mast.position.y = height + 15;
    group.add(mast);

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), beaconMat);
    bMesh.position.y = height + 26;
    group.add(bMesh);
    this.hazardLights.push(beaconMat);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Skyscraper Style 6: Classic Brick & Stone Urban Loft
     ========================================================================== */
  createLoftBuilding(x, z, height) {
    const group = new THREE.Group();
    const w = 30;
    const d = 30;

    const geo = new THREE.BoxGeometry(w, height, d);
    const mesh = new THREE.Mesh(geo, this.materials.limestone);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Classic Rooftop Cedar Water Tower
    const tankGroup = new THREE.Group();
    const tankGeo = new THREE.CylinderGeometry(4, 4, 8, 12);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 7;
    tankGroup.add(tank);

    // Conical roof cap
    const capGeo = new THREE.ConeGeometry(4.5, 3, 12);
    const cap = new THREE.Mesh(capGeo, tankMat);
    cap.position.y = 12.5;
    tankGroup.add(cap);

    // Steel leg stilt frame
    const frameGeo = new THREE.BoxGeometry(6, 6, 6);
    const frame = new THREE.Mesh(frameGeo, this.materials.steel);
    frame.position.y = 3;
    tankGroup.add(frame);

    tankGroup.position.set(5, height, 5);
    group.add(tankGroup);

    // Ground level retail storefront awning
    const awningGeo = new THREE.BoxGeometry(w - 6, 1.2, 4);
    const awningMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.5 ? 0x991b1b : 0x1e3a8a,
      roughness: 0.7
    });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 4.5, d / 2 + 2);
    group.add(awning);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  /* ==========================================================================
     Central Park & Civic Plaza (Green Oasis, Fountain, Trees & Benches)
     ========================================================================== */
  buildCentralPark() {
    const halfSpan = (this.gridSize * this.totalStride) / 2;
    // Central Park spans across (gx=2, gz=2) and (gx=2, gz=3)
    const parkCenterX = -halfSpan + 2 * this.totalStride + this.totalStride / 2;
    const parkCenterZ = -halfSpan + 2.5 * this.totalStride + this.totalStride / 2;
    const parkW = this.blockSize;
    const parkL = this.blockSize * 2 + this.streetWidth;

    const parkGroup = new THREE.Group();

    // Grass terrain
    const grassGeo = new THREE.BoxGeometry(parkW, 0.5, parkL);
    const grassMesh = new THREE.Mesh(grassGeo, this.materials.grass);
    grassMesh.position.y = 0.25;
    grassMesh.receiveShadow = true;
    parkGroup.add(grassMesh);

    // Elegant Stone Walking Paths (Paving crossing through park)
    const pathGeoMain = new THREE.PlaneGeometry(8, parkL - 8);
    const pathMeshMain = new THREE.Mesh(pathGeoMain, this.materials.sidewalk);
    pathMeshMain.rotation.x = -Math.PI / 2;
    pathMeshMain.position.y = 0.52;
    pathMeshMain.receiveShadow = true;
    parkGroup.add(pathMeshMain);

    const pathGeoCross = new THREE.PlaneGeometry(parkW - 8, 8);
    const pathMeshCross = new THREE.Mesh(pathGeoCross, this.materials.sidewalk);
    pathMeshCross.rotation.x = -Math.PI / 2;
    pathMeshCross.position.y = 0.53;
    pathMeshCross.receiveShadow = true;
    parkGroup.add(pathMeshCross);

    // Grand Central Water Fountain
    const fountainGroup = new THREE.Group();
    const basinGeo = new THREE.CylinderGeometry(14, 15, 2, 24);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.position.y = 1;
    basin.castShadow = true;
    basin.receiveShadow = true;
    fountainGroup.add(basin);

    // Water surface inside basin
    const waterGeo = new THREE.CylinderGeometry(13.6, 13.6, 0.4, 24);
    const water = new THREE.Mesh(waterGeo, this.materials.water);
    water.position.y = 1.8;
    fountainGroup.add(water);

    // Multi-tier centerpiece
    const centerTierGeo = new THREE.CylinderGeometry(4, 5, 5, 16);
    const centerTier = new THREE.Mesh(centerTierGeo, basinMat);
    centerTier.position.y = 3.5;
    fountainGroup.add(centerTier);

    const topSpoutGeo = new THREE.SphereGeometry(1.5, 12, 12);
    const topSpout = new THREE.Mesh(topSpoutGeo, this.materials.bronze);
    topSpout.position.y = 6.5;
    fountainGroup.add(topSpout);

    fountainGroup.position.set(0, 0, 0);
    parkGroup.add(fountainGroup);

    // Plant 48 Trees of varied types (Oak, Pine, Flowering Cherry Blossom)
    for (let i = 0; i < 48; i++) {
      const tx = (Math.random() - 0.5) * (parkW - 16);
      const tz = (Math.random() - 0.5) * (parkL - 16);

      // Keep trees off the fountain center
      if (Math.hypot(tx, tz) < 18) continue;
      // Keep trees off the main paths
      if (Math.abs(tx) < 6 || Math.abs(tz) < 6) continue;

      const tree = this.createRealisticTree();
      tree.position.set(tx, 0.5, tz);
      parkGroup.add(tree);
      this.parkTrees.push(tree);
    }

    // Add Park Benches along paths
    const benchPositions = [
      { x: 7, z: -35, rot: Math.PI / 2 },
      { x: -7, z: -35, rot: -Math.PI / 2 },
      { x: 7, z: 35, rot: Math.PI / 2 },
      { x: -7, z: 35, rot: -Math.PI / 2 },
      { x: -28, z: 7, rot: 0 },
      { x: -28, z: -7, rot: Math.PI },
      { x: 28, z: 7, rot: 0 },
      { x: 28, z: -7, rot: Math.PI }
    ];

    benchPositions.forEach(bp => {
      const bench = this.createParkBench();
      bench.position.set(bp.x, 0.5, bp.z);
      bench.rotation.y = bp.rot;
      parkGroup.add(bench);
    });

    // Park Ornate Lantern Posts
    const lanternPositions = [
      { x: 6, z: -60 }, { x: -6, z: -60 },
      { x: 6, z: -20 }, { x: -6, z: -20 },
      { x: 6, z: 20 },  { x: -6, z: 20 },
      { x: 6, z: 60 },  { x: -6, z: 60 },
      { x: -40, z: 6 }, { x: -40, z: -6 },
      { x: 40, z: 6 },  { x: 40, z: -6 }
    ];

    lanternPositions.forEach(lp => {
      const lantern = this.createParkLantern();
      lantern.position.set(lp.x, 0.5, lp.z);
      parkGroup.add(lantern);
    });

    parkGroup.position.set(parkCenterX, 0, parkCenterZ);
    this.scene.add(parkGroup);
  }

  createRealisticTree() {
    const group = new THREE.Group();

    // Wood trunk
    const trunkH = 5 + Math.random() * 3;
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, trunkH, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x45220c, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage (Organic layered clusters)
    const treeType = Math.random();
    let foliageColor = 0x15803d; // Emerald Oak
    if (treeType < 0.25) {
      foliageColor = 0xf472b6; // Cherry Blossom Pink
    } else if (treeType < 0.5) {
      foliageColor = 0x166534; // Deep Forest Pine
    } else if (treeType < 0.75) {
      foliageColor = 0x65a30d; // Light Lime Foliage
    }

    const foliageMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      roughness: 0.8,
      metalness: 0.05
    });

    // Multi-sphere foliage puffs
    const puffs = 4;
    for (let p = 0; p < puffs; p++) {
      const radius = 3.5 + Math.random() * 1.5;
      const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
      const puff = new THREE.Mesh(puffGeo, foliageMat);
      puff.position.set(
        (Math.random() - 0.5) * 2.2,
        trunkH + p * 2.0 + 1.5,
        (Math.random() - 0.5) * 2.2
      );
      puff.castShadow = true;
      group.add(puff);
    }

    const scale = 0.85 + Math.random() * 0.45;
    group.scale.set(scale, scale, scale);
    return group;
  }

  createParkBench() {
    const group = new THREE.Group();

    // Cast iron legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const legGeo = new THREE.BoxGeometry(0.3, 1.2, 1.8);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-1.8, 0.6, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(1.8, 0.6, 0);
    group.add(legL);
    group.add(legR);

    // Wood seat slats
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const seatGeo = new THREE.BoxGeometry(4.2, 0.2, 1.6);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.set(0, 1.1, 0);
    group.add(seat);

    // Wood backrest slats
    const backGeo = new THREE.BoxGeometry(4.2, 1.2, 0.2);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 1.8, -0.7);
    group.add(back);

    return group;
  }

  createParkLantern() {
    const group = new THREE.Group();

    // Cast iron pole
    const poleGeo = new THREE.CylinderGeometry(0.18, 0.3, 9, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.steel);
    pole.position.y = 4.5;
    pole.castShadow = true;
    group.add(pole);

    // Glass lamp globe
    const globeGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: new THREE.Color(0x000000),
      roughness: 0.1
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.position.y = 9.2;
    group.add(globe);

    this.streetLamps.push({
      material: globeMat,
      pointLight: null
    });

    return group;
  }

  /* ==========================================================================
     Street Furniture (Street Lamps, Traffic Lights, Signs, Fire Hydrants)
     ========================================================================== */
  buildStreetFurniture() {
    const halfSpan = (this.gridSize * this.totalStride) / 2;

    // Place Modern Street Lamps along sidewalks
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const bx = -halfSpan + gx * this.totalStride + this.totalStride / 2;
        const bz = -halfSpan + gz * this.totalStride + this.totalStride / 2;
        const halfBlock = this.blockSize / 2;

        // Lamp posts at block edges
        const lampOffset = 3.5;
        this.addBoulevardStreetLamp(bx - halfBlock + lampOffset, bz - halfBlock + lampOffset, Math.PI / 4);
        this.addBoulevardStreetLamp(bx + halfBlock - lampOffset, bz - halfBlock + lampOffset, -Math.PI / 4);
        this.addBoulevardStreetLamp(bx - halfBlock + lampOffset, bz + halfBlock - lampOffset, 3 * Math.PI / 4);
        this.addBoulevardStreetLamp(bx + halfBlock - lampOffset, bz + halfBlock - lampOffset, -3 * Math.PI / 4);

        // Fire Hydrants
        if ((gx + gz) % 2 === 0) {
          this.addFireHydrant(bx - halfBlock + 4, bz + 12);
        }

        // Street Name & Traffic Signs
        this.addStreetSign(bx - halfBlock + 2, bz - halfBlock + 2, '5th Ave & Broadway');
      }
    }

    // Place 4-Way Traffic Light Poles at Intersections
    this.intersections.forEach(inter => {
      const d = this.streetWidth / 2 + 2.5;

      // 4 traffic poles per intersection
      inter.lights.push(this.addTrafficLightPole(inter.x - d, inter.z - d, 0, 'NS'));
      inter.lights.push(this.addTrafficLightPole(inter.x + d, inter.z - d, Math.PI / 2, 'EW'));
      inter.lights.push(this.addTrafficLightPole(inter.x + d, inter.z + d, Math.PI, 'NS'));
      inter.lights.push(this.addTrafficLightPole(inter.x - d, inter.z + d, -Math.PI / 2, 'EW'));
    });
  }

  addBoulevardStreetLamp(x, z, rot) {
    const group = new THREE.Group();

    // Steel pole with curved mast arm
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.4, 15, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.steel);
    pole.position.y = 7.5;
    pole.castShadow = true;
    group.add(pole);

    // Overhanging arm
    const armGeo = new THREE.BoxGeometry(0.25, 0.25, 5);
    const arm = new THREE.Mesh(armGeo, this.materials.steel);
    arm.position.set(0, 15, 2.2);
    arm.rotation.x = 0.12;
    group.add(arm);

    // LED luminaire head
    const headGeo = new THREE.BoxGeometry(1.2, 0.35, 2.5);
    const head = new THREE.Mesh(headGeo, this.materials.steel);
    head.position.set(0, 14.8, 4.4);
    group.add(head);

    // Glowing LED emitter lens
    const lensGeo = new THREE.PlaneGeometry(1.0, 2.2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffeedd,
      emissive: new THREE.Color(0x000000),
      roughness: 0.1
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 14.6, 4.4);
    group.add(lens);

    // Spot/point light for night illumination
    const lampLight = new THREE.PointLight(0xffeedd, 0, 45, 1.6);
    lampLight.position.set(0, 14, 4.4);
    group.add(lampLight);

    this.streetLamps.push({
      material: lensMat,
      pointLight: lampLight
    });

    group.position.set(x, 0.45, z);
    group.rotation.y = rot;
    this.scene.add(group);
  }

  addTrafficLightPole(x, z, rot, direction) {
    const group = new THREE.Group();

    // Vertical pole
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.35, 14, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.steel);
    pole.position.y = 7;
    pole.castShadow = true;
    group.add(pole);

    // Mast arm reaching over traffic lane
    const armGeo = new THREE.BoxGeometry(0.2, 0.2, 8);
    const arm = new THREE.Mesh(armGeo, this.materials.steel);
    arm.position.set(0, 13.5, 4);
    group.add(arm);

    // Traffic signal housing
    const boxGeo = new THREE.BoxGeometry(1.2, 3.2, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 13, 7.5);
    group.add(box);

    // 3 Signal lenses: Red, Yellow, Green
    const redMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: new THREE.Color(0xff0000) });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0x443300, emissive: new THREE.Color(0x000000) });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x003300, emissive: new THREE.Color(0x000000) });

    const lensGeo = new THREE.SphereGeometry(0.35, 12, 12);

    const redLens = new THREE.Mesh(lensGeo, redMat);
    redLens.position.set(0, 14.1, 7.9);
    group.add(redLens);

    const yelLens = new THREE.Mesh(lensGeo, yellowMat);
    yelLens.position.set(0, 13.0, 7.9);
    group.add(yelLens);

    const grnLens = new THREE.Mesh(lensGeo, greenMat);
    grnLens.position.set(0, 11.9, 7.9);
    group.add(grnLens);

    group.position.set(x, 0.45, z);
    group.rotation.y = rot;
    this.scene.add(group);

    return {
      direction: direction,
      redMat: redMat,
      yellowMat: yellowMat,
      greenMat: greenMat,
      setState: function(state) {
        if (state === 'RED') {
          redMat.emissive.setHex(0xff0000);
          yellowMat.emissive.setHex(0x000000);
          greenMat.emissive.setHex(0x000000);
        } else if (state === 'YELLOW') {
          redMat.emissive.setHex(0x000000);
          yellowMat.emissive.setHex(0xfbbf24);
          greenMat.emissive.setHex(0x000000);
        } else if (state === 'GREEN') {
          redMat.emissive.setHex(0x000000);
          yellowMat.emissive.setHex(0x000000);
          greenMat.emissive.setHex(0x22c55e);
        }
      }
    };
  }

  addFireHydrant(x, z) {
    const group = new THREE.Group();
    const hydGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.2, 8);
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const hyd = new THREE.Mesh(hydGeo, hydMat);
    hyd.position.y = 1.1;
    group.add(hyd);

    // Silver side nozzle caps
    const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.y = 1.2;
    group.add(cap);

    group.position.set(x, 0.45, z);
    this.scene.add(group);
  }

  addStreetSign(x, z, text) {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 7, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.steel);
    pole.position.y = 3.5;
    group.add(pole);

    // Green street sign plate
    const signGeo = new THREE.BoxGeometry(3.5, 0.7, 0.1);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(1.5, 6.6, 0);
    group.add(sign);

    group.position.set(x, 0.45, z);
    this.scene.add(group);
  }

  /* ==========================================================================
     Giant Animated LED Billboards & Advertisements
     ========================================================================== */
  buildAnimatedBillboards() {
    // We place 4 massive animated digital LED screens on key skyscraper facades
    const billboardConfigs = [
      {
        x: -42, y: 55, z: 25, rotY: 0, w: 32, h: 18,
        theme: 'cyber-car', title: 'NEXUS GT // ZERO EMISSIONS'
      },
      {
        x: 42, y: 70, z: -25, rotY: Math.PI, w: 36, h: 20,
        theme: 'stock-ticker', title: 'GLOBAL METRO INDEX +4.82%'
      },
      {
        x: 25, y: 60, z: -42, rotY: Math.PI / 2, w: 28, h: 16,
        theme: 'synthwave', title: 'NEO TOKYO FM 108.4'
      },
      {
        x: -25, y: 65, z: 42, rotY: -Math.PI / 2, w: 30, h: 17,
        theme: 'hologram', title: 'METROPOLIS TECH CONF 2026'
      }
    ];

    billboardConfigs.forEach(cfg => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.95,
        roughness: 0.3
      });

      const screenGeo = new THREE.PlaneGeometry(cfg.w, cfg.h);
      const screenMesh = new THREE.Mesh(screenGeo, mat);

      // Frame / Bezel
      const frameGeo = new THREE.BoxGeometry(cfg.w + 1.2, cfg.h + 1.2, 0.8);
      const frameMesh = new THREE.Mesh(frameGeo, this.materials.steel);
      frameMesh.position.z = -0.45;

      const group = new THREE.Group();
      group.add(screenMesh);
      group.add(frameMesh);
      group.position.set(cfg.x, cfg.y, cfg.z);
      group.rotation.y = cfg.rotY;

      this.scene.add(group);

      this.animatedBillboards.push({
        canvas: canvas,
        ctx: ctx,
        texture: texture,
        cfg: cfg,
        time: Math.random() * 10
      });
    });
  }

  updateBillboards(delta) {
    this.animatedBillboards.forEach(bb => {
      bb.time += delta;
      const ctx = bb.ctx;
      const w = bb.canvas.width;
      const h = bb.canvas.height;
      const t = bb.time;

      if (bb.cfg.theme === 'cyber-car') {
        // High-tech sports car promo with glowing laser grid
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, w, h);

        // Perspective glowing horizon grid
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        const horizonY = 160;
        ctx.beginPath();
        for (let x = -200; x < w + 200; x += 40) {
          ctx.moveTo(w / 2, horizonY);
          ctx.lineTo(x, h);
        }
        ctx.stroke();

        // Animated horizontal scrolling lines
        ctx.strokeStyle = '#38bdf8';
        for (let y = horizonY; y < h; y += 16) {
          const dy = (y + (t * 60) % 16);
          if (dy < h) {
            ctx.beginPath();
            ctx.moveTo(0, dy);
            ctx.lineTo(w, dy);
            ctx.stroke();
          }
        }

        // Big Futuristic Typography
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('NEXUS GT-V', 30, 70);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('HYPER-ELECTRIC // 1,200 HP', 30, 105);

        // Pulsing neon button
        const pulse = Math.sin(t * 5) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
        ctx.fillRect(30, 120, 140, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('RESERVE NOW', 45, 137);

      } else if (bb.cfg.theme === 'stock-ticker') {
        // Global Financial Live Graph
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('WALL ST // METRO NASDAQ', 25, 45);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText('LIVE TELEMETRY FEED', 25, 70);

        // Dynamic Candlestick / Line Chart
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 25; x < w - 25; x += 15) {
          const val = Math.sin(x * 0.03 + t * 3) * 35 + Math.cos(x * 0.08) * 15 + 150;
          if (x === 25) ctx.moveTo(x, val);
          else ctx.lineTo(x, val);
        }
        ctx.stroke();

        // Ticker tape at bottom
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 215, w, 40);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 16px monospace';
        const tickerOffset = (t * 50) % 300;
        ctx.fillText('▲ AAPL +2.4%  ▲ NVDA +5.1%  ▲ METR +8.9%  ▼ TSLA -0.8%', -tickerOffset + 20, 240);
        ctx.fillText('▲ AAPL +2.4%  ▲ NVDA +5.1%  ▲ METR +8.9%  ▼ TSLA -0.8%', -tickerOffset + 420, 240);

      } else if (bb.cfg.theme === 'synthwave') {
        // Retro 80s Sun & Synthwave Waveform
        ctx.fillStyle = '#1e1035';
        ctx.fillRect(0, 0, w, h);

        // Gradient Sun
        const sunGrad = ctx.createLinearGradient(0, 50, 0, 170);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f43f5e');
        sunGrad.addColorStop(1, '#831843');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(w / 2, 110, 65, 0, Math.PI * 2);
        ctx.fill();

        // Blinds cut into sun
        ctx.fillStyle = '#1e1035';
        for (let y = 100; y < 170; y += 10) {
          ctx.fillRect(w / 2 - 70, y, 140, 4);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RETROWAVE 108.4', w / 2, 215);
        ctx.textAlign = 'start';

      } else {
        // Holographic Tech Conference
        ctx.fillStyle = '#061727';
        ctx.fillRect(0, 0, w, h);

        // Animated concentric cyan rings
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        const ringRad = ((t * 40) % 80);
        ctx.beginPath();
        ctx.arc(380, 120, ringRad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(380, 120, (ringRad + 40) % 80, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('METROPOLIS', 35, 65);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('AI EXPO 2026', 35, 100);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText('NOV 14-18 // METRO CENTER', 35, 135);
      }

      bb.texture.needsUpdate = true;
    });
  }

  /* ==========================================================================
     Traffic Light & Night Lighting Cycle Updates
     ========================================================================== */
  updateTrafficSignals(delta) {
    this.intersections.forEach(inter => {
      inter.timer += delta;
      // 14 second cycle: 5.5s Green, 1.5s Yellow, 7s Red
      const cycle = inter.timer % 14;

      if (cycle < 5.5) {
        // NS Green, EW Red
        inter.trafficState = 'NS_GREEN';
        inter.lights.forEach(l => l.setState(l.direction === 'NS' ? 'GREEN' : 'RED'));
      } else if (cycle < 7.0) {
        // NS Yellow, EW Red
        inter.trafficState = 'NS_YELLOW';
        inter.lights.forEach(l => l.setState(l.direction === 'NS' ? 'YELLOW' : 'RED'));
      } else if (cycle < 12.5) {
        // NS Red, EW Green
        inter.trafficState = 'EW_GREEN';
        inter.lights.forEach(l => l.setState(l.direction === 'NS' ? 'RED' : 'GREEN'));
      } else {
        // NS Red, EW Yellow
        inter.trafficState = 'EW_YELLOW';
        inter.lights.forEach(l => l.setState(l.direction === 'NS' ? 'RED' : 'YELLOW'));
      }
    });
  }

  updateNightLighting(nightRatio, timeOfDay) {
    // Window emissive illumination at night
    const emissiveLevel = Math.pow(nightRatio, 1.4);
    this.windowMaterials.forEach(mat => {
      if (mat) {
        mat.emissive.setRGB(emissiveLevel, emissiveLevel, emissiveLevel);
      }
    });

    // Street lamps illumination
    this.streetLamps.forEach(lamp => {
      if (lamp.material) {
        const lampEmissive = nightRatio > 0.4 ? 1.0 : 0.0;
        lamp.material.emissive.setRGB(lampEmissive, lampEmissive * 0.9, lampEmissive * 0.8);
      }
      if (lamp.pointLight) {
        lamp.pointLight.intensity = nightRatio * 1.8;
      }
    });
  }

  update(delta) {
    this.updateBillboards(delta);
    this.updateTrafficSignals(delta);

    // Hazard lights blink on top of skyscrapers
    const hazardBlink = (Date.now() % 1200) < 600;
    this.hazardLights.forEach(mat => {
      mat.color.setHex(hazardBlink ? 0xff0033 : 0x220005);
    });
  }
}

window.CityBuilder = CityBuilder;
