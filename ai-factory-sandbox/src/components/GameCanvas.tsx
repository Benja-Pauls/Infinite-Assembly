import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameItem, Spawner, Modifier, Connection } from '../types/game';

interface GameCanvasProps {
  gameState: GameState;
  canvasWidth: number;
  canvasHeight: number;
  itemSize: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  draggedItem: any;
  sellZone: { x: number; y: number; width: number; height: number };
  onAddSpawner: (x: number, y: number, itemType: string) => void;
  onAddModifier: (x: number, y: number, modifierType: string) => void;
  onStartConnection: (fromId: string, fromType: 'spawner' | 'modifier', x: number, y: number) => void;
  onUpdateDraggedConnection: (x: number, y: number) => void;
  onCompleteConnection: (toId: string, toType: 'modifier' | 'sell') => void;
  onCancelConnection: () => void;
}

const SIMPLE_ELEMENTS = [
  { name: 'Water', emoji: '💧' },
  { name: 'Fire', emoji: '🔥' },
  { name: 'Earth', emoji: '🌍' },
  { name: 'Air', emoji: '💨' }
];

export function GameCanvas({ 
  gameState, 
  canvasWidth, 
  canvasHeight, 
  itemSize,
  zoom,
  onZoomChange,
  draggedItem,
  sellZone,
  onAddSpawner,
  onAddModifier,
  onStartConnection,
  onUpdateDraggedConnection,
  onCompleteConnection,
  onCancelConnection
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const floatingNumberRef = useRef<{ x: number; y: number; text: string; type: string; timestamp: number } | null>(null);
  const [redrawFlag, setRedrawFlag] = useState(0);
  const redraw = () => setRedrawFlag(f => f + 1);
  const debounceRef = useRef<number>(0);

  // Only allow one floating number at a time
  const showFloatingNumber = useCallback((x: number, y: number, text: string, type: string) => {
    floatingNumberRef.current = { x, y, text, type, timestamp: Date.now() };
    redraw();
    setTimeout(() => {
      if (floatingNumberRef.current && Date.now() - floatingNumberRef.current.timestamp >= 1200) {
        floatingNumberRef.current = null;
        redraw();
      }
    }, 1200);
  }, []);

  // Show floating number only when cash increases
  useEffect(() => {
    if (gameState.cashHistory && gameState.cashHistory.length > 1) {
      const last = gameState.cashHistory[gameState.cashHistory.length - 1];
      const prev = gameState.cashHistory[gameState.cashHistory.length - 2];
      if (last.cash > prev.cash) {
        showFloatingNumber(
          sellZone.x + sellZone.width / 2,
          sellZone.y + sellZone.height / 2,
          `+$${last.cash - prev.cash}`,
          'positive'
        );
      }
    }
  }, [gameState.cashHistory, sellZone, showFloatingNumber]);

  // Redraw on gameState, viewOffset, or zoom changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx);
  }, [gameState, viewOffset, zoom, redrawFlag]);

  const getWorldCoordinates = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    return {
      x: (canvasX - viewOffset.x) / zoom,
      y: (canvasY - viewOffset.y) / zoom
    };
  }, [viewOffset, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
    
    // Check if clicking on a connection point first
    let connectionStarted = false;

    // Check spawner output points
    gameState.spawners.forEach(spawner => {
      const outputX = spawner.x + spawner.width;
      const outputY = spawner.y + spawner.height / 2;
      const distance = Math.sqrt(Math.pow(worldCoords.x - outputX, 2) + Math.pow(worldCoords.y - outputY, 2));
      
      if (distance < 20) {
        onStartConnection(spawner.id, 'spawner', outputX, outputY);
        setIsDraggingConnection(true);
        connectionStarted = true;
      }
    });

    // Check modifier output points
    if (!connectionStarted) {
      gameState.modifiers.forEach(modifier => {
        const outputX = modifier.x + modifier.width;
        const outputY = modifier.y + modifier.height / 2;
        const distance = Math.sqrt(Math.pow(worldCoords.x - outputX, 2) + Math.pow(worldCoords.y - outputY, 2));
        
        if (distance < 20) {
          onStartConnection(modifier.id, 'modifier', outputX, outputY);
          setIsDraggingConnection(true);
          connectionStarted = true;
        }
      });
    }

    // If not starting a connection, start panning
    if (!connectionStarted) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX - canvasRef.current!.getBoundingClientRect().left, y: e.clientY - canvasRef.current!.getBoundingClientRect().top };
    }
  }, [gameState.spawners, gameState.modifiers, getWorldCoordinates, onStartConnection]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDraggingConnection) {
      const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
      let connectionCompleted = false;

      // Check if dropping on a modifier input
      gameState.modifiers.forEach(modifier => {
        const inputX = modifier.x;
        const inputY = modifier.y + modifier.height / 2;
        const distance = Math.sqrt(Math.pow(worldCoords.x - inputX, 2) + Math.pow(worldCoords.y - inputY, 2));
        
        if (distance < 25) {
          onCompleteConnection(modifier.id, 'modifier');
          connectionCompleted = true;
        }
      });

      // Check if dropping on sell zone - use world coordinates
      if (!connectionCompleted) {
        const inSellZoneX = worldCoords.x >= sellZone.x && worldCoords.x <= sellZone.x + sellZone.width;
        const inSellZoneY = worldCoords.y >= sellZone.y && worldCoords.y <= sellZone.y + sellZone.height;
        
        if (inSellZoneX && inSellZoneY) {
          onCompleteConnection('sell', 'sell');
          connectionCompleted = true;
        }
      }

      if (!connectionCompleted) {
        onCancelConnection();
      }

      setIsDraggingConnection(false);
    }
  }, [isPanning, isDraggingConnection, gameState.modifiers, sellZone, getWorldCoordinates, onCompleteConnection, onCancelConnection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentMouseX = e.clientX - rect.left;
      const currentMouseY = e.clientY - rect.top;

      const deltaX = currentMouseX - lastMousePos.current.x;
      const deltaY = currentMouseY - lastMousePos.current.y;

      setViewOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastMousePos.current = { x: currentMouseX, y: currentMouseY };
    }
  }, [isPanning]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Handle touchpad pinch-to-zoom (detected by ctrlKey)
    if (e.ctrlKey) {
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05; // Smaller steps for smoother zoom
      const newZoom = Math.max(0.3, Math.min(3, zoom * zoomFactor));
      onZoomChange(newZoom);
      return;
    }
    
    // Handle two-finger scroll for panning on touchpads - reduce sensitivity
    const panSensitivity = 0.5;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll - pan horizontally
      setViewOffset(prev => ({ x: prev.x - e.deltaX * panSensitivity, y: prev.y }));
    } else {
      // Vertical scroll - pan vertically  
      setViewOffset(prev => ({ x: prev.x, y: prev.y - e.deltaY * panSensitivity }));
    }
  }, [zoom, onZoomChange]);

  // Handle touch events for mobile pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      // Store initial touch distance for pinch-to-zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      (canvasRef.current as any)._initialTouchDistance = distance;
      (canvasRef.current as any)._initialZoom = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const canvas = canvasRef.current as any;
      if (canvas._initialTouchDistance && canvas._initialZoom) {
        const scale = distance / canvas._initialTouchDistance;
        const newZoom = Math.max(0.3, Math.min(3, canvas._initialZoom * scale));
        onZoomChange(newZoom);
      }
    }
  }, [onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    const canvas = canvasRef.current as any;
    if (canvas) {
      delete canvas._initialTouchDistance;
      delete canvas._initialZoom;
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const worldCoords = getWorldCoordinates(e.clientX, e.clientY);

    if (draggedItem.type === 'spawner') {
      onAddSpawner(worldCoords.x - 40, worldCoords.y - 30, draggedItem.data.name);
      showFloatingNumber(worldCoords.x, worldCoords.y, `${draggedItem.data.name} Spawner`, 'creation');
    } else if (draggedItem.type === 'modifier') {
      onAddModifier(worldCoords.x - 50, worldCoords.y - 40, draggedItem.data.name);
      showFloatingNumber(worldCoords.x, worldCoords.y, `${draggedItem.data.name} Modifier`, 'creation');
    }
  }, [draggedItem, getWorldCoordinates, onAddSpawner, onAddModifier, showFloatingNumber]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Only draw visible items (in viewport)
  const isItemVisible = (item: GameItem) => {
    const x = item.x + viewOffset.x / zoom;
    const y = item.y + viewOffset.y / zoom;
    return x > -100 && x < canvasWidth / zoom + 100 && y > -100 && y < canvasHeight / zoom + 100;
  };

  // Draw function (no particles, no flowing dots)
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(viewOffset.x / zoom, viewOffset.y / zoom);
    // Grid
    if (zoom > 0.6) {
      ctx.strokeStyle = `rgba(0,0,0,0.05)`;
      ctx.lineWidth = 1 / zoom;
      const gridSize = 50;
      const startX = Math.floor((-viewOffset.x / zoom) / gridSize) * gridSize;
      const startY = Math.floor((-viewOffset.y / zoom) / gridSize) * gridSize;
      const endX = startX + (canvasWidth / zoom) + gridSize;
      const endY = startY + (canvasHeight / zoom) + gridSize;
      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
      }
    }
    // Sell zone
    ctx.fillStyle = 'rgba(39, 174, 96, 0.15)';
    ctx.fillRect(sellZone.x, sellZone.y, sellZone.width, sellZone.height);
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([8 / zoom, 4 / zoom]);
    ctx.strokeRect(sellZone.x, sellZone.y, sellZone.width, sellZone.height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#27ae60';
    ctx.font = `bold ${16 / zoom}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('💰 SELL', sellZone.x + sellZone.width / 2, sellZone.y + sellZone.height / 2);
    // Connections
    gameState.connections.forEach(connection => {
      if (connection.points.length >= 2) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(connection.points[0].x, connection.points[0].y);
        ctx.lineTo(connection.points[1].x, connection.points[1].y);
        ctx.stroke();
      }
    });
    // Dragged connection
    if (gameState.draggedConnection) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(gameState.draggedConnection.startX, gameState.draggedConnection.startY);
      ctx.lineTo(gameState.draggedConnection.currentX, gameState.draggedConnection.currentY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Spawners
    gameState.spawners.forEach(spawner => {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(spawner.x, spawner.y, spawner.width, spawner.height);
      ctx.strokeStyle = '#1e8449';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(spawner.x, spawner.y, spawner.width, spawner.height);
      const element = SIMPLE_ELEMENTS.find(e => e.name === spawner.itemType);
      if (element) {
        ctx.fillStyle = 'white';
        ctx.font = `${14 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(element.emoji, spawner.x + spawner.width / 2, spawner.y + spawner.height / 2 - 4);
        ctx.font = `${10 / zoom}px Arial`;
        ctx.fillText(element.name, spawner.x + spawner.width / 2, spawner.y + spawner.height / 2 + 12);
      }
      // Output connection point
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(spawner.x + spawner.width, spawner.y + spawner.height / 2, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    });
    // Modifiers
    gameState.modifiers.forEach(modifier => {
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(modifier.x, modifier.y, modifier.width, modifier.height);
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(modifier.x, modifier.y, modifier.width, modifier.height);
      ctx.fillStyle = 'white';
      ctx.font = `${14 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(modifier.emoji, modifier.x + modifier.width / 2, modifier.y + modifier.height / 2 - 4);
      ctx.font = `${10 / zoom}px Arial`;
      ctx.fillText(modifier.name, modifier.x + modifier.width / 2, modifier.y + modifier.height / 2 + 12);
      // Input connection point
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.arc(modifier.x, modifier.y + modifier.height / 2, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      // Output connection point
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(modifier.x + modifier.width, modifier.y + modifier.height / 2, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    });
    // Items (only visible ones)
    gameState.items.forEach(item => {
      if (!isItemVisible(item)) return;
      ctx.save();
      ctx.translate(item.x + itemSize / 2, item.y + itemSize / 2);
      ctx.font = `${itemSize / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(item.emoji, 0, itemSize / 4 / zoom);
      ctx.font = `${7 / zoom}px Arial`;
      ctx.fillText(item.name, 0, -itemSize / 2 / zoom);
      ctx.font = `${8 / zoom}px Arial`;
      ctx.fillStyle = '#27ae60';
      ctx.fillText(`$${item.cashPerItem}`, 0, itemSize / zoom + 8 / zoom);
      ctx.restore();
    });
    // Floating number (if any)
    if (floatingNumberRef.current) {
      const { x, y, text, type, timestamp } = floatingNumberRef.current;
      const elapsed = Date.now() - timestamp;
      if (elapsed < 1200) {
        ctx.save();
        ctx.globalAlpha = 1 - elapsed / 1200;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = type === 'positive' ? '#27ae60' : '#3498db';
        ctx.fillText(text, x, y - (elapsed / 1200) * 30);
        ctx.restore();
      }
    }
    ctx.restore();
  }, [gameState, canvasWidth, canvasHeight, itemSize, viewOffset, zoom]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          cursor: isPanning ? 'grabbing' : isDraggingConnection ? 'crosshair' : 'grab'
        }}
      />
      <div className="pan-instructions">
        🖱️ Click & drag to pan • 🔍 Pinch or Ctrl+scroll to zoom • 🔗 Click connection points to connect
      </div>
    </>
  );
} 