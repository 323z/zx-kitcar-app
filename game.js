// ============================================================
//  Citroen ZX Kit Car Rally Simulator v6.0
//  256x256 Canvas + Virtual Buttons + Full Physics
// ============================================================

(function () {
'use strict';

// ---------- Canvas ----------
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- Input ----------
var keys = {};
var touchState = {};

document.addEventListener('keydown', function(e){ keys[e.key] = true; });
document.addEventListener('keyup', function(e){ keys[e.key] = false; });

// Virtual button areas (x, y, w, h, id)
var BTN = {
  LEFT:  {x:4,   y:200, w:28, h:28, label:'◀'},
  RIGHT: {x:40,  y:200, w:28, h:28, label:'▶'},
  THROTTLE:{x:196,y:190, w:28, h:28, label:'▲'},
  BRAKE: {x:228, y:190, w:28, h:28, label:'■'},
  CLUTCH:{x:196, y:224, w:24, h:24, label:'C'},
  HANDBRAKE:{x:228,y:224, w:24, h:24, label:'H'},
  UPGEAR:  {x:164, y:200, w:24, h:24, label:'▲'},
  DOWNGEAR:{x:164, y:228, w:24, h:24, label:'▼'},
  BOOST:   {x:100, y:220, w:30, h:22, label:'OBST'},
  CAMERA:  {x:130, y:220, w:24, h:22, label:'CAM'},
  START:   {x:100, y:195, w:30, h:18, label:'START'},
  RESET:   {x:135, y:195, w:24, h:18, label:'RST'}
};

function pointInBtn(px, py, b) {
  return px >= b.x && px <= b.x+b.w && py >= b.y && py <= b.y+b.h;
}

canvas.addEventListener('touchstart', function(e){
  e.preventDefault();
  var rect = canvas.getBoundingClientRect();
  for (var i=0;i<e.touches.length;i++){
    var t = e.touches[i];
    var tx = (t.clientX - rect.left) * 256 / rect.width;
    var ty = (t.clientY - rect.top)  * 256 / rect.height;
    for (var k in BTN) if (pointInBtn(tx,ty,BTN[k])) touchState[k] = true;
  }
});
canvas.addEventListener('touchend', function(e){
  e.preventDefault();
  touchState = {};
  if (e.touches.length===0) return;
  var rect = canvas.getBoundingClientRect();
  for (var i=0;i<e.touches.length;i++){
    var t = e.touches[i];
    var tx = (t.clientX - rect.left) * 256 / rect.width;
    var ty = (t.clientY - rect.top)  * 256 / rect.height;
    for (var k in BTN) if (pointInBtn(tx,ty,BTN[k])) touchState[k] = true;
  }
});
canvas.addEventListener('mousedown', function(e){
  var rect = canvas.getBoundingClientRect();
  var tx = (e.clientX - rect.left) * 256 / rect.width;
  var ty = (e.clientY - rect.top)  * 256 / rect.height;
  for (var k in BTN) if (pointInBtn(tx,ty,BTN[k])) touchState[k] = true;
});
canvas.addEventListener('mouseup', function(){ touchState = {}; });

function isDown(action) {
  if (touchState[action]) return true;
  switch(action) {
    case 'LEFT': return keys['ArrowLeft']||keys['a']||keys['A'];
    case 'RIGHT': return keys['ArrowRight']||keys['d']||keys['D'];
    case 'THROTTLE': return keys['ArrowUp']||keys['w']||keys['W'];
    case 'BRAKE': return keys['ArrowDown']||keys['s']||keys['S'];
    case 'CLUTCH': return keys['c']||keys['C'];
    case 'HANDBRAKE': return keys['h']||keys['H']||keys[' '];
    case 'UPGEAR': return keys['e']||keys['E'];
    case 'DOWNGEAR': return keys['q']||keys['Q'];
    case 'BOOST': return keys['b']||keys['B'];
    case 'CAMERA': return keys['v']||keys['V'];
    case 'START': return keys['Enter'];
    case 'RESET': return keys['r']||keys['R'];
  }
  return false;
}

// ---------- Car State ----------
var car = {
  x: 128, y: 128, angle: 0, speed: 0, rpm: 1000,
  gear: 1, clutch: false, boost: 0, boostReady: true, boostCooldown: 0,
  heat: 0, fanOn: false, abs: true, handbrake: false,
  best0to100: Infinity, accelStart: 0, racing: false,
  lap: 0, lapTimes: [],, lapStart: 0, bestLap: Infinity,
  ai: [], camera: 0, smoke: [], engineSound: null
};

// AI opponents
for (var ai=0; ai<3; ai++) {
  car.ai.push({x:100+ai*20, y:100, angle:0, speed:0, color:['#f44','#4f4','#44f'][ai], lap:0, bestLap:Infinity});
}

// Track (simple oval)
function trackDist(x,y) {
  var cx=128, cy=128, dx=x-cx, dy=y-cy;
  var angle = Math.atan2(dy,dx);
  var r = 80 + 30*Math.sin(angle*3);
  var tr = Math.sqrt(dx*dx+dy*dy);
  return tr - r; // negative = inside track
}

// ---------- Audio ----------
var audioCtx = null;
function initAudio() {
  try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
}
function playEngineSound() {
  if (!audioCtx) return;
  if (car.engineSound) return;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  gain.gain.value = 0.05;
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start();
  car.engineSound = {osc:osc, gain:gain};
}
function updateEngineSound() {
  if (!car.engineSound) return;
  var f = 60 + car.rpm * 0.3;
  car.engineSound.osc.frequency.value = f;
  var g = 0.02 + (car.throttle?0.06:0) + (car.boost>0?0.04:0);
  car.engineSound.gain.gain.value = g;
}
function stopEngineSound() {
  if (car.engineSound) { car.engineSound.osc.stop(); car.engineSound = null; }
}

// ---------- Physics ----------
var GEAR_RATIOS = [0, 3.5, 2.1, 1.4, 1.0, 0.8, 0.65];
var FINAL_DRIVE = 4.1;
var MAX_RPM = 8500, IDLE_RPM = 900;

function gearRatio() { return GEAR_RATIOS[car.gear] * FINAL_DRIVE; }

function engineTorque(rpm) {
  // Gaussian torque curve peaking at 5500 rpm
  var mu = 5500, sigma = 1800;
  var t = 180 * Math.exp(-Math.pow(rpm-mu,2)/(2*sigma*sigma)) + 30;
  if (rpm < IDLE_RPM) t *= rpm/IDLE_RPM;
  if (rpm > 7500) t *= Math.max(0.3, 1-(rpm-7500)/1500);
  return t;
}

function update(dt) {
  // Clutch
  car.clutch = isDown('CLUTCH');

  // Gear shifts (need clutch or sync)
  if (isDown('UPGEAR') && !car._lastUp) {
    if (car.gear < 6) car.gear++;
    car._lastUp = true;
  } else if (!isDown('UPGEAR')) car._lastUp = false;
  if (isDown('DOWNGEAR') && !car._lastDown) {
    if (car.gear > 1) car.gear--;
    car._lastDown = true;
  } else if (!isDown('DOWNGEAR')) car._lastDown = false;

  // Boost
  if (isDown('BOOST') && car.boostReady && car.boostCooldown<=0) {
    car.boost = 8; car.boostReady = false;
  }
  if (car.boost > 0) car.boost -= dt;
  if (!car.boostReady && car.boost<=0) car.boostCooldown = 25;
  if (car.boostCooldown > 0) {
    car.boostCooldown -= dt;
    if (car.boostCooldown <= 0) car.boostReady = true;
  }

  // Throttle / Brake
  var throttle = isDown('THROTTLE') ? 1 : 0;
  var brake = isDown('BRAKE') ? 1 : 0;
  car.handbrake = isDown('HANDBRAKE');

  // RPM simulation
  var wheelRPM = car.speed * gearRatio() * 60 / (2*Math.PI*0.3);
  var targetRPM = car.clutch ? (throttle*6500 + IDLE_RPM) : Math.max(IDLE_RPM, wheelRPM);
  car.rpm += (targetRPM - car.rpm) * Math.min(1, dt*3);
  car.rpm = Math.max(IDLE_RPM, Math.min(MAX_RPM, car.rpm));

  // Drive force
  var driveForce = 0;
  if (!car.clutch && throttle > 0) {
    driveForce = engineTorque(car.rpm) * throttle * (car.boost>0?1.3:1) / (gearRatio()*0.3);
  }
  // Drag
  var drag = car.speed * car.speed * 0.0008 + car.speed * 0.02;
  // Rolling resistance
  var roll = car.speed * 0.01;
  // Brake
  var brakeForce = brake * 0.15 * car.speed;
  // Handbrake locks rear
  var hbForce = car.handbrake ? 0.12*car.speed : 0;

  var netForce = driveForce - drag - roll - brakeForce - hbForce;
  car.speed += netForce * dt * 0.016;
  car.speed = Math.max(0, car.speed);

  // Heat
  var heatGen = throttle * (car.boost>0?3:1.5) * dt;
  car.heat += heatGen - 0.5*dt - (car.fanOn?2.5*dt:0);
  car.heat = Math.max(0, Math.min(120, car.heat));
  car.fanOn = car.heat > 70;

  // Steering
  var steer = 0;
  if (isDown('LEFT')) steer = -1;
  if (isDown('RIGHT')) steer = 1;
  var steerAmt = steer * 1.8 * (car.handbrake?1.5:1) * dt;
  // Speed-sensitive steering
  steerAmt *= Math.max(0.3, 1 - car.speed/200);
  car.angle += steerAmt;

  // Position update
  car.x += Math.cos(car.angle) * car.speed * dt * 0.06;
  car.y += Math.sin(car.angle) * car.speed * dt * 0.06;

  // Track collision (simple)
  if (trackDist(car.x, car.y) > 0) {
    // Off track - slow down
    car.speed *= 0.97;
    // Push back
    var a = Math.atan2(car.y-128, car.x-128);
    car.x -= Math.cos(a)*0.5;
    car.y -= Math.sin(a)*0.5;
  }

  // 0-100 timer
  if (car.speed >= 100/3.6 && car.accelStart === 0 && car.racing) {
    // Just crossed 100km/h
  }
  if (throttle > 0 && car.speed < 1 && car.accelStart === 0 && car.racing) {
    car.accelStart = performance.now();
  }
  if (car.accelStart > 0) {
    var elapsed = (performance.now() - car.accelStart)/1000;
    if (car.speed >= 100/3.6) {
      if (elapsed < car.best0to100) car.best0to100 = elapsed;
      car.accelStart = -1; // done
    }
    if (elapsed > 20) car.accelStart = -1; // timeout
  }

  // Lap detection (cross start/finish line at angle ~0)
  var lapAngle = Math.atan2(car.y-128, car.x-128);
  if (car._lastAngle === undefined) car._lastAngle = lapAngle;
  // Detect crossing angle 0 going positive
  if (car._lastAngle < 0.5 && lapAngle > 0.5 && car.speed > 5) {
    if (car.lapStart > 0) {
      var lapTime = (performance.now()-car.lapStart)/1000;
      car.lapTimes.push(lapTime.toFixed(2));
      if (lapTime < car.bestLap) car.bestLap = lapTime;
    }
    car.lap++;
    car.lapStart = performance.now();
  }
  car._lastAngle = lapAngle;

  // AI opponents (simple follow-track)
  for (var i=0;i<car.ai.length;i++) {
    var a = car.ai[i];
    a.angle += 0.02 + i*0.005;
    a.speed = 25 + i*5 + Math.sin(performance.now()*0.001+i)*5;
    a.x = 128 + Math.cos(a.angle)*(70+i*5);
    a.y = 128 + Math.sin(a.angle)*(70+i*5);
  }

  // Smoke particles
  if (car.handbrake && car.speed > 10) {
    car.smoke.push({x:car.x-Math.cos(car.angle)*6, y:car.y-Math.sin(car.angle)*6,
                    life:1, max:1, r:Math.random()*3+2});
  }
  for (var s=car.smoke.length-1;s>=0;s--) {
    car.smoke[s].life -= dt*0.5;
    car.smoke[s].r += dt*2;
    if (car.smoke[s].life <= 0) car.smoke.splice(s,1);
  }

  // Camera toggle
  if (isDown('CAMERA') && !car._lastCam) {
    car.camera = (car.camera+1)%3;
    car._lastCam = true;
  } else if (!isDown('CAMERA')) car._lastCam = false;

  // Start race
  if (isDown('START') && !car.racing) {
    car.racing = true; car.lap = 0; car.lapTimes=[]; car.lapStart=performance.now();
    car.accelStart = 0; car.best0to100 = Infinity;
    initAudio(); playEngineSound();
  }
  // Reset
  if (isDown('RESET')) {
    car.x=128; car.y=100; car.angle=-Math.PI/2; car.speed=0; car.rpm=1000;
    car.gear=1; car.lap=0; car.lapTimes=[]; car.lapStart=performance.now();
    car.boost=0; car.boostCooldown=0; car.boostReady=true; car.heat=0;
    car.smoke=[]; car.racing=false; car.accelStart=0;
    stopEngineSound();
  }

  updateEngineSound();
}

// ---------- Rendering ----------
function drawTrack() {
  // Grass background
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0,0,256,256);

  // Track (drawn as filled path)
  ctx.beginPath();
  for (var i=0;i<=64;i++) {
    var a = (i/64)*Math.PI*2;
    var r = 80 + 30*Math.sin(a*3);
    var px = 128+Math.cos(a)*r;
    var py = 128+Math.sin(a)*r;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle = '#444';
  ctx.fill();

  // Inner grass
  ctx.beginPath();
  for (var i=0;i<=64;i++) {
    var a = (i/64)*Math.PI*2;
    var r = 55 + 20*Math.sin(a*3+0.5);
    var px = 128+Math.cos(a)*r;
    var py = 128+Math.sin(a)*r;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle = '#2a5a2a';
  ctx.fill();

  // Start/finish line
  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate(-Math.PI/2);
  ctx.fillStyle = '#fff';
  for (var i=-3;i<=3;i++) {
    if (i%2===0) ctx.fillRect(-3, i*4-2, 6, 4);
  }
  ctx.restore();
}

function drawCar(x, y, angle, color, isPlayer) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Body
  ctx.fillStyle = color||'#cc0';
  ctx.fillRect(-5, -3, 10, 6);
  // Roof
  ctx.fillStyle = '#ff8';
  ctx.fillRect(-2, -2, 4, 3);
  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(-5,-4,3,2); ctx.fillRect(2,-4,3,2);
  ctx.fillRect(-5,2,3,2);  ctx.fillRect(2,2,3,2);
  // Headlights
  if (isPlayer) {
    ctx.fillStyle = '#ff0';
    ctx.fillRect(4,-2,1,1); ctx.fillRect(4,1,1,1);
  }
  ctx.restore();
}

function drawSmoke() {
  for (var i=0;i<car.smoke.length;i++) {
    var s = car.smoke[i];
    ctx.fillStyle = 'rgba(200,200,200,'+s.life/s.max*0.5+')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawHUD() {
  // Speed (km/h)
  var speedKmh = (car.speed*3.6).toFixed(0);
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText(speedKmh+' km/h', 4, 12);

  // Gear
  ctx.fillStyle = car.clutch?'#fa0':'#0f0';
  ctx.fillText('G'+car.gear+(car.clutch?' (C)':''), 70, 12);

  // RPM bar
  var rpmPct = (car.rpm-IDLE_RPM)/(MAX_RPM-IDLE_RPM);
  ctx.fillStyle = '#333'; ctx.fillRect(100,4,60,8);
  ctx.fillStyle = rpmPct>0.85?'#f00':rpmPct>0.6?'#ff0':'#0f0';
  ctx.fillRect(100,4,60*rpmPct,8);

  // Heat
  ctx.fillStyle = '#333'; ctx.fillRect(170,4,40,8);
  ctx.fillStyle = car.heat>80?'#f00':car.heat>50?'#fa0':'#0a0';
  ctx.fillRect(170,4,40*(car.heat/120),8);
  if (car.fanOn) { ctx.fillStyle='#0ff'; ctx.fillText('FAN',170,20); }

  // Boost
  ctx.fillStyle = '#333'; ctx.fillRect(100,14,60,6);
  ctx.fillStyle = car.boost>0?'#f0f':car.boostReady?'#0ff':'#555';
  ctx.fillRect(100,14,60*(car.boost>0?car.boost/8:(car.boostCooldown>0?1-car.boostCooldown/25:1)),6);
  ctx.fillStyle='#fff'; ctx.fillText('BST',70,20);

  // Lap / Time
  ctx.fillStyle = '#fff';
  ctx.fillText('Lap '+(car.lap+1)+'/3', 4, 244);
  if (car.lapStart > 0) {
    var curLap = ((performance.now()-car.lapStart)/1000).toFixed(1);
    ctx.fillText(curLap+'s', 60, 244);
  }
  if (car.bestLap < Infinity) {
    ctx.fillStyle='#ff0'; ctx.fillText('Best:'+car.bestLap.toFixed(1)+'s',130,244);
  }

  // 0-100
  if (car.best0to100 < Infinity) {
    ctx.fillStyle='#0ff'; ctx.fillText('0-100:'+car.best0to100.toFixed(2)+'s',4,234);
  }

  // Status
  if (!car.racing) {
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(40,80,176,60);
    ctx.fillStyle='#ff0'; ctx.font='14px monospace';
    ctx.fillText('READY',100,105);
    ctx.font='9px monospace'; ctx.fillStyle='#fff';
    ctx.fillText('Throttle+Brake=Start',62,120);
    ctx.fillText('Push-Start if stall',66,132);
  }

  // Overheat warning
  if (car.heat > 100) {
    ctx.fillStyle='#f00'; ctx.font='12px monospace';
    ctx.fillText('OVERHEAT!',90,50);
  }

  // Boost status
  if (!car.boostReady && car.boostCooldown>0) {
    ctx.fillStyle='#fa0'; ctx.font='8px monospace';
    ctx.fillText('BST CD:'+car.boostCooldown.toFixed(0)+'s',100,24);
  }
}

function drawVirtualButtons() {
  var btns = [
    ['LEFT','#444'],['RIGHT','#444'],
    ['THROTTLE','#262'],['BRAKE','#822'],
    ['CLUTCH','#843'],['HANDBRAKE','#824'],
    ['UPGEAR','#246'],['DOWNGEAR','#246'],
    ['BOOST',car.boostReady?'#a2a':'#444'],
    ['CAMERA','#448'],['START','#4a4'],['RESET','#a44']
  ];
  ctx.font='9px monospace'; ctx.textAlign='center';
  for (var i=0;i<btns.length;i++) {
    var b = BTN[btns[i][0]];
    ctx.fillStyle = touchState[btns[i][0]] ? '#fff' : btns[i][1];
    ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.fillStyle = touchState[btns[i][0]] ? '#000' : '#fff';
    ctx.fillText(b.label, b.x+b.w/2, b.y+b.h/2+3);
  }
  ctx.textAlign='left';
}

function render() {
  // Camera modes
  var camX=0, camY=0;
  if (car.camera === 1) { camX = -car.x+128; camY = -car.y+128; }
  else if (car.camera === 2) { camX = -car.x+128+Math.cos(car.angle)*20; camY = -car.y+128+Math.sin(car.angle)*20; }
  else { camX = -car.x+128; camY = -car.y+128; }

  ctx.save();
  ctx.translate(camX, camY);

  drawTrack();
  drawSmoke();

  // AI cars
  for (var i=0;i<car.ai.length;i++) {
    var a = car.ai[i];
    drawCar(a.x, a.y, a.angle+Math.PI/2, a.color, false);
  }

  // Player car
  drawCar(car.x, car.y, car.angle+Math.PI/2, '#cc0', true);

  ctx.restore();

  drawHUD();
  drawVirtualButtons();
}

// ---------- Main Loop ----------
var lastTime = performance.now();
function frame(now) {
  var dt = Math.min(0.05, (now-lastTime)/1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Push-start helper: if stalled, hold clutch + throttle then release clutch
// (simulated automatically when player presses both)

})();
