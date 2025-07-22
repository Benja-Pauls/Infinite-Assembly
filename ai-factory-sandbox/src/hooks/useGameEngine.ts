import { useState, useEffect, useCallback, useRef } from 'react';
import { ELEMENTAL_INGREDIENTS, SIMPLE_MODIFIERS } from '../types/game';
import { aiService } from '../services/aiService';

export interface GameItem {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  cashPerItem: number;
  isMoving: boolean;
  isBeingProcessed: boolean;
  processingModifierId?: string;
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
}

export interface Modifier {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  inputs: string[];
  outputs: string[];
  processingQueue: ProcessingItem[];
  lastProcess: number;
  processInterval: number;
}

export interface ProcessingItem {
  id: string;
  itemId: string;
  itemName: string;
  itemEmoji: string;
  startTime: number;
  duration: number;
  progress: number;
}

export interface Connection {
  id: string;
  fromId: string;
  fromType: 'spawner' | 'modifier';
  toId: string;
  toType: 'modifier' | 'sell';
  points: { x: number; y: number }[];
}

export interface DraggedConnection {
  fromId: string;
  fromType: 'spawner' | 'modifier';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface GameState {
  spawners: Spawner[];
  modifiers: Modifier[];
  items: GameItem[];
  connections: Connection[];
  draggedConnection: DraggedConnection | null;
  totalCash: number;
  cashPerMinute: number;
  discoveredCombos: Record<string, any>;
  cashHistory: { timestamp: number; cash: number }[];
  lastDiscovery: any;
}

const GRID_SIZE = 50;
const ITEM_SIZE = 20;
const SPAWNER_SIZE = 60;
const MODIFIER_SIZE = 80;

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>({
    spawners: [],
    modifiers: [],
    items: [],
    connections: [],
    draggedConnection: null,
    totalCash: 1000,
    cashPerMinute: 0,
    discoveredCombos: {},
    cashHistory: [{ timestamp: Date.now(), cash: 1000 }],
    lastDiscovery: null
  });

  const [lastDiscovery, setLastDiscovery] = useState<any>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(Date.now());

  // Game loop for item movement and processing
  useEffect(() => {
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setGameState(prevState => {
        let newState = { ...prevState };
        let cashGained = 0;

        // Update item positions
        newState.items = newState.items.map(item => {
          if (item.isMoving) {
            const dx = item.targetX - item.x;
            const dy = item.targetY - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 2) {
              // Item reached target
              if (item.isBeingProcessed) {
                // Item reached modifier for processing
                return { ...item, isMoving: false, x: item.targetX, y: item.targetY };
              } else {
                // Item reached sell zone or final destination
                if (item.targetX > 800 && item.targetY > 300) { // Sell zone
                  cashGained += item.cashPerItem;
                  return null; // Remove item
                }
                return { ...item, isMoving: false, x: item.targetX, y: item.targetY };
              }
            } else {
              // Move item towards target
              const moveDistance = item.speed * deltaTime / 1000;
              const moveRatio = Math.min(moveDistance / distance, 1);
              return {
                ...item,
                x: item.x + dx * moveRatio,
                y: item.y + dy * moveRatio
              };
            }
          }
          return item;
        }).filter(item => item !== null) as GameItem[];

        // Spawn new items from spawners
        newState.spawners.forEach(spawner => {
          if (now - spawner.lastSpawn >= spawner.spawnInterval) {
            const element = ELEMENTAL_INGREDIENTS.find(e => e.name === spawner.itemType);
            if (element) {
              const newItem: GameItem = {
                id: `item-${Date.now()}-${Math.random()}`,
                name: element.name,
                emoji: element.emoji,
                x: spawner.x + spawner.width,
                y: spawner.y + spawner.height / 2,
                targetX: spawner.x + spawner.width,
                targetY: spawner.y + spawner.height / 2,
                speed: 100,
                cashPerItem: 0.01,
                isMoving: false,
                isBeingProcessed: false
              };
              newState.items.push(newItem);
            }
            newState.spawners = newState.spawners.map(s => 
              s.id === spawner.id ? { ...s, lastSpawn: now } : s
            );
          }
        });

        // Process items in modifiers
        newState.modifiers.forEach(modifier => {
          // Update processing queue
          modifier.processingQueue = modifier.processingQueue.map(processingItem => {
            const elapsed = now - processingItem.startTime;
            const progress = Math.min(elapsed / processingItem.duration, 1);
            
            if (progress >= 1) {
              // Processing complete - create output item
              const outputItem: GameItem = {
                id: `item-${Date.now()}-${Math.random()}`,
                name: processingItem.itemName,
                emoji: processingItem.itemEmoji,
                x: modifier.x + modifier.width,
                y: modifier.y + modifier.height / 2,
                targetX: modifier.x + modifier.width,
                targetY: modifier.y + modifier.height / 2,
                speed: 100,
                cashPerItem: processingItem.itemName.includes('Steamy') ? 10 : 1,
                isMoving: false,
                isBeingProcessed: false
              };
              newState.items.push(outputItem);
              return null; // Remove from processing queue
            }
            
            return { ...processingItem, progress };
          }).filter(Boolean) as ProcessingItem[];

          // Check for new items to process
          const itemsAtModifier = newState.items.filter(item => 
            !item.isMoving && 
            !item.isBeingProcessed &&
            Math.abs(item.x - modifier.x) < 10 &&
            Math.abs(item.y - (modifier.y + modifier.height / 2)) < 10
          );

          itemsAtModifier.forEach(item => {
            if (modifier.processingQueue.length < 3) { // Max 3 items processing at once
              const processingItem: ProcessingItem = {
                id: `processing-${Date.now()}-${Math.random()}`,
                itemId: item.id,
                itemName: item.name,
                itemEmoji: item.emoji,
                startTime: now,
                duration: 3000, // 3 seconds processing time
                progress: 0
              };
              
              modifier.processingQueue.push(processingItem);
              newState.items = newState.items.map(i => 
                i.id === item.id ? { ...i, isBeingProcessed: true, processingModifierId: modifier.id } : i
              );
            }
          });

          // Update modifier in state
          newState.modifiers = newState.modifiers.map(m => 
            m.id === modifier.id ? { ...modifier, processingQueue: modifier.processingQueue } : m
          );
        });

        // Move items along connections
        newState.items.forEach(item => {
          if (!item.isMoving && !item.isBeingProcessed) {
            // Find next destination
            const connection = newState.connections.find(conn => {
              if (conn.fromType === 'spawner') {
                const spawner = newState.spawners.find(s => s.id === conn.fromId);
                return spawner && Math.abs(item.x - (spawner.x + spawner.width)) < 10 &&
                       Math.abs(item.y - (spawner.y + spawner.height / 2)) < 10;
              } else if (conn.fromType === 'modifier') {
                const modifier = newState.modifiers.find(m => m.id === conn.fromId);
                return modifier && Math.abs(item.x - (modifier.x + modifier.width)) < 10 &&
                       Math.abs(item.y - (modifier.y + modifier.height / 2)) < 10;
              }
              return false;
            });

            if (connection) {
              if (connection.toType === 'modifier') {
                const modifier = newState.modifiers.find(m => m.id === connection.toId);
                if (modifier) {
                  item.targetX = modifier.x;
                  item.targetY = modifier.y + modifier.height / 2;
                  item.isMoving = true;
                }
              } else if (connection.toType === 'sell') {
                item.targetX = 850;
                item.targetY = 350;
                item.isMoving = true;
              }
            }
          }
        });

        // Update cash
        if (cashGained > 0) {
          newState.totalCash += cashGained;
          newState.cashHistory.push({ timestamp: now, cash: newState.totalCash });
        }

        return newState;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const addSpawner = useCallback((x: number, y: number, itemType: string) => {
    const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    
    const spawner: Spawner = {
      id: `spawner-${Date.now()}`,
      x: gridX,
      y: gridY,
      width: SPAWNER_SIZE,
      height: SPAWNER_SIZE,
      itemType,
      lastSpawn: Date.now(),
      spawnInterval: 2000 // 2 seconds
    };

    setGameState(prev => ({
      ...prev,
      spawners: [...prev.spawners, spawner]
    }));
  }, []);

  const addModifier = useCallback((x: number, y: number, modifierType: string) => {
    const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    
    const modifier: Modifier = {
      id: `modifier-${Date.now()}`,
      x: gridX,
      y: gridY,
      width: MODIFIER_SIZE,
      height: MODIFIER_SIZE,
      name: modifierType,
      inputs: [],
      outputs: [],
      processingQueue: [],
      lastProcess: Date.now(),
      processInterval: 3000
    };

    setGameState(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, modifier]
    }));
  }, []);

  const startConnection = useCallback((fromId: string, fromType: 'spawner' | 'modifier', x: number, y: number) => {
    const draggedConnection: DraggedConnection = {
      fromId,
      fromType,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    };

    setGameState(prev => ({
      ...prev,
      draggedConnection
    }));
  }, []);

  const updateDraggedConnection = useCallback((x: number, y: number) => {
    setGameState(prev => {
      if (prev.draggedConnection) {
        return {
          ...prev,
          draggedConnection: {
            ...prev.draggedConnection,
            currentX: x,
            currentY: y
          }
        };
      }
      return prev;
    });
  }, []);

  const completeConnection = useCallback((toId: string, toType: 'modifier' | 'sell') => {
    setGameState(prev => {
      if (!prev.draggedConnection) return prev;

      const connection: Connection = {
        id: `connection-${Date.now()}`,
        fromId: prev.draggedConnection.fromId,
        fromType: prev.draggedConnection.fromType,
        toId,
        toType,
        points: [
          { x: prev.draggedConnection.startX, y: prev.draggedConnection.startY },
          { x: prev.draggedConnection.currentX, y: prev.draggedConnection.currentY }
        ]
      };

      return {
        ...prev,
        connections: [...prev.connections, connection],
        draggedConnection: null
      };
    });
  }, []);

  const cancelConnection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      draggedConnection: null
    }));
  }, []);

  const clearLastDiscovery = useCallback(() => {
    setLastDiscovery(null);
  }, []);

  return {
    gameState,
    lastDiscovery,
    clearLastDiscovery,
    addSpawner,
    addModifier,
    startConnection,
    updateDraggedConnection,
    completeConnection,
    cancelConnection,
    canvasDimensions: { width: 1200, height: 800 },
    ITEM_SIZE,
    SELL_ZONE: { x: 800, y: 300, width: 200, height: 100 }
  };
} 