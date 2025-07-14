import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GameState, GameItem, Spawner, Connection, Modifier } from '../types/game';
import { ELEMENTAL_INGREDIENTS, SIMPLE_MODIFIERS } from '../types/game';
import { combineItems, getCachedCombo, getWealthMilestone } from '../services/gpt';

const ITEM_SIZE = 20;
const CONNECTION_SPEED = 80; // pixels per second
const SELL_ZONE = {
  x: 800,
  y: 300,
  width: 120,
  height: 200
};

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>({
    items: [],
    spawners: [],
    connections: [],
    modifiers: [],
    totalCash: 0,
    cashPerMinute: 0,
    discoveredCombos: {},
    lastCashUpdate: Date.now(),
    cashHistory: []
  });

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1400, height: 800 });
  const animationRef = useRef<number | undefined>(undefined);
  const lastFrameTime = useRef<number>(Date.now());

  // Function to update canvas dimensions
  const updateCanvasDimensions = useCallback(() => {
    const sidebar = 160; // sidebar width
    const availableWidth = window.innerWidth - sidebar;
    const availableHeight = window.innerHeight - 100; // account for header and controls
    
    setCanvasDimensions({
      width: Math.max(availableWidth, 800),
      height: Math.max(availableHeight, 600)
    });
  }, []);

  // Update canvas size on window resize
  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  const processCombination = useCallback(async (inputItems: GameItem[], modifier: Modifier, gameState: GameState) => {
    const ingredientNames = inputItems.map(item => item.name);
    const cacheKey = getCachedCombo(ingredientNames, modifier.name);

    let result = gameState.discoveredCombos[cacheKey];
    
    if (!result) {
      result = await combineItems(ingredientNames, modifier.name);
      gameState.discoveredCombos[cacheKey] = result;
      saveDiscoveredCombos(gameState.discoveredCombos);
    }

    // Find output connection from this modifier
    const outputConnection = gameState.connections.find(
      conn => conn.fromId === modifier.id && conn.fromType === 'modifier'
    );

    if (outputConnection) {
      const newItem: GameItem = {
        id: uuidv4(),
        name: result.name,
        emoji: result.emoji,
        cashPerItem: result.cashPerItem,
        type: result.type,
        x: outputConnection.points[0].x,
        y: outputConnection.points[0].y,
        vx: 0,
        vy: 0,
        progress: 0,
        connectionId: outputConnection.id
      };
      gameState.items.push(newItem);
    }
  }, []);

  const updateCashPerMinute = useCallback((gameState: GameState, now: number) => {
    gameState.cashHistory.push({ timestamp: now, cash: gameState.totalCash });
    
    const oneMinuteAgo = now - 60000;
    gameState.cashHistory = gameState.cashHistory.filter(entry => entry.timestamp > oneMinuteAgo);

    if (gameState.cashHistory.length > 1) {
      const oldestEntry = gameState.cashHistory[0];
      const latestEntry = gameState.cashHistory[gameState.cashHistory.length - 1];
      const timeDiff = latestEntry.timestamp - oldestEntry.timestamp;
      const cashDiff = latestEntry.cash - oldestEntry.cash;
      
      if (timeDiff > 0) {
        gameState.cashPerMinute = (cashDiff / timeDiff) * 60000;
      }
    }
  }, []);

  const createConnection = useCallback((fromId: string, fromType: 'spawner' | 'modifier', toId: string, toType: 'modifier' | 'sell'): Connection => {
    const connection: Connection = {
      id: uuidv4(),
      fromId,
      toId,
      fromType,
      toType,
      fromPort: 'output',
      toPort: 'input',
      points: [], // Will be calculated based on block positions
      speed: CONNECTION_SPEED
    };
    return connection;
  }, []);

  const calculateConnectionPoints = useCallback((connection: Connection, spawners: Spawner[], modifiers: Modifier[]): { x: number; y: number }[] => {
    let startPoint: { x: number; y: number };
    let endPoint: { x: number; y: number };

    // Calculate start point
    if (connection.fromType === 'spawner') {
      const spawner = spawners.find(s => s.id === connection.fromId);
      if (spawner) {
        startPoint = { x: spawner.x + spawner.width, y: spawner.y + spawner.height / 2 };
      } else {
        startPoint = { x: 0, y: 0 };
      }
    } else {
      const modifier = modifiers.find(m => m.id === connection.fromId);
      if (modifier) {
        startPoint = { x: modifier.x + modifier.width, y: modifier.y + modifier.height / 2 };
      } else {
        startPoint = { x: 0, y: 0 };
      }
    }

    // Calculate end point
    if (connection.toType === 'sell') {
      // Position sell connections to go to the center of the sell zone
      endPoint = { x: SELL_ZONE.x + SELL_ZONE.width / 2, y: SELL_ZONE.y + SELL_ZONE.height / 2 };
    } else {
      const modifier = modifiers.find(m => m.id === connection.toId);
      if (modifier) {
        endPoint = { x: modifier.x, y: modifier.y + modifier.height / 2 };
      } else {
        endPoint = { x: 0, y: 0 };
      }
    }

    // Simple straight line for now - could be enhanced with curves later
    return [startPoint, endPoint];
  }, []);

  // Initialize with minimal setup
  useEffect(() => {
    const waterSpawner: Spawner = {
      id: uuidv4(),
      x: 80,
      y: 200,
      width: 80,
      height: 60,
      itemType: 'Water',
      lastSpawn: Date.now(),
      spawnInterval: 3000
    };

    const fireSpawner: Spawner = {
      id: uuidv4(),
      x: 80,
      y: 320,
      width: 80,
      height: 60,
      itemType: 'Fire',
      lastSpawn: Date.now(),
      spawnInterval: 3000
    };

    const heatModifier: Modifier = {
      id: uuidv4(),
      x: 350,
      y: 260,
      width: 100,
      height: 80,
      name: 'Heat',
      emoji: '🔥',
      inputs: [],
      lastProcess: Date.now(),
      processInterval: 2000
    };

    // Create initial connections
    const waterToHeat = createConnection(waterSpawner.id, 'spawner', heatModifier.id, 'modifier');
    const heatToSell = createConnection(heatModifier.id, 'modifier', 'sell', 'sell');

    setGameState(prev => ({
      ...prev,
      spawners: [waterSpawner, fireSpawner],
      modifiers: [heatModifier],
      connections: [waterToHeat, heatToSell],
      discoveredCombos: loadDiscoveredCombos()
    }));
  }, [createConnection]);

  // Game loop
  useEffect(() => {
    let lastUpdateTime = Date.now();
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;

    function gameLoop() {
      const now = Date.now();
      const deltaTime = now - lastFrameTime.current;
      
      // Only update if enough time has passed (throttle to 60fps max)
      if (deltaTime < FRAME_TIME) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      lastFrameTime.current = now;

      // Only update game state every 16ms (60fps) to reduce re-renders
      if (now - lastUpdateTime > FRAME_TIME) {
        lastUpdateTime = now;

        setGameState(prev => {
          const newState = { ...prev };
          let hasChanges = false;

          // Update connection points only when necessary
          const newConnections = newState.connections.map(conn => ({
            ...conn,
            points: calculateConnectionPoints(conn, newState.spawners, newState.modifiers)
          }));
          
          // Check if connections actually changed
          const connectionsChanged = newConnections.some((conn, i) => 
            !newState.connections[i] || 
            conn.points[0]?.x !== newState.connections[i].points[0]?.x ||
            conn.points[0]?.y !== newState.connections[i].points[0]?.y ||
            conn.points[1]?.x !== newState.connections[i].points[1]?.x ||
            conn.points[1]?.y !== newState.connections[i].points[1]?.y
          );
          
          if (connectionsChanged) {
            newState.connections = newConnections;
            hasChanges = true;
          }

          // Spawn items from spawners (less frequently)
          for (let i = 0; i < newState.spawners.length; i++) {
            const spawner = newState.spawners[i];
            if (now - spawner.lastSpawn >= spawner.spawnInterval) {
              const ingredient = ELEMENTAL_INGREDIENTS.find(ing => ing.name === spawner.itemType);
              const outputConnection = newState.connections.find(
                conn => conn.fromId === spawner.id && conn.fromType === 'spawner'
              );

              if (ingredient && outputConnection && outputConnection.points.length > 0) {
                const newItem: GameItem = {
                  id: uuidv4(),
                  name: ingredient.name,
                  emoji: ingredient.emoji,
                  cashPerItem: 15,
                  type: 'Ingredient',
                  x: outputConnection.points[0].x,
                  y: outputConnection.points[0].y,
                  vx: 0,
                  vy: 0,
                  progress: 0,
                  connectionId: outputConnection.id
                };
                newState.items.push(newItem);
                newState.spawners[i] = { ...spawner, lastSpawn: now };
                hasChanges = true;
              }
            }
          }

          // Move items along connections
          const itemsToRemove = new Set<string>();
          for (let i = 0; i < newState.items.length; i++) {
            const item = newState.items[i];
            if (item.connectionId) {
              const connection = newState.connections.find(c => c.id === item.connectionId);
              if (connection && connection.points.length >= 2) {
                const distance = Math.sqrt(
                  Math.pow(connection.points[1].x - connection.points[0].x, 2) +
                  Math.pow(connection.points[1].y - connection.points[0].y, 2)
                );
                
                const progressIncrement = (CONNECTION_SPEED * deltaTime) / 1000 / distance;
                const newProgress = Math.min(item.progress + progressIncrement, 1);
                
                if (newProgress >= 1) {
                  // Item reached end of connection
                  if (connection.toType === 'sell') {
                    // Item reached sell zone - add cash and mark for removal
                    newState.totalCash += item.cashPerItem;
                    itemsToRemove.add(item.id);
                    hasChanges = true;
                  } else {
                    // Item reached modifier
                    const modifier = newState.modifiers.find(m => m.id === connection.toId);
                    if (modifier && !modifier.inputs.includes(item.id)) {
                      modifier.inputs.push(item.id);
                      hasChanges = true;
                    }
                  }
                } else {
                  // Update item position
                  const t = newProgress;
                  const startPoint = connection.points[0];
                  const endPoint = connection.points[1];
                  
                  const newX = startPoint.x + (endPoint.x - startPoint.x) * t;
                  const newY = startPoint.y + (endPoint.y - startPoint.y) * t;
                  
                  if (Math.abs(newX - item.x) > 0.1 || Math.abs(newY - item.y) > 0.1 || newProgress !== item.progress) {
                    newState.items[i] = {
                      ...item,
                      x: newX,
                      y: newY,
                      progress: newProgress
                    };
                    hasChanges = true;
                  }
                }
              }
            }
          }

          // Remove items that reached sell zone
          if (itemsToRemove.size > 0) {
            newState.items = newState.items.filter(item => !itemsToRemove.has(item.id));
            hasChanges = true;
          }

          // Process modifiers (less frequently)
          for (let i = 0; i < newState.modifiers.length; i++) {
            const modifier = newState.modifiers[i];
            if (modifier.inputs.length > 0 && now - modifier.lastProcess >= modifier.processInterval) {
              const inputItems = modifier.inputs.map(id => 
                newState.items.find(item => item.id === id)
              ).filter(Boolean) as GameItem[];

              if (inputItems.length > 0) {
                processCombination(inputItems, modifier, newState);
                
                // Remove processed items
                newState.items = newState.items.filter(item => 
                  !modifier.inputs.includes(item.id)
                );

                newState.modifiers[i] = {
                  ...modifier,
                  inputs: [],
                  lastProcess: now
                };
                hasChanges = true;
              }
            }
          }

          // Update cash per minute less frequently (every second)
          if (now - newState.lastCashUpdate > 1000) {
            updateCashPerMinute(newState, now);
            newState.lastCashUpdate = now;
            hasChanges = true;
          }

          // Only return new state if something actually changed
          return hasChanges ? newState : prev;
        });
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    }

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [processCombination, updateCashPerMinute, calculateConnectionPoints]);

  const addSpawner = useCallback((x: number, y: number, itemType: string) => {
    const newSpawner: Spawner = {
      id: uuidv4(),
      x,
      y,
      width: 80,
      height: 60,
      itemType,
      lastSpawn: Date.now(),
      spawnInterval: 3000
    };

    setGameState(prev => ({
      ...prev,
      spawners: [...prev.spawners, newSpawner]
    }));
  }, []);

  const addModifier = useCallback((x: number, y: number, modifierType: string) => {
    const modifierData = SIMPLE_MODIFIERS.find(m => m.name === modifierType);
    if (!modifierData) return;

    const newModifier: Modifier = {
      id: uuidv4(),
      x,
      y,
      width: 100,
      height: 80,
      name: modifierData.name,
      emoji: modifierData.emoji,
      inputs: [],
      lastProcess: Date.now(),
      processInterval: 2000
    };

    setGameState(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, newModifier]
    }));
  }, []);

  const startConnection = useCallback((fromId: string, fromType: 'spawner' | 'modifier', x: number, y: number) => {
    setGameState(prev => ({
      ...prev,
      draggedConnection: {
        fromId,
        fromType,
        fromPort: 'output',
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      }
    }));
  }, []);

  const updateDraggedConnection = useCallback((x: number, y: number) => {
    setGameState(prev => ({
      ...prev,
      draggedConnection: prev.draggedConnection ? {
        ...prev.draggedConnection,
        currentX: x,
        currentY: y
      } : undefined
    }));
  }, []);

  const completeConnection = useCallback((toId: string, toType: 'modifier' | 'sell') => {
    setGameState(prev => {
      if (!prev.draggedConnection) return prev;

      const newConnection = createConnection(
        prev.draggedConnection.fromId,
        prev.draggedConnection.fromType,
        toId,
        toType
      );

      return {
        ...prev,
        connections: [...prev.connections, newConnection],
        draggedConnection: undefined
      };
    });
  }, [createConnection]);

  const cancelConnection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      draggedConnection: undefined
    }));
  }, []);

  const getWealthStatus = useCallback(() => {
    return getWealthMilestone(gameState.totalCash);
  }, [gameState.totalCash]);

  return {
    gameState,
    addSpawner,
    addModifier,
    startConnection,
    updateDraggedConnection,
    completeConnection,
    cancelConnection,
    getWealthStatus,
    canvasDimensions,
    ITEM_SIZE,
    SELL_ZONE
  };
}

function loadDiscoveredCombos(): Record<string, any> {
  try {
    const saved = localStorage.getItem('ai-factory-discovered-combos');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveDiscoveredCombos(combos: Record<string, any>) {
  try {
    localStorage.setItem('ai-factory-discovered-combos', JSON.stringify(combos));
  } catch {
    // Ignore localStorage errors
  }
} 