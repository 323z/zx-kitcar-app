// ============================================================
//  Citroen ZX Kit Car Rally Simulator v6.0
//  256x256 canvas, virtual keypad, full physics
//  Ported from C++ Windows console original
// ============================================================

(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = 256, H = 256;

  // ─── Input ───────────────────────────────────────────
  var keys = {};
  var touch = {
    left: false, right: false, up: false, down: false,
    lbtn: false, rbtn: false, obtn: false, hbtn: false,
    sbtn: false, absbtn: false
  };

  document.addEventListener('keydown', function (e) {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

  function isDown(action) {
    switch (action) {
      case 'left': return keys['arrowleft'] || keys['a'] || touch.left;
      case 'right': return keys['arrowright'] || keys['d'] || touch.right;
      case 'up': return keys['arrowup'] || keys['w'] || touch.up;
      case 'down': return keys['arrowdown'] || keys['s'] || touch.down;
      case 'shift': return keys['shift'] || touch.sbtn;
      case 'space': return keys[' '] || touch.hbtn;
      case 'o': return keys['o'] || touch.obtn;
      case 'b': return keys['b'] || touch.absbtn;
      case 'r': return keys['r'];
      case 'l': return keys['l'] || touch.lbtn;
      case 'e': return keys['e'] || touch.rbtn;
    }
    return false;
  }

  // ─── Virtual Buttons (touch) ────────────────────────
  var btns = [
    { id: 'left', x: 8, y: 200, w: 32, h: 24, label: '◀', ref: 'left' },
    { id: 'right', x: 48, y: 200, w: 32, h: 24, label: '▶', ref: 'right' },
    { id: 'up', x: 28, y: 174, w: 32, h: 24, label: '▲', ref: 'up' },
    { id: 'down', x: 28, y: 226, w: 32, h: 24, label: '▼', ref: 'down' },
    { id: 'lbtn', x: 200, y: 170, w: 22, h: 18, label: 'L', ref: 'lbtn' },
    { id: 'rbtn', x: 226, y: 170, w: 22, h: 18, label: 'R', ref: 'rbtn' },
    { id: 'obtn', x: 200, y: 192, w: 22, h: 18, label: 'O', ref: 'obtn' },
    { id: 'hbtn', x: 226, y: 192, w: 22, h: 18, label: 'H', ref: 'hbtn' },
    { id: 'sbtn', x: 200, y: 214, w: 22, h: 18, label: 'S', ref: 'sbtn' },
    { id: 'absbtn', x: 226, y: 214, w: 22, h: 18, label: 'A', ref: 'absbtn' },
  ];

  function pointInBtn(px, py, b) { return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h; }

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    for (var i = 0; i < e.touches.length; i++) {
      var tx = (e.touches[i].clientX - rect.left) * sx;
      var ty = (e.touches[i].clientY - rect.top) * sy;
      for (var j = 0; j < btns.length; j++) {
        if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    for (var k in touch) touch[k] = false;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    for (var i = 0; i < e.touches.length; i++) {
      var tx = (e.touches[i].clientX - rect.left) * sx;
      var ty = (e.touches[i].clientY - rect.top) * sy;
      for (var j = 0; j < btns.length; j++) {
        if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var k in touch) touch[k] = false;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    for (var i = 0; i < e.touches.length; i++) {
      var tx = (e.touches[i].clientX - rect.left) * sx;
      var ty = (e.touches[i].clientY - rect.top) * sy;
      for (var j = 0; j < btns.length; j++) {
        if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
      }
    }
  }, { passive: false });

  // Mouse fallback for desktop testing
  var mouseDown = false;
  canvas.addEventListener('mousedown', function (e) {
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    var tx = (e.clientX - rect.left) * sx, ty = (e.clientY - rect.top) * sy;
    for (var j = 0; j < btns.length; j++) if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
    mouseDown = true;
  });
  canvas.addEventListener('mouseup', function () { for (var k in touch) touch[k] = false; mouseDown = false; });
  canvas.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    var tx = (e.clientX - rect.left) * sx, ty = (e.clientY - rect.top) * sy;
    for (var k in touch) touch[k] = false;
    for (var j = 0; j < btns.length; j++) if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
  });

  // ─── Car Physics State ───────────────────────────────
  var car = {
    x: 128, y: 80, angle: 0, speed: 0, gear: 0, rpm: 800,
    clutch: 1, throttle: 0, brake: 0, handbrake: false,
    abs: false, overboost: false, obTimer: 0, obCooldown: 0,
    engineTemp: 75, fanOn: false, oilPressure: 60,
    lapTime: 0, bestLap: 999, lastLap: 0,
    lapCount: 0, raceTime: 0, finishTime: 0,
    dragStart: 0, dragActive: false, dragResult: 0,
    pos: 0, totalPos: 4, driftScore: 0,
    accelTime: 0, speedMax: 0,
    // Telemetry
    wheelSpin: [0, 0, 0, 0],
    suspTravel: [0, 0, 0, 0],
    gForce: 0,
    fuel: 100,
    damage: 0,
    // Camera
    camMode: 0, // 0=chase, 1=hood, 2=orbit
    camAngle: 0,
  };

  // ─── Track ───────────────────────────────────────────
  var trackW = 48;
  var track = {
    segments: [],
    checkpoints: [],
    length: 2000,
  };

  function generateTrack() {
    track.segments = [];
    var numPts = 40;
    var pts = [];
    for (var i = 0; i < numPts; i++) {
      var a = (i / numPts) * Math.PI * 2;
      var r = 80 + Math.sin(a * 3) * 25 + Math.cos(a * 2) * 15;
      pts.push({ x: 128 + Math.cos(a) * r, y: 128 + Math.sin(a) * r });
    }
    // Build centerline
    for (var i = 0; i < numPts; i++) {
      var p1 = pts[i], p2 = pts[(i + 1) % numPts];
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx);
      track.segments.push({ x: p1.x, y: p1.y, angle: angle, length: dist });
    }
    // Checkpoints
    track.checkpoints = [10, 20, 30];
    track.length = numPts;
  }
  generateTrack();

  // ─── Gear ratios (6-speed sequential) ────────────────
  var gearRatios = [-3.2, 3.8, 2.4, 1.6, 1.2, 0.9, 0.75];
  var finalDrive = 4.1;
  var wheelRadius = 0.3;

  // ─── Engine torque curve (Gaussian model) ────────────
  function engineTorque(rpm) {
    var peakRPM = 6800, peakTq = 285;
    var sigma = 2200;
    var t = peakTq * Math.exp(-Math.pow(rpm - peakRPM, 2) / (2 * sigma * sigma));
    // Idle torque
    if (rpm < 800) t = peakTq * 0.3;
    // Redline cut
    if (rpm > 8200) t = 0;
    return t;
  }

  // ─── Overboost ────────────────────────────────────────
  var OVERBOOST_MAX = 8.0;
  var OVERBOOST_COOLDOWN = 25.0;

  // ─── Game state ──────────────────────────────────────
  var gameState = 'menu'; // menu, racing, paused, finished
  var frameCount = 0;
  var dt = 1 / 30;

  // ─── Sound (Web Audio) ────────────────────────────────
  var audioCtx = null;
  var engineOsc = null, engineGain = null;

  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { }
  }

  function updateEngineSound() {
    if (!audioCtx) return;
    if (!engineOsc) {
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineGain.gain.value = 0.03;
      engineOsc.start();
    }
    var freq = 40 + (car.rpm / 8000) * 200;
    engineOsc.frequency.value = freq;
    engineGain.gain.value = 0.01 + car.throttle * 0.04;
  }

  // ─── Physics Update ──────────────────────────────────
  function updatePhysics() {
    // Clutch & gear
    if (isDown('shift') && car.clutch > 0.5) {
      // Shift up
      if (car.gear < 6) car.gear++;
      car.clutch = 0;
    }
    if (isDown('control') && car.clutch > 0.5) {
      if (car.gear > 0) car.gear--;
      car.clutch = 0;
    }
    // Clutch auto-engage
    car.clutch = Math.min(1, car.clutch + dt * 2);

    // Throttle
    car.throttle = isDown('up') ? 1 : 0;
    car.brake = isDown('down') ? 1 : 0;
    car.handbrake = isDown('space');

    // Overboost
    if (isDown('o') && car.obCooldown <= 0 && car.obTimer <= 0) {
      car.overboost = true;
      car.obTimer = OVERBOOST_MAX;
    }
    if (car.obTimer > 0) {
      car.obTimer -= dt;
      if (car.obTimer <= 0) { car.overboost = false; car.obCooldown = OVERBOOST_COOLDOWN; }
    }
    if (car.obCooldown > 0) car.obCooldown -= dt;

    // ABS
    car.abs = isDown('b');

    // Engine RPM
    var targetRPM = 800 + car.throttle * 7000;
    if (car.gear > 0 && car.clutch > 0.8) {
      var wheelRPS = car.speed / (2 * Math.PI * wheelRadius);
      var gearRatio = gearRatios[car.gear] * finalDrive;
      targetRPM = wheelRPS * gearRatio * 60 / (2 * Math.PI) * 10;
      targetRPM = Math.max(800, Math.min(8200, targetRPM));
    }
    car.rpm += (targetRPM - car.rpm) * dt * 3;

    // Torque → Force
    var torque = engineTorque(car.rpm) * car.throttle * (car.overboost ? 1.35 : 1.0);
    var force = torque * gearRatios[car.gear] * finalDrive / wheelRadius * car.clutch;
    var mass = 980;
    var accel = force / mass;

    // Drag
    var drag = car.speed * car.speed * 0.0004 + car.speed * 0.02;
    accel -= drag;

    car.speed += accel * dt * 10;
    if (car.brake) car.speed -= car.speed * dt * 0.8;
    car.speed = Math.max(0, car.speed);

    // Steering
    var steer = 0;
    if (isDown('left')) steer = -1;
    if (isDown('right')) steer = 1;
    var steerAngle = steer * 0.6 * (1 - car.speed / 200);
    car.angle += steerAngle * dt * (car.handbrake ? 2.5 : 1.0);

    // Position update
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // Track boundaries (simple)
    var segIdx = Math.floor(car.pos) % track.segments.length;
    var seg = track.segments[segIdx];
    if (seg) {
      var dx = car.x - seg.x, dy = car.y - seg.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > trackW * 0.6) {
        // Off-track → slow down
        car.speed *= 0.98;
        car.damage += dt * 2;
      }
    }

    // Lap progress
    car.pos += car.speed * dt * 0.1;
    if (car.pos >= track.length) {
      car.pos -= track.length;
      car.lapCount++;
      car.lastLap = car.lapTime;
      if (car.lapTime < car.bestLap) car.bestLap = car.lapTime;
      car.lapTime = 0;
      if (car.lapCount >= 3) {
        gameState = 'finished';
        car.finishTime = car.raceTime;
      }
    }
    car.lapTime += dt;
    car.raceTime += dt;

    // Telemetry
    car.speedMax = Math.max(car.speedMax, car.speed);
    car.accelTime += dt;
    car.gForce = Math.abs(steerAngle) * car.speed * 0.1;
    for (var w = 0; w < 4; w++) {
      car.wheelSpin[w] = car.speed * (1 + (w < 2 ? 0 : 0.05) * (car.handbrake ? 2 : 1));
      car.suspTravel[w] = Math.sin(frameCount * 0.3 + w) * 2;
    }

    // Engine temp
    car.engineTemp += (car.throttle * 0.3 - 0.1) * dt;
    if (car.engineTemp > 95) car.fanOn = true;
    if (car.engineTemp < 85) car.fanOn = false;
    if (car.fanOn) car.engineTemp -= 0.2 * dt;
    car.engineTemp = Math.max(60, Math.min(120, car.engineTemp));

    // Fuel
    car.fuel -= car.throttle * dt * 0.5;
    if (car.fuel < 0) car.fuel = 0;

    // Camera
    if (isDown('c')) car.camMode = (car.camMode + 1) % 3;
    car.camAngle += steerAngle * 0.5;
  }

  // ─── Rendering ────────────────────────────────────────
  function draw() {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Camera transform
    ctx.save();
    var camX = car.x, camY = car.y;
    if (car.camMode === 1) { camX = car.x - Math.cos(car.angle) * 20; camY = car.y - Math.sin(car.angle) * 20; }
    if (car.camMode === 2) { camX = car.x + Math.cos(car.camAngle) * 40; camY = car.y + Math.sin(car.camAngle) * 40; }
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-car.angle * 0.3);
    ctx.translate(-camX, -camY);

    // Track
    drawTrack();

    // Cars (AI + player)
    drawCars();

    // Player car (always on top)
    drawPlayerCar();

    ctx.restore();

    // HUD
    drawHUD();

    // Virtual buttons
    drawButtons();

    // Menu / overlays
    if (gameState === 'menu') drawMenu();
    if (gameState === 'finished') drawFinish();
  }

  function drawTrack() {
    // Draw track surface
    ctx.strokeStyle = '#444';
    ctx.lineWidth = trackW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < track.segments.length; i++) {
      var s = track.segments[i];
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Track edges (curbs)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (var i = 0; i < track.segments.length; i++) {
      var s = track.segments[i];
      var nx = -Math.sin(s.angle), ny = Math.cos(s.angle);
      var ex = s.x + nx * trackW * 0.5, ey = s.y + ny * trackW * 0.5;
      if (i === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish line
    var s0 = track.segments[0];
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s0.x - 10, s0.y - 10);
    ctx.lineTo(s0.x + 10, s0.y + 10);
    ctx.stroke();
  }

  function drawCars() {
    // AI cars
    var aiCars = [
      { pos: car.pos + 5, color: '#e74c3c', offset: -8 },
      { pos: car.pos + 12, color: '#3498db', offset: 8 },
      { pos: car.pos - 8, color: '#2ecc71', offset: 0 },
    ];
    for (var i = 0; i < aiCars.length; i++) {
      var ai = aiCars[i];
      var idx = Math.floor(ai.pos) % track.segments.length;
      var seg = track.segments[idx];
      if (!seg) continue;
      var nx = -Math.sin(seg.angle), ny = Math.cos(seg.angle);
      var ax = seg.x + nx * ai.offset, ay = seg.y + ny * ai.offset;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(seg.angle);
      ctx.fillStyle = ai.color;
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#222';
      ctx.fillRect(-4, -2, 2, 4);
      ctx.fillRect(2, -2, 2, 4);
      ctx.restore();
    }
  }

  function drawPlayerCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Body
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-7, -4, 14, 8);
    // Hood
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-3, -3, 6, 6);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-6, -5, 3, 2);
    ctx.fillRect(-6, 3, 3, 2);
    ctx.fillRect(3, -5, 3, 2);
    ctx.fillRect(3, 3, 3, 2);
    // Spinning wheels effect
    ctx.fillStyle = '#666';
    for (var w = 0; w < 4; w++) {
      var wx = (w < 2 ? -5 : 4), wy = (w % 2 === 0 ? -4 : 4);
      var spin = Math.sin(car.wheelSpin[w] * 0.5) * 1.5;
      ctx.fillRect(wx, wy + spin, 2, 1);
    }

    ctx.restore();

    // Drift smoke
    if (car.handbrake && car.speed > 20) {
      for (var s = 0; s < 3; s++) {
        var sx = car.x - Math.cos(car.angle) * 8 + (Math.random() - 0.5) * 6;
        var sy = car.y - Math.sin(car.angle) * 8 + (Math.random() - 0.5) * 6;
        ctx.fillStyle = 'rgba(200,200,200,' + (0.3 - s * 0.1) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + s * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawHUD() {
    // RPM bar
    var rpmPct = (car.rpm - 800) / (8200 - 800);
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, 100, 8);
    var rpmColor = rpmPct > 0.85 ? '#e74c3c' : rpmPct > 0.6 ? '#f39c12' : '#2ecc71';
    ctx.fillStyle = rpmColor;
    ctx.fillRect(10, 10, 100 * rpmPct, 8);

    // Gear
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('G' + car.gear, 115, 20);

    // Speed
    ctx.font = '12px monospace';
    ctx.fillText('SPD: ' + Math.floor(car.speed), 10, 30);

    // Lap
    ctx.fillText('LAP: ' + car.lapCount + '/3', 10, 46);
    ctx.fillText('TIME: ' + car.lapTime.toFixed(1) + 's', 10, 60);
    if (car.bestLap < 999) ctx.fillText('BEST: ' + car.bestLap.toFixed(1) + 's', 10, 74);

    // Temp
    ctx.fillStyle = car.engineTemp > 100 ? '#e74c3c' : '#3498db';
    ctx.fillText('TEMP:' + Math.floor(car.engineTemp) + (car.fanOn ? ' FAN' : ''), 130, 30);

    // Boost
    if (car.overboost) { ctx.fillStyle = '#e74c3c'; ctx.fillText('BOOST!', 130, 46); }
    else if (car.obCooldown > 0) { ctx.fillStyle = '#666'; ctx.fillText('CD:' + car.obCooldown.toFixed(0), 130, 46); }

    // Fuel
    ctx.fillStyle = car.fuel < 20 ? '#e74c3c' : '#2ecc71';
    ctx.fillText('FUEL:' + Math.floor(car.fuel) + '%', 130, 62);

    // ABS
    if (car.abs) { ctx.fillStyle = '#3498db'; ctx.fillText('ABS', 130, 78); }

    // 0-100 timer
    if (car.accelTime < 30 && car.speed < 100) {
      ctx.fillStyle = '#f1c40f';
      ctx.fillText('0-100: ' + car.accelTime.toFixed(1) + 's', 130, 94);
    } else if (car.speed >= 100 && car.accelTime < 30) {
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('0-100: ' + car.accelTime.toFixed(2) + 's ✓', 130, 94);
    }
  }

  function drawButtons() {
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var active = touch[b.ref];
      ctx.fillStyle = active ? '#f1c40f' : '#333';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = active ? '#000' : '#ccc';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  function drawMenu() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CITROEN ZX KIT CAR', W / 2, 70);
    ctx.fillText('RALLY SIM v6.0', W / 2, 90);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.fillText('256x256 Virtual Racing', W / 2, 110);
    ctx.fillText('', W / 2, 125);
    ctx.fillStyle = '#fff';
    ctx.fillText('CONTROLS:', W / 2, 145);
    ctx.fillStyle = '#aaa';
    ctx.fillText('Arrows/WASD - Drive', W / 2, 160);
    ctx.fillText('Shift - Gear Up | Ctrl - Gear Down', W / 2, 172);
    ctx.fillText('Space - Handbrake', W / 2, 184);
    ctx.fillText('O - Overboost | B - ABS', W / 2, 196);
    ctx.fillText('C - Camera | R - Reset', W / 2, 208);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tap HERE or Press ENTER to Start', W / 2, 232);
    ctx.textAlign = 'left';
  }

  function drawFinish() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RACE FINISHED!', W / 2, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('Total Time: ' + car.finishTime.toFixed(2) + 's', W / 2, 110);
    ctx.fillText('Best Lap: ' + (car.bestLap < 999 ? car.bestLap.toFixed(2) + 's' : '--'), W / 2, 130);
    ctx.fillText('Max Speed: ' + Math.floor(car.speedMax), W / 2, 150);
    ctx.fillText('Damage: ' + Math.floor(car.damage) + '%', W / 2, 170);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tap or Press R to Restart', W / 2, 210);
    ctx.textAlign = 'left';
  }

  // ─── Menu input handling ─────────────────────────────
  function checkMenuStart() {
    if (gameState === 'menu' && (isDown('enter') || isDown(' '))) {
      gameState = 'racing';
      initAudio();
    }
    if (gameState === 'finished' && isDown('r')) {
      // Reset
      car.x = 128; car.y = 80; car.angle = 0; car.speed = 0;
      car.gear = 0; car.rpm = 800; car.lapCount = 0;
      car.lapTime = 0; car.raceTime = 0; car.bestLap = 999;
      car.fuel = 100; car.damage = 0; car.speedMax = 0; car.accelTime = 0;
      car.pos = 0; car.engineTemp = 75; car.fanOn = false;
      gameState = 'racing';
    }
  }

  // ─── Main loop ───────────────────────────────────────
  function frame() {
    frameCount++;
    checkMenuStart();

    if (gameState === 'racing') {
      updatePhysics();
      updateEngineSound();
    }

    draw();
    requestAnimationFrame(frame);
  }

  // ─── Start ───────────────────────────────────────────
  // Resize canvas for display while keeping 256x256 internal
  function resize() {
    var container = document.getElementById('gameContainer');
    var size = Math.min(container.clientWidth, container.clientHeight) - 10;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // Prevent context menu on long-press
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Start
  requestAnimationFrame(frame);

})();
