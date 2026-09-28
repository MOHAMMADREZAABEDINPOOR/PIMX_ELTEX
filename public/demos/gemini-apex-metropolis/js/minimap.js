/**
 * High-Tech Circular Radar Minimap
 * Renders city streets, Central Park, player orientation, traffic blips, police pursuits, and mission markers.
 */
class Minimap {
  constructor(canvasId, city) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.city = city;

    this.mapRadius = 90; // Canvas is 180x180
    this.zoom = 0.55; // World meters to pixels scale
  }

  update(playerPos, playerYaw, trafficCars, policeUnits, activeWaypoint, isEvading) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cx = this.mapRadius;
    const cy = this.mapRadius;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save and clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.mapRadius - 3, 0, Math.PI * 2);
    ctx.clip();

    // Dark Radar Base
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Center map around player and rotate with player yaw so forward is UP
    ctx.translate(cx, cy);
    ctx.rotate(-playerYaw);

    // 1. Draw City Blocks & Central Park
    this.drawCityBlocks(ctx, playerPos);

    // 2. Draw Road Grid Lines
    this.drawRoads(ctx, playerPos);

    // 3. Draw Civilian Traffic Blips
    this.drawTraffic(ctx, playerPos, trafficCars);

    // 4. Draw Police Units (Red/Blue Blinking)
    this.drawPolice(ctx, playerPos, policeUnits);

    // 5. Draw Active Mission Waypoint Marker
    this.drawMissionWaypoint(ctx, playerPos, activeWaypoint);

    // 6. Evade Search Radius
    if (isEvading) {
      this.drawEvadeRing(ctx);
    }

    ctx.restore();

    // 7. Draw Player Directional Arrow at static center
    this.drawPlayerArrow(ctx, cx, cy);

    // 8. Draw Range Radar Rings
    this.drawRadarRings(ctx, cx, cy);
  }

  drawCityBlocks(ctx, playerPos) {
    const halfSpan = this.city.cityExtent;
    const step = this.city.stepSize;
    const block = this.city.blockSize;
    const scale = this.zoom;
    const centerIdx = Math.floor(this.city.gridSize / 2);

    for (let gx = 0; gx < this.city.gridSize; gx++) {
      for (let gz = 0; gz < this.city.gridSize; gz++) {
        const bx = -halfSpan + (gx + 0.5) * step;
        const bz = -halfSpan + (gz + 0.5) * step;

        const relX = (bx - playerPos.x) * scale;
        const relZ = (bz - playerPos.z) * scale;
        const size = block * scale;

        // Central Park in center block
        if (gx === centerIdx && gz === centerIdx) {
          ctx.fillStyle = 'rgba(34, 110, 44, 0.45)';
          ctx.fillRect(relX - size / 2, relZ - size / 2, size, size);
          ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
          ctx.strokeRect(relX - size / 2, relZ - size / 2, size, size);
        } else {
          ctx.fillStyle = 'rgba(25, 34, 52, 0.7)';
          ctx.fillRect(relX - size / 2, relZ - size / 2, size, size);
          ctx.strokeStyle = 'rgba(50, 75, 110, 0.35)';
          ctx.strokeRect(relX - size / 2, relZ - size / 2, size, size);
        }
      }
    }
  }

  drawRoads(ctx, playerPos) {
    const halfSpan = this.city.cityExtent;
    const step = this.city.stepSize;
    const scale = this.zoom;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = this.city.roadWidth * scale;
    ctx.lineCap = 'round';

    for (let i = 0; i <= this.city.gridSize; i++) {
      const coord = -halfSpan + i * step;

      // Horizontal Road
      ctx.beginPath();
      ctx.moveTo((-halfSpan - playerPos.x) * scale, (coord - playerPos.z) * scale);
      ctx.lineTo((halfSpan - playerPos.x) * scale, (coord - playerPos.z) * scale);
      ctx.stroke();

      // Vertical Road
      ctx.beginPath();
      ctx.moveTo((coord - playerPos.x) * scale, (-halfSpan - playerPos.z) * scale);
      ctx.lineTo((coord - playerPos.x) * scale, (halfSpan - playerPos.z) * scale);
      ctx.stroke();
    }
  }

  drawTraffic(ctx, playerPos, cars) {
    if (!cars) return;
    const scale = this.zoom;
    ctx.fillStyle = '#8899aa';

    cars.forEach(c => {
      const v = c.vehicle;
      const relX = (v.mesh.position.x - playerPos.x) * scale;
      const relZ = (v.mesh.position.z - playerPos.z) * scale;

      ctx.beginPath();
      ctx.arc(relX, relZ, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawPolice(ctx, playerPos, units) {
    if (!units) return;
    const scale = this.zoom;
    const isRed = Math.floor(Date.now() / 200) % 2 === 0;

    units.forEach(u => {
      const v = u.vehicle;
      const relX = (v.mesh.position.x - playerPos.x) * scale;
      const relZ = (v.mesh.position.z - playerPos.z) * scale;

      ctx.fillStyle = isRed ? '#ff0044' : '#0088ff';
      ctx.beginPath();
      ctx.arc(relX, relZ, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isRed ? 'rgba(255, 0, 68, 0.5)' : 'rgba(0, 136, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  drawMissionWaypoint(ctx, playerPos, cp) {
    if (!cp) return;
    const scale = this.zoom;
    const relX = (cp.x - playerPos.x) * scale;
    const relZ = (cp.z - playerPos.z) * scale;

    const pulse = 4.5 + Math.sin(Date.now() * 0.008) * 1.5;

    ctx.save();
    ctx.translate(relX, relZ);

    // Glowing Diamond
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(0, -pulse);
    ctx.lineTo(pulse, 0);
    ctx.lineTo(0, pulse);
    ctx.lineTo(-pulse, 0);
    ctx.closePath();
    ctx.fill();

    // Pulse Ring
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, pulse * 1.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawEvadeRing(ctx) {
    const pulse = Math.sin(Date.now() * 0.006) * 4;
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, (75 + pulse) * this.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawPlayerArrow(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // Bright Directional Cyan Arrow pointing straight UP
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawRadarRings(ctx, cx, cy) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  }
}
