import React, { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { GameCanvas } from './components/GameCanvas';
import { DiscoveryNotification } from './components/DiscoveryNotification';
import { HelpOverlay } from './components/HelpOverlay';
import { ELEMENTAL_INGREDIENTS, SIMPLE_MODIFIERS } from './types/game';
import './App.css';

interface TooltipState {
  show: boolean;
  text: string;
  x: number;
  y: number;
}

function App() {
  const {
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
  } = useGameEngine();

  const [showHelp, setShowHelp] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [lastDiscovery, setLastDiscovery] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, text: '', x: 0, y: 0 });

  const formatCash = (amount: number) => {
    if (amount >= 1000000000000) {
      return `$${(amount / 1000000000000).toFixed(1)}T`;
    } else if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDragStart = (e: React.DragEvent, type: 'spawner' | 'modifier', data: any) => {
    setDraggedItem({ type, data });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const hideTooltip = () => {
    setTooltip({ show: false, text: '', x: 0, y: 0 });
  };

  return (
    <div className="app">
      <div className="game-header">
        <h1>🏭 AI Factory Sandbox</h1>
        <p>Drag from connection points to connect blocks • Items that reach the green zone make money</p>
      </div>
      
      <div className="game-container">
        <div className="sidebar">
          <h3>Parts</h3>
          
          <div className="part-category">
            <h4>Elements</h4>
            {ELEMENTAL_INGREDIENTS.map(ingredient => (
              <div
                key={ingredient.name}
                className="draggable-item"
                draggable
                onDragStart={(e) => handleDragStart(e, 'spawner', ingredient)}
                onDragEnd={handleDragEnd}
              >
                {ingredient.emoji} {ingredient.name}
              </div>
            ))}
          </div>

          <div className="part-category">
            <h4>Modifiers</h4>
            {SIMPLE_MODIFIERS.map(modifier => (
              <div
                key={modifier.name}
                className="draggable-item"
                draggable
                onDragStart={(e) => handleDragStart(e, 'modifier', modifier)}
                onDragEnd={handleDragEnd}
              >
                {modifier.emoji} {modifier.name}
              </div>
            ))}
          </div>
        </div>

        <div className="game-canvas-container">
          <div className="canvas-controls">
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomOut}>−</button>
              <div className="zoom-level">{Math.round(zoom * 100)}%</div>
              <button className="zoom-btn" onClick={handleZoomIn}>+</button>
              <button className="zoom-btn" onClick={handleResetZoom}>Reset</button>
            </div>
            
            <div className="game-stats">
              <div 
                className="stat-item"
                onMouseEnter={(e) => showTooltip(e, 'Total money earned from all items sold')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-label">Cash</div>
                <div className="stat-value main-cash">{formatCash(gameState.totalCash)}</div>
              </div>
              <div 
                className="stat-item"
                onMouseEnter={(e) => showTooltip(e, 'Average money earned per minute over the last 60 seconds')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-label">Per Minute</div>
                <div className="stat-value">{formatCash(gameState.cashPerMinute)}</div>
              </div>
              <div 
                className="stat-item"
                onMouseEnter={(e) => showTooltip(e, 'Your wealth level compared to real-world milestones')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-label">Net Worth</div>
                <div className="stat-value wealth-status">{getWealthStatus()}</div>
              </div>
              <div 
                className="stat-item"
                onMouseEnter={(e) => showTooltip(e, 'Number of unique item combinations you have discovered')}
                onMouseLeave={hideTooltip}
              >
                <div className="stat-label">Discoveries</div>
                <div className="stat-value">{Object.keys(gameState.discoveredCombos).length}</div>
              </div>
            </div>
          </div>

          <div className="canvas-wrapper">
            <GameCanvas
              gameState={gameState}
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
              itemSize={ITEM_SIZE}
              zoom={zoom}
              onZoomChange={setZoom}
              draggedItem={draggedItem}
              sellZone={SELL_ZONE}
              onAddSpawner={addSpawner}
              onAddModifier={addModifier}
              onStartConnection={startConnection}
              onUpdateDraggedConnection={updateDraggedConnection}
              onCompleteConnection={completeConnection}
              onCancelConnection={cancelConnection}
            />
            
            {showHelp && (
              <HelpOverlay onClose={() => setShowHelp(false)} />
            )}
          </div>
        </div>
      </div>

      {lastDiscovery && (
        <DiscoveryNotification
          discovery={lastDiscovery}
          onClose={() => setLastDiscovery(null)}
        />
      )}

      {tooltip.show && (
        <div 
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default App;
