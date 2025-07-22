import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameState, GameItem, Spawner, Modifier, Connection, ProcessingItem } from '../hooks/useGameEngine';

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
  onCompleteConnection: (toId: string, toType: 'modifier' | 'sell') => void;
  onCancelConnection: () => void;
  onUpdateDraggedConnection: (x: number, y: number) => void;
}

const GRID_SIZE = 50;

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
  onCompleteConnection,
  onCancelConnection,
  onUpdateDraggedConnection
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastRenderTimeRef = useRef<number>(0);
  
  // Canvas state
  const [canvasState, setCanvasState] = useState({
    viewOffset: { x: 0, y: 0 },
    isPanning: false,
    lastMousePos: { x: 0, y: 0 },
    hoveredConnectionPoint: null as { id: string; type: string; x: number; y: number } | null
  });

  // Get world coordinates from screen coordinates
  const getWorldCoordinates = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    return {
      x: (canvasX - canvasState.viewOffset.x) / zoom,
      y: (canvasY - canvasState.viewOffset.y) / zoom
    };
  }, [canvasState.viewOffset, zoom]);

  // Get connection points for all components
  const connectionPoints = useMemo(() => {
    const points: { id: string; type: string; x: number; y: number; isInput: boolean }[] = [];
    
    // Spawner output points
    gameState.spawners.forEach(spawner => {
      points.push({
        id: spawner.id,
        type: 'spawner',
        x: spawner.x + spawner.width,
        y: spawner.y + spawner.height / 2,
        isInput: false
      });
    });

    // Modifier input and output points
    gameState.modifiers.forEach(modifier => {
      // Input point (left side)
      points.push({
        id: modifier.id,
        type: 'modifier',
        x: modifier.x,
        y: modifier.y + modifier.height / 2,
        isInput: true
      });
      // Output point (right side)
      points.push({
        id: modifier.id,
        type: 'modifier',
        x: modifier.x + modifier.width,
        y: modifier.y + modifier.height / 2,
        isInput: false
      });
    });

    return points;
  }, [gameState.spawners, gameState.modifiers]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
    
    // Check if clicking on a connection point
    let connectionStarted = false;
    for (const point of connectionPoints) {
      const distance = Math.sqrt(Math.pow(worldCoords.x - point.x, 2) + Math.pow(worldCoords.y - point.y, 2));
      
      if (distance < 20 / zoom) {
        onStartConnection(point.id, point.type as 'spawner' | 'modifier', point.x, point.y);
        connectionStarted = true;
        break;
      }
    }

    // If not starting a connection, start panning
    if (!connectionStarted) {
      const rect = canvasRef.current!.getBoundingClientRect();
      setCanvasState(prev => ({
        ...prev,
        isPanning: true,
        lastMousePos: { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }));
    }
  }, [connectionPoints, getWorldCoordinates, onStartConnection, zoom]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasState.isPanning) {
      setCanvasState(prev => ({ ...prev, isPanning: false }));
    }

    if (gameState.draggedConnection) {
      const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
      let connectionCompleted = false;

      // Check if dropping on a modifier input
      gameState.modifiers.forEach(modifier => {
        const inputX = modifier.x;
        const inputY = modifier.y + modifier.height / 2;
        const distance = Math.sqrt(Math.pow(worldCoords.x - inputX, 2) + Math.pow(worldCoords.y - inputY, 2));
        
        if (distance < 25 / zoom) {
          onCompleteConnection(modifier.id, 'modifier');
          connectionCompleted = true;
        }
      });

      // Check if dropping on sell zone
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
    }
  }, [canvasState.isPanning, gameState.draggedConnection, gameState.modifiers, sellZone, getWorldCoordinates, onCompleteConnection, onCancelConnection, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle panning
    if (canvasState.isPanning) {
      const deltaX = mouseX - canvasState.lastMousePos.x;
      const deltaY = mouseY - canvasState.lastMousePos.y;

      setCanvasState(prev => ({
        ...prev,
        viewOffset: { x: prev.viewOffset.x + deltaX, y: prev.viewOffset.y + deltaY },
        lastMousePos: { x: mouseX, y: mouseY }
      }));
    }

    // Handle dragged connection
    if (gameState.draggedConnection) {
      const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
      onUpdateDraggedConnection(worldCoords.x, worldCoords.y);
    }

    // Check for hovered connection points
    const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
    let foundHover = false;

    for (const point of connectionPoints) {
      const distance = Math.sqrt(Math.pow(worldCoords.x - point.x, 2) + Math.pow(worldCoords.y - point.y, 2));
      
      if (distance < 20 / zoom) {
        setCanvasState(prev => ({
          ...prev,
          hoveredConnectionPoint: { id: point.id, type: point.type, x: point.x, y: point.y }
        }));
        foundHover = true;
        break;
      }
    }

    if (!foundHover && canvasState.hoveredConnectionPoint) {
      setCanvasState(prev => ({ ...prev, hoveredConnectionPoint: null }));
    }
  }, [canvasState.isPanning, canvasState.lastMousePos, canvasState.hoveredConnectionPoint, gameState.draggedConnection, getWorldCoordinates, onUpdateDraggedConnection, zoom, connectionPoints]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.ctrlKey) {
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.max(0.3, Math.min(3, zoom * zoomFactor));
      onZoomChange(newZoom);
      return;
    }
    
    const panSensitivity = 0.5;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setCanvasState(prev => ({
        ...prev,
        viewOffset: { x: prev.viewOffset.x - e.deltaX * panSensitivity, y: prev.viewOffset.y }
      }));
    } else {
      setCanvasState(prev => ({
        ...prev,
        viewOffset: { x: prev.viewOffset.x, y: prev.viewOffset.y - e.deltaY * panSensitivity }
      }));
    }
  }, [zoom, onZoomChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
    const gridX = Math.round(worldCoords.x / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(worldCoords.y / GRID_SIZE) * GRID_SIZE;

    if (draggedItem.type === 'spawner') {
      onAddSpawner(gridX, gridY, draggedItem.data.name);
    } else if (draggedItem.type === 'modifier') {
      onAddModifier(gridX, gridY, draggedItem.data.name);
    }
  }, [draggedItem, getWorldCoordinates, onAddSpawner, onAddModifier]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Render function
  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#f7fafc');
    gradient.addColorStop(1, '#edf2f7');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(canvasState.viewOffset.x / zoom, canvasState.viewOffset.y / zoom);
    
    // Draw grid
    if (zoom > 0.6) {
      ctx.strokeStyle = 'rgba(160, 174, 192, 0.2)';
      ctx.lineWidth = 1 / zoom;
      const gridSize = 50;
      const startX = Math.floor((-canvasState.viewOffset.x / zoom) / gridSize) * gridSize;
      const startY = Math.floor((-canvasState.viewOffset.y / zoom) / gridSize) * gridSize;
      const endX = startX + (canvasWidth / zoom) + gridSize;
      const endY = startY + (canvasHeight / zoom) + gridSize;
      
      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }
    
    // Draw sell zone
    const sellGradient = ctx.createLinearGradient(sellZone.x, sellZone.y, sellZone.x + sellZone.width, sellZone.y + sellZone.height);
    sellGradient.addColorStop(0, 'rgba(72, 187, 120, 0.15)');
    sellGradient.addColorStop(1, 'rgba(56, 178, 172, 0.15)');
    ctx.fillStyle = sellGradient;
    ctx.fillRect(sellZone.x, sellZone.y, sellZone.width, sellZone.height);
    
    ctx.strokeStyle = '#48bb78';
    ctx.lineWidth = 3 / zoom;
    ctx.strokeRect(sellZone.x, sellZone.y, sellZone.width, sellZone.height);
    
    ctx.fillStyle = '#2f855a';
    ctx.font = `bold ${18 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💰 SELL', sellZone.x + sellZone.width / 2, sellZone.y + sellZone.height / 2 + 6 / zoom);
    
    // Draw connections
    gameState.connections.forEach(connection => {
      if (connection.points.length >= 2) {
        const start = connection.points[0];
        const end = connection.points[1];
        
        const connectionGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        connectionGradient.addColorStop(0, '#667eea');
        connectionGradient.addColorStop(1, '#764ba2');
        
        ctx.strokeStyle = connectionGradient;
        ctx.lineWidth = 4 / zoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });
    
    // Draw dragged connection
    if (gameState.draggedConnection) {
      ctx.strokeStyle = '#e53e3e';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gameState.draggedConnection.startX, gameState.draggedConnection.startY);
      ctx.lineTo(gameState.draggedConnection.currentX, gameState.draggedConnection.currentY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw spawners
    gameState.spawners.forEach(spawner => {
      const spawnerGradient = ctx.createLinearGradient(spawner.x, spawner.y, spawner.x + spawner.width, spawner.y + spawner.height);
      spawnerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      spawnerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      ctx.fillStyle = spawnerGradient;
      ctx.fillRect(spawner.x, spawner.y, spawner.width, spawner.height);
      
      ctx.strokeStyle = '#48bb78';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeRect(spawner.x, spawner.y, spawner.width, spawner.height);
      
      // Spawner content
      ctx.fillStyle = '#2d3748';
      ctx.font = `${18 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('💧', spawner.x + spawner.width / 2, spawner.y + spawner.height / 2 - 4);
      ctx.font = `${11 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillText(spawner.itemType, spawner.x + spawner.width / 2, spawner.y + spawner.height / 2 + 12);
      
      // Output connection point
      const pointGradient = ctx.createRadialGradient(
        spawner.x + spawner.width, spawner.y + spawner.height / 2, 0,
        spawner.x + spawner.width, spawner.y + spawner.height / 2, 8 / zoom
      );
      pointGradient.addColorStop(0, '#48bb78');
      pointGradient.addColorStop(1, '#38a169');
      ctx.fillStyle = pointGradient;
      ctx.beginPath();
      ctx.arc(spawner.x + spawner.width, spawner.y + spawner.height / 2, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    });
    
    // Draw modifiers
    gameState.modifiers.forEach(modifier => {
      const isProcessing = modifier.processingQueue.length > 0;
      
      const modifierGradient = ctx.createLinearGradient(modifier.x, modifier.y, modifier.x + modifier.width, modifier.y + modifier.height);
      if (isProcessing) {
        modifierGradient.addColorStop(0, 'rgba(255, 243, 205, 0.95)');
        modifierGradient.addColorStop(1, 'rgba(254, 235, 200, 0.95)');
      } else {
        modifierGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        modifierGradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      }
      ctx.fillStyle = modifierGradient;
      ctx.fillRect(modifier.x, modifier.y, modifier.width, modifier.height);
      
      ctx.strokeStyle = isProcessing ? '#f6ad55' : '#667eea';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeRect(modifier.x, modifier.y, modifier.width, modifier.height);
      
      // Modifier content
      ctx.fillStyle = '#2d3748';
      ctx.font = `${18 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚙️', modifier.x + modifier.width / 2, modifier.y + modifier.height / 2 - 4);
      ctx.font = `${11 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillText(modifier.name, modifier.x + modifier.width / 2, modifier.y + modifier.height / 2 + 12);
      
      // Input connection point
      const inputGradient = ctx.createRadialGradient(
        modifier.x, modifier.y + modifier.height / 2, 0,
        modifier.x, modifier.y + modifier.height / 2, 8 / zoom
      );
      inputGradient.addColorStop(0, '#667eea');
      inputGradient.addColorStop(1, '#5a67d8');
      ctx.fillStyle = inputGradient;
      ctx.beginPath();
      ctx.arc(modifier.x, modifier.y + modifier.height / 2, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Output connection point
      const outputGradient = ctx.createRadialGradient(
        modifier.x + modifier.width, modifier.y + modifier.height / 2, 0,
        modifier.x + modifier.width, modifier.y + modifier.height / 2, 8 / zoom
      );
      outputGradient.addColorStop(0, '#48bb78');
      outputGradient.addColorStop(1, '#38a169');
      ctx.fillStyle = outputGradient;
      ctx.beginPath();
      ctx.arc(modifier.x + modifier.width, modifier.y + modifier.height / 2, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Draw processing queue
      modifier.processingQueue.forEach((processingItem, index) => {
        const progressBarY = modifier.y + modifier.height + 10 + (index * 20);
        const progressBarWidth = modifier.width;
        const progressBarHeight = 15;
        
        // Progress bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(modifier.x, progressBarY, progressBarWidth, progressBarHeight);
        
        // Progress bar fill
        const fillWidth = progressBarWidth * processingItem.progress;
        ctx.fillStyle = '#f6ad55';
        ctx.fillRect(modifier.x, progressBarY, fillWidth, progressBarHeight);
        
        // Item emoji
        ctx.font = `${12 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2d3748';
        ctx.fillText(processingItem.itemEmoji, modifier.x - 20, progressBarY + 10);
        
        // Progress percentage
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2d3748';
        ctx.font = `${10 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillText(`${Math.round(processingItem.progress * 100)}%`, modifier.x + modifier.width / 2, progressBarY + 10);
      });
    });
    
    // Draw connection point hover effects
    if (canvasState.hoveredConnectionPoint) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(canvasState.hoveredConnectionPoint.x, canvasState.hoveredConnectionPoint.y, 12 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();
    }
    
    // Draw items in transit
    gameState.items.forEach(item => {
      if (item.isBeingProcessed) return; // Skip items being processed
      
      ctx.save();
      ctx.translate(item.x + itemSize / 2, item.y + itemSize / 2);
      
      // Item background
      const itemGradient = ctx.createLinearGradient(-itemSize / 2, -itemSize / 2, itemSize / 2, itemSize / 2);
      itemGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      itemGradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      ctx.fillStyle = itemGradient;
      ctx.fillRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize);
      
      // Item border
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize);
      
      // Item emoji
      ctx.font = `${itemSize * 0.6 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2d3748';
      ctx.fillText(item.emoji, 0, itemSize * 0.2 / zoom);
      
      // Item name
      ctx.font = `${8 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillText(item.name, 0, -itemSize * 0.3 / zoom);
      
      // Item value
      ctx.font = `${9 / zoom}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillStyle = '#48bb78';
      ctx.fillText(`$${item.cashPerItem.toFixed(2)}`, 0, itemSize * 0.4 / zoom);
      
      ctx.restore();
    });
    
    ctx.restore();
  }, [
    canvasWidth, canvasHeight, zoom, canvasState, sellZone, gameState, itemSize
  ]);

  // Animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (currentTime - lastRenderTimeRef.current >= 33) { // ~30 FPS
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            render(ctx);
            lastRenderTimeRef.current = currentTime;
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

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
        onContextMenu={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          cursor: canvasState.isPanning ? 'grabbing' : gameState.draggedConnection ? 'crosshair' : canvasState.hoveredConnectionPoint ? 'pointer' : 'grab',
          background: '#f8f9fa',
          display: 'block'
        }}
      />
      <div className="canvas-instructions">
        <div className="instruction-item">
          <span className="instruction-icon">🖱️</span>
          <span className="instruction-text">Click & drag to pan</span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon">🔍</span>
          <span className="instruction-text">Scroll to zoom</span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon">🔗</span>
          <span className="instruction-text">Click connection points</span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon">📦</span>
          <span className="instruction-text">Drag items to place</span>
        </div>
      </div>
    </>
  );
} 