export interface GameItem {
  id: string;
  name: string;
  emoji: string;
  cashPerItem: number;
  type: 'Ingredient' | 'Modifier';
  x: number;
  y: number;
  vx: number;
  vy: number;
  progress: number; // 0-1, progress along connection
  connectionId?: string; // Which connection this item is traveling on
  rarity?: string;
  category?: string;
  complexity?: number;
  description?: string;
}

export interface Spawner {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  itemType: string;
  lastSpawn: number;
  spawnInterval: number;
  outputConnection?: Connection;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'spawner' | 'modifier';
  toType: 'modifier' | 'sell';
  fromPort: 'output';
  toPort: 'input';
  points: { x: number; y: number }[]; // Bezier curve points
  speed: number;
}

export interface Modifier {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  emoji: string;
  inputs: string[]; // Item IDs that are currently being processed
  lastProcess: number;
  processInterval: number;
  inputConnection?: Connection;
  outputConnection?: Connection;
  category?: string;
  description?: string;
}

export interface ConnectionPoint {
  id: string;
  blockId: string;
  blockType: 'spawner' | 'modifier';
  type: 'input' | 'output';
  x: number;
  y: number;
  isConnected: boolean;
}

export interface GPTResponse {
  name: string;
  emoji: string;
  cashPerItem: number;
  type: 'Ingredient' | 'Modifier';
  rarity?: string;
  category?: string;
  complexity?: number;
  description?: string;
  isNewDiscovery?: boolean;
}

export interface GameState {
  items: GameItem[];
  spawners: Spawner[];
  connections: Connection[];
  modifiers: Modifier[];
  totalCash: number;
  cashPerMinute: number;
  discoveredCombos: Record<string, GPTResponse>;
  lastCashUpdate: number;
  cashHistory: { timestamp: number; cash: number }[];
  draggedConnection?: {
    fromId: string;
    fromType: 'spawner' | 'modifier';
    fromPort: 'output';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  };
}

export interface DragItem {
  type: 'spawner' | 'modifier';
  data: any;
}

export const ELEMENTAL_INGREDIENTS = [
  { name: 'Water', emoji: '💧' },
  { name: 'Fire', emoji: '🔥' },
  { name: 'Earth', emoji: '🌍' },
  { name: 'Air', emoji: '💨' }
];

export const SIMPLE_MODIFIERS = [
  { name: 'Heat', emoji: '🔥' },
  { name: 'Cool', emoji: '❄️' },
  { name: 'Mix', emoji: '🌀' },
  { name: 'Compress', emoji: '🗜️' },
  { name: 'Purify', emoji: '✨' }
]; 