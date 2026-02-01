import React from 'react';
import { PlugDisconnected48Regular } from '@fluentui/react-icons';
import './ErrorState.css';

function ErrorState({ message, retryAfter }) {
  return (
    <div className="error-state">
      <div className="error-card">
        <PlugDisconnected48Regular className="error-icon" />
        <h2 className="error-title">Rates temporarily unavailable</h2>
        <p className="error-message">
          {message || "We're unable to reach any data sources right now. Please check back shortly."}
        </p>
        {retryAfter && (
          <p className="retry-info">Retry in {retryAfter} seconds</p>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
