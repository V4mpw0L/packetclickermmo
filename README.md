# 📦 Packet Clicker

> **A cyberpunk-themed idle clicker MMO with deep progression systems, anti-cheat protection, and PWA support**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](https://web.dev/progressive-web-apps/)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## 🎮 Game Overview

**Packet Clicker MMO** is a feature-rich cyberpunk idle clicker game that combines traditional clicker mechanics with MMO-style progression systems. Build your hacking empire by clicking packets, upgrading your systems, and competing on global leaderboards!

### 🌟 Key Features

- 🖱️ **Addictive Clicking Mechanics** with visual feedback and combo systems
- ⭐ **Prestige System** for long-term progression and permanent upgrades
- 💎 **Gem Economy** with purchasable boosts and premium content
- 📅 **Daily Rewards** with streak bonuses to keep players engaged
- 🎪 **Random Events** that add excitement and variety to gameplay
- 🎨 **Customizable Themes** including Cyberpunk, Matrix, Neon, and more
- 👤 **Avatar System** with unlockable skins and premium options
- 🤖 **Advanced Anti-Bot Protection** with mathematical challenges
- 📱 **PWA Support** - install as native app on mobile devices
- 🏆 **Achievement System** with gem rewards and progression tracking

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/packetclickermmo.git
   cd packetclickermmo
   ```

2. **Serve the files**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Or just open index.html in your browser
   ```

3. **Open in browser**
   - Navigate to `http://localhost:8000` or open `index.html` directly

### 🌐 Deployment Options

- **GitHub Pages**: Enable in Settings > Pages > Deploy from branch
- **Netlify**: Connect repository for automatic deployments
- **Vercel**: Import project for instant deployment
- **Firebase Hosting**: Use `firebase deploy` after setup

## 🎯 Gameplay Features

### Core Mechanics
- **Click to Earn**: Generate packets by clicking the main button
- **Idle Progression**: Earn packets automatically with idle upgrades
- **Critical Hits**: Chance-based multipliers for bonus packets
- **Upgrade System**: Improve click power, idle rate, and crit chance

### Progression Systems

#### ⭐ Prestige System
Unlock after reaching 50,000 packets:
- **Auto Clicker**: Automatic clicking (up to 10 levels)
- **Packet Multiplier**: +10% packet gain per level (20 levels)
- **Gem Hunter**: 5% chance to find gems on click (5 levels)
- **Critical Master**: +5% crit chance per level (15 levels)
- **Offline Earnings**: Earn while offline (24 levels = 24 hours)
- **Lucky Clicker**: 1% chance for 10x rewards (10 levels)
- **Mega Crits**: Upgrade crit multiplier to 3x+ (5 levels)
- **Gem Magnet**: Idle packets can generate gems (8 levels)

#### ⚡ Temporary Boosts
Purchase with gems for immediate power:
- **Double Packets** (5min) - 3 gems
- **Triple Gems** (10min) - 8 gems
- **Quad Click Power** (3min) - 5 gems
- **Mega Crit Mode** (2min) - 12 gems
- **Auto-Clicker** (1min) - 15 gems

#### 🎪 Random Events
Surprise bonuses that trigger randomly:
- **Packet Rain**: 2x packets for 2 minutes
- **Gem Rush**: 10x gem find rate
- **Critical Frenzy**: All clicks are critical
- **Packet Surge**: Instant packet bonus
- **Upgrade Sale**: 50% off upgrades

### 🎨 Customization

#### Visual Themes
- **Cyberpunk** (Default) - Teal and gold aesthetic
- **Neon Pink** - Hot pink and cyan vibes
- **Dark Mode** - Clean black and white
- **Matrix Green** - Classic hacker green
- **Retro Amber** - Vintage terminal orange

#### Avatar System
- **Default Avatars**: Multiple starting options
- **Earned Avatars**: Unlock through achievements
- **Premium Avatars**: Purchase with gems
- **Dynamic Generation**: Powered by DiceBear API

## 🛡️ Anti-Cheat System

### Detection Methods
- **Pattern Analysis**: Identifies bot-like clicking patterns
- **Speed Detection**: Flags impossibly fast interactions
- **Variance Checking**: Monitors click interval consistency
- **Suspicion Scoring**: Gradual escalation system

### Challenge Types
- **Math Problems**: Simple arithmetic verification
- **Sequence Completion**: Pattern recognition tests
- **Color Recognition**: Visual identification challenges
- **Response Time**: Human-like interaction validation

### Protection Measures
- **Progressive Penalties**: Escalating timeouts for failures
- **Click Blocking**: Temporary interaction prevention
- **Automatic Recovery**: Self-resolving after verification
- **Fair Play**: Maintains game balance without frustration

## 🏗️ Technical Architecture

### Frontend Stack
- **Vanilla JavaScript** - No frameworks, maximum performance
- **CSS3** with custom animations and responsive design
- **HTML5** with semantic markup and accessibility features
- **Local Storage** for persistent game state

### PWA Features
- **Service Worker** for offline functionality
- **Web Manifest** for native app installation
- **Responsive Design** optimized for all screen sizes
- **Performance Optimized** with asset caching

### File Structure
```
packetclickermmo/
├── index.html              # Main game interface
├── main.js                 # Core game logic and state management
├── style.css              # Styling and responsive design
├── manifest.json          # PWA configuration
├── service-worker.js      # Offline caching and performance
├── src/                   # Modular code organization (future)
│   ├── data/              # Game data and constants
│   ├── logic/             # Game mechanics and calculations
│   ├── ui/                # Interface rendering and interactions
│   └── utils/             # Utility functions and helpers
└── README.md              # This file
```

## 📊 Game Statistics

### Player Tracking
- **Total Clicks**: Lifetime interaction count
- **Packets Earned**: Cumulative packet generation
- **Upgrades Purchased**: Investment tracking
- **Session Time**: Current play duration
- **Achievement Progress**: Milestone completion

### Progression Metrics
- **Prestige Level**: Long-term advancement indicator
- **Data Shards**: Prestige currency accumulation
- **Daily Streak**: Consecutive login rewards
- **Gem Balance**: Premium currency status

## 🏆 Achievement System

### Starter Achievements
- **Getting Started** 🟢 - Send your first packet (1 gem)
- **Packet Handler** 📦 - Reach 100 packets (1 gem)
- **Fast Clicker** 👆 - Upgrade click power 10 times (1 gem)

### Advanced Achievements
- **Gem Collector** 💎 - Earn 10 gems (2 gems)
- **Critical Master** ✨ - Unlock critical hits (1 gem)
- **Click Master** 🖱️ - Complete 100 clicks (2 gems)

### Elite Achievements
- **First Prestige** ⭐ - Reach prestige level 1 (5 gems)
- **VIP Status** 👑 - Activate VIP membership (3 gems)
- **Week Warrior** 📅 - Maintain 7-day login streak (10 gems)

## 🔧 Configuration & Customization

### Game Balance
All progression rates and costs are defined in constants for easy adjustment:
- **Upgrade Costs**: Linear scaling with configurable multipliers
- **Prestige Requirements**: Threshold and reward calculations
- **Random Event Rates**: Probability and duration settings
- **Anti-Bot Sensitivity**: Detection thresholds and penalties

### Theme System
Easily add new themes by extending the `THEMES` object:
```javascript
const THEMES = {
  customTheme: {
    name: "Custom Theme",
    colors: ["#primary", "#secondary", "#background"],
    cost: 50,
    unlocked: false,
  }
}
```

## 📱 Mobile Experience

### Responsive Design
- **Flexible Layout**: Adapts to any screen size
- **Touch Optimized**: Large buttons and gesture support
- **Fast Performance**: Optimized animations and interactions
- **Offline Play**: Full functionality without internet

### PWA Installation
1. **Chrome Mobile**: "Add to Home Screen" prompt
2. **iOS Safari**: Share > "Add to Home Screen"
3. **Desktop**: Install icon in address bar
4. **Features**: Full-screen, offline access, push notifications ready

## 🚀 Performance Optimization

### Loading Speed
- **Minimal Dependencies**: No external frameworks
- **Asset Caching**: Service worker pre-caches all resources
- **Lazy Loading**: Features load as needed
- **Compressed Assets**: Optimized images and code

### Runtime Performance
- **Efficient Rendering**: Minimal DOM manipulation
- **Smart Updates**: Only refresh changed elements
- **Memory Management**: Proper cleanup and garbage collection
- **Battery Friendly**: Optimized for mobile device battery life

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Test on multiple devices and browsers
- Ensure PWA functionality remains intact
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **DiceBear API** for avatar generation
- **Tailwind CSS** for rapid styling
- **Google Fonts** for typography
- **Game SFX** for audio effects
- **Community** for feedback and testing

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/packetclickermmo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/packetclickermmo/discussions)
- **Email**: your.email@example.com

---

<div align="center">

**🎮 Start your hacking journey today! 🎮**

[**Play Now**](https://yourusername.github.io/packetclickermmo) • [**Report Bug**](https://github.com/yourusername/packetclickermmo/issues) • [**Request Feature**](https://github.com/yourusername/packetclickermmo/issues)

</div>