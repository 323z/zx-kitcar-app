# Citroen ZX Kit Car Rally Sim v6.0

A complete port of the C++ Windows console racing simulator to HTML5 Canvas + Node.js, packaged as an Android APK via Cordova.

## Features

- **Full vehicle physics** ported from the original C++ codebase
- **256x256 pixel canvas** - authentic retro aesthetic
- **Virtual on-screen keyboard** for touch devices
- **Push-Start / Bump-Start** - roll in gear, drop clutch to auto-fire the engine
- **6-speed sequential gearbox** with realistic RPM matching
- **Cooling system** with overheat limp mode and critical stall
- **Overboost system** - +15% torque for 8 seconds, 25s cooldown
- **0-100 km/h timer**
- **Wheel slip/lock detection** with visual indicators
- **Compatible with Android 4.4.4+** (API 19+)

## Controls

| Key | Action |
|-----|--------|
| `G` | Throttle (hold) |
| `B` | Brake (hold) |
| `Space` | Handbrake (hold, locks rear) |
| `+` / `=` | Shift up |
| `-` / `_` | Shift down |
| `C` | Clutch (HOLD = open, RELEASE = engage) |
| `I` | Ignition toggle (OFF <-> CRANKING -> RUNNING) |
| `P` | Overboost (one-shot +15% torque, 8s) |
| `R` | Reset all systems |
| `Q` | Quit |

## Push-Start / Bump-Start

When the engine dies:
1. Gain speed (>10 km/h) by rolling/pushing
2. Shift to 1st or 2nd gear
3. Release clutch `[C]`
4. Wheels spin the engine - at ~500 RPM it auto-fires!

## Local Development

```bash
# Requires Node.js >= 5.8
npm install
npm start
# Open http://localhost:8080
```

## GitHub Actions Auto-Build

Push to `main` or `master` branch and the workflow will:
1. Setup Node.js 5.8 + Java 8 (Zulu) + Java 17 (Temurin) + Android SDK
2. Install Cordova 8.1.2
3. Generate app icons and splash screens
4. Build both **Debug** and **Release** APKs
5. Upload artifacts (downloadable for 30 days)
6. On git tag push: create a GitHub Release with all APKs

### Manual workflow trigger
Go to Actions → "Build Android APK" → "Run workflow"

### Build Environment Notes
- **JDK 17 (Temurin)** — used for Android SDK command-line tools (`sdkmanager`, `aapt2`, `d8`)
- **JDK 8 (Zulu)** — used for Cordova CLI and Gradle 4.x (Cordova-Android 8.x requirement)
- **Node.js 5.8** — required by Cordova 8.x
- **Android API 28** build-tools, min SDK 19 (Android 4.4.4+)

## Project Structure

```
.
├── index.html          # Main HTML with virtual keyboard
├── game.js             # Complete game engine (physics + rendering)
├── server.js           # Node.js dev server
├── package.json        # Node.js project config
├── config.xml          # Cordova/Android config
├── .github/
│   └── workflows/
│       └── build-apk.yml  # GitHub Actions CI/CD
└── README.md
```

## Vehicle Reference - Citroen ZX Kit Car

| Spec | Value |
|------|-------|
| Engine | PSA XU10 J4D/Z, 1998cc DOHC 16V |
| Max Power | 255 PS @ 9000 rpm (187 kW) |
| Peak Torque | 238 Nm @ 7600 rpm |
| Compression | 12.0 : 1 |
| Gearbox | 6-speed sequential + helical LSD |
| Curb Weight | ~1010 kg |
| FIA Class | Group A/7 (Kit Car / F2) |
| Homologation | A 5468 |

## License

MIT
