# 🏁 Citroen ZX Kit Car Rally Sim v6.0

> A retro-style 256×256 pixel rally racing simulator with full telemetry,  
> 6-speed sequential gearbox, push-start ignition, and overboost system.  
> Runs in browser, packaged as Android APK (4.4.4+).

---

## 🎮 Controls

### Virtual Keys (on-screen)
| Button | Action |
|--------|--------|
| `GAS` | Throttle |
| `BRAKE` | Brake |
| `CLUTCH` | Clutch pedal |
| `◀` `▶` | Steer left / right |
| `HB` | Handbrake (rear lock) |
| `⚡` | Overboost (8s, 25s cooldown) |
| `1`-`6` | Direct gear select |
| `R` | Reverse |
| `N` | Neutral |

### Keyboard
| Key | Action |
|-----|--------|
| `W` | Gas |
| `S` | Brake |
| `C` | Clutch |
| `←` `→` | Steer |
| `Space` | Handbrake |
| `Shift` | Boost |
| `Q` / `A` | Shift up / down |
| `1`-`6` | Gear select |
| `R` | Reverse |
| `N` | Neutral |

---

## 🔧 Push-Start Sequence

1. Clutch in + roll the car (or get a push)
2. Speed > 2 m/s with clutch engaged
3. After ~0.27s the engine fires at 1200 RPM

---

## 🚀 Quick Start (Local Dev)

```bash
npm install
npm start
# Open http://localhost:8080
```

---

## 📦 Build APK (GitHub Actions)

1. Push this repo to GitHub
2. Go to **Actions → Build Android APK → Run workflow**
3. Wait ~5-8 min → Download APK artifact
4. Install on Android 4.4.4+ device

### Requirements (handled by CI)
- Node.js 18 LTS
- JDK 17 (SDK tools) + JDK 8 (Cordova/Gradle)
- Android SDK cmdline-tools 11.0
- Cordova 8.1.2 + Cordova-Android 8.1.0

---

## 📁 Project Structure

```
citroen-zx-kitcar/
├── index.html              # 256×256 canvas + virtual keys
├── game.js                 # Full game engine (physics, render, input)
├── server.js               # Node.js dev server
├── package.json            # Node + Cordova deps
├── config.xml              # Cordova Android config (API 19-28)
├── README.md
└── .github/workflows/
    └── build-apk.yml       # GitHub Actions CI (single file)
```

---

## 🛠️ Tech Details

| Component | Value |
|-----------|-------|
| Canvas | 256×256 px, pixelated rendering |
| Physics tick | 50ms cap, requestAnimationFrame |
| Torque curve | Gaussian, peak @ 4500 RPM |
| Gearbox | 6-speed + R, sequential |
| Boost | +30% torque, 8s duration, 25s cooldown |
| Cooling | Dynamic fan @ 90°C, overheat @ 115°C |
| 0-100 timer | Auto-starts above 5 km/h |

---

## ⚙️ CI Pipeline (build-apk.yml)

```
Checkout → Node 18 → Cordova 8.1.2
→ JDK 17 (Temurin, default)
→ JDK 8 (Zulu, saved as JDK8_HOME)
→ Android SDK cmdline-tools 11.0
→ Accept licenses + install SDK 28
→ Generate icons/splash (Python PIL)
→ cordova create + platform add android@8.1.0
→ Copy www/ assets
→ Build Debug APK (JDK 8)
→ Build Release APK (JDK 8)
→ Upload artifacts (upload-artifact@v4)
→ On tag: GitHub Release (softprops/action-gh-release@v2)
```

---

## 📜 License

MIT License — do whatever you want, just don't blame me when you spin out.
