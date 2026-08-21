/* =========================================================
   Citroen ZX Kit Car Rally Simulator v6.0
   Complete game engine — physics, rendering, input, UI
   Target: 256x256 canvas, virtual buttons, Android 4.4.4+
   ========================================================= */

(function () {
  'use strict';

  // ── Canvas & Context ──────────────────────────────────
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 256, H = 256;

  // ── Splash screen logic ───────────────────────────────
  var splash = document.getElementById('splash');
  var progressBar = document.getElementById('progress-bar');
  var splashStatus = document.getElementById('splash-status');
  var bootSteps = [
    'Initializing engine...', 'Loading textures...',
    'Calibrating physics...', 'Mounting turbo...',
    'Ready to race!'
  ];
  var bootIdx = 0;
  function bootStep() {
    if (bootIdx < bootSteps.length) {
      splashStatus.textContent = bootSteps[bootIdx];
      progressBar.style.width = ((bootIdx + 1) / bootSteps.length * 100) + '%';
      bootIdx++;
      setTimeout(bootStep, 300);
    } else {
      setTimeout(function () { splash.style.display = 'none'; }, 400);
    }
  }
  setTimeout(bootStep, 200);

  // ── Input: Virtual Buttons + Keyboard ────────────────
  var input = { up: false, down: false, left: false, right: false,
                clutch: false, handbrake: false, boost: false };

  function bindBtn(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    var press = function (e) { e.preventDefault(); input[key] = true;  el.classList.add('active'); };
    var rel   = function (e) { e.preventDefault(); input[key] = false; el.classList.remove('active'); };
    el.addEventListener('touchstart', press, {passive:false});
    el.addEventListener('touchend',   rel,  {passive:false});
    el.addEventListener('touchcancel', rel,  {passive:false});
    el.addEventListener('mousedown',  press);
    el.addEventListener('mouseup',    rel);
    el.addEventListener('mouseleave', rel);
  }
  bindBtn('btn-up', 'up');
  bindBtn('btn-down', 'down');
  bindBtn('btn-left', 'left');
  bindBtn('btn-right', 'right');
  bindBtn('btn-clutch', 'clutch');
  bindBtn('btn-handbrake', 'handbrake');
  bindBtn('btn-boost', 'boost');

  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': input.up = true; break;
      case 'ArrowDown': case 's': input.down = true; break;
      case 'ArrowLeft': case 'a': input.left = true; break;
      case 'ArrowRight': case 'd': input.right = true; break;
      case 'c': case 'C': input.clutch = true; break;
      case ' ': input.handbrake = true; break;
      case 'b': case 'B': input.boost = true; break;
    }
  });
  document.addEventListener('keyup', function (e) {
    switch (e.key) {
      case 'ArrowUp': case 'w': input.up = false; break;
      case 'ArrowDown': case 's': input.down = false; break;
      case 'ArrowLeft': case 'a': input.left = false; break;
      case 'ArrowRight': case 'd': input.right = false; break;
      case 'c': case 'C': input.clutch = false; break;
      case ' ': input.handbrake = false; break;
      case 'b': case 'B': input.boost = false; break;
    }
  });

  // ── Car Physics Constants ─────────────────────────────
  var GEAR_RATIOS = [-3.5, 0, 3.727, 2.364, 1.681, 1.312, 1.0, 0.793];
  var FINAL_DRIVE = 4.125;
  var WHEEL_RADIUS = 0.3;
  var MASS = 1200;
  var DRAG_COEF = 0.42;
  var ROLL_RES = 12;
  var MAX_ENGINE_TORQUE = 280;
  var IDLE_RPM = 900;
  var REDLINE = 7200;
  var MAX_RPM = 7500;
  var RPM_PER_SEC = 4000;
  var SHIFT_UP_RPM = 6500;
  var SHIFT_DOWN_RPM = 2500;
  var BOOST_MULT = 1.35;
  var BOOST_DUR = 8.0;
  var BOOST_COOLDOWN = 25.0;

  // ── Car State ─────────────────────────────────────────
  var car = {
    x: 128, y: 128, angle: 0, speed: 0, rpm: IDLE_RPM,
    gear: 0, clutch: 1.0, throttle: 0, brake: 0,
    steering: 0, handbrake: false, boost: false,
    boostTimer: 0, boostCD: 0, temp: 85, fan: false,
    odometer: 0, lapTime: 0, bestLap: 0,
    accelTime: 0, accelStart: 0, measuring: false,
    onTrack: true, surfaceGrip: 1.0,
    engineOn: false, starting: false, startTimer: 0
  };

  // ── Track ─────────────────────────────────────────────
  var trackW = 40;
  var checkpoints = [
    {x:128, y:40}, {x:200, y:60}, {x:220, y:128},
    {x:200, y:200}, {x:128, y:220}, {x:50, y:200},
    {x:30, y:128}, {x:50, y:60}
  ];
  var cpIdx = 0;
  var lapCount = 0;

  // ── Engine torque curve (Gaussian) ────────────────────
  function engineTorque(rpm) {
    var peak = 4200;
    var sigma = 1800;
    var t = MAX_ENGINE_TORQUE * Math.exp(-Math.pow(rpm - peak, 2) / (2 * sigma * sigma));
    return Math.max(0, t);
  }

  // ── Push-start (助推启动) ─────────────────────────────
  function tryPushStart(dt) {
    if (car.starting) {
      car.startTimer += dt;
      car.rpm += 600 * dt;
      if (car.rpm >= 1200 || car.startTimer > 3.0) {
        car.starting = false;
        car.engineOn = true;
        car.rpm = Math.max(car.rpm, 1200);
      }
    } else if (!car.engineOn && car.speed > 2.0 && input.clutch) {
      car.starting = true;
      car.startTimer = 0;
    }
  }

  // ── Transmission ──────────────────────────────────────
  function updateGear(dt) {
    if (input.clutch) {
      // Clutch disengaged — RPM floats
      car.rpm += (input.up ? 800 : (input.down ? -400 : 0)) * dt * 60;
      car.rpm = Math.max(IDLE_RPM * 0.6, Math.min(MAX_RPM, car.rpm));
    } else {
      // Auto-shift logic
      if (car.gear > 1 && car.rpm > SHIFT_UP_RPM) {
        car.gear = Math.min(7, car.gear + 1);
        car.rpm *= 0.7;
      } else if (car.gear > 2 && car.rpm < SHIFT_DOWN_RPM) {
        car.gear = Math.max(1, car.gear - 1);
        car.rpm *= 1.3;
      }
    }

    // Manual shift (keyboard 1-7)
    if (input.up && !input.clutch) {
      // upshift request via rapid clutch
    }
  }

  // ── Physics update ────────────────────────────────────
  function updatePhysics(dt) {
    if (!car.engineOn && !car.starting) {
      // Engine off — coasting
      car.speed *= Math.pow(0.98, dt * 60);
      tryPushStart(dt);
    } else {
      car.starting = false;
    }

    // Throttle / Brake
    var throttle = input.up ? 1 : 0;
    var brake = input.down ? 1 : 0;
    car.throttle = throttle;
    car.brake = brake;

    // Boost
    if (car.boostCD > 0) car.boostCD -= dt;
    if (input.boost && car.boostCD <= 0 && car.boostTimer <= 0) {
      car.boost = true;
      car.boostTimer = BOOST_DUR;
      car.boostCD = BOOST_COOLDOWN;
    }
    if (car.boostTimer > 0) {
      car.boostTimer -= dt;
      if (car.boostTimer <= 0) car.boost = false;
    }

    // RPM dynamics
    if (car.engineOn) {
      var targetRpm = IDLE_RPM + throttle * (REDLINE - IDLE_RPM);
      var rpmRate = (targetRpm - car.rpm) * 2.5;
      car.rpm += rpmRate * dt;
      if (car.boost) car.rpm = Math.min(MAX_RPM, car.rpm + 800 * dt);
      car.rpm = Math.max(IDLE_RPM * 0.5, Math.min(MAX_RPM, car.rpm));
    }

    // Driving force
    var gearRatio = GEAR_RATIOS[car.gear] || 0;
    var driveForce = 0;
    if (car.gear > 0 && !input.clutch) {
      var wheelRpm = car.rpm * gearRatio * FINAL_DRIVE;
      var wheelTorque = engineTorque(car.rpm) * gearRatio * FINAL_DRIVE;
      if (car.boost) wheelTorque *= BOOST_MULT;
      driveForce = wheelTorque / WHEEL_RADIUS;
    }

    // Acceleration
    var accel = driveForce / MASS;
    if (brake > 0) accel -= 12;
    accel -= DRAG_COEF * car.speed * car.speed / MASS;
    accel -= ROLL_RES * car.speed / MASS;

    car.speed += accel * dt;
    car.speed = Math.max(-8, Math.min(85, car.speed));

    // Steering
    var steerInput = 0;
    if (input.left) steerInput -= 1;
    if (input.right) steerInput += 1;
    car.steering = steerInput;

    var speedFactor = Math.min(1, car.speed / 20);
    var turnRate = steerInput * 1.8 * speedFactor;
    if (input.handbrake) turnRate *= 1.8; // Drift!
    car.angle += turnRate * dt;

    // Position update
    var dx = Math.sin(car.angle) * car.speed * dt;
    var dy = -Math.cos(car.angle) * car.speed * dt;
    car.x += dx;
    car.y += dy;
    car.odometer += Math.sqrt(dx*dx + dy*dy) * 0.01;

    // World wrap (simple)
    if (car.x < -10) car.x = W + 10;
    if (car.x > W + 10) car.x = -10;
    if (car.y < -10) car.y = H + 10;
    if (car.y > H + 10) car.y = -10;

    // Checkpoint / Lap
    var cp = checkpoints[cpIdx];
    var d = Math.sqrt((car.x - cp.x)*(car.x - cp.x) + (car.y - cp.y)*(car.y - cp.y));
    if (d < 18) {
      cpIdx = (cpIdx + 1) % checkpoints.length;
      if (cpIdx === 0) {
        lapCount++;
        if (car.lapTime > 0) {
          if (car.bestLap === 0 || car.lapTime < car.bestLap) car.bestLap = car.lapTime;
        }
        car.lapTime = 0;
      }
    }
    car.lapTime += dt;

    // 0-100 timing
    if (car.speed >= 27.78 && !car.measuring) { // 100 km/h ≈ 27.78 m/s
      car.measuring = true;
      car.accelTime = car.lapTime; // rough
    }
    if (car.speed < 5) car.measuring = false;

    // Cooling system
    var loadFactor = throttle * (car.speed > 10 ? 1 : 0.5);
    car.temp += (loadFactor * 8 - (car.temp > 90 ? 6 : 2)) * dt;
    car.temp = Math.max(70, Math.min(130, car.temp));
    car.fan = car.temp > 95;

    updateGear(dt);
  }

  // ── Rendering ─────────────────────────────────────────
  function draw() {
    // Sky / background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Ground (rally dirt)
    ctx.fillStyle = '#3a2e1e';
    ctx.fillRect(0, 0, W, H);

    // Track (simple oval-ish)
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = trackW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i <= checkpoints.length; i++) {
      var p = checkpoints[i % checkpoints.length];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Track edges
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (var j = 0; j <= checkpoints.length; j++) {
      var q = checkpoints[j % checkpoints.length];
      if (j === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Checkpoint markers
    for (var k = 0; k < checkpoints.length; k++) {
      var cp = checkpoints[k];
      ctx.fillStyle = (k === cpIdx) ? '#0f0' : '#444';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trees / obstacles
    var trees = [[80,80],[180,100],[60,180],[200,160],[100,200],[160,40]];
    for (var t = 0; t < trees.length; t++) {
      var tx = trees[t][0], ty = trees[t][1];
      ctx.fillStyle = '#1a3a1a';
      ctx.beginPath();
      ctx.arc(tx, ty, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a5a0a';
      ctx.beginPath();
      ctx.arc(tx-2, ty-2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Car body
    ctx.fillStyle = '#cc0';
    ctx.fillRect(-6, -3, 12, 6);
    // Car roof
    ctx.fillStyle = '#aa0';
    ctx.fillRect(-3, -2, 6, 4);
    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, -4, 3, 2);
    ctx.fillRect(-5,  2, 3, 2);
    ctx.fillRect( 2, -4, 3, 2);
    ctx.fillRect( 2,  2, 3, 2);
    // Headlights
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, -2, 2, 1);
    ctx.fillRect(4,  1, 2, 1);

    ctx.restore();

    // ── HUD ──
    // RPM bar
    var rpmPct = (car.rpm - IDLE_RPM) / (MAX_RPM - IDLE_RPM);
    ctx.fillStyle = '#222';
    ctx.fillRect(4, H - 22, W - 8, 6);
    var rpmColor = rpmPct > 0.85 ? '#f00' : (rpmPct > 0.65 ? '#ff0' : '#0f0');
    ctx.fillStyle = rpmColor;
    ctx.fillRect(4, H - 22, (W - 8) * rpmPct, 6);

    // Speed (km/h)
    var speedKmh = Math.round(car.speed * 3.6);
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.fillText(speedKmh + ' km/h', 6, 12);

    // Gear
    var gearStr = car.gear === 0 ? 'R' : (car.gear === 1 ? 'N' : car.gear - 1);
    ctx.fillStyle = car.gear > 1 ? '#0f0' : '#ff0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('G' + gearStr, W - 28, 12);

    // Engine temp
    ctx.fillStyle = car.temp > 105 ? '#f00' : (car.temp > 95 ? '#fa0' : '#0cc');
    ctx.font = '7px monospace';
    ctx.fillText('T:' + Math.round(car.temp) + (car.fan ? ' FAN' : ''), 6, 22);

    // Boost indicator
    if (car.boost) {
      ctx.fillStyle = '#f0f';
      ctx.fillText('BOOST!', W/2 - 14, 12);
    } else if (car.boostCD > 0) {
      ctx.fillStyle = '#666';
      ctx.fillText('CD:' + Math.ceil(car.boostCD) + 's', W/2 - 14, 12);
    }

    // Lap / Time
    ctx.fillStyle = '#ccc';
    ctx.font = '7px monospace';
    ctx.fillText('Lap:' + lapCount + ' T:' + car.lapTime.toFixed(1) + 's', 6, H - 28);
    if (car.bestLap > 0) {
      ctx.fillStyle = '#0f0';
      ctx.fillText('Best:' + car.bestLap.toFixed(1) + 's', W - 60, H - 28);
    }

    // 0-100 timer
    if (car.accelTime > 0 && car.accelTime < 30) {
      ctx.fillStyle = '#ff0';
      ctx.fillText('0-100: ' + car.accelTime.toFixed(2) + 's', W/2 - 24, H - 12);
    }

    // Engine off warning
    if (!car.engineOn) {
      ctx.fillStyle = '#f00';
      ctx.font = '8px monospace';
      ctx.fillText('ENGINE OFF — Clutch+Roll!', 30, H/2);
    }

    // Clutch indicator
    if (input.clutch) {
      ctx.fillStyle = '#fa0';
      ctx.font = '7px monospace';
      ctx.fillText('CLUTCH', W - 40, 22);
    }
  }

  // ── Main loop ─────────────────────────────────────────
  var lastTime = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    updatePhysics(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ── Gear display (DOM) ──────────────────────────────
  var gearEl = document.getElementById('gear-display');
  setInterval(function () {
    if (!gearEl) return;
    var g = car.gear === 0 ? 'R' : (car.gear === 1 ? 'N' : car.gear - 1);
    gearEl.textContent = 'Gear: ' + g + ' | RPM: ' + Math.round(car.rpm);
  }, 100);

})();
