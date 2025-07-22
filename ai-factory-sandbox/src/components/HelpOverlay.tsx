interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <div className="help-overlay">
      <div className="help-content">
        <div className="help-header">
          <h2>🏭 AI Factory Sandbox - How to Play</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="help-body">
          <div className="help-section">
            <h3>🎯 Objective</h3>
            <p>Build automated factories to create and sell items for profit. Discover new combinations and become wealthy!</p>
          </div>

          <div className="help-section">
            <h3>🔧 Getting Started</h3>
            <ul>
              <li><strong>Drag Elements:</strong> Drag Water, Fire, Earth, or Air from the sidebar to the canvas</li>
              <li><strong>Add Modifiers:</strong> Drag Heat, Cool, Mix, Compress, or Purify to transform materials</li>
              <li><strong>Connect:</strong> Click and drag from connection points (circles) to create pipelines</li>
              <li><strong>Sell:</strong> Connect to the green "SELL" zone to earn money</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>💰 Economy</h3>
            <ul>
              <li><strong>Base Elements:</strong> Water ($0.01), Fire ($0.05), Earth ($0.02), Air ($0.01)</li>
              <li><strong>Combinations:</strong> More complex items are worth much more</li>
              <li><strong>Rarity:</strong> Items have different rarity levels affecting their value</li>
              <li><strong>Discovery:</strong> New combinations are discovered automatically</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>🎮 Controls</h3>
            <ul>
              <li><strong>Pan:</strong> Click and drag to move around the canvas</li>
              <li><strong>Zoom:</strong> Use mouse wheel or pinch gestures to zoom in/out</li>
              <li><strong>Connect:</strong> Click connection points and drag to create links</li>
              <li><strong>Delete:</strong> Right-click to remove connections (coming soon)</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>🚀 Tips</h3>
            <ul>
              <li>Start with simple combinations like Water + Heat = Steam</li>
              <li>Chain multiple modifiers for complex, valuable items</li>
              <li>Watch the discoveries panel to see what you've created</li>
              <li>Experiment with different combinations to find the most profitable chains</li>
            </ul>
          </div>
        </div>

        <div className="help-footer">
          <button className="start-btn" onClick={onClose}>
            Let's Build! 🏭
          </button>
        </div>
      </div>
    </div>
  );
} 