// ============================================================
//  Citroen ZX Kit Car Rally Simulator v6.0
//  256x256 canvas, virtual keypad, full physics
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
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault();
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
      case 'enter': return keys['enter'];
      case 'control': return keys['control'];
    }
    return false;
  }

  // ─── Virtual Buttons ────────────────────────────────
  var btns = [
    { id:'left',  x:6,  y:200, w:30, h:22, label:'\u25C0', ref:'left' },
    { id:'right', x:42, y:200, w:30, h:22, label:'\u25B6', ref:'right' },
    { id:'up',    x:24, y:174, w:30, h:22, label:'\u25B2', ref:'up' },
    { id:'down',  x:24, y:226, w:30, h:22, label:'\u25BC', ref:'down' },
    { id:'lbtn',  x:200,y:168, w:22, h:16, label:'L', ref:'lbtn' },
    { id:'rbtn',  x:226,y:168, w:22, h:16, label:'R', ref:'rbtn' },
    { id:'obtn',  x:200,y:188, w:22, h:16, label:'O', ref:'obtn' },
    { id:'hbtn',  x:226,y:188, w:22, h:16, label:'H', ref:'hbtn' },
    { id:'sbtn',  x:200,y:208, w:22, h:16, label:'S', ref:'sbtn' },
    { id:'absbtn',x:226,y:208, w:22, h:16, label:'A', ref:'absbtn' },
  ];

  function pointInBtn(px, py, b) { return px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h; }

  function updateTouch(e) {
    for (var k in touch) touch[k] = false;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    var touches = e.touches || e.changedTouches || [];
    for (var i = 0; i < touches.length; i++) {
      var tx = (touches[i].clientX - rect.left) * sx;
      var ty = (touches[i].clientY - rect.top) * sy;
      for (var j = 0; j < btns.length; j++) {
        if (pointInBtn(tx, ty, btns[j])) touch[btns[j].ref] = true;
      }
    }
  }

  canvas.addEventListener('touchstart', function(e){e.preventDefault();updateTouch(e);},{passive:false});
  canvas.addEventListener('touchend', function(e){e.preventDefault();updateTouch(e);},{passive:false});
  canvas.addEventListener('touchmove', function(e){e.preventDefault();updateTouch(e);},{passive:false});
  canvas.addEventListener('touchcancel', function(e){for(var k in touch) touch[k]=false;},{passive:false});

  var mouseDown = false;
  canvas.addEventListener('mousedown', function(e){
    mouseDown = true;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width/rect.width, sy = canvas.height/rect.height;
    var tx=(e.clientX-rect.left)*sx, ty=(e.clientY-rect.top)*sy;
    for(var j=0;j<btns.length;j++) if(pointInBtn(tx,ty,btns[j])) touch[btns[j].ref]=true;
  });
  canvas.addEventListener('mouseup', function(){for(var k in touch) touch[k]=false; mouseDown=false;});
  canvas.addEventListener('mousemove', function(e){
    if(!mouseDown) return;
    var rect = canvas.getBoundingClientRect();
    var sx = canvas.width/rect.width, sy = canvas.height/rect.height;
    var tx=(e.clientX-rect.left)*sx, ty=(e.clientY-rect.top)*sy;
    for(var k in touch) touch[k]=false;
    for(var j=0;j<btns.length;j++) if(pointInBtn(tx,ty,btns[j])) touch[btns[j].ref]=true;
  });

  // ─── Car Physics ────────────────────────────────────
  var car = {
    x:128, y:80, angle:0, speed:0, gear:0, rpm:800,
    clutch:1, throttle:0, brake:0, handbrake:false,
    abs:false, overboost:false, obTimer:0, obCooldown:0,
    engineTemp:75, fanOn:false, fuel:100, damage:0,
    lapTime:0, bestLap:999, lastLap:0, lapCount:0,
    raceTime:0, finishTime:0, pos:0,
    speedMax:0, accelTime:0,
    wheelSpin:[0,0,0,0], gForce:0, camMode:0, camAngle:0
  };

  // ─── Track (procedural oval with bumps) ─────────────
  var trackW = 48;
  var trackSegs = [];
  var TRACK_LEN = 40;

  function generateTrack() {
    trackSegs = [];
    for (var i = 0; i < TRACK_LEN; i++) {
      var a = (i / TRACK_LEN) * Math.PI * 2;
      var r = 82 + Math.sin(a*3)*22 + Math.cos(a*2)*12;
      var x = 128 + Math.cos(a)*r;
      var y = 128 + Math.sin(a)*r;
      var dx, dy;
      if (i < TRACK_LEN-1) {
        var a2 = ((i+1)/TRACK_LEN)*Math.PI*2;
        dx = (128+Math.cos(a2)*r) - x;
        dy = (128+Math.sin(a2)*r) - y;
      } else {
        dx = trackSegs[0].x - x;
        dy = trackSegs[0].y - y;
      }
      trackSegs.push({x:x, y:y, angle:Math.atan2(dy,dx)});
    }
  }
  generateTrack();

  // ─── Gear & Engine ──────────────────────────────────
  var gearRatios = [-3.2, 3.8, 2.4, 1.6, 1.2, 0.9, 0.75];
  var finalDrive = 4.1;
  var wheelR = 0.3;

  function engineTorque(rpm) {
    var peak = 6800, tq = 285, sig = 2200;
    var t = tq * Math.exp(-Math.pow(rpm-peak,2)/(2*sig*sig));
    if (rpm < 800) t = tq*0.3;
    if (rpm > 8200) t = 0;
    return t;
  }

  // ─── Audio ──────────────────────────────────────────
  var actx = null, osc = null, gain = null;
  function initAudio() {
    try { actx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
  }
  function updAudio() {
    if (!actx) return;
    if (!osc) { osc=actx.createOscillator(); gain=actx.createGain(); osc.type='sawtooth'; osc.connect(gain); gain.connect(actx.destination); gain.gain.value=0.02; osc.start(); }
    osc.frequency.value = 40 + (car.rpm/8000)*200;
    gain.gain.value = 0.01 + car.throttle*0.03;
  }

  // ─── Physics ────────────────────────────────────────
  function updatePhysics() {
    var dt = 1/30;

    // Shifting
    if (isDown('shift') && car.clutch > 0.5) { if(car.gear<6) car.gear++; car.clutch=0; }
    if (isDown('control') && car.clutch > 0.5) { if(car.gear>0) car.gear--; car.clutch=0; }
    car.clutch = Math.min(1, car.clutch + dt*2);

    // Inputs
    car.throttle = isDown('up') ? 1 : 0;
    car.brake = isDown('down') ? 1 : 0;
    car.handbrake = isDown('space');

    // Overboost
    if (isDown('o') && car.obCooldown<=0 && car.obTimer<=0) { car.overboost=true; car.obTimer=8; }
    if (car.obTimer>0) { car.obTimer-=dt; if(car.obTimer<=0){car.overboost=false; car.obCooldown=25;} }
    if (car.obCooldown>0) car.obCooldown-=dt;
    car.abs = isDown('b');

    // RPM
    var tgtRpm = 800 + car.throttle*7000;
    if (car.gear>0 && car.clutch>0.8) {
      var wheelRPS = car.speed/(2*Math.PI*wheelR);
      tgtRpm = wheelRPS*gearRatios[car.gear]*finalDrive*60/(2*Math.PI)*10;
      tgtRpm = Math.max(800, Math.min(8200, tgtRpm));
    }
    car.rpm += (tgtRpm - car.rpm)*dt*3;

    // Force
    var tq = engineTorque(car.rpm)*car.throttle*(car.overboost?1.35:1);
    var force = tq*gearRatios[car.gear]*finalDrive/wheelR*car.clutch;
    var accel = force/980 - car.speed*car.speed*0.0004 - car.speed*0.02;
    if (car.brake) accel -= car.speed*0.8;

    car.speed = Math.max(0, car.speed + accel*dt*10);

    // Steering
    var steer = (isDown('left')?-1:0) + (isDown('right')?1:0);
    var sAng = steer*0.6*(1-car.speed/200);
    car.angle += sAng*dt*(car.handbrake?2.5:1);

    // Move
    car.x += Math.cos(car.angle)*car.speed*dt;
    car.y += Math.sin(car.angle)*car.speed*dt;

    // Track bounds
    var idx = Math.floor(car.pos)%TRACK_LEN;
    var seg = trackSegs[idx];
    if (seg) {
      var dx=car.x-seg.x, dy=car.y-seg.y;
      if (Math.sqrt(dx*dx+dy*dy) > trackW*0.6) { car.speed*=0.98; car.damage+=dt*2; }
    }

    // Progress
    car.pos += car.speed*dt*0.1;
    if (car.pos >= TRACK_LEN) {
      car.pos -= TRACK_LEN;
      car.lapCount++;
      car.lastLap = car.lapTime;
      if (car.lapTime < car.bestLap) car.bestLap = car.lapTime;
      car.lapTime = 0;
      if (car.lapCount >= 3) { gameState='finished'; car.finishTime=car.raceTime; }
    }
    car.lapTime+=dt; car.raceTime+=dt;

    // Telemetry
    car.speedMax = Math.max(car.speedMax, car.speed);
    car.accelTime += dt;
    car.gForce = Math.abs(sAng)*car.speed*0.1;
    for (var w=0;w<4;w++) car.wheelSpin[w] = car.speed*(1+(w<2?0:0.05)*(car.handbrake?2:1));

    // Temp
    car.engineTemp += (car.throttle*0.3-0.1)*dt;
    car.fanOn = car.engineTemp > 95;
    if (car.fanOn) car.engineTemp -= 0.2*dt;
    car.engineTemp = Math.max(60, Math.min(120, car.engineTemp));

    // Fuel
    car.fuel = Math.max(0, car.fuel - car.throttle*dt*0.5);

    // Camera
    if (isDown('c')) car.camMode = (car.camMode+1)%3;
    car.camAngle += sAng*0.5;
  }

  // ─── Rendering ──────────────────────────────────────
  function draw() {
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,W,H);
    ctx.save();
    var cx=car.x, cy=car.y;
    if(car.camMode===1){cx=car.x-Math.cos(car.angle)*20;cy=car.y-Math.sin(car.angle)*20;}
    if(car.camMode===2){cx=car.x+Math.cos(car.camAngle)*40;cy=car.y+Math.sin(car.camAngle)*40;}
    ctx.translate(W/2,H/2); ctx.rotate(-car.angle*0.3); ctx.translate(-cx,-cy);

    drawTrack();
    drawAICars();
    drawPlayerCar();
    ctx.restore();

    drawHUD();
    drawButtons();
    if(gameState==='menu') drawMenu();
    if(gameState==='finished') drawFinish();
  }

  function drawTrack() {
    ctx.strokeStyle='#444'; ctx.lineWidth=trackW; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath();
    for(var i=0;i<trackSegs.length;i++){var s=trackSegs[i]; if(i===0) ctx.moveTo(s.x,s.y); else ctx.lineTo(s.x,s.y);}
    ctx.closePath(); ctx.stroke();

    ctx.strokeStyle='#e74c3c'; ctx.lineWidth=2; ctx.setLineDash([4,4]);
    ctx.beginPath();
    for(var i=0;i<trackSegs.length;i++){
      var s=trackSegs[i], nx=-Math.sin(s.angle), ny=Math.cos(s.angle);
      var ex=s.x+nx*trackW*0.5, ey=s.y+ny*trackW*0.5;
      if(i===0) ctx.moveTo(ex,ey); else ctx.lineTo(ex,ey);
    }
    ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);

    var s0=trackSegs[0];
    ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(s0.x-10,s0.y-10); ctx.lineTo(s0.x+10,s0.y+10); ctx.stroke();
  }

  function drawAICars() {
    var ais=[{p:car.pos+5,o:-8,c:'#e74c3c'},{p:car.pos+12,o:8,c:'#3498db'},{p:car.pos-8,o:0,c:'#2ecc71'}];
    for(var i=0;i<ais.length;i++){
      var idx=Math.floor(((ais[i].p%TRACK_LEN)+TRACK_LEN)%TRACK_LEN);
      var s=trackSegs[idx]; if(!s) continue;
      var nx=-Math.sin(s.angle), ny=Math.cos(s.angle);
      var ax=s.x+nx*ais[i].o, ay=s.y+ny*ais[i].o;
      ctx.save(); ctx.translate(ax,ay); ctx.rotate(s.angle);
      ctx.fillStyle=ais[i].c; ctx.fillRect(-6,-3,12,6);
      ctx.fillStyle='#222'; ctx.fillRect(-4,-2,2,4); ctx.fillRect(2,-2,2,4);
      ctx.restore();
    }
  }

  function drawPlayerCar() {
    ctx.save(); ctx.translate(car.x,car.y); ctx.rotate(car.angle);
    ctx.fillStyle='#f1c40f'; ctx.fillRect(-7,-4,14,8);
    ctx.fillStyle='#f39c12'; ctx.fillRect(-3,-3,6,6);
    ctx.fillStyle='#222';
    ctx.fillRect(-6,-5,3,2); ctx.fillRect(-6,3,3,2);
    ctx.fillRect(3,-5,3,2); ctx.fillRect(3,3,3,2);
    ctx.fillStyle='#666';
    for(var w=0;w<4;w++){
      var wx=(w<2?-5:4), wy=(w%2===0?-4:4);
      ctx.fillRect(wx,wy+Math.sin(car.wheelSpin[w]*0.5)*1.5,2,1);
    }
    ctx.restore();

    if(car.handbrake&&car.speed>20){
      for(var s=0;s<3;s++){
        var sx=car.x-Math.cos(car.angle)*8+(Math.random()-0.5)*6;
        var sy=car.y-Math.sin(car.angle)*8+(Math.random()-0.5)*6;
        ctx.fillStyle='rgba(200,200,200,'+(0.3-s*0.1)+')';
        ctx.beginPath(); ctx.arc(sx,sy,3+s*2,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawHUD() {
    var rpmPct=(car.rpm-800)/7400;
    ctx.fillStyle='#333'; ctx.fillRect(10,10,100,8);
    ctx.fillStyle = rpmPct>0.85?'#e74c3c':rpmPct>0.6?'#f39c12':'#2ecc71';
    ctx.fillRect(10,10,100*rpmPct,8);
    ctx.fillStyle='#fff'; ctx.font='bold 16px monospace'; ctx.fillText('G'+car.gear,115,20);
    ctx.font='12px monospace';
    ctx.fillText('SPD:'+Math.floor(car.speed),10,30);
    ctx.fillText('LAP:'+car.lapCount+'/3',10,46);
    ctx.fillText('TIME:'+car.lapTime.toFixed(1)+'s',10,60);
    if(car.bestLap<999) ctx.fillText('BEST:'+car.bestLap.toFixed(1)+'s',10,74);
    ctx.fillStyle = car.engineTemp>100?'#e74c3c':'#3498db';
    ctx.fillText('TMP:'+Math.floor(car.engineTemp)+(car.fanOn?' FAN':''),130,30);
    if(car.overboost){ctx.fillStyle='#e74c3c';ctx.fillText('BOOST!',130,46);}
    else if(car.obCooldown>0){ctx.fillStyle='#666';ctx.fillText('CD:'+car.obCooldown.toFixed(0),130,46);}
    ctx.fillStyle = car.fuel<20?'#e74c3c':'#2ecc71';
    ctx.fillText('FL:'+Math.floor(car.fuel)+'%',130,62);
    if(car.abs){ctx.fillStyle='#3498db';ctx.fillText('ABS',130,78);}
    if(car.accelTime<30&&car.speed<100){ctx.fillStyle='#f1c40f';ctx.fillText('0-100:'+car.accelTime.toFixed(1)+'s',130,94);}
    else if(car.speed>=100&&car.accelTime<30){ctx.fillStyle='#2ecc71';ctx.fillText('0-100:'+car.accelTime.toFixed(2)+'s \u2713',130,94);}
  }

  function drawButtons() {
    for(var i=0;i<btns.length;i++){
      var b=btns[i], act=touch[b.ref];
      ctx.fillStyle=act?'#f1c40f':'#333'; ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.strokeRect(b.x,b.y,b.w,b.h);
      ctx.fillStyle=act?'#000':'#ccc'; ctx.font='10px monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.label,b.x+b.w/2,b.y+b.h/2);
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }
  }

  function drawMenu() {
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#f1c40f'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
    ctx.fillText('CITROEN ZX KIT CAR',W/2,70);
    ctx.fillText('RALLY SIM v6.0',W/2,90);
    ctx.fillStyle='#aaa'; ctx.font='10px monospace';
    ctx.fillText('256x256 Virtual Racing',W/2,110);
    ctx.fillText('',W/2,125);
    ctx.fillStyle='#fff'; ctx.fillText('CONTROLS:',W/2,145);
    ctx.fillStyle='#aaa';
    ctx.fillText('Arrows/WASD - Drive',W/2,160);
    ctx.fillText('Shift - Gear Up | Ctrl - Down',W/2,172);
    ctx.fillText('Space - Handbrake',W/2,184);
    ctx.fillText('O - Overboost | B - ABS',W/2,196);
    ctx.fillText('C - Camera | R - Reset',W/2,208);
    ctx.fillStyle='#f1c40f'; ctx.fillText('Tap or Press ENTER to Start',W/2,232);
    ctx.textAlign='left';
  }

  function drawFinish() {
    ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#f1c40f'; ctx.font='bold 16px monospace'; ctx.textAlign='center';
    ctx.fillText('RACE FINISHED!',W/2,80);
    ctx.fillStyle='#fff'; ctx.font='12px monospace';
    ctx.fillText('Total: '+car.finishTime.toFixed(2)+'s',W/2,110);
    ctx.fillText('Best Lap: '+(car.bestLap<999?car.bestLap.toFixed(2):'--'),W/2,130);
    ctx.fillText('Max SPD: '+Math.floor(car.speedMax),W/2,150);
    ctx.fillText('Damage: '+Math.floor(car.damage)+'%',W/2,170);
    ctx.fillStyle='#f1c40f'; ctx.fillText('Tap or R to Restart',W/2,210);
    ctx.textAlign='left';
  }

  // ─── Game State ─────────────────────────────────────
  var gameState = 'menu';
  var frameCount = 0;

  function checkState() {
    if(gameState==='menu' && (isDown('enter')||isDown(' ')||isDown('up'))) {
      gameState='racing'; initAudio();
    }
    if(gameState==='finished' && isDown('r')) {
      car.x=128; car.y=80; car.angle=0; car.speed=0; car.gear=0; car.rpm=800;
      car.lapCount=0; car.lapTime=0; car.raceTime=0; car.bestLap=999;
      car.fuel=100; car.damage=0; car.speedMax=0; car.accelTime=0;
      car.pos=0; car.engineTemp=75; car.fanOn=false; car.obCooldown=0; car.obTimer=0;
      gameState='racing';
    }
  }

  // ─── Main Loop ──────────────────────────────────────
  function frame() {
    frameCount++;
    checkState();
    if(gameState==='racing') { updatePhysics(); updAudio(); }
    draw();
    requestAnimationFrame(frame);
  }

  // ─── Boot ───────────────────────────────────────────
  function resize() {
    var size = Math.min(window.innerWidth, window.innerHeight) - 10;
    canvas.style.width = size+'px'; canvas.style.height = size+'px';
  }
  window.addEventListener('resize', resize); resize();
  canvas.addEventListener('contextmenu', function(e){e.preventDefault();});

  requestAnimationFrame(frame);
})();
