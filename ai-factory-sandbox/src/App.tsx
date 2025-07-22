import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { useGameEngine } from './hooks/useGameEngine';
import { ELEMENTAL_INGREDIENTS, SIMPLE_MODIFIERS } from './types/game';
import './App.css';

function App() {
  const {
    gameState,
    lastDiscovery,
    clearLastDiscovery,
    addSpawner,
    addModifier,
    startConnection,
    completeConnection,
    cancelConnection,
    updateDraggedConnection,
    canvasDimensions,
    ITEM_SIZE,
    SELL_ZONE
  } = useGameEngine();

  const [zoom, setZoom] = useState(1);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number; type: string } | null>(null);

  // Handle drag start for parts
  const handleDragStart = useCallback((e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Handle tooltip
  const handleMouseEnter = useCallback((e: React.MouseEvent, content: string, type: string = 'help') => {
    setTooltip({
      content,
      x: e.clientX + 10,
      y: e.clientY - 10,
      type
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Calculate stats
  const productionCount = gameState.spawners.length;
  const processingCount = gameState.modifiers.filter(m => m.processingQueue.length > 0).length;
  const discoveriesCount = Object.keys(gameState.discoveredCombos).length;

  // Format cash
  const formatCash = (cash: number) => {
    if (cash >= 1000000) return `$${(cash / 1000000).toFixed(1)}M`;
    if (cash >= 1000) return `$${(cash / 1000).toFixed(1)}K`;
    return `$${cash.toFixed(2)}`;
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="game-header">
        <div className="header-left">
          <h1>🏭 AI Factory Sandbox</h1>
          <p>Build your production lines and discover new combinations</p>
        </div>
        
        <div className="header-right">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <span className="stat-value">{formatCash(gameState.totalCash)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📈</span>
              <span className="stat-value">{formatCash(gameState.cashPerMinute)}/min</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔬</span>
              <span className="stat-value">{discoveriesCount}</span>
            </div>
          </div>
          
          <div className="canvas-controls">
            <button 
              className="control-btn" 
              onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
              onMouseEnter={(e) => handleMouseEnter(e, 'Zoom out (Q-)', 'help')}
              onMouseLeave={handleMouseLeave}
            >
              Q-
            </button>
            <button 
              className="control-btn"
              onClick={() => setZoom(1)}
              onMouseEnter={(e) => handleMouseEnter(e, 'Reset zoom', 'help')}
              onMouseLeave={handleMouseLeave}
            >
              🎯
            </button>
            <button 
              className="control-btn" 
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              onMouseEnter={(e) => handleMouseEnter(e, 'Zoom in (Q+)', 'help')}
              onMouseLeave={handleMouseLeave}
            >
              Q+
            </button>
          </div>
          
          <button 
            className="help-btn"
            onClick={() => setShowHelp(!showHelp)}
            onMouseEnter={(e) => handleMouseEnter(e, 'Show/hide help overlay', 'help')}
            onMouseLeave={handleMouseLeave}
          >
            Help
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="game-container">
        {/* Parts Panel */}
        <div className="parts-panel">
          {/* Production Units */}
          <div className="parts-section">
            <h3>🏭 Production Units</h3>
            <div className="parts-grid">
              {ELEMENTAL_INGREDIENTS.map((element) => (
                <div
                  key={element.name}
                  className="part-item spawner-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, { type: 'spawner', data: element })}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={(e) => handleMouseEnter(e, `${element.name} Spawner\nGenerates ${element.name} elements\nDrag to place on grid`, 'item')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="part-emoji">{element.emoji}</div>
                  <div className="part-name">{element.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Processors */}
          <div className="parts-section">
            <h3>⚙️ Processors</h3>
            <div className="parts-grid">
              {SIMPLE_MODIFIERS.map((modifier) => (
                <div
                  key={modifier.name}
                  className="part-item modifier-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, { type: 'modifier', data: modifier })}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={(e) => handleMouseEnter(e, `${modifier.name} Processor\nProcesses input materials\nDrag to place on grid`, 'item')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="part-emoji">{modifier.emoji}</div>
                  <div className="part-name">{modifier.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Discoveries */}
          <div className="parts-section">
            <h3>⭐ Discoveries</h3>
            <div className="discoveries-list">
              {Object.keys(gameState.discoveredCombos).length > 0 ? (
                Object.entries(gameState.discoveredCombos).map(([name, combo]) => (
                  <div
                    key={name}
                    className="discovery-item"
                    onMouseEnter={(e) => handleMouseEnter(e, `${combo.name}\nValue: $${combo.cashPerItem}\nRarity: ${combo.rarity}`, 'discovery')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="discovery-emoji">{combo.emoji}</div>
                    <div className="discovery-info">
                      <div className="discovery-name">{combo.name}</div>
                      <div className="discovery-price">${combo.cashPerItem}</div>
                      <div className="discovery-rarity">{combo.rarity}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-discoveries">
                  No discoveries yet. Connect components and start processing!
                </div>
              )}
            </div>
          </div>

          {/* Controls Info */}
          <div className="parts-section">
            <h3>🎮 Controls</h3>
            <div className="controls-info">
              <div className="control-item">
                <span className="control-icon">🖱️</span>
                <span className="control-text">Click & drag to pan</span>
              </div>
              <div className="control-item">
                <span className="control-icon">🔍</span>
                <span className="control-text">Scroll to zoom</span>
              </div>
              <div className="control-item">
                <span className="control-icon">🔗</span>
                <span className="control-text">Click connection points</span>
              </div>
              <div className="control-item">
                <span className="control-icon">📦</span>
                <span className="control-text">Drag items to place</span>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="canvas-area">
          <div className="canvas-header">
            <h2>🏭 Factory Floor</h2>
            <div className="canvas-stats">
              <span>Production: {productionCount} units</span>
              <span>Processing: {processingCount} machines</span>
              <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
          </div>
          
          <div className="canvas-container">
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
              onCompleteConnection={completeConnection}
              onCancelConnection={cancelConnection}
              onUpdateDraggedConnection={updateDraggedConnection}
            />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={`tooltip tooltip-${tooltip.type}`}
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          {tooltip.content.split('\n').map((line, index) => (
            <div key={index} className="tooltip-line">
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Discovery Popup */}
      {lastDiscovery && (
        <div className="discovery-popup">
          <div className="discovery-popup-content">
            <h3>🎉 New Discovery!</h3>
            <div className="discovery-emoji-large">{lastDiscovery.emoji}</div>
            <div className="discovery-name-large">{lastDiscovery.name}</div>
            <div className="discovery-description">{lastDiscovery.description}</div>
            <div className="discovery-value">Value: ${lastDiscovery.cashPerItem}</div>
            <button onClick={clearLastDiscovery}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
