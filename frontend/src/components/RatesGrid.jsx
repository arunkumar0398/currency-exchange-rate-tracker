import React from 'react';
import RateCard from './RateCard';
import './RatesGrid.css';

function RatesGrid({ base, rates }) {
  if (!rates || Object.keys(rates).length === 0) {
    return null;
  }

  return (
    <div className="rates-container">
      <h2 className="section-title">Currency Exchange Rates</h2>
      <div className="rates-grid">
        {Object.entries(rates).map(([currency, rate]) => (
          <RateCard
            key={currency}
            base={base}
            target={currency}
            rate={rate}
          />
        ))}
      </div>
    </div>
  );
}

export default RatesGrid;
