/**
 * Realistic & Fun Arcade Vehicle Physics Engine
 * Includes dual-clutch 7-speed transmission, speed-sensitive steering,
 * suspension chassis pitch & roll, handbrake drifting, skid marks, and tire smoke particles.
 */

class VehiclePhysics {
    constructor(carModel, scene) {
        this.car = carModel;
        this.scene = scene;

        // Vehicle transform state
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.heading = 0; // Rotation around Y axis in radians
        this.speed = 0;   // Forward speed in m/s (1 m/s = 3.6 km/h)
        this.speedKmh = 0;

        // Dynamic chassis lean angles
        this.pitchAngle = 0; // Squat under accel, dive under brake
        this.rollAngle = 0;  // Body roll under cornering
        this.suspensionGroup = new THREE.Group();
        this.scene.add(this.suspensionGroup);
        this.suspensionGroup.add(this.car.group);

        // Control Inputs
        this.inputs = {
            throttle: 0,
            brake: 0,
            steer: 0,
            handbrake: false
        };

        // Tuning parameters
        this.params = {
            maxSpeed: 94.5,       // ~340 km/h
            reverseMaxSpeed: 18,  // ~65 km/h
            acceleration: 38.0,   // Rapid supercar launch
            brakingPower: 58.0,   // High-performance carbon ceramic brakes
            dragCoefficient: 0.015,
            rollingResistance: 0.8,
            corneringStiffness: 14.0,
            driftStiffness: 4.8,
            maxSteerAngle: 0.52,  // ~30 degrees at low speeds
            wheelRadius: 0.36
        };

        // Transmission & Engine simulation
        this.currentGear = 1;
        this.isReverse = false;
        this.rpm = 900;
        this.redlineRpm = 8600;
        this.idleRpm = 900;
        this.turboBoost = 0; // In bar (0.0 to 2.2 bar)
        this.gearRatios = [3.8, 2.7, 2.0, 1.5, 1.2, 0.95, 0.78];
        this.finalDrive = 3.4;

        // Drift state & scoring
        this.slipAngle = 0;
        this.slipRatio = 0;
        this.isDrifting = false;
        this.driftScore = 0;
        this.driftMultiplier = 1;
        this.currentDriftPoints = 0;

        // Visual effects systems
        this._initSkidmarks();
        this._initTireSmoke();
    }

    _initSkidmarks() {
        this.maxSkidPoints = 1200;
        this.skidPositions = new Float32Array(this.maxSkidPoints * 3);
        this.skidOpacities = new Float32Array(this.maxSkidPoints);
        this.skidIndex = 0;

        this.skidGeometry = new THREE.BufferGeometry();
        this.skidGeometry.setAttribute('position', new THREE.BufferAttribute(this.skidPositions, 3));

        this.skidMaterial = new THREE.LineBasicMaterial({
            color: 0x111111,
            linewidth: 3,
            transparent: true,
            opacity: 0.65,
            depthWrite: false
        });

        this.skidMesh = new THREE.LineSegments(this.skidGeometry, this.skidMaterial);
        this.scene.add(this.skidMesh);

        this.lastSkidLeft = null;
        this.lastSkidRight = null;
    }

    _initTireSmoke() {
        this.particles = [];
        this.maxParticles = 120;

        const pGeo = new THREE.PlaneGeometry(0.5, 0.5);
        // Create soft smoke particle texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
        grad.addColorStop(0, 'rgba(230, 235, 240, 0.6)');
        grad.addColorStop(0.5, 'rgba(200, 205, 210, 0.3)');
        grad.addColorStop(1, 'rgba(180, 185, 190, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const pTex = new THREE.CanvasTexture(canvas);

        this.smokeMaterial = new THREE.MeshBasicMaterial({
            map: pTex,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });

        this.smokeGroup = new THREE.Group();
        this.scene.add(this.smokeGroup);

        for (let i = 0; i < this.maxParticles; i++) {
            const mesh = new THREE.Mesh(pGeo, this.smokeMaterial.clone());
            mesh.visible = false;
            this.smokeGroup.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1.0,
                scale: 1.0
            });
        }
        this.smokeIndex = 0;
    }

    _spawnSmoke(x, y, z, intensity) {
        const p = this.particles[this.smokeIndex];
        this.smokeIndex = (this.smokeIndex + 1) % this.maxParticles;

        p.mesh.position.set(
            x + (Math.random() - 0.5) * 0.2,
            y + 0.15,
            z + (Math.random() - 0.5) * 0.2
        );
        p.mesh.rotation.z = Math.random() * Math.PI * 2;
        p.mesh.scale.set(0.6, 0.6, 0.6);
        p.mesh.visible = true;

        p.velocity.set(
            (Math.random() - 0.5) * 0.8,
            0.6 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
        );
        p.life = 0;
        p.maxLife = 0.8 + Math.random() * 0.5;
        p.intensity = Math.min(1.0, intensity);
    }

    _addSkidMark(p1, p2) {
        if (!p1 || !p2) return;
        const posAttr = this.skidGeometry.attributes.position;
        const idx = this.skidIndex * 6;

        posAttr.array[idx] = p1.x;
        posAttr.array[idx + 1] = 0.015; // Slightly above road
        posAttr.array[idx + 2] = p1.z;

        posAttr.array[idx + 3] = p2.x;
        posAttr.array[idx + 4] = 0.015;
        posAttr.array[idx + 5] = p2.z;

        posAttr.needsUpdate = true;
        this.skidIndex = (this.skidIndex + 1) % (this.maxSkidPoints / 2);
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1; // Clamp timestep

        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
        const right = new THREE.Vector3(forward.z, 0, -forward.x);

        // 1. Calculate Acceleration & Braking Forces
        let engineForce = 0;
        let brakeForce = 0;

        if (this.inputs.throttle > 0) {
            if (this.isReverse && this.speed > 0.5) {
                // Braking while in reverse
                brakeForce = this.inputs.throttle * this.params.brakingPower;
            } else {
                this.isReverse = false;
                // Torque curve with gear multiplier
                const gearRatio = this.gearRatios[this.currentGear - 1] || 1.0;
                const powerCurve = Math.max(0.4, 1.0 - (this.speed / this.params.maxSpeed) * 0.7);
                engineForce = this.inputs.throttle * this.params.acceleration * powerCurve;
            }
        }

        if (this.inputs.brake > 0) {
            if (this.speed > 0.8 && !this.isReverse) {
                brakeForce = this.inputs.brake * this.params.brakingPower;
                this.car.setBraking(true);
            } else if (this.speed <= 0.8 && this.speed >= -this.params.reverseMaxSpeed) {
                // Reverse
                this.isReverse = true;
                this.car.setBraking(false);
                engineForce = -this.inputs.brake * (this.params.acceleration * 0.4);
            }
        } else {
            this.car.setBraking(false);
        }

        // Handbrake lock
        if (this.inputs.handbrake) {
            brakeForce += this.params.brakingPower * 1.5;
            this.car.setBraking(true);
        }

        // 2. Dynamic Longitudinal Physics (Speed)
        let totalLongitudinalAcc = engineForce;
        if (this.speed > 0) {
            totalLongitudinalAcc -= brakeForce;
            totalLongitudinalAcc -= this.speed * this.params.rollingResistance;
            totalLongitudinalAcc -= this.speed * this.speed * this.params.dragCoefficient;
        } else if (this.speed < 0) {
            totalLongitudinalAcc += brakeForce;
            totalLongitudinalAcc -= this.speed * this.params.rollingResistance;
            totalLongitudinalAcc += this.speed * this.speed * this.params.dragCoefficient;
        }

        this.speed += totalLongitudinalAcc * dt;
        if (Math.abs(this.speed) < 0.05 && this.inputs.throttle === 0 && this.inputs.brake === 0) {
            this.speed = 0;
        }
        this.speedKmh = Math.abs(this.speed * 3.6);

        // 3. Progressive Steering & Yaw Rate
        // Steering lock decreases dynamically as speed increases
        const speedRatio = Math.min(1.0, this.speedKmh / 220);
        const dynamicMaxSteer = this.params.maxSteerAngle * (1.0 - speedRatio * 0.65);
        const currentSteerAngle = this.inputs.steer * dynamicMaxSteer;
        this.car.setSteeringAngle(currentSteerAngle);

        // Turn rate
        let turnRate = (this.speed / 2.7) * Math.sin(currentSteerAngle);
        if (this.isReverse) turnRate = -turnRate;

        // Handbrake / Drift Oversteer Boost
        const driftGrip = (this.inputs.handbrake || (this.isDrifting && Math.abs(this.inputs.steer) > 0.4))
            ? this.params.driftStiffness
            : this.params.corneringStiffness;

        if (this.inputs.handbrake && this.speedKmh > 25) {
            this.isDrifting = true;
            turnRate += this.inputs.steer * (3.8 * (this.speedKmh / 100));
        }

        this.heading += turnRate * dt;

        // 4. Lateral Velocity & Slip Calculation
        const targetVel = forward.clone().multiplyScalar(this.speed);
        // Blend velocity towards target direction with traction recovery
        const traction = Math.min(1.0, driftGrip * dt);
        this.velocity.lerp(targetVel, traction);

        // Calculate tire slip angle and drift intensity
        const actualMovingDir = this.velocity.clone().normalize();
        const lateralSlip = actualMovingDir.dot(right);
        this.slipRatio = Math.abs(lateralSlip) + (this.inputs.handbrake ? 0.6 : 0);

        if (this.slipRatio > 0.28 && this.speedKmh > 35) {
            this.isDrifting = true;
            // Accumulate drift points
            const driftPoints = Math.round(this.slipRatio * this.speedKmh * dt * 8);
            this.currentDriftPoints += driftPoints;
            this.driftScore += driftPoints;
            this.driftMultiplier = Math.min(5.0, 1.0 + Math.floor(this.currentDriftPoints / 500) * 0.5);
        } else {
            if (this.isDrifting && this.currentDriftPoints > 0) {
                // Bank the drift points
                this.currentDriftPoints = 0;
            }
            this.isDrifting = false;
        }

        // Move position
        this.position.addScaledVector(this.velocity, dt);

        // 5. Transmission & Gear Shift Simulation
        this._updateTransmission(dt);

        // 6. Wheels Rolling & Alignment
        const rollDelta = (this.speed * dt) / this.params.wheelRadius;
        this.car.rollWheels(rollDelta);

        // 7. Dynamic Chassis Pitch & Roll (Suspension Lean)
        // Squat on throttle, nose-dive on brake
        const targetPitch = (totalLongitudinalAcc / this.params.acceleration) * 0.055;
        this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, targetPitch, dt * 10);

        // Lateral G roll
        const lateralG = (this.speed * turnRate) / 9.81;
        const targetRoll = -lateralG * 0.045;
        this.rollAngle = THREE.MathUtils.lerp(this.rollAngle, targetRoll, dt * 12);

        // Update Car Transform
        this.suspensionGroup.position.copy(this.position);
        this.suspensionGroup.rotation.y = this.heading;
        this.car.group.rotation.x = this.pitchAngle;
        this.car.group.rotation.z = this.rollAngle;

        // 8. Visual Effects (Skid Marks & Tire Smoke)
        this._updateVFX(dt, right);

        // Update Sound Synthesizer
        if (window.soundEngine) {
            window.soundEngine.update(
                this.rpm,
                this.inputs.throttle,
                this.speedKmh,
                this.slipRatio,
                this.currentGear
            );
        }
    }

    _updateTransmission(dt) {
        if (this.isReverse) {
            this.currentGear = 'R';
            this.rpm = THREE.MathUtils.lerp(this.rpm, this.idleRpm + (this.speedKmh / this.params.reverseMaxSpeed) * 5500, dt * 8);
            return;
        }

        // Speed thresholds for 7-speed dual-clutch transmission
        const gearThresholds = [0, 48, 88, 135, 185, 240, 290, 360];

        // Determine gear
        for (let g = 1; g <= 7; g++) {
            if (this.speedKmh < gearThresholds[g]) {
                this.currentGear = g;
                break;
            }
            this.currentGear = 7;
        }

        // Calculate RPM based on current gear ratio
        const minSpeedForGear = gearThresholds[this.currentGear - 1];
        const maxSpeedForGear = gearThresholds[this.currentGear];
        const gearProgress = Math.max(0, Math.min(1.0, (this.speedKmh - minSpeedForGear) / (maxSpeedForGear - minSpeedForGear)));

        let targetRpm = this.idleRpm + (this.inputs.throttle * 800) + gearProgress * (this.redlineRpm - 2600);
        if (this.speedKmh < 2) {
            targetRpm = this.idleRpm + this.inputs.throttle * 4500; // Free revving in neutral/launch
        }

        this.rpm = THREE.MathUtils.lerp(this.rpm, Math.min(this.redlineRpm, Math.max(this.idleRpm, targetRpm)), dt * 14);

        // Turbo Boost (ramps up with RPM & throttle)
        const targetBoost = (this.inputs.throttle > 0.4 && this.rpm > 3000)
            ? (this.rpm / this.redlineRpm) * 2.1
            : 0;
        this.turboBoost = THREE.MathUtils.lerp(this.turboBoost, targetBoost, dt * 6);
    }

    _updateVFX(dt, right) {
        const carWorldPos = this.suspensionGroup.position;
        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));

        // Rear tire contact positions
        const rearLeftPos = carWorldPos.clone()
            .addScaledVector(forward, -1.35)
            .addScaledVector(right, -0.9);
        const rearRightPos = carWorldPos.clone()
            .addScaledVector(forward, -1.35)
            .addScaledVector(right, 0.9);

        // Draw skidmarks if slipping or heavy braking
        const isSlipping = (this.slipRatio > 0.32 || this.inputs.handbrake || (this.inputs.brake > 0.7 && this.speedKmh > 30));

        if (isSlipping && this.speedKmh > 10) {
            if (this.lastSkidLeft && this.lastSkidRight) {
                this._addSkidMark(this.lastSkidLeft, rearLeftPos);
                this._addSkidMark(this.lastSkidRight, rearRightPos);
            }
            this.lastSkidLeft = rearLeftPos.clone();
            this.lastSkidRight = rearRightPos.clone();

            // Spawn smoke particles at rear tires
            if (Math.random() < 0.7) {
                this._spawnSmoke(rearLeftPos.x, rearLeftPos.y, rearLeftPos.z, this.slipRatio);
                this._spawnSmoke(rearRightPos.x, rearRightPos.y, rearRightPos.z, this.slipRatio);
            }
        } else {
            this.lastSkidLeft = null;
            this.lastSkidRight = null;
        }

        // Animate active smoke particles
        this.particles.forEach(p => {
            if (!p.mesh.visible) return;
            p.life += dt;
            if (p.life >= p.maxLife) {
                p.mesh.visible = false;
                return;
            }
            p.mesh.position.addScaledVector(p.velocity, dt);
            const progress = p.life / p.maxLife;
            const currentScale = 0.5 + progress * 2.4;
            p.mesh.scale.set(currentScale, currentScale, currentScale);
            p.mesh.material.opacity = (1.0 - progress) * 0.45 * (p.intensity || 1.0);
        });
    }

    resetPosition(x = 0, z = 0, heading = 0) {
        this.position.set(x, 0, z);
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.heading = heading;
        this.pitchAngle = 0;
        this.rollAngle = 0;
        this.suspensionGroup.position.copy(this.position);
        this.suspensionGroup.rotation.y = this.heading;
        this.currentGear = 1;
        this.rpm = 900;
        this.lastSkidLeft = null;
        this.lastSkidRight = null;
    }
}

window.VehiclePhysics = VehiclePhysics;
