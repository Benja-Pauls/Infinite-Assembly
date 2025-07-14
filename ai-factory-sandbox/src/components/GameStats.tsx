import React from 'react';

interface GameStatsProps {
  totalCash: number;
  cashPerMinute: number;
  wealthStatus: string;
  discoveredCombos: Record<string, any>;
}

export function GameStats({ totalCash, cashPerMinute, wealthStatus, discoveredCombos }: GameStatsProps) {
  const formatCash = (amount: number) => {
    if (amount >= 1000000000000) {
      return `$${(amount / 1000000000000).toFixed(2)}T`;
    } else if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="game-stats">
      <div className="stats-main">
        <div className="stat-item">
          <div className="stat-label">Total Cash</div>
          <div className="stat-value main-cash">{formatCash(totalCash)}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Cash per Minute</div>
          <div className="stat-value">{formatCash(cashPerMinute)}/min</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Wealth Status</div>
          <div className="stat-value wealth-status">{wealthStatus}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Discovered Items</div>
          <div className="stat-value">{Object.keys(discoveredCombos).length}</div>
        </div>
      </div>
      
      <div className="discovered-items">
        <h4>Recent Discoveries</h4>
        <div className="discoveries-list">
          {Object.entries(discoveredCombos).slice(-5).reverse().map(([key, item]) => (
            <div key={key} className="discovery-item">
              <span className="discovery-emoji">{item.emoji}</span>
              <span className="discovery-name">{item.name}</span>
              <span className="discovery-value">{formatCash(item.cashPerItem)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 