import type { GameState } from '../types/game';

interface GameStatsProps {
  gameState: GameState;
  getWealthStatus: () => string;
}

export function GameStats({ gameState, getWealthStatus }: GameStatsProps) {
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

  return (
    <div className="game-stats">
      <div className="stat-item">
        <div className="stat-label">Cash</div>
        <div className="stat-value main-cash">{formatCash(gameState.totalCash)}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Per Minute</div>
        <div className="stat-value">{formatCash(gameState.cashPerMinute)}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Net Worth</div>
        <div className="stat-value wealth-status">{getWealthStatus()}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Discoveries</div>
        <div className="stat-value">{Object.keys(gameState.discoveredCombos).length}</div>
      </div>
    </div>
  );
} 