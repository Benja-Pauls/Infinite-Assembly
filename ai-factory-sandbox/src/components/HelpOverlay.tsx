import React from 'react';

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <div className="help-overlay">
      <button className="close-btn" onClick={onClose}>×</button>
      <h4>🎮 How to Play</h4>
      <ul>
        <li>🏭 Drag parts from sidebar to canvas</li>
        <li>🔗 Click connection points to connect</li>
        <li>📍 Drop on blue dots or sell zone</li>
        <li>💰 Items in sell zone = cash</li>
        <li>🖱️ Click & drag to pan</li>
        <li>🔍 Pinch/Ctrl+scroll to zoom</li>
        <li>📱 Two-finger scroll to pan</li>
      </ul>
    </div>
  );
} 