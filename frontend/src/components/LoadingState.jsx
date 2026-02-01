import React from 'react';
import './LoadingState.css';

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p className="loading-text">Loading exchange rates...</p>
    </div>
  );
}

export default LoadingState;
