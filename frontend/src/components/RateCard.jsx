import React from 'react';
import { Card } from '@fluentui/react-components';
import './RateCard.css';

function RateCard({ base, target, rate }) {
  // Format rate with appropriate decimal places
  const formatRate = (value) => {
    if (value >= 100) {
      return value.toFixed(2);
    } else if (value >= 1) {
      return value.toFixed(4);
    } else {
      return value.toFixed(6);
    }
  };

  return (
    <Card className="rate-card">
      <div className="currency-pair">
        {base}/{target}
      </div>
      <div className="rate-value">
        {formatRate(rate)}
      </div>
    </Card>
  );
}

export default RateCard;
