# 🏭 AI Factory Sandbox

A sandbox-style web game about building the most absurd and efficient factory possible using GPT-powered logic. Players drag and connect elemental ingredients with modifiers to create new items, with GPT determining the outcomes.

## 🎮 Game Features

- **Connection-based building** - Drag from connection points to link blocks together
- **GPT-powered item creation** - Unique combinations generate new items with creative names and values
- **Real-time simulation** - Watch items flow through connections and generate cash
- **Zoomable workspace** - Scale your view from 50% to 300% for massive factories
- **Intuitive interactions** - Visual connection points with satisfying drag-to-connect
- **Persistent discovery system** - Items are cached locally for consistent gameplay
- **Wealth milestones** - Humorous wealth status messages as you get richer

## 🚀 Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd ai-factory-sandbox
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `ai-factory-sandbox` directory:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   *Note: The game works without an API key using fallback responses for demo purposes*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:5173`

## 🎯 How to Play

### Basic Gameplay
- **Spawners** automatically create base ingredients (Water 💧, Fire 🔥, Earth 🌍, Air 💨)
- **Connection points** appear as colored dots on blocks (green = output, blue = input)
- **Drag connections** from green dots to blue dots or the sell zone
- **Items flow** along connections and combine at modifiers using GPT
- **Goal**: Build increasingly complex factories and maximize your cash per minute

### Controls
- **Drag blocks** from sidebar to place spawners and modifiers
- **Click & drag** from green connection points to create connections
- **Drop connections** on blue input points or the green sell zone
- **Right-click + drag** to pan the view around large factories
- **Zoom controls** in the header to resize your view

### Factory Components
1. **Spawners** (Green blocks) - Generate base ingredients automatically
   - Have one output connection point (green dot on right side)
2. **Modifiers** (Orange blocks) - Combine ingredients into new items
   - Input connection point (blue dot on left side)
   - Output connection point (green dot on right side)
3. **Sell Zone** (Green area on right) - Items that reach here generate cash

## 🧪 Item Creation System

When items reach a modifier through connections, they're sent to GPT with a prompt like:
```
Combine these ingredients: Water, Fire using the modifier: Heat
```

GPT returns a creative item with:
- **Name**: e.g., "Steam Smoothie"
- **Emoji**: e.g., "🥤"
- **Value**: Cash per item (higher for complex combinations)
- **Type**: Ingredient or Modifier (for future use)

## 🏗️ Development

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Canvas**: HTML5 Canvas for rendering with custom drawing
- **API**: OpenAI GPT-3.5-turbo for item generation
- **Styling**: Custom CSS with modern design patterns

### Key Files
- `src/hooks/useGameEngine.ts` - Connection-based game logic and state management
- `src/components/GameCanvas.tsx` - Canvas rendering with connection system
- `src/components/GameStats.tsx` - Statistics display
- `src/services/gpt.ts` - OpenAI API integration with fallbacks
- `src/types/game.ts` - TypeScript interfaces for connections and blocks

### Building
```bash
npm run build
```

## 🎨 Design Philosophy

- **Intuitive Connections**: Visual drag-and-drop between connection points
- **Satisfying Feedback**: Animated flowing dots, pulsing items, smooth interactions
- **Dopamine-driven UX**: Immediate visual feedback, discovery notifications, wealth milestones
- **Scalable Workspace**: Zoomable canvas that grows with your factory
- **Creative Freedom**: No restrictions on placement or factory complexity

## 🌟 Key Interaction Features

- **Visual Connection Points**: Color-coded dots (green = output, blue = input)
- **Flowing Animations**: Animated dots show connection activity
- **Drag-to-Connect**: Click and drag from outputs to inputs
- **Satisfying Snapping**: Connections snap to valid drop targets
- **Real-time Preview**: See connection paths while dragging
- **Immediate Feedback**: Connections light up when active

## 📝 Notes

- The game intentionally has no hard limits - build massive factories!
- No prestige or reset mechanics - just continuous growth and discovery
- Cash is for milestone messages and satisfaction (no purchasing system)
- Local storage caches discovered combinations for consistency
- Works offline with fallback item generation when no API key is provided

## 🤝 Contributing

Feel free to submit issues and enhancement requests! This is designed to be a fun, experimental project focused on satisfying user interactions.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

*"Build factories so complex they make your browser sweat!"* 🚀
