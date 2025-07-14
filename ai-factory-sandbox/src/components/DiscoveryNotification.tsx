import React, { useEffect } from 'react';

interface DiscoveryNotificationProps {
  discovery: {
    name: string;
    emoji: string;
    cashPerItem: number;
    type: string;
  };
  onClose: () => void;
}

export function DiscoveryNotification({ discovery, onClose }: DiscoveryNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

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
    <div className="discovery-notification">
      <h4>New Discovery! {discovery.emoji}</h4>
      <p>{discovery.name} - {formatCash(discovery.cashPerItem)} each</p>
    </div>
  );
} 