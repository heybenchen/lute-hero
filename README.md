# 🎸 Lute Hero 🎸

A web-based multiplayer tabletop game where Bards defeat monsters by converting them into fans with the power of music!

## 🎮 Game Concept

In a post-catastrophe fantasy world, only Bards remain. Players navigate a connected board, encounter monsters, and defeat them through musical combat using dice-based song mechanics.

## ✨ Features

### Core Gameplay
- **14-Space Graph Board**: Connected network with wrap-around edges
- **Turn-Based Movement**: Move one space per turn to connected locations
- **Genre System**: 5 music genres (Pop, Rock, Electronic, Classical, Hip-Hop)
- **Dice-Based Combat**: Roll dice pairs with critical hit mechanics
- **Song System**: Compose songs with 4 dice slots and track effects
- **Monster Spawning**: Dynamic monster generation based on genre tags
- **Fame & EXP Economy**: Earn fame to progress, spend EXP to draft new cards

### Combat Mechanics
- **The Mashup**: AOE combat system where songs damage all monsters
- **Critical Hits**: Rolling max value grants +5 bonus damage
- **Genre Multipliers**: Vulnerable genres take 2x damage, resistant take 0.5x
- **Track Effects**: 12+ unique effects (rerolls, upgrades, multipliers, etc.)
- **Catchup Mechanic**: Failed combats grant bonus EXP

### Progression
- **Draft Shop**: Spend EXP to acquire new dice pairs (5-15 EXP) and songs (5 EXP)
- **Fame Tiers**: Gain multiplied fame as you defeat more monsters
- **Phase System**: Main → Underground Scene → Final Boss
- **Final Boss**: Cooperative battle with player elimination mechanics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or equivalent package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Build for production
npm build
```

## 🎯 How to Play

### Setup
1. Choose 2-4 players
2. Assign names and select starting genres
3. Each player starts with:
   - 1 song with 2 starter dice (d6 + d6)
   - Position on an edge space
   - 0 EXP, 0 Fame

### Gameplay Loop
1. **Move**: Click a connected space (highlighted in blue)
2. **Combat**: Monsters spawn when entering spaces
   - Select songs to play (each usable once per combat)
   - Dice roll automatically with crit chances
   - Damage all monsters simultaneously
   - Defeat all monsters or retreat for bonus EXP
3. **Draft**: Spend EXP at the Draft Shop
   - Buy dice pairs to strengthen songs
   - Purchase new songs with special effects
   - Slot dice into song positions
4. **End Turn**: Pass to next player

### Round Structure
- **Round** = All players complete one turn
- At start of each round: 1 genre tag added to each space
- Every 2 genre tags = 1 monster spawns when entered
- Clear all monsters → remove all genre tags from space

### Victory Conditions
**Phase 1: Main Game**
- Gain collective fame to unlock Underground Scene

**Phase 2: Underground Scene**
- Each player defeats an elite monster

**Phase 3: Final Boss**
- Band together to fight the boss
- Lowest damage dealer eliminated each round
- Earn fame based on damage dealt
- **Winner**: Player with most total fame!

## 🧪 Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ Dice rolling and critical hits
- ✅ Damage calculation with genre multipliers
- ✅ Fame calculation and multipliers
- ✅ Monster spawning logic
- ✅ 41 tests passing

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS (custom tabletop aesthetic)
- **State Management**: Zustand with slices pattern
- **Build Tool**: Vite
- **Testing**: Vitest + jsdom
- **Type Safety**: Full TypeScript coverage

## 📁 Project Structure

```
src/
├── components/
│   ├── game/
│   │   ├── Board/          # Graph-based game board
│   │   ├── Combat/         # Combat modal UI
│   │   ├── PlayerPanel/    # Player stats & turn management
│   │   ├── DraftShop/      # Card drafting system
│   │   ├── GameView.tsx    # Main game screen
│   │   └── Setup.tsx       # Game setup screen
│   └── ui/                 # Reusable UI components
├── game-logic/
│   ├── dice/              # Dice rolling & effects
│   ├── combat/            # Damage calculation & spawning
│   ├── fame/              # Fame & EXP calculation
│   └── board/             # Graph builder
├── store/
│   └── slices/            # Zustand state slices
├── types/                 # TypeScript type definitions
└── data/                  # Game data & configurations
```

## 🎨 Design Philosophy

**Tabletop Aesthetic**
- Parchment-themed UI with wood tones
- Card-based component design
- Medieval/fantasy font choices (Cinzel + Barlow)
- Visual dice representations

**Pragmatic Architecture**
- Zustand for simple, scalable state management
- Separated game logic from UI
- Testable pure functions
- TypeScript for type safety

## 🔮 Future Enhancements

- [ ] Online multiplayer with WebSocket sync
- [ ] Animations for dice rolls and combat
- [ ] Sound effects and music
- [ ] Additional track effects (expand to 20+)
- [ ] More monster varieties
- [ ] Persistent leaderboards
- [ ] Mobile-responsive design
- [ ] Accessibility improvements

## 📝 Game Balance Notes

Current tuning (subject to change):
- **Fame Multipliers**: 1x (1-3), 2x (4-6), 3x (7-9), 4x (10+)
- **EXP Costs**: Dice 5-15 EXP, Songs 5 EXP
- **Monster Spawning**: 2 tags = 1 monster
- **Crit Bonus**: +5 damage
- **Genre Multipliers**: 2x vulnerable, 0.5x resistant

## 🤝 Contributing

This is a single-player prototype. Future multiplayer features may include:
- Server architecture
- Real-time state synchronization
- Player authentication
- Lobby system

## 📜 License

MIT License - feel free to fork and expand!

## 🎵 Credits

Built with React, TypeScript, and Tailwind CSS.

Game design inspired by tabletop RPGs and deck-building card games.

---

**Ready to rock? Start the dev server and become the ultimate Lute Hero!** 🎸🔥
