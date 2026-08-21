# Citroen ZX Kit Car Rally Simulator v6.0

> 256×256 像素画布 | 虚拟按键 | 完整物理引擎 | Android 4.4.4+

## 🎮 游戏特性

- **引擎物理**: 高斯扭矩曲线, 怠速 900 RPM, 红线 7200 RPM
- **6速序列变速箱**: 自动换挡 + 离合联动
- **Push-Start 助推启动**: 熄火后靠惯性重启引擎
- **Overboost 增压**: 8 秒持续 + 25 秒冷却
- **冷却系统**: 动态温度 + 风扇自动启停
- **0-100 km/h 计时**
- **手刹漂移**: 后轮锁止, 转向过度
- **虚拟按键 + 物理键盘双输入**

## 🎹 键盘控制

| 按键 | 功能 |
|------|------|
| ↑ / W | 油门 |
| ↓ / S | 刹车 |
| ← / A | 左转 |
| → / D | 右转 |
| C | 离合 |
| Space | 手刹 |
| B | Overboost |

## 🚀 本地开发

```bash
npm install
npm start
# 浏览器打开 http://localhost:8080
```

## 📦 GitHub Actions 自动编译 APK

1. 推送到 GitHub 仓库
2. **Settings → Actions → General** → Workflow permissions = Read and write
3. **Actions → Build Android APK → Run workflow**
4. 等待 ~5-8 分钟
5. 下载 Debug APK → 安装到 Android 4.4.4+ 设备

### Tag 触发自动发版

```bash
git tag v6.0.0 && git push origin v6.0.0
```

自动创建 GitHub Release 并附上 APK zip 包。

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 渲染 | HTML5 Canvas 256×256 |
| 引擎 | 纯 JavaScript (无依赖) |
| 构建 | Node.js 16 + Cordova 8.1.2 |
| 编译 | Gradle 4.10.3 + Android SDK 28 |
| CI/CD | GitHub Actions (ubuntu-22.04) |
| JDK | 17 (SDK 工具) + 8 (Gradle 4.x) |

## 📁 项目结构

```
.
├── www/
│   ├── index.html    # 256×256 画布 + 虚拟按键 UI
│   └── game.js       # 完整游戏引擎
├── server.js          # Node.js 本地开发服务器
├── package.json       # npm 配置
├── config.xml         # Cordova 配置
└── .github/workflows/
    └── build-apk.yml  # GitHub Actions 流水线
```

## 📋 系统要求

- Android 4.4.4 (API 19) 或更高
- 触摸屏设备
- 建议 1GB+ RAM

## 🔧 故障排除

**APK 安装失败**: 确保 "未知来源" 已启用

**游戏卡顿**: 关闭其他后台应用, 该游戏为 256×256 像素, 不应有性能问题

**虚拟按键不响应**: 确保浏览器/WebView 未拦截触摸事件

## 📄 License

MIT License
