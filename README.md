# Citroen ZX Kit Car Rally Simulator v6.0

A complete racing simulator — 256×256 pixel canvas, full physics engine, 6-speed sequential gearbox, 3 AI opponents, drift smoke, Web Audio engine sound.

## Quick Start (Local)

```bash
npm install
npm start
# Open http://localhost:8080
```

## Build Android APK (GitHub Actions)

1. Push this repo to GitHub
2. Go to **Actions → Build Android APK → Run workflow**
3. Wait ~5–8 minutes
4. Download **Debug** or **Release** APK from **Artifacts**
5. Install on **Android 4.4.4+**

## Project Structure

```
├── index.html              # Standalone HTML version
├── game.js                 # Full game engine (physics + rendering + input)
├── server.js               # Node.js local dev server
├── package.json            # npm config + Cordova dep
├── config.xml              # Cordova Android config
├── www/                    # Cordova web assets
│   ├── index.html
│   └── game.js
└── .github/workflows/
    └── build-apk.yml      # Complete CI/CD pipeline
```

## Controls

| Action | Keyboard | Touch |
|--------|-----------|-------|
| Steer Left | ← / A | ◀ |
| Steer Right | → / D | ▶ |
| Accelerate | ↑ / W | ▲ |
| Brake | ↓ / S | ▼ |
| Handbrake | Space | H |
| Gear Up | Shift | L |
| Gear Down | Ctrl | R |
| Overboost | O | O |
| ABS Toggle | B | A |
| Camera | C | — |
| Reset | R | — |

## Tech Specs

- **Engine**: 1.8L 16V, peak torque 285 Nm @ 6800 RPM
- **Gearbox**: 6-speed sequential (ratios: 3.8→0.75)
- **Final Drive**: 4.1:1
- **Wheel Radius**: 0.3m
- **Mass**: 980 kg
- **Top Speed**: ~210 km/h
- **0–100 km/h**: ~12.8s (normal) / ~10.5s (overboost)

## License

MIT
