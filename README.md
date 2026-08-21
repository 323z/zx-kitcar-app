# Citroen ZX Kit Car Rally Simulator v6.0

256×256 pixel canvas racing simulator with virtual buttons, built for Android 4.4.4+ via Cordova.

## Features

- 6-speed sequential gearbox with clutch
- Engine torque curve (Gaussian model, peak 5500rpm)
- Overboost system (8s active + 25s cooldown)
- Cooling system with auto fan
- 0-100 km/h timer
- ABS + Handbrake (rear-wheel lock)
- 3-lap race with AI opponents
- 3 camera modes
- Engine sound (Web Audio API)
- Drift smoke effects
- Virtual buttons (touch + keyboard)

## Local Development

```bash
npm install
npm start
# Open http://localhost:8080
```

## Controls

| Key | Action |
|-----|--------|
| Arrow Up / W | Throttle |
| Arrow Down / S | Brake |
| Arrow Left / A | Steer Left |
| Arrow Right / D | Steer Right |
| C | Clutch |
| H / Space | Handbrake |
| Q | Shift Down |
| E | Shift Up |
| B | Overboost |
| V | Camera Toggle |
| Enter | Start Race |
| R | Reset |

## GitHub Actions → APK

1. Push to GitHub repo
2. Settings → Actions → General → Workflow permissions = Read and write
3. Actions → Build Android APK → Run workflow
4. Wait 5-8 min → Download Debug APK
5. Install on Android 4.4.4+ device

## Build Pipeline

```
Checkout → Node 18 → JDK 17 (SDK) + JDK 8 (Cordova)
→ Gradle 4.10.3 → Pillow → Android SDK → Cordova
→ Generate Icons → Patch Gradle (remove jcenter)
→ Build Debug + Release APK → Upload Artifacts
```

## Project Structure

```
├── index.html          # Standalone HTML version
├── game.js             # Full game engine (480 lines)
├── server.js           # Node.js local server
├── package.json        # npm config
├── config.xml          # Cordova config
├── www/                # Cordova web assets
│   ├── index.html
│   └── game.js
└── .github/workflows/
    └── build-apk.yml   # Full CI pipeline
```

## License

MIT
