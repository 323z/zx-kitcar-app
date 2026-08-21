/* =========================================================
   Citroen ZX Kit Car Rally Sim v6.0 — Full Engine
   256x256 Canvas · Virtual Keys · Android 4.4.4+
   ========================================================= */

(function () {
'use strict';

// ─── Canvas ─────────────────────────────────────────
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var W = 256, H = 256;

// ─── HUD Elements ──────────────────────────────────
var hudGear  = document.getElementById('hudGear');
var hudRPM   = document.getElementById('hudRPM');
var hudSpeed = document.getElementById('hudSpeed');
var hudTemp  = document.getElementById('hudTemp');
var hudBoost = document.getElementById('hudBoost');
var hudTime  = document.getElementById('hudTime');

// ─── Input State ──────────────────────────────────
var input = {
  gas: false, brake: false, clutch: false,
  left: false, right: false,
  handbrake: false, boost: false
};
var currentGear = 0; // 0=N, 1-6 forward, -1=R

// ─── Virtual Key Bindings ──────────────────────────
var keyMap = {
  'gas': 'KeyW', 'brake': 'KeyS', 'clutch': 'KeyC',
  'left': 'ArrowLeft', 'right': 'ArrowRight',
  'handbrake': 'Space', 'boost': 'ShiftLeft'
};
var gearKeyMap = {
  'gear1': 1, 'gear2': 2, 'gear3': 3,
  'gear4': 4, 'gear5': 5, 'gear6': 6, 'gearR': -1
};

// Virtual key event handlers
document.querySelectorAll('.vkey').forEach(function (el) {
  var k = el.dataset.key;
  function press(e) {
    e.preventDefault();
    el.classList.add('active');
    if (gearKeyMap[k] !== undefined) {
      setGear(gearKeyMap[k]);
    } else {
      for (var key in keyMap) {
        if (keyMap[key] === k || key === k) { input[key] = true; break; }
      }
      // direct match
      if (input[k] === false) {
        for (var ik in input) {
          if (ik === k) input[ik] = true;
        }
      }
    }
  }
  function release(e) {
    e.preventDefault();
    el.classList.remove('active');
    if (gearKeyMap[k] === undefined) {
      for (var key2 in keyMap) {
        if (keyMap[key2] === k || key2 === k) input[key2] = false;
      }
      for (var ik2 in input) {
        if (ik2 === k) input[ik2] = false;
      }
    }
  }
  el.addEventListener('touchstart', press, {passive: false});
  el.addEventListener('touchend', release, {passive: false});
  el.addEventListener('touchcancel', release, {passive: false});
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
});

// ─── Keyboard ──────────────────────────────────────
document.addEventListener('keydown', function (e) {
  var code = e.code;
  for (var k in keyMap) { if (keyMap[k] === code) { input[k] = true; e.preventDefault(); } }
  if (code === 'KeyN') setGear(0);
  if (code === 'KeyR' && !e.shiftKey) setGear(-1);
  for (var g = 1; g <= 6; g++) {
    if (code === 'Digit' + g) setGear(g);
  }
  // shift gears
  if (code === 'KeyQ') shiftUp();
  if (code === 'KeyA') shiftDown();
});
document.addEventListener('keyup', function (e) {
  var code = e.code;
  for (var k in keyMap) { if (keyMap[k] === code) input[k] = false; }
});

// ─── Car Physics State ─────────────────────────────
var car = {
  // Engine
  rpm: 800, rpmIdle: 800, rpmMax: 8500,
  engineOn: false, starting: false, startTimer: 0,
  torqueCurve: null,

  // Drivetrain
  gear: 0, gearRatios: [0, 3.5, 2.1, 1.4, 1.0, 0.78, 0.62],
  finalDrive: 4.1, diffRatio: 1.0,
  wheelRadius: 0.3,

  // Motion
  speed: 0, // m/s
  posX: 0, posY: 0,
  heading: 0, // radians
  angularVel: 0,

  // Boost
  boostActive: false, boostTimer: 0, boostCooldown: 0,
  boostAvailable: true,

  // Temp
  coolantTemp: 70, fanOn: false,

  // Timing
  timer100Active: false, timer100Start: 0, timer100Result: null,

  // Telemetry
  distance: 0, maxSpeed: 0
};

// Build torque curve (Gaussian-ish, peak ~4500 RPM)
(function buildTorque() {
  var curve = {};
  for (var r = 800; r <= 8500; r += 100) {
    var x = (r - 4500) / 2200;
    var t = 180 * Math.exp(-x * x * 1.2) + 40;
    curve[r] = t;
  }
  car.torqueCurve = curve;
})();

function getTorque(rpm) {
  var r = Math.round(rpm / 100) * 100;
  if (r < 800) r = 800;
  if (r > 8500) r = 8500;
  return car.torqueCurve[r] || 0;
}

// ─── Gear Logic ────────────────────────────────────
function setGear(g) {
  if (!car.engineOn && g !== 0) return;
  if (g === car.gear) return;
  // Require clutch or be at idle for simplicity
  if (!input.clutch && Math.abs(car.rpm - car.rpmIdle) > 200 && g !== 0) {
    // Grind — no gear change without clutch
    return;
  }
  car.gear = g;
  updateGearHUD();
}

function shiftUp() {
  if (car.gear >= 0 && car.gear < 6) setGear(car.gear + 1);
}
function shiftDown() {
  if (car.gear > 1) setGear(car.gear - 1);
  else if (car.gear === 1) setGear(0);
}

function updateGearHUD() {
  var g = car.gear;
  hudGear.textContent = g === 0 ? 'N' : (g === -1 ? 'R' : g);
}

// ─── Engine Start (Push-Start) ─────────────────────
function tryStartEngine() {
  if (car.engineOn || car.starting) return;
  car.starting = true;
  car.startTimer = 0;
}

function pushStartTick(dt) {
  if (!car.starting) return;
  car.startTimer += dt;
  // Simulate push-start: needs wheels turning + clutch engaged
  var wheelSpeed = Math.abs(car.speed);
  if (wheelSpeed > 2.0 && input.clutch) {
    // Clutch dropped with momentum → engine fires
    if (car.startTimer > 0.27) {
      car.engineOn = true;
      car.starting = false;
      car.rpm = 1200;
      car.coolantTemp = 72;
    }
  } else if (car.startTimer > 3.0) {
    // Failed push-start
    car.starting = false;
    car.startTimer = 0;
  } else {
    // Rev starter motor
    car.rpm = 200 + Math.random() * 300;
  }
}

// ─── Boost System ──────────────────────────────────
function activateBoost() {
  if (!car.boostAvailable || car.boostActive || car.boostCooldown > 0) return;
  car.boostActive = true;
  car.boostTimer = 8.0; // 8 sec overboost
  car.boostAvailable = false;
  hudBoost.textContent = 'BOOST!';
}

function updateBoost(dt) {
  if (car.boostActive) {
    car.boostTimer -= dt;
    if (car.boostTimer <= 0) {
      car.boostActive = false;
      car.boostCooldown = 25.0; // 25 sec cooldown
      hudBoost.textContent = 'COOL';
    }
  } else if (car.boostCooldown > 0) {
    car.boostCooldown -= dt;
    if (car.boostCooldown <= 0) {
      car.boostAvailable = true;
      hudBoost.textContent = 'RDY';
    } else {
      hudBoost.textContent = car.boostCooldown.toFixed(0) + 's';
    }
  } else {
    hudBoost.textContent = 'RDY';
  }
}

// ─── Cooling System ────────────────────────────────
function updateCooling(dt) {
  var target = 75;
  var heatRate = 0;
  if (car.engineOn) {
    var load = car.rpm / car.rpmMax;
    heatRate = load * 12; // degrees per second at full RPM
    if (car.boostActive) heatRate *= 1.8;
  } else {
    heatRate = -5; // cools down when off
  }
  // Fan kicks in above 90
  if (car.coolantTemp > 90) {
    car.fanOn = true;
    heatRate -= 8;
  } else if (car.coolantTemp < 80) {
    car.fanOn = false;
  }
  car.coolantTemp += heatRate * dt;
  if (car.coolantTemp < 60) car.coolantTemp = 60;
  if (car.coolantTemp > 115) {
    // Overheat! Engine loses power
    car.coolantTemp = 115;
  }
  hudTemp.textContent = car.coolantTemp.toFixed(0) + '°' + (car.fanOn ? 'F' : '');
}

// ─── Physics Update ────────────────────────────────
function updatePhysics(dt) {
  if (!car.engineOn) {
    // Engine off — coasting
    car.speed *= Math.pow(0.98, dt * 60);
    if (car.speed < 0.1) car.speed = 0;
    car.rpm = car.rpmIdle * 0.5;
    pushStartTick(dt);
  } else {
    // RPM control
    var gearRatio = car.gear === 0 ? 0 : (car.gear === -1 ? -3.5 : car.gearRatios[car.gear]);
    var finalRatio = car.finalDrive * car.diffRatio;

    if (car.gear === 0) {
      // Neutral — RPM follows gas
      var rpmTarget = input.gas ? 3000 + Math.random() * 2000 : car.rpmIdle;
      car.rpm += (rpmTarget - car.rpm) * dt * 2;
    } else {
      // In gear — RPM from wheel speed
      var wheelRPM = (car.speed / (2 * Math.PI * car.wheelRadius)) * 60;
      var calcRPM = Math.abs(wheelRPM * gearRatio * finalRatio);
      calcRPM = Math.max(car.rpmIdle, Math.min(car.rpmMax, calcRPM));

      // Apply torque
      var throttle = input.gas ? 1.0 : 0.0;
      if (car.boostActive) throttle = 1.3;
      var torque = getTorque(calcRPM) * throttle;
      var overheatFactor = car.coolantTemp > 105 ? 0.6 : 1.0;
      torque *= overheatFactor;

      // Drive force
      var driveForce = torque * gearRatio * finalRatio / car.wheelRadius;
      var mass = 1050; // kg
      var accel = driveForce / mass;

      // Braking
      var brakeForce = input.brake ? -15 : 0;
      // Drag
      var drag = -car.speed * Math.abs(car.speed) * 0.0012;
      // Rolling resistance
      var roll = -car.speed * 0.015;

      var netAccel = accel + brakeForce + drag + roll;
      car.speed += netAccel * dt;

      // RPM from actual speed
      car.rpm = calcRPM + (input.gas ? 200 : -100) * dt * 60;
      car.rpm = Math.max(car.rpmIdle, Math.min(car.rpmMax, car.rpm));
    }

    // Limiter
    if (car.rpm > car.rpmMax) car.rpm = car.rpmMax;
  }

  // Steering
  var steerSpeed = 1.8;
  if (input.left) car.angularVel = -steerSpeed;
  else if (input.right) car.angularVel = steerSpeed;
  else car.angularVel *= 0.9;

  // Handbrake
  if (input.handbrake) {
    car.angularVel *= 1.15; // rear wheels locked → spin
    car.speed *= Math.pow(0.95, dt * 60);
  }

  car.heading += car.angularVel * dt * (car.speed / 10);
  car.posX += car.speed * Math.cos(car.heading) * dt;
  car.posY += car.speed * Math.sin(car.heading) * dt;
  car.distance += Math.abs(car.speed) * dt;

  // 0-100 timer
  var speedKmh = car.speed * 3.6;
  if (speedKmh > 5 && !car.timer100Active && car.timer100Start === 0) {
    car.timer100Active = true;
    car.timer100Start = performance.now();
  }
  if (car.timer100Active && speedKmh >= 100) {
    car.timer100Active = false;
    car.timer100Result = ((performance.now() - car.timer100Start) / 1000).toFixed(2);
    hudTime.textContent = '0-100: ' + car.timer100Result + 's';
  }

  if (speedKmh > car.maxSpeed) car.maxSpeed = speedKmh;
}

// ─── Rendering (256x256) ──────────────────────────
var cameraX = 0, cameraY = 0;

function render() {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Camera follow
  cameraX = car.posX;
  cameraY = car.posY;

  // Draw road/track
  drawTrack();

  // Draw car
  drawCar();

  // Draw HUD bar
  drawHUDBar();

  // Draw RPM bar
  drawRPMBar();

  // Draw boost bar
  drawBoostBar();
}

function drawTrack() {
  // Simple rally track — alternating tarmac/dirt segments
  ctx.save();
  var tileSize = 32;
  var startX = Math.floor((cameraX - W/2) / tileSize) * tileSize;
  var startY = Math.floor((cameraY - H/2) / tileSize) * tileSize;

  for (var y = startY - tileSize; y < cameraY + H/2 + tileSize; y += tileSize) {
    for (var x = startX - tileSize; x < cameraX + W/2 + tileSize; x += tileSize) {
      var sx = x - cameraX + W/2;
      var sy = y - cameraY + H/2;

      // Pseudo-random surface type
      var hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      hash = hash - Math.floor(hash);
      var isTarmac = hash > 0.4;

      ctx.fillStyle = isTarmac ? '#3a3a3a' : '#5a4a3a';
      ctx.fillRect(sx, sy, tileSize, tileSize);

      // Road edges
      if (isTarmac) {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(sx, sy, tileSize, 1);
        ctx.fillRect(sx, sy + tileSize - 1, tileSize, 1);
      }

      // Skid marks
      if (Math.abs(car.angularVel) > 1.0 && Math.abs(x - car.posX) < 5 && Math.abs(y - car.posY) < 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx + 4, sy + 4, tileSize - 8, tileSize - 8);
      }
    }
  }

  // Track center line (dashed)
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  var clY = -cameraY + H/2;
  ctx.moveTo(0, clY);
  ctx.lineTo(W, clY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawCar() {
  ctx.save();
  var cx = W/2, cy = H/2;
  ctx.translate(cx, cy);
  ctx.rotate(car.heading + Math.PI/2);

  // Car body (top-down view) — Citroen ZX Kit Car silhouette
  // Main body
  ctx.fillStyle = '#e8c200';
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 20, 3);
  ctx.fill();

  // Roof/cockpit
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(-4, -4, 8, 10, 2);
  ctx.fill();

  // Hood
  ctx.fillStyle = '#c9a800';
  ctx.fillRect(-5, -10, 10, 4);

  // Wheels
  ctx.fillStyle = '#111';
  // Front-left
  ctx.fillRect(-7, -8, 2, 4);
  // Front-right
  ctx.fillRect(5, -8, 2, 4);
  // Rear-left
  ctx.fillRect(-7, 5, 2, 4);
  // Rear-right
  ctx.fillRect(5, 5, 2, 4);

  // Headlights
  ctx.fillStyle = '#fff';
  ctx.fillRect(-5, -10, 2, 1);
  ctx.fillRect(3, -10, 2, 1);

  // Tail lights
  ctx.fillStyle = '#f00';
  ctx.fillRect(-5, 9, 2, 1);
  ctx.fillRect(3, 9, 2, 1);

  // Spoiler
  ctx.fillStyle = '#222';
  ctx.fillRect(-6, 8, 12, 2);

  ctx.restore();

  // Speed lines when boosting
  if (car.boostActive) {
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
      var angle = car.heading + Math.PI + (Math.random() - 0.5) * 0.5;
      var len = 8 + Math.random() * 12;
      var sx2 = cx - Math.cos(angle) * 10;
      var sy2 = cy - Math.sin(angle) * 10;
      ctx.beginPath();
      ctx.moveTo(sx2, sy2);
      ctx.lineTo(sx2 - Math.cos(angle) * len, sy2 - Math.sin(angle) * len);
      ctx.stroke();
    }
  }
}

function drawHUDBar() {
  // Top bar background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, 14);

  // Gear indicator
  ctx.fillStyle = car.gear === 0 ? '#ff0' : (car.gear === -1 ? '#f00' : '#0f0');
  ctx.font = '10px Courier New';
  ctx.textAlign = 'left';
  var gearStr = car.gear === 0 ? 'N' : (car.gear === -1 ? 'R' : car.gear);
  ctx.fillText('G:' + gearStr, 3, 11);

  // Speed
  ctx.fillStyle = '#0ff';
  var spd = (car.speed * 3.6).toFixed(0);
  ctx.fillText(spd + 'km/h', 35, 11);

  // Temp
  ctx.fillStyle = car.coolantTemp > 100 ? '#f00' : (car.coolantTemp > 90 ? '#fa0' : '#0f0');
  ctx.fillText(car.coolantTemp.toFixed(0) + 'C', 90, 11);

  // Boost
  ctx.fillStyle = car.boostActive ? '#0ff' : (car.boostAvailable ? '#ff0' : '#888');
  var boostStr = car.boostActive ? 'BST!' : (car.boostAvailable ? 'RDY' : car.boostCooldown.toFixed(0)+'s');
  ctx.fillText(boostStr, 130, 11);

  // Engine status
  ctx.fillStyle = car.engineOn ? '#0f0' : (car.starting ? '#fa0' : '#f00');
  ctx.fillText(car.engineOn ? 'ON' : (car.starting ? 'CRK' : 'OFF'), 175, 11);

  // 0-100 time
  if (car.timer100Result) {
    ctx.fillStyle = '#ff0';
    ctx.fillText('0-100:' + car.timer100Result + 's', 200, 11);
  }
}

function drawRPMBar() {
  var barW = 200, barH = 4;
  var bx = (W - barW) / 2, by = H - 10;
  // Background
  ctx.fillStyle = '#222';
  ctx.fillRect(bx, by, barW, barH);
  // Fill
  var rpmPct = (car.rpm - car.rpmIdle) / (car.rpmMax - car.rpmIdle);
  rpmPct = Math.max(0, Math.min(1, rpmPct));
  var r = Math.floor(255 * rpmPct);
  var g = Math.floor(255 * (1 - rpmPct * 0.5));
  var b = 0;
  ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
  ctx.fillRect(bx, by, barW * rpmPct, barH);
  // Redline zone
  ctx.fillStyle = 'rgba(255,0,0,0.4)';
  ctx.fillRect(bx + barW * 0.8, by, barW * 0.2, barH);
}

function drawBoostBar() {
  var barW = 60, barH = 3;
  var bx = W - 65, by = H - 16;
  ctx.fillStyle = '#222';
  ctx.fillRect(bx, by, barW, barH);
  var pct = car.boostActive ? (car.boostTimer / 8.0) : (car.boostAvailable ? 1 : 1 - car.boostCooldown / 25.0);
  pct = Math.max(0, Math.min(1, pct));
  ctx.fillStyle = car.boostActive ? '#0ff' : (car.boostAvailable ? '#ff0' : '#888');
  ctx.fillRect(bx, by, barW * pct, barH);
}

// ─── Main Game Loop ────────────────────────────────
var lastTime = performance.now();
var gameRunning = false;

function gameLoop() {
  if (!gameRunning) return;
  var now = performance.now();
  var dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  // Handle start button
  if (!car.engineOn && !car.starting) {
    if (input.clutch && input.gas) {
      tryStartEngine();
    }
  }

  updatePhysics(dt);
  updateCooling(dt);
  updateBoost(dt);
  pushStartTick(dt);

  // Update HUD DOM
  var spdVal = (car.speed * 3.6).toFixed(0);
  hudRPM.textContent = Math.round(car.rpm);
  hudSpeed.textContent = spdVal;

  render();
  requestAnimationFrame(gameLoop);
}

// ─── Start Screen ──────────────────────────────────
document.getElementById('startBtn').addEventListener('click', function () {
  document.getElementById('start-screen').style.display = 'none';
  gameRunning = true;
  lastTime = performance.now();
  gameLoop();
});

// ─── Initial Render (start screen background) ──────
(function initRender() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
  // Draw some track tiles
  for (var y = 0; y < H; y += 32) {
    for (var x = 0; x < W; x += 32) {
      ctx.fillStyle = ((x/32 + y/32) % 2 === 0) ? '#3a3a3a' : '#5a4a3a';
      ctx.fillRect(x, y, 32, 32);
    }
  }
  // Center car preview
  car.posX = 0; car.posY = 0;
  drawCar();
})();

// ─── Expose for debugging ───────────────────────────
window.ZXSim = { car: car, input: input, setGear: setGear, activateBoost: activateBoost };

})();
