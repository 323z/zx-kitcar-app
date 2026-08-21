# Citroen ZX Kit Car Rally Simulator v6.0

A complete port of the C++ Windows console racing simulator to HTML5 Canvas + Cordova Android APK.

## Features

- 🏎️ Full racing physics (engine torque curve, 6-speed sequential gearbox, clutch)
- 🔥 Overboost system (8s boost + 25s cooldown)
- 🌡️ Engine cooling system with auto fan
- 📊 Complete telemetry (RPM, speed, G-force, wheel spin, suspension)
- 🏁 3-lap races with lap timing and best lap tracking
- 🤖 3 AI opponents with basic racing AI
- 🎮 Virtual on-screen buttons (touch + keyboard)
- 📱 256×256 pixel canvas (authentic retro feel)
- 🔊 Web Audio API engine sound
- 🎨 Multiple camera modes (chase / hood / orbit)

## Local Development

```bash
npm install
npm start
# Open http://localhost:8080
```

## Build APK via GitHub Actions

1. Push this repo to GitHub
2. Go to **Actions → Build Android APK → Run workflow**
3. Wait ~5-8 minutes
4. Download Debug or Release APK from **Artifacts**
5. Install on **Android 4.4.4+** device

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

| Action | Keyboard | Touch Button |
|--------|-----------|--------------|
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

## Technical Details

- **Engine**: 1.8L 16V, peak torque 285 Nm at 6800 RPM
- **Gearbox**: 6-speed sequential (ratios: 3.8→0.75)
- **Final Drive**: 4.1:1
- **Wheel Radius**: 0.3m
- **Mass**: 980 kg
- **Top Speed**: ~210 km/h
- **0-100 km/h**: ~12.8s (normal) / ~10.5s (overboost)

## License

MIT
