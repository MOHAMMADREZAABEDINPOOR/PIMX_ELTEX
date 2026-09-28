/**
 * User Interface & HUD Management
 * Syncs game state with glassmorphic HUD, speedometer, wanted stars, notifications, and menus.
 */
class UIManager {
  constructor() {
    // Elements
    this.cashVal = document.getElementById('cash-val');
    this.timeVal = document.getElementById('time-val');
    this.weatherVal = document.getElementById('weather-val');

    // Speedometer
    this.speedometerContainer = document.getElementById('speedometer-container');
    this.speedDigital = document.getElementById('speed-digital');
    this.gearIndicator = document.getElementById('gear-indicator');
    this.rpmBar = document.getElementById('rpm-bar');
    this.nitroFill = document.getElementById('nitro-fill');
    this.damageFill = document.getElementById('damage-fill');
    this.iconLights = document.getElementById('icon-lights');
    this.iconHorn = document.getElementById('icon-horn');
    this.iconDrift = document.getElementById('icon-drift');

    // Action Prompt
    this.actionPrompt = document.getElementById('action-prompt');
    this.actionKey = document.getElementById('action-key');
    this.actionText = document.getElementById('action-text');

    // Wanted Panel
    this.wantedStars = document.querySelectorAll('.wanted-stars .star');
    this.sirenBadge = document.getElementById('siren-badge');

    // Notification Banner
    this.notificationBanner = document.getElementById('notification-banner');
    this.notificationTimer = null;

    // Mission Banner
    this.missionBanner = document.getElementById('mission-banner');
    this.missionName = document.getElementById('mission-name');
    this.missionReward = document.getElementById('mission-reward');
    this.missionObjective = document.getElementById('mission-objective');
    this.missionDistance = document.getElementById('mission-distance');
    this.missionTimer = document.getElementById('mission-timer');

    // Mission Complete Dialog
    this.missionDialog = document.getElementById('mission-dialog');
    this.dialogTitle = document.getElementById('dialog-title');
    this.dialogReward = document.getElementById('dialog-reward');
    this.btnDialogOk = document.getElementById('btn-dialog-ok');

    // Radio
    this.radioStation = document.getElementById('radio-station');
    this.radioTrack = document.getElementById('radio-track');
    this.radioPanel = document.getElementById('radio-panel');

    // Controls Modal
    this.controlsModal = document.getElementById('controls-modal');
    this.btnHelpToggle = document.getElementById('btn-help-toggle');
    this.btnCloseModal = document.getElementById('btn-close-modal');

    this.setupListeners();
  }

  setupListeners() {
    // Controls modal toggling
    if (this.btnHelpToggle) {
      this.btnHelpToggle.addEventListener('click', () => this.toggleControlsModal());
    }
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener('click', () => this.hideControlsModal());
    }

    // Mission complete button
    if (this.btnDialogOk) {
      this.btnDialogOk.addEventListener('click', () => {
        this.missionDialog.classList.remove('show');
      });
    }

    // Radio station cycling on click
    if (this.radioPanel) {
      this.radioPanel.addEventListener('click', () => {
        window.soundEngine.init();
        window.soundEngine.resume();
        const station = window.soundEngine.cycleRadio();
        this.updateRadio(station);
      });
    }

    // Weather preset buttons
    ['noon', 'sunset', 'night', 'storm'].forEach(id => {
      const btn = document.getElementById(`btn-${id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.btn-weather').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (window.game && window.game.weather) {
            window.game.weather.setPreset(id.toUpperCase());
          }
        });
      }
    });
  }

  updateCash(amount) {
    if (this.cashVal) {
      this.cashVal.innerText = amount.toLocaleString();
    }
  }

  updateEnvironment(timeOfDay, weather) {
    if (this.timeVal) {
      const hours = Math.floor(timeOfDay);
      const minutes = Math.floor((timeOfDay % 1) * 60);
      const strH = hours < 10 ? '0' + hours : '' + hours;
      const strM = minutes < 10 ? '0' + minutes : '' + minutes;
      this.timeVal.innerText = `${strH}:${strM}`;
    }
    if (this.weatherVal) {
      this.weatherVal.innerText = weather;
    }
  }

  updateSpeedometer(vehicle, inVehicle) {
    if (!this.speedometerContainer) return;

    if (!inVehicle || !vehicle) {
      this.speedometerContainer.style.display = 'none';
      return;
    }

    this.speedometerContainer.style.display = 'flex';

    // Speed & Gear
    const speed = Math.round(vehicle.speedMph || 0);
    this.speedDigital.innerText = speed;
    this.gearIndicator.innerText = vehicle.currentGear || 'D';

    // RPM Bar (1000 - 7500)
    const rpmPct = Math.min(100, Math.max(0, ((vehicle.rpm - 1000) / 6500) * 100));
    this.rpmBar.style.width = `${rpmPct}%`;

    // Nitro Fuel
    const nitroPct = (vehicle.nitroFuel / vehicle.maxNitro) * 100;
    this.nitroFill.style.width = `${nitroPct}%`;

    // Integrity / Damage
    const healthPct = Math.max(0, 100 - vehicle.damage);
    this.damageFill.style.width = `${healthPct}%`;
    if (healthPct < 30) {
      this.damageFill.style.background = '#ff2244';
    } else if (healthPct < 60) {
      this.damageFill.style.background = '#ffaa00';
    } else {
      this.damageFill.style.background = '#00ff88';
    }

    // Status Icons
    if (this.iconLights) {
      this.iconLights.classList.toggle('active', vehicle.headlightsOn);
    }
    if (this.iconDrift) {
      this.iconDrift.classList.toggle('active', vehicle.handbrake || vehicle.slipRatio > 0.2);
    }
  }

  showActionPrompt(key, text) {
    if (!this.actionPrompt) return;
    this.actionKey.innerText = key;
    this.actionText.innerText = text;
    this.actionPrompt.style.display = 'flex';
  }

  hideActionPrompt() {
    if (this.actionPrompt) {
      this.actionPrompt.style.display = 'none';
    }
  }

  updateWantedStars(stars, isEvading) {
    this.wantedStars.forEach((star, idx) => {
      const starIndex = idx + 1;
      star.className = 'star';
      if (starIndex <= stars) {
        star.classList.add('active');
        if (isEvading) {
          star.classList.add('pursuit');
        }
      }
    });

    if (this.sirenBadge) {
      this.sirenBadge.style.display = stars > 0 ? 'block' : 'none';
      this.sirenBadge.innerText = isEvading ? 'EVADING' : 'PURSUIT';
    }
  }

  showNotification(text) {
    if (!this.notificationBanner) return;
    if (this.notificationTimer) clearTimeout(this.notificationTimer);

    this.notificationBanner.innerText = text;
    this.notificationBanner.classList.add('show');

    this.notificationTimer = setTimeout(() => {
      this.notificationBanner.classList.remove('show');
    }, 4000);
  }

  showMissionBanner(mission, checkpoint) {
    if (!this.missionBanner) return;
    this.missionName.innerText = mission.title;
    this.missionReward.innerText = `+$${mission.reward.toLocaleString()}`;
    this.missionObjective.innerText = checkpoint.desc;
    this.missionBanner.style.display = 'block';
  }

  updateMissionHUD(mission, checkpoint, dist, timer) {
    if (!this.missionBanner) return;
    this.missionObjective.innerText = checkpoint.desc;
    this.missionDistance.innerText = `DIST: ${Math.round(dist)}m`;

    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    this.missionTimer.innerText = `TIME: ${timeStr}`;
  }

  hideMissionBanner() {
    if (this.missionBanner) {
      this.missionBanner.style.display = 'none';
    }
  }

  showMissionCompleteModal(title, reward) {
    if (!this.missionDialog) return;
    this.dialogTitle.innerText = "MISSION ACCOMPLISHED!";
    this.dialogReward.innerText = `+$${reward.toLocaleString()}`;
    this.missionDialog.classList.add('show');
  }

  updateRadio(station) {
    if (this.radioStation) this.radioStation.innerText = station.name;
    if (this.radioTrack) this.radioTrack.innerText = station.track;
  }

  toggleControlsModal() {
    if (!this.controlsModal) return;
    const isShowing = this.controlsModal.style.display === 'block';
    this.controlsModal.style.display = isShowing ? 'none' : 'block';
  }

  hideControlsModal() {
    if (this.controlsModal) this.controlsModal.style.display = 'none';
  }
}
