// ============================================================
//  Citroen ZX Kit Car Rally Sim v6.0 - HTML5/Canvas Port
//  256x256 screen, virtual keys, Node.js 5.8 compatible
//  Ported from citroen_ZX_16V.cpp
// ============================================================

(function (global) {
'use strict';

// ============================================================
//  Timer
// ============================================================
var g_perf_start = Date.now() / 1000;

function timer_now() {
    return Date.now() / 1000 - g_perf_start;
}

// ============================================================
//  Car constants (from C++ source)
// ============================================================
var G = 9.80665;
var AIR_DENS = 1.225;
var TIRE_R = 0.30;
var MASS = 1010.0;
var CD = 0.34;
var FRONT_A = 2.1;
var ROLL_RES = 0.013;
var MECH_EFF = 0.93;
var IDLE_RPM = 800;
var REDLINE = 9000;
var MAX_TORQUE = 238.0;
var MAX_POWER = 187000.0;
var COMPRESSION_RATIO = 12.0;
var FINAL_DRIVE = 4.50;
var GEAR_RATIO = [0, 2.636, 2.083, 1.666, 1.350, 1.150, 1.043];
var GEAR_EFF   = [0, 0.96,  0.96,  0.97,  0.97,  0.98,  0.98];
var BRAKE_FORCE_MAX = 12000.0;
var HANDBRAKE_FORCE = 5000.0;
var BRAKE_DECAY_RATE = 0.03;
var COOLANT_MASS = 8.5;
var COOLANT_SPEC_HEAT = 4186.0;
var ENGINE_HEAT_RATE = 3500.0;
var RADIATOR_COOL_RATE = 1200.0;
var TEMP_OPTIMAL = 87.0;
var TEMP_OVERHEAT = 115.0;
var TEMP_CRITICAL = 125.0;
var TEMP_AMBIENT = 22.0;
var BOOST_MULT = 1.15;
var BOOST_DURATION = 8.0;
var BOOST_COOLDOWN = 25.0;
var BOOST_TEMP_PENALTY = 0.003;
var PUSH_START_MIN_RPM = 500.0;
var PUSH_START_MIN_SPD = 3.0;
var PUSH_DRAG_TORQUE = 45.0;
var PUSH_RPM_RISE_RATE = 1800.0;
var PUSH_REQUIRED_GEARS = [0, 3.0, 4.5, 6.0, 8.0, 10.0, 12.0];

// ============================================================
//  Sim state
// ============================================================
var g_throttle = 0.0;
var g_gear = 1;
var g_rpm = 800.0;
var g_speed = 0.0;
var g_distance = 0.0;
var g_running = true;
var g_clutch = false;
var g_brake = 0.0;
var g_handbrake = false;

// Ignition: 0=OFF, 1=CRANKING, 2=RUNNING, 3=STALL
var IGN_OFF=0, IGN_CRANKING=1, IGN_RUNNING=2, IGN_STALL=3;
var g_ignition = IGN_RUNNING;
var g_crank_timer = 0.0;

var g_push_active = false;
var g_push_rpm = 0.0;
var g_push_success = false;
var g_push_ok_timer = 0.0;

var g_coolant_temp = TEMP_AMBIENT;
var g_oil_temp = TEMP_AMBIENT;
var g_radiator_fan = false;
var g_overheat_limp = false;

var g_boost_active = false;
var g_boost_timer = 0.0;
var g_boost_cooldown = 0.0;
var g_boost_available = true;

var g_wheel_lock = [0,0,0,0];
var g_wheel_slip = [0,0,0,0];

var g_timer_start = 0.0;
var g_0to100_time = -1.0;
var g_0to100_active = false;

// ============================================================
//  Canvas setup (256x256)
// ============================================================
var canvas = document.getElementById('screen');
var ctx = canvas.getContext('2d');
var W = 256, H = 256;

// Off-screen buffer for pixel manipulation
var imgData = ctx.createImageData(W, H);
var px = imgData.data;

function setPixel(x, y, r, g, b) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    var i = (y * W + x) * 4;
    px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = 255;
}

function clearScreen(r, g, b) {
    for (var i = 0; i < px.length; i += 4) {
        px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = 255;
    }
}

// Character set - minimal ASCII font (5x7)
var FONT_W = 3, FONT_H = 5;
var FONT = {
    ' ': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    '!': [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
    '"': [1,1,0,1,1,0,0,0,0,0,0,0,0,0,0],
    '#': [1,1,0,1,1,1,0,1,1,0,1,1,0,1,1],
    '$': [0,1,0,1,1,1,0,1,0,1,1,1,0,1,0],
    '%': [1,0,1,0,0,1,0,1,0,1,0,0,1,0,1],
    '&': [0,1,0,1,0,1,0,1,1,0,1,0,0,1,0],
    "'": [0,1,0,0,1,0,0,0,0,0,0,0,0,0,0],
    '(': [0,0,1,0,1,0,0,1,0,0,1,0,0,0,1],
    ')': [1,0,0,0,1,0,0,1,0,0,1,0,1,0,0],
    '*': [0,1,0,1,1,1,0,1,0,0,1,0,0,0,0],
    '+': [0,0,0,0,1,0,1,1,1,0,1,0,0,0,0],
    ',': [0,0,0,0,0,0,0,0,0,0,1,0,0,1,0],
    '-': [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0],
    '.': [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    '/': [0,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
    '0': [0,1,0,1,0,1,1,0,1,1,0,1,0,1,0],
    '1': [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
    '2': [1,1,0,0,0,1,0,1,0,1,0,0,1,1,1],
    '3': [1,1,0,0,0,1,0,1,0,0,0,1,1,1,0],
    '4': [1,0,1,1,0,1,1,1,1,0,0,1,0,0,1],
    '5': [1,1,1,1,0,0,1,1,0,0,0,1,1,1,0],
    '6': [0,1,0,1,0,0,1,1,1,1,0,1,0,1,0],
    '7': [1,1,1,0,0,1,0,1,0,0,1,0,0,1,0],
    '8': [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
    '9': [0,1,0,1,0,1,1,1,0,0,0,1,0,1,0],
    ':': [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
    ';': [0,0,0,0,1,0,0,0,0,0,1,0,0,1,0],
    '<': [0,0,1,0,1,0,1,0,0,0,1,0,0,0,1],
    '=': [0,0,0,1,1,1,0,0,0,1,1,1,0,0,0],
    '>': [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1],
    '?': [0,1,0,1,0,0,0,1,0,0,0,0,0,1,0],
    '@': [0,1,0,1,0,1,1,1,1,1,0,1,0,1,0],
    'A': [0,1,0,1,0,1,1,1,1,1,0,1,1,0,1],
    'B': [1,1,0,1,0,1,1,1,0,1,0,1,1,1,0],
    'C': [0,1,0,1,0,0,1,0,0,1,0,0,0,1,0],
    'D': [1,1,0,1,0,1,1,0,1,1,0,1,1,1,0],
    'E': [1,1,1,1,0,0,1,1,0,1,0,0,1,1,1],
    'F': [1,1,1,1,0,0,1,1,0,1,0,0,1,0,0],
    'G': [0,1,0,1,0,0,1,0,0,1,0,1,0,1,0],
    'H': [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
    'I': [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
    'J': [0,0,1,0,0,1,0,0,1,0,0,1,1,1,0],
    'K': [1,0,1,1,0,0,1,1,0,1,0,0,1,0,1],
    'L': [1,0,0,1,0,0,1,0,0,1,0,0,1,1,1],
    'M': [1,0,1,1,1,1,1,0,1,1,0,1,1,0,1],
    'N': [1,0,1,1,1,1,1,0,1,1,0,1,1,0,1],
    'O': [0,1,0,1,0,1,1,0,1,1,0,1,0,1,0],
    'P': [1,1,0,1,0,1,1,1,0,1,0,0,1,0,0],
    'Q': [0,1,0,1,0,1,1,0,1,1,1,1,0,1,1],
    'R': [1,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
    'S': [0,1,0,1,0,0,0,1,0,0,0,1,0,1,0],
    'T': [1,1,1,0,1,0,0,1,0,0,1,0,0,1,0],
    'U': [1,0,1,1,0,1,1,0,1,1,0,1,0,1,0],
    'V': [1,0,1,1,0,1,1,0,1,1,0,1,0,0,0],
    'W': [1,0,1,1,0,1,1,0,1,1,1,1,1,0,1],
    'X': [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
    'Y': [1,0,1,1,0,1,0,1,0,0,1,0,0,1,0],
    'Z': [1,1,1,0,0,1,0,1,0,1,0,0,1,1,1],
    '[': [0,1,0,1,0,0,1,0,0,1,0,0,0,1,0],
    '\\':[1,0,0,0,1,0,0,0,1,0,1,0,0,0,1],
    ']': [0,1,0,0,0,1,0,0,1,0,0,1,0,1,0],
    '^': [0,1,0,1,0,1,0,0,0,0,0,0,0,0,0],
    '_': [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    '`': [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
    'a': [0,0,0,0,1,0,0,1,1,0,1,1,0,1,1],
    'b': [1,0,0,1,0,0,1,1,0,1,0,0,1,1,0],
    'c': [0,0,0,0,1,0,1,0,0,1,0,0,0,1,0],
    'd': [0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
    'e': [0,0,0,0,1,0,1,1,1,1,0,0,0,1,0],
    'f': [0,0,0,0,1,0,1,1,0,1,0,0,1,0,0],
    'g': [0,0,0,0,1,1,0,1,0,0,1,0,0,1,0],
    'h': [1,0,0,1,0,0,1,1,0,1,0,1,1,0,1],
    'i': [0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
    'j': [0,0,0,0,0,1,0,0,1,0,0,1,0,1,0],
    'k': [1,0,0,1,0,0,1,1,0,1,0,0,1,0,1],
    'l': [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
    'm': [0,0,0,1,1,1,1,0,1,1,0,1,1,0,1],
    'n': [0,0,0,1,0,1,1,0,1,1,0,1,1,0,1],
    'o': [0,0,0,0,1,0,1,0,1,1,0,1,0,1,0],
    'p': [0,0,0,1,1,0,1,0,1,1,1,0,1,0,0],
    'q': [0,0,0,0,1,1,1,0,1,0,0,1,0,0,1],
    'r': [0,0,0,1,0,1,1,1,0,1,0,0,1,0,0],
    's': [0,0,0,0,1,0,0,1,0,0,0,1,0,1,0],
    't': [0,0,0,0,1,0,0,1,0,0,1,0,0,1,0],
    'u': [0,0,0,1,0,1,1,0,1,1,0,1,0,1,0],
    'v': [0,0,0,1,0,1,1,0,1,1,0,1,0,0,0],
    'w': [0,0,0,1,0,1,1,0,1,1,1,1,1,0,1],
    'x': [0,0,0,1,0,1,0,1,0,0,1,0,1,0,1],
    'y': [0,0,0,1,0,1,0,1,0,0,1,0,0,1,0],
    'z': [0,0,0,1,1,1,0,1,0,1,0,0,1,1,1],
    '|': [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
    '~': [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0],
    '*': [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
};

function getCharData(ch) {
    if (FONT[ch]) return FONT[ch];
    return FONT['?'];
}

function drawChar(x, y, ch, r, g, b, scale) {
    scale = scale || 1;
    var data = getCharData(ch);
    for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 3; col++) {
            if (data[row * 3 + col]) {
                for (var sy = 0; sy < scale; sy++) {
                    for (var sx = 0; sx < scale; sx++) {
                        setPixel(x + col * scale + sx, y + row * scale + sy, r, g, b);
                    }
                }
            }
        }
    }
}

function drawText(x, y, text, r, g, b, scale) {
    scale = scale || 1;
    for (var i = 0; i < text.length; i++) {
        drawChar(x + i * 3 * scale, y, text[i], r, g, b, scale);
    }
}

function drawTextCentered(y, text, r, g, b, scale) {
    scale = scale || 1;
    var tw = text.length * 3 * scale;
    var x = Math.floor((W - tw) / 2);
    drawText(x, y, text, r, g, b, scale);
}

// ============================================================
//  Helpers
// ============================================================
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function iround(v) { return (v + 0.5) | 0; }

function engine_torque(rpm_val) {
    if (rpm_val < 700) return 35.0;
    if (rpm_val > REDLINE) return 0.0;
    var peak = 7600.0, sigma = 2800.0;
    var tq = MAX_TORQUE * Math.exp(-0.5 * Math.pow((rpm_val - peak) / sigma, 2));
    var max_tq = MAX_POWER / (2 * Math.PI * rpm_val / 60.0);
    if (max_tq < tq) tq = max_tq;
    if (rpm_val < IDLE_RPM) tq = 40.0;
    return tq;
}

function speed_to_rpm(spd, gear) {
    if (gear < 1 || gear > 6) return IDLE_RPM;
    var w = spd / TIRE_R * GEAR_RATIO[gear] * FINAL_DRIVE * 60.0 / (2 * Math.PI);
    return clamp(w, 0.0, REDLINE);
}

// ============================================================
//  Physics
// ============================================================
function physics(dt) {
    var thr = g_throttle;
    var gr = g_gear;
    var rpm = g_rpm;
    var spd = g_speed;
    var cl = g_clutch;
    var ign = g_ignition;
    var brake = g_brake;
    var hb = g_handbrake;
    var coolant = g_coolant_temp;
    var oil = g_oil_temp;
    var boost_on = g_boost_active;

    // ---- PUSH-START LOGIC ----
    var push_can_engage = (ign === IGN_OFF || ign === IGN_STALL)
        && !cl && gr >= 1 && gr <= 6
        && spd >= PUSH_START_MIN_SPD;

    if (push_can_engage) {
        var target_rpm = speed_to_rpm(spd, gr);
        g_push_rpm += dt * PUSH_RPM_RISE_RATE;
        if (g_push_rpm > target_rpm) g_push_rpm = target_rpm;

        var drag_factor = PUSH_DRAG_TORQUE * GEAR_RATIO[gr] * FINAL_DRIVE / TIRE_R;
        spd -= (drag_factor / MASS) * dt * 0.5;
        if (spd < 0) spd = 0;

        g_push_active = true;

        if (g_push_rpm >= PUSH_START_MIN_RPM) {
            g_ignition = IGN_RUNNING;
            g_rpm = g_push_rpm;
            g_push_success = true;
            g_push_active = false;
            g_push_rpm = 0.0;
            g_throttle = 0.15;
            g_push_ok_timer = 3.0;
            return;
        }

        if (spd < PUSH_REQUIRED_GEARS[gr] * 0.6) {
            g_push_rpm -= dt * PUSH_RPM_RISE_RATE * 0.8;
            if (g_push_rpm < 0) g_push_rpm = 0;
        }

        g_speed = spd;
        g_distance += spd * dt;
        g_rpm = g_push_rpm;
        return;
    } else if (g_push_active && (cl || gr === 0)) {
        g_push_active = false;
        g_push_rpm = 0.0;
    }

    // ---- NORMAL IGNITION ----
    if (ign === IGN_OFF) {
        thr = 0.0;
        rpm *= (1.0 - dt * 0.8);
        if (rpm < IDLE_RPM * 0.5) rpm = 0;
    } else if (ign === IGN_CRANKING) {
        g_crank_timer += dt;
        rpm += dt * 600.0;
        if (rpm > IDLE_RPM * 1.2) {
            g_ignition = IGN_RUNNING;
            g_crank_timer = 0.0;
        }
        if (g_crank_timer > 3.0) {
            g_ignition = IGN_OFF;
            g_crank_timer = 0.0;
        }
        thr = 0.0;
    } else if (ign === IGN_STALL) {
        thr = 0.0;
        rpm = 0;
    }

    // RPM update
    if (ign === IGN_RUNNING) {
        if (!cl && gr >= 1 && gr <= 6 && spd > 0.1) {
            var tgt = speed_to_rpm(spd, gr);
            rpm += (tgt - rpm) * clamp(dt * 10.0, 0.0, 1.0);
        } else if (cl) {
            var tgt2 = IDLE_RPM + thr * (REDLINE - IDLE_RPM) * 0.90;
            rpm += (tgt2 - rpm) * clamp(dt * 5.0, 0.0, 1.0);
        } else {
            var tgt3 = IDLE_RPM + thr * (REDLINE - IDLE_RPM) * 0.90;
            rpm += (tgt3 - rpm) * clamp(dt * 4.0, 0.0, 1.0);
        }
    }
    rpm = clamp(rpm, 0.0, REDLINE + 200);

    // Drive force
    var drive = 0.0;
    if (gr >= 1 && gr <= 6 && !cl && ign === IGN_RUNNING) {
        var tq = engine_torque(rpm) * thr;
        if (boost_on) tq *= BOOST_MULT;
        var wtq = tq * GEAR_RATIO[gr] * FINAL_DRIVE * GEAR_EFF[gr];
        drive = wtq / TIRE_R;
    }

    // Brake
    var brake_force = 0.0;
    if (brake > 0.0) brake_force = brake * BRAKE_FORCE_MAX;
    if (hb) {
        brake_force += HANDBRAKE_FORCE;
        g_wheel_lock[2] = 2; g_wheel_lock[3] = 2;
    } else if (brake <= 0.8) {
        g_wheel_lock[2] = 0; g_wheel_lock[3] = 0;
    }

    // Drag
    var drag = 0.5 * AIR_DENS * CD * FRONT_A * spd * spd;
    var roll = ROLL_RES * MASS * G;
    var net = drive - drag - roll - brake_force;

    // Engine braking
    if (thr < 0.05 && spd > 0.5 && gr >= 1 && !cl && ign === IGN_RUNNING) {
        var eb = engine_torque(rpm) * 0.12 * GEAR_RATIO[gr] * FINAL_DRIVE * GEAR_EFF[gr] / TIRE_R;
        net -= eb;
    }

    // Overheat limp
    if (coolant > TEMP_OVERHEAT) {
        drive *= 0.5;
        net = drive - drag - roll - brake_force;
        g_overheat_limp = true;
    } else {
        g_overheat_limp = false;
    }

    spd += (net / MASS) * dt;
    if (spd < 0) spd = 0;

    // Wheel slip/lock
    var front_slip = (thr > 0.7 && spd < 10 && gr >= 1 && !cl && ign === IGN_RUNNING);
    g_wheel_slip[0] = front_slip ? 1 : 0;
    g_wheel_slip[1] = front_slip ? 1 : 0;
    g_wheel_slip[2] = (hb || (thr > 0.8 && spd < 5 && gr === 1)) ? 1 : 0;
    g_wheel_slip[3] = (hb || (thr > 0.8 && spd < 5 && gr === 1)) ? 1 : 0;

    if (brake > 0.8 && spd > 5) {
        g_wheel_lock[0] = 2; g_wheel_lock[1] = 2;
    } else if (!hb && brake <= 0.1) {
        g_wheel_lock[0] = 0; g_wheel_lock[1] = 0;
    }

    g_distance += spd * dt;

    // Cooling
    var load_factor = thr * (rpm / REDLINE);
    if (load_factor > 1.0) load_factor = 1.0;
    var heat_in = ENGINE_HEAT_RATE * load_factor * dt;
    if (boost_on) heat_in *= (1.0 + BOOST_TEMP_PENALTY * 60.0);
    if (ign !== IGN_RUNNING) heat_in = 0.0;

    var airflow = spd * 0.8;
    var fan_bonus = g_radiator_fan ? 1.5 : 0.0;
    var cool_out = RADIATOR_COOL_RATE * (airflow * 0.02 + fan_bonus) * dt;
    if (spd < 1.0 && !g_radiator_fan) cool_out = RADIATOR_COOL_RATE * 0.05 * dt;

    var temp_change = (heat_in - cool_out) / (COOLANT_MASS * COOLANT_SPEC_HEAT / 1000.0);
    coolant += temp_change;

    if (ign !== IGN_RUNNING) {
        coolant += (TEMP_AMBIENT - coolant) * dt * 0.02;
        if (coolant < TEMP_AMBIENT) coolant = TEMP_AMBIENT;
    }

    if (coolant > 95.0) g_radiator_fan = true;
    if (coolant < 82.0) g_radiator_fan = false;
    oil += (coolant - oil) * dt * 0.15;

    if (coolant > TEMP_CRITICAL && ign === IGN_RUNNING) {
        g_ignition = IGN_STALL;
        rpm = 0; thr = 0; g_throttle = 0.0;
    }

    // Boost
    if (boost_on) {
        g_boost_timer += dt;
        if (g_boost_timer >= BOOST_DURATION) {
            g_boost_active = false;
            g_boost_timer = 0.0;
            g_boost_cooldown = BOOST_COOLDOWN;
            g_boost_available = false;
        }
    } else if (!g_boost_available) {
        g_boost_cooldown -= dt;
        if (g_boost_cooldown <= 0.0) {
            g_boost_available = true;
            g_boost_cooldown = 0.0;
        }
    }

    // 0-100
    if (g_0to100_active) {
        if (spd * 3.6 >= 100.0) {
            g_0to100_time = timer_now() - g_timer_start;
            g_0to100_active = false;
        }
    } else if (thr > 0.5 && spd < 1.0 && gr === 1 && ign === IGN_RUNNING) {
        g_timer_start = timer_now();
        g_0to100_active = true;
        g_0to100_time = -1.0;
    }

    // Push success timer
    if (g_push_ok_timer > 0) {
        g_push_ok_timer -= dt;
        if (g_push_ok_timer <= 0) {
            g_push_success = false;
            g_push_ok_timer = 0;
        }
    }

    // Store
    g_rpm = rpm; g_speed = spd; g_coolant_temp = clamp(coolant, TEMP_AMBIENT-5, TEMP_CRITICAL+5);
    g_oil_temp = clamp(oil, TEMP_AMBIENT-5, TEMP_CRITICAL+5);
}

// ============================================================
//  Rendering - 256x256 optimized
// ============================================================

// Color palette (RGB)
var C_BLACK=0, C_WHITE=1, C_RED=2, C_GREEN=3, C_BLUE=4, C_YELLOW=5, C_CYAN=6, C_MAG=7, C_GRAY=8, C_DGRAY=9, C_LGRAY=10, C_LBLUE=11, C_LGREEN=12, C_LRED=13, C_LYEL=14, C_LMAG=15;
var PAL = [
    [0,0,0], [255,255,255], [200,0,0], [0,180,0], [0,0,200],
    [220,220,0], [0,200,200], [200,0,200], [100,100,100], [60,60,60],
    [180,180,180], [80,80,255], [0,255,0], [255,80,80], [255,255,80],
    [255,80,255]
];

function pc(x, y, ch, color) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    var p = PAL[color] || PAL[0];
    // For ASCII chars, draw the character
    if (ch >= 32 && ch < 127) {
        // Simple char rendering at 4x5 font
        drawChar(x, y, String.fromCharCode(ch), p[0], p[1], p[2], 1);
    }
}

// Simplified text rendering using a minimal font
var FONT4x5 = {
    // Minimal 4x5 font for digits and basic chars
};

function drawRect(x, y, w, h, r, g, b) {
    for (var iy = y; iy < y+h; iy++)
        for (var ix = x; ix < x+w; ix++)
            setPixel(ix, iy, r, g, b);
}

function drawRectC(x, y, w, h, color) {
    var p = PAL[color];
    drawRect(x, y, w, h, p[0], p[1], p[2]);
}

// Draw a bar (horizontal)
function drawBar(x, y, len, color) {
    var p = PAL[color];
    for (var i = 0; i < len; i++) setPixel(x+i, y, p[0], p[1], p[2]);
}

// Fast text rendering on 256x256 canvas
function drawStr(x, y, str, color) {
    var p = PAL[color];
    for (var i = 0; i < str.length; i++) {
        drawChar(x + i * 4, y, str[i], p[0], p[1], p[2], 1);
    }
}

function drawStrCenter(y, str, color) {
    var p = PAL[color];
    var tw = str.length * 4;
    var x = (W - tw) / 2;
    for (var i = 0; i < str.length; i++) {
        drawChar(x + i * 4, y, str[i], p[0], p[1], p[2], 1);
    }
}

// Number to string helpers
function numStr(v, w, dp) {
    var neg = v < 0; v = neg ? -v : v;
    var s = '';
    if (dp !== undefined) {
        var f = Math.round((v - Math.floor(v)) * Math.pow(10,dp));
        var wh = Math.floor(v);
        s = wh.toString() + '.' + (f<10?'0'+f:f);
    } else {
        s = Math.round(v).toString();
    }
    while (s.length < w) s = ' ' + s;
    if (neg && s[0]===' ') s = '-' + s.substr(1);
    else if (neg) s = '-' + s;
    return s;
}

// ============================================================
//  Main render function for 256x256
// ============================================================
function render() {
    var spd = g_speed, rpm = g_rpm, gr = g_gear, thr = g_throttle;
    var dist = g_distance, kmh = spd * 3.6;
    var coolant = g_coolant_temp, oil = g_oil_temp;
    var boost_on = g_boost_active, boost_avail = g_boost_available;
    var boost_cd = g_boost_cooldown;
    var ign = g_ignition, hb = g_handbrake, brake = g_brake;
    var fan = g_radiator_fan, limp = g_overheat_limp;
    var cl = g_clutch, push_act = g_push_active;
    var push_rpm = g_push_rpm, push_ok = g_push_success;

    // Clear
    clearScreen(0, 0, 0);

    // ---- Road scene (top area, y=8 to y=80) ----
    var roadTop = 8, roadBot = 80;
    var rc = 128; // road center
    var rl = rc - 50, rr = rc + 50;

    // Road surface (dark gray)
    for (var r = roadTop; r < roadBot; r++) {
        for (var c = rl; c <= rr; c++) {
            var seed = ((r * 7 + c * 13) ^ ((dist * 0.1) | 0)) & 1;
            setPixel(c, r, seed ? 50 : 40, seed ? 50 : 40, seed ? 50 : 40);
        }
    }

    // Center line (dashed yellow)
    for (var r2 = roadTop+2; r2 < roadBot; r2 += 4) {
        if (((r2 + dist*0.5)|0) % 8 < 4) {
            for (var cc = rc-1; cc <= rc+1; cc++) setPixel(cc, r2, 200, 200, 0);
        }
    }

    // Road edges (white + red curb)
    for (var r3 = roadTop; r3 < roadBot; r3++) {
        var curbPhase = ((r3 + dist*0.3)|0) % 4;
        var curbC = curbPhase < 2 ? C_RED : C_WHITE;
        var cp = PAL[curbC];
        setPixel(rl-1, r3, cp[0], cp[1], cp[2]);
        setPixel(rr+1, r3, cp[0], cp[1], cp[2]);
        var ep = PAL[C_WHITE];
        setPixel(rl, r3, ep[0], ep[1], ep[2]);
        setPixel(rr, r3, ep[0], ep[1], ep[2]);
    }

    // ---- Car drawing (ASCII art at y=55-78) ----
    var carY = 55;
    var carX = rc - 20;

    // Car body - simplified
    // Roof
    for (var i = 0; i < 24; i++) setPixel(carX+8+i, carY, 180, 180, 0);
    for (var i = 0; i < 20; i++) setPixel(carX+10+i, carY+1, 180, 180, 0);
    // Windshield
    for (var i = 0; i < 6; i++) setPixel(carX+6+i, carY+2, 0, 100, 200);
    for (var i = 0; i < 6; i++) setPixel(carX+18+i, carY+2, 0, 100, 200);
    // Body
    for (var i = 0; i < 28; i++) setPixel(carX+4+i, carY+3, 200, 200, 0);
    for (var i = 0; i < 28; i++) setPixel(carX+4+i, carY+4, 180, 180, 0);
    // "ZX" text
    drawStr(carX+11, carY+3, 'ZX', C_BLACK);
    // Bottom
    for (var i = 0; i < 28; i++) setPixel(carX+4+i, carY+5, 150, 150, 0);
    // Wheels
    drawRectC(carX+3, carY+6, 6, 4, C_BLACK);
    drawRectC(carX+19, carY+6, 6, 4, C_BLACK);
    // Wheel rims
    drawRectC(carX+4, carY+7, 4, 2, C_GRAY);
    drawRectC(carX+20, carY+7, 4, 2, C_GRAY);

    // Boost flames
    if (boost_on) {
        setPixel(carX+30, carY+4, 255, 80, 0);
        setPixel(carX+31, carY+3, 255, 120, 0);
        setPixel(carX+32, carY+4, 255, 60, 0);
        setPixel(carX+29, carY+5, 200, 50, 0);
    } else if (thr > 0.85 && spd > 5) {
        setPixel(carX+30, carY+4, 255, 100, 0);
    }

    // Wheel slip indicators
    for (var w = 0; w < 4; w++) {
        var wl = g_wheel_lock[w], ws = g_wheel_slip[w];
        var wx = (w < 2) ? carX+4 : carX+20;
        var wy = carY+8;
        if (wl === 2) drawStr(wx, wy, 'L', C_RED);
        else if (ws === 1) drawStr(wx, wy, 'S', C_YELLOW);
        else drawStr(wx, wy, '.', C_GREEN);
    }

    // ---- DASHBOARD (y=82 to y=255) ----
    // Background strip
    drawRectC(0, 82, 256, 174, C_DGRAY);

    // === ROW 1: Title bar ===
    drawRectC(0, 82, 256, 9, C_BLUE);
    drawStrCenter(83, 'CITROEN ZX KC v6', C_CYAN);

    // === ROW 2: RPM Bar ===
    drawStr(2, 93, 'RPM', C_YELLOW);
    var display_rpm = push_act ? push_rpm : rpm;
    var rpm_pct = clamp(display_rpm / REDLINE, 0, 1);
    var rpm_w = iround(rpm_pct * 50);
    for (var i = 0; i < 50; i++) {
        var c = (i < rpm_w) ? (i > 42 ? C_RED : i > 34 ? C_YELLOW : C_GREEN) : C_GRAY;
        if (push_act) c = C_YELLOW;
        var cp2 = PAL[c];
        setPixel(30+i, 93, cp2[0], cp2[1], cp2[2]);
        setPixel(30+i, 94, cp2[0], cp2[1], cp2[2]);
    }
    drawStr(82, 93, numStr(display_rpm, 5)|0, push_act?C_YELLOW:C_WHITE);
    if (display_rpm > REDLINE * 0.9) drawStr(110, 93, 'LIM!', C_RED);

    // === ROW 3: GEAR ===
    drawStr(2, 98, 'GEAR', C_WHITE);
    var gearStr = (gr === 0) ? '[N]' : ('[' + gr + ']');
    var gColor = boost_on ? C_RED : C_GREEN;
    if (push_act) gColor = C_YELLOW;
    drawStr(32, 98, gearStr, gColor);
    // Gear pips
    for (var g = 1; g <= 6; g++) {
        var gx = 50 + (g-1)*8;
        drawRectC(gx, 98, 6, 3, g <= gr ? C_GREEN : C_GRAY);
    }

    // === ROW 4: SPEED ===
    drawStr(2, 104, 'SPD', C_LBLUE);
    drawStr(28, 104, numStr(kmh, 5, 0), C_WHITE);
    drawStr(56, 104, 'kmh', C_GRAY);
    // Speed bar
    var spd_pct = clamp(kmh / 240.0, 0, 1);
    var spd_w = iround(spd_pct * 30);
    for (var i = 0; i < 30; i++) {
        var sc = i < spd_w ? (i>24?C_RED:i>18?C_YELLOW:C_LBLUE) : C_GRAY;
        var sp = PAL[sc];
        setPixel(90+i, 104, sp[0], sp[1], sp[2]);
    }

    // === ROW 5: THR + BRK ===
    drawStr(2, 110, 'THR', C_YELLOW);
    var thr_w = iround(thr * 20);
    for (var i = 0; i < 20; i++) {
        var tc = i < thr_w ? (i>16?C_RED:C_GREEN) : C_GRAY;
        var tp = PAL[tc];
        setPixel(24+i, 110, tp[0], tp[1], tp[2]);
    }
    drawStr(46, 110, numStr(thr*100,3)|0, C_YELLOW);
    drawStr(60, 110, '%', C_YELLOW);

    drawStr(68, 110, 'BRK', C_RED);
    var brk_w = iround(brake * 15);
    for (var i = 0; i < 15; i++) {
        var bc2 = i < brk_w ? C_RED : C_GRAY;
        var bp2 = PAL[bc2];
        setPixel(88+i, 110, bp2[0], bp2[1], bp2[2]);
    }

    // === ROW 6: HNDBRK + CLUTCH + IGN ===
    drawStr(2, 116, 'HB', hb ? C_RED : C_GRAY);
    if (hb) drawStr(16, 116, 'ON', C_RED);
    else drawStr(16, 116, '..', C_DGRAY);

    drawStr(36, 116, 'CL', C_WHITE);
    drawStr(48, 116, cl ? 'OPN' : 'LCK', cl ? C_RED : C_GREEN);

    drawStr(68, 116, 'IGN', C_WHITE);
    var ignStr = 'OFF'; var ignC = C_RED;
    if (ign === IGN_CRANKING) { ignStr = 'CRK'; ignC = C_YELLOW; }
    else if (ign === IGN_RUNNING) { ignStr = 'RUN'; ignC = C_GREEN; }
    else if (ign === IGN_STALL) { ignStr = 'STL'; ignC = C_RED; }
    drawStr(82, 116, ignStr, ignC);

    // === ROW 7: PUSH-START ===
    drawStr(2, 122, 'PUSH', C_MAG);
    if (push_act) {
        var blink = ((timer_now() * 4) | 0) % 2;
        drawStr(28, 122, blink ? 'ACTIVE!' : 'REV UP!', C_YELLOW);
        var ppct = clamp(push_rpm / PUSH_START_MIN_RPM, 0, 1);
        var pw = iround(ppct * 20);
        for (var i = 0; i < 20; i++) {
            var pc2 = i < pw ? C_YELLOW : C_GRAY;
            var pp3 = PAL[pc2];
            setPixel(60+i, 122, pp3[0], pp3[1], pp3[2]);
        }
    } else if (push_ok) {
        drawStr(28, 122, 'SUCCESS!', C_GREEN);
    } else if (ign === IGN_OFF || ign === IGN_STALL) {
        if (spd >= PUSH_START_MIN_SPD && gr >= 1 && !cl) {
            drawStr(28, 122, 'DROP CLUTCH!', C_YELLOW);
        } else {
            drawStr(28, 122, 'dead-push/I', C_RED);
        }
    } else {
        drawStr(28, 122, 'standby', C_GRAY);
    }

    // === ROW 8: COOLANT + OIL ===
    drawStr(2, 128, 'COOL', C_LGREEN);
    var temp_pct = clamp((coolant - TEMP_AMBIENT) / (TEMP_CRITICAL - TEMP_AMBIENT), 0, 1);
    var temp_w = iround(temp_pct * 20);
    for (var i = 0; i < 20; i++) {
        var tc2 = i < temp_w ? (i>16?C_RED:i>12?C_YELLOW:C_LGREEN) : C_GRAY;
        var tp2 = PAL[tc2];
        setPixel(24+i, 128, tp2[0], tp2[1], tp2[2]);
    }
    drawStr(46, 128, numStr(coolant, 5, 0), coolant>TEMP_OVERHEAT?C_RED:C_LGREEN);
    drawStr(60, 128, 'C', C_GRAY);

    drawStr(68, 128, 'OIL', C_MAG);
    drawStr(84, 128, numStr(oil, 5, 0), oil>TEMP_OVERHEAT?C_RED:C_MAG);

    if (coolant > TEMP_CRITICAL) drawStr(110, 128, 'BOIL!', C_RED);
    else if (coolant > TEMP_OVERHEAT) drawStr(110, 128, 'HOT!', C_RED);
    else if (coolant > 95) drawStr(110, 128, 'WARM', C_YELLOW);
    else drawStr(110, 128, 'COLD', C_LGREEN);

    // === ROW 9: LOAD + CR ===
    var torque_avail = (ign === IGN_RUNNING) ? engine_torque(rpm)/MAX_TORQUE : 0;
    var load = clamp(thr * torque_avail, 0, 1);
    drawStr(2, 134, 'LOAD', C_MAG);
    var load_w = iround(load * 25);
    for (var i = 0; i < 25; i++) {
        var lc2 = i < load_w ? (i>20?C_RED:i>14?C_YELLOW:C_MAG) : C_GRAY;
        var lp2 = PAL[lc2];
        setPixel(26+i, 134, lp2[0], lp2[1], lp2[2]);
    }
    if (limp) drawStr(56, 134, 'LIMP!', C_RED);

    // === ROW 10: BOOST ===
    drawStr(2, 140, 'BST', C_RED);
    if (boost_on) {
        drawStr(18, 140, 'ON', C_RED);
        var bpct = 1.0 - (g_boost_timer / BOOST_DURATION);
        var bw = iround(bpct * 15);
        for (var i = 0; i < 15; i++) {
            var bcp = i < bw ? C_RED : C_GRAY;
            var bpp = PAL[bcp];
            setPixel(24+i, 140, bpp[0], bpp[1], bpp[2]);
        }
        drawStr(42, 140, numStr(BOOST_DURATION-g_boost_timer, 3, 1), C_RED);
    } else if (boost_avail) {
        drawStr(18, 140, 'RDY', C_GREEN);
        for (var i = 0; i < 15; i++) { var gp=PAL[C_GREEN]; setPixel(24+i,140,gp[0],gp[1],gp[2]); }
    } else {
        drawStr(18, 140, 'CD', C_GRAY);
        var bpct2 = 1.0 - (boost_cd / BOOST_COOLDOWN);
        var bw2 = iround(bpct2 * 15);
        for (var i = 0; i < 15; i++) {
            var bcp2 = i < bw2 ? C_YELLOW : C_GRAY;
            var bpp2 = PAL[bcp2];
            setPixel(24+i, 140, bpp2[0], bpp2[1], bpp2[2]);
        }
    }

    // Distance
    drawStr(50, 140, 'DIST', C_GRAY);
    drawStr(68, 140, numStr(dist, 6, 0), C_WHITE);
    drawStr(100, 140, 'm', C_GRAY);

    // === ROW 11: 0-100 ===
    if (g_0to100_time > 0) {
        drawStr(2, 146, '0-100', C_CYAN);
        drawStr(28, 146, numStr(g_0to100_time, 5, 2), C_CYAN);
        drawStr(56, 146, 's', C_CYAN);
    } else if (g_0to100_active) {
        drawStr(2, 146, '0-100 RUN', C_YELLOW);
    } else {
        drawStr(2, 146, '0-100 --', C_GRAY);
    }

    // === ROW 12: SPARK ===
    drawStr(2, 152, 'SPK', C_MAG);
    if (ign === IGN_RUNNING) {
        var sr = iround(rpm / 1000.0);
        if (sr > 9) sr = 9;
        for (var i = 0; i < sr; i++) {
            var sp2 = PAL[C_YELLOW];
            setPixel(22+i*2, 152, sp2[0], sp2[1], sp2[2]);
            setPixel(22+i*2+1, 152, sp2[0], sp2[1], sp2[2]);
        }
        drawStr(42, 152, 'FIRING', C_GREEN);
    } else if (push_act) {
        drawStr(22, 152, 'await..', C_YELLOW);
    } else if (ign === IGN_CRANKING) {
        drawStr(22, 152, 'crank..', C_YELLOW);
    } else {
        drawStr(22, 152, 'no spark', C_RED);
    }
    drawStr(70, 152, '1-3-4-2', C_GRAY);

    // === ROW 13: BRAKE SYS ===
    drawStr(2, 158, 'BRK', C_RED);
    if (hb) drawStr(22, 158, 'REAR LOCK!', C_RED);
    else if (brake > 0.8) drawStr(22, 158, 'HARD ABS', C_YELLOW);
    else if (brake > 0.3) drawStr(22, 158, 'MODERATE', C_YELLOW);
    else drawStr(22, 158, 'standby', C_GRAY);

    // === ROW 14: DRIVETRAIN ===
    drawStr(2, 164, 'DRV', C_LBLUE);
    if (push_act) drawStr(22, 164, 'PUSH-START', C_YELLOW);
    else if (cl) drawStr(22, 164, 'CLUTCH OPEN', C_RED);
    else if (ign !== IGN_RUNNING) drawStr(22, 164, 'ENG OFF', C_RED);
    else if (gr >= 1 && gr <= 6) drawStr(22, 164, 'FRONT PWR', C_GREEN);
    else drawStr(22, 164, 'NEUTRAL', C_YELLOW);

    drawStr(100, 164, 'LSD', C_GRAY);
    drawStr(116, 164, numStr(FINAL_DRIVE,4,2), C_GRAY);

    // === ROW 15: FAN ===
    drawStr(2, 170, 'FAN', C_CYAN);
    drawStr(22, 170, fan ? 'ON' : 'off', fan ? C_GREEN : C_GRAY);

    // === ROW 16: DISTANCE (large) ===
    drawStr(2, 176, 'TRIP', C_GRAY);
    drawStr(28, 176, numStr(dist/1000, 5, 2), C_WHITE);
    drawStr(62, 176, 'km', C_GRAY);

    // === ROW 17: HELP LINE ===
    if (ign === IGN_OFF || ign === IGN_STALL) {
        drawStr(2, 184, 'PUSH:spd>10km/h gear1-2 relC', C_YELLOW);
    } else {
        drawStr(2, 184, 'G=gas B=brk Spc=hb +=up -=dn', C_GRAY);
    }

    // === ROW 18: KEY STATE ===
    drawStr(2, 192, 'Th', C_GRAY);
    drawStr(14, 192, numStr(thr*100,3)|0, C_GRAY);
    drawStr(28, 192, 'Bk', C_GRAY);
    drawStr(40, 192, numStr(brake*100,3)|0, C_GRAY);
    drawStr(54, 192, 'Hb', C_GRAY);
    drawStr(66, 192, hb?'100':'  0', hb?C_RED:C_GRAY);
    drawStr(80, 192, 'G', C_GRAY);
    drawStr(86, 192, gr.toString(), C_GRAY);
    drawStr(92, 192, 'R', C_GRAY);
    drawStr(98, 192, numStr(display_rpm,5)|0, push_act?C_YELLOW:C_GRAY);
    drawStr(112, 192, 'T', C_GRAY);
    drawStr(118, 192, numStr(coolant,3)|0, coolant>100?C_RED:C_GRAY);

    // === ROW 19: STATUS ===
    drawStr(2, 200, 'Spd', C_GRAY);
    drawStr(22, 200, numStr(kmh,5,1), C_WHITE);
    drawStr(50, 200, 'kmh', C_GRAY);

    // Bottom bar
    drawRectC(0, 210, 256, 46, C_BLACK);

    // Mini help
    drawStrCenter(214, 'G-Gas B-Brk Spc-HB +-Gear', C_GRAY);
    drawStrCenter(222, 'C-Clutch I-Ign P-Boost', C_GRAY);
    drawStrCenter(230, 'R-Reset Q-Quit', C_GRAY);

    // Push-start hint
    if (ign === IGN_OFF || ign === IGN_STALL) {
        drawStrCenter(240, '>PUSH-START: roll in gear,drop C<', C_YELLOW);
    }

    // === OVERHEAT WARNING FLASH ===
    if (coolant > TEMP_OVERHEAT) {
        var flash = ((timer_now() * 3) | 0) % 2;
        if (flash) {
            drawStrCenter(248, '!! OVERHEAT !!', C_RED);
        }
    }

    // === BOOST FLASH ===
    if (boost_on) {
        var bflash = ((timer_now() * 6) | 0) % 2;
        if (bflash) {
            drawStr(220, 140, '!BST!', C_RED);
        }
    }

    // ---- Blit to canvas ----
    ctx.putImageData(imgData, 0, 0);
}

// ============================================================
//  Input handling (virtual keys + keyboard)
// ============================================================
var keyState = {};

function pressKey(k) {
    if (keyState[k]) return;
    keyState[k] = true;
    handleKeyPress(k);
}

function releaseKey(k) {
    keyState[k] = false;
    handleKeyRelease(k);
}

function handleKeyPress(k) {
    switch(k) {
    case 'g': case 'G':
        if (g_ignition === IGN_RUNNING) g_throttle = clamp(g_throttle+0.12, 0, 1);
        break;
    case 'b': case 'B':
        g_brake = clamp(g_brake+0.15, 0, 1);
        break;
    case '+': case '=':
        if (g_gear < 6) {
            g_throttle = 0; g_gear++;
            if (g_ignition === IGN_RUNNING && !g_clutch)
                g_rpm = clamp(speed_to_rpm(g_speed, g_gear), IDLE_RPM, REDLINE);
        }
        break;
    case '-': case '_':
        if (g_gear > 0) {
            g_throttle = 0; g_gear--;
            if (g_ignition === IGN_RUNNING && !g_clutch)
                g_rpm = clamp(speed_to_rpm(g_speed, g_gear), IDLE_RPM, REDLINE);
        }
        break;
    case 'i': case 'I':
        if (g_ignition === IGN_OFF || g_ignition === IGN_STALL) {
            g_ignition = IGN_CRANKING; g_crank_timer = 0;
        } else if (g_ignition === IGN_RUNNING || g_ignition === IGN_CRANKING) {
            g_ignition = IGN_OFF; g_rpm = 0; g_throttle = 0;
        }
        break;
    case 'p': case 'P':
        if (g_boost_available && !g_boost_active && g_ignition === IGN_RUNNING) {
            g_boost_active = true; g_boost_timer = 0;
        }
        break;
    case 'r': case 'R':
        resetAll();
        break;
    case 'q': case 'Q':
        g_running = false;
        break;
    case 'c': case 'C':
        g_clutch = true; g_throttle = 0;
        break;
    case ' ': case 'space':
        g_handbrake = true;
        break;
    }
}

function handleKeyRelease(k) {
    switch(k) {
    case 'c': case 'C':
        if (g_clutch) {
            g_clutch = false;
            if (g_ignition === IGN_RUNNING)
                g_rpm = clamp(speed_to_rpm(g_speed, g_gear), IDLE_RPM, REDLINE);
        }
        break;
    case ' ': case 'space':
        g_handbrake = false;
        break;
    }
}

function resetAll() {
    g_throttle = 0; g_gear = 1; g_rpm = IDLE_RPM; g_speed = 0; g_distance = 0;
    g_brake = 0; g_handbrake = false; g_clutch = false;
    g_ignition = IGN_RUNNING; g_crank_timer = 0;
    g_push_active = false; g_push_rpm = 0; g_push_success = false; g_push_ok_timer = 0;
    g_coolant_temp = TEMP_AMBIENT; g_oil_temp = TEMP_AMBIENT;
    g_radiator_fan = false; g_overheat_limp = false;
    g_boost_active = false; g_boost_timer = 0; g_boost_cooldown = 0; g_boost_available = true;
    g_wheel_lock = [0,0,0,0]; g_wheel_slip = [0,0,0,0];
    g_0to100_time = -1; g_0to100_active = false; g_timer_start = timer_now();
}

// ============================================================
//  Virtual Key bindings
// ============================================================
var vkeys = document.querySelectorAll('.vkey');
for (var vi = 0; vi < vkeys.length; vi++) {
    (function(vk) {
        var k = vk.getAttribute('data-key');
        var press = function(e) { e.preventDefault(); pressKey(k); vk.classList.add('active'); };
        var rel = function(e) { e.preventDefault(); releaseKey(k); vk.classList.remove('active'); };
        vk.addEventListener('touchstart', press, {passive:false});
        vk.addEventListener('touchend', rel, {passive:false});
        vk.addEventListener('touchcancel', rel, {passive:false});
        vk.addEventListener('mousedown', press);
        vk.addEventListener('mouseup', rel);
        vk.addEventListener('mouseleave', rel);
    })(vkeys[vi]);
}

// Physical keyboard
document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    var k = e.key;
    if (k === ' ') { e.preventDefault(); pressKey('space'); }
    else { pressKey(k); }
});
document.addEventListener('keyup', function(e) {
    var k = e.key;
    if (k === ' ') { e.preventDefault(); releaseKey('space'); }
    else { releaseKey(k); }
});

// ============================================================
//  Status bar updates
// ============================================================
var statusEl = document.getElementById('status');
function updateStatus() {
    var parts = [];
    parts.push('Thr:' + (g_throttle*100|0) + '%');
    parts.push('Brk:' + (g_brake*100|0) + '%');
    parts.push('Hb:' + (g_handbrake?'ON':'off'));
    parts.push('G:' + g_gear);
    parts.push('RPM:' + (g_rpm|0));
    parts.push('Spd:' + (g_speed*3.6).toFixed(1) + 'km/h');
    parts.push('T:' + (g_coolant_temp|0) + 'C');
    var ignS = ['OFF','CRK','RUN','STL'][g_ignition];
    parts.push('Ign:' + ignS);
    if (g_push_active) parts.push('PUSH!');
    if (g_boost_active) parts.push('BOOST!');
    statusEl.textContent = parts.join(' | ');
}

// ============================================================
//  Intro screen
// ============================================================
function showIntro() {
    var ov = document.getElementById('msgOverlay');
    ov.style.display = 'flex';
    document.getElementById('ovTitle').textContent = 'CITROEN ZX KC';
    document.getElementById('ovTitle').className = 'big';
    document.getElementById('ovBody').innerHTML =
        '<span class="hl">F2 Rally Sim v6.0</span><br>' +
        'XU10 J4D/Z 2.0L 16V<br>' +
        '255 PS @ 9000 rpm<br>' +
        '238 Nm @ 7600 rpm<br>' +
        '6-Spd Sequential + LSD<br>' +
        '1010 kg | CR 12:1<br><br>' +
        '<span class="warn">+ PUSH-START / BUMP-START</span><br>' +
        'Engine dead? Roll in gear,<br>' +
        'drop clutch = auto fire!';
    document.getElementById('ovFoot').textContent = 'Tap [I] Ign to start engine';
}

function hideIntro() {
    document.getElementById('msgOverlay').style.display = 'none';
}

// ============================================================
//  Main loop
// ============================================================
var PHYS_DT = 1.0 / 60.0;
var RENDER_DT = 1.0 / 30.0;
var phys_acc = 0;
var next_render = timer_now() + RENDER_DT;
var last = timer_now();
var intro_done = false;

function mainLoop() {
    if (!g_running) {
        drawRectC(0, 100, 256, 56, C_RED);
        drawStrCenter(116, 'Merci! Au revoir!', C_YELLOW);
        ctx.putImageData(imgData, 0, 0);
        statusEl.textContent = 'Stopped. Refresh to restart.';
        return;
    }

    var now = timer_now();
    var frame_dt = now - last;
    last = now;
    if (frame_dt > 0.25) frame_dt = 0.25;

    // Auto-decay throttle/brake
    if (g_throttle > 0) g_throttle = clamp(g_throttle - 0.015, 0, 1);
    if (g_brake > 0) g_brake = clamp(g_brake - BRAKE_DECAY_RATE, 0, 1);

    phys_acc += frame_dt;
    while (phys_acc >= PHYS_DT) {
        physics(PHYS_DT);
        phys_acc -= PHYS_DT;
    }

    if (now >= next_render) {
        render();
        updateStatus();
        next_render = now + RENDER_DT;
    }

    requestAnimationFrame(mainLoop);
}

// ============================================================
//  Init
// ============================================================
function init() {
    showIntro();
    // Wait for ignition press to start
    var startCheck = setInterval(function() {
        if (g_ignition === IGN_CRANKING || g_ignition === IGN_RUNNING) {
            if (!intro_done) {
                intro_done = true;
                hideIntro();
                clearInterval(startCheck);
                g_timer_start = timer_now();
                last = timer_now();
                requestAnimationFrame(mainLoop);
            }
        }
    }, 50);
}

// First-time user gesture handler (for audio context & touch)
var firstGesture = false;
function onFirstGesture() {
    if (firstGesture) return;
    firstGesture = true;
    init();
}
document.addEventListener('touchstart', onFirstGesture, {passive:true});
document.addEventListener('mousedown', onFirstGesture);
document.addEventListener('keydown', onFirstGesture);

// Fallback: start after 3s if no gesture
setTimeout(function() { if (!firstGesture) { firstGesture = true; init(); } }, 3000);

})(window);
