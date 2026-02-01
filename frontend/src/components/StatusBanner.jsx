import React from 'react';
import './StatusBanner.css';
import { formatAge } from '../services/api';

function StatusBanner({ status, warning, cacheAge, timestamp }) {
  if (status !== 'stale' && !warning) {
    return null;
  }

  return (
    <div className="status-banner warning">
      <div className="banner-content">
        <svg className="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="banner-text">
          {warning || `Warning: All live sources are unavailable. Showing cached data from ${formatAge(cacheAge)}.`}
        </span>
      </div>
    </div>
  );
}

export default StatusBanner;
