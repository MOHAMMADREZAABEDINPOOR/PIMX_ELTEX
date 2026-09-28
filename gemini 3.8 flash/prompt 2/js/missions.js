/**
 * Mission & Objective Management System
 * Features interactive waypoint beacons, delivery runs, time trials, and reward mechanics.
 */
class MissionManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;

    this.activeMission = null;
    this.currentCheckpointIndex = 0;
    this.timer = 0;
    this.distanceToTarget = 0;

    // 3D Waypoint Beacon Visuals
    this.beaconGroup = new THREE.Group();
    this.scene.add(this.beaconGroup);
    this.setupBeaconVisuals();

    // Mission Definitions
    this.missions = [
      {
        id: 'courier_rush',
        title: 'MIDNIGHT EXPRESS COURIER',
        reward: 1500,
        timeLimit: 90,
        checkpoints: [
          { name: 'Industrial Warehouse Drop', x: -120, z: -100, desc: 'Deliver Parcel to Warehouse #4' },
          { name: 'Downtown Tech Hub', x: 60, z: -80, desc: 'Drop Encrypted Drive at Apex Tower' },
          { name: 'Commercial Boulevard Safehouse', x: -40, z: 120, desc: 'Final Handshake at Safehouse' }
        ]
      },
      {
        id: 'vip_escort',
        title: 'VIP EXECUTIVE SHUTTLE',
        reward: 2200,
        timeLimit: 110,
        checkpoints: [
          { name: 'Grand Hotel Valet', x: -80, z: 40, desc: 'Pick up VIP Diplomat at Grand Hotel' },
          { name: 'City Helipad Lounge', x: 140, z: -40, desc: 'Escort VIP to Rooftop Helipad Terminal' }
        ]
      },
      {
        id: 'contraband_getaway',
        title: 'HOT PURSUIT GETAWAY',
        reward: 3500,
        timeLimit: 120,
        wantedTrigger: 3,
        checkpoints: [
          { name: 'Underground Chop Shop', x: 120, z: 140, desc: 'Evade 3-Star Police and reach the Chop Shop!' }
        ]
      },
      {
        id: 'emergency_sprint',
        title: 'CITY HOSPITAL SPRINT',
        reward: 1800,
        timeLimit: 65,
        checkpoints: [
          { name: 'Metropolis General Hospital', x: -140, z: -40, desc: 'Urgent Medical Supplies Delivery!' }
        ]
      }
    ];

    this.currentMissionIndex = 0;
  }

  setupBeaconVisuals() {
    // 1. Tall Sky Beam Cylinder
    const beamGeo = new THREE.CylinderGeometry(0.8, 2.2, 140, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.beaconBeam.position.y = 70;
    this.beaconGroup.add(this.beaconBeam);

    // 2. Pulsing Ground Ring
    const ringGeo = new THREE.RingGeometry(2.0, 3.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.groundRing = new THREE.Mesh(ringGeo, ringMat);
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.position.y = 0.15;
    this.beaconGroup.add(this.groundRing);

    // 3. Central Pulsing Diamond
    const diamondGeo = new THREE.OctahedronGeometry(1.4, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      wireframe: true
    });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.diamond.position.y = 2.4;
    this.beaconGroup.add(this.diamond);

    this.beaconGroup.visible = false;
  }

  startNextMission() {
    const mission = this.missions[this.currentMissionIndex];
    this.startMission(mission);
    this.currentMissionIndex = (this.currentMissionIndex + 1) % this.missions.length;
  }

  startMission(mission) {
    this.activeMission = mission;
    this.currentCheckpointIndex = 0;
    this.timer = mission.timeLimit;

    // Trigger wanted level if this is a pursuit mission
    if (mission.wantedTrigger && window.game && window.game.police) {
      window.game.police.setWantedLevel(mission.wantedTrigger);
    }

    this.updateBeaconPosition();
    this.beaconGroup.visible = true;

    window.soundEngine.playMissionChime(true);

    if (window.game && window.game.ui) {
      window.game.ui.showMissionBanner(this.activeMission, this.getCurrentCheckpoint());
      window.game.ui.showNotification(`MISSION STARTED: ${mission.title}!`);
    }
  }

  getCurrentCheckpoint() {
    if (!this.activeMission) return null;
    return this.activeMission.checkpoints[this.currentCheckpointIndex];
  }

  updateBeaconPosition() {
    const cp = this.getCurrentCheckpoint();
    if (!cp) return;
    this.beaconGroup.position.set(cp.x, 0, cp.z);
  }

  update(dt, playerPos) {
    // Animate Beacon
    if (this.beaconGroup.visible) {
      this.groundRing.rotation.z += dt * 1.5;
      const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.18;
      this.groundRing.scale.set(pulse, pulse, pulse);

      this.diamond.rotation.y += dt * 2.0;
      this.diamond.position.y = 2.4 + Math.sin(Date.now() * 0.004) * 0.4;
    }

    if (!this.activeMission) return;

    // Countdown Timer
    this.timer -= dt;
    if (this.timer <= 0) {
      this.failMission("Time expired!");
      return;
    }

    // Distance to current waypoint
    const cp = this.getCurrentCheckpoint();
    if (!cp) return;

    this.distanceToTarget = Math.hypot(playerPos.x - cp.x, playerPos.z - cp.z);

    // Checkpoint Reach Detection (within 4.8m)
    if (this.distanceToTarget < 5.0) {
      this.advanceCheckpoint();
    }

    // Update HUD
    if (window.game && window.game.ui) {
      window.game.ui.updateMissionHUD(this.activeMission, cp, this.distanceToTarget, this.timer);
    }
  }

  advanceCheckpoint() {
    this.currentCheckpointIndex++;
    window.soundEngine.playMissionChime(true);

    if (this.currentCheckpointIndex >= this.activeMission.checkpoints.length) {
      this.completeMission();
    } else {
      this.updateBeaconPosition();
      const nextCp = this.getCurrentCheckpoint();
      if (window.game && window.game.ui) {
        window.game.ui.showNotification(`CHECKPOINT REACHED! Next: ${nextCp.name}`);
      }
    }
  }

  completeMission() {
    const reward = this.activeMission.reward;
    const title = this.activeMission.title;

    this.beaconGroup.visible = false;
    this.activeMission = null;

    if (window.game) {
      window.game.addCash(reward);
      if (window.game.ui) {
        window.game.ui.hideMissionBanner();
        window.game.ui.showMissionCompleteModal(title, reward);
      }
    }
  }

  failMission(reason = "Mission Failed") {
    this.beaconGroup.visible = false;
    this.activeMission = null;

    window.soundEngine.playMissionChime(false);

    if (window.game && window.game.ui) {
      window.game.ui.hideMissionBanner();
      window.game.ui.showNotification(`MISSION FAILED: ${reason.toUpperCase()}`);
    }
  }

  getActiveWaypoint() {
    if (!this.activeMission) return null;
    return this.getCurrentCheckpoint();
  }
}
