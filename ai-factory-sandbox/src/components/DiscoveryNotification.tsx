import { useEffect } from 'react';
import type { GPTResponse } from '../types/game';

interface DiscoveryNotificationProps {
  discovery: GPTResponse;
  onClose: () => void;
}

export function DiscoveryNotification({ discovery, onClose }: DiscoveryNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'uncommon': return '#27ae60';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      case 'mythic': return '#e74c3c';
      case 'transcendent': return '#e67e22';
      case 'cosmic': return '#8e44ad';
      case 'divine': return '#f1c40f';
      default: return '#95a5a6';
    }
  };

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
      return `$${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="discovery-notification">
      <div className="discovery-content">
        <div className="discovery-header">
          <span className="discovery-icon">🔬</span>
          <span className="discovery-title">New Discovery!</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="discovery-body">
          <div className="discovery-item">
            <div className="item-emoji">{discovery.emoji}</div>
            <div className="item-info">
              <div className="item-name">{discovery.name}</div>
              <div className="item-price">{formatCash(discovery.cashPerItem)}</div>
              {discovery.description && (
                <div className="item-description">{discovery.description}</div>
              )}
              {discovery.rarity && (
                <div 
                  className="item-rarity"
                  style={{ color: getRarityColor(discovery.rarity) }}
                >
                  {discovery.rarity.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 