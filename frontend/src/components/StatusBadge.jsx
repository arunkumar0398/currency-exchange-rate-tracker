import React from 'react';
import './StatusBadge.css';
import { formatAge } from '../services/api';

function StatusBadge({ status, cacheAge }) {
  const isLive = status === 'live';
  const isStale = status === 'stale';

  return (
    <div className={`status-badge ${isLive ? 'live' : isStale ? 'stale' : 'unavailable'}`}>
      <span className="status-indicator"></span>
      <span className="status-text">
        {isLive ? 'LIVE' : isStale ? 'STALE' : 'UNAVAILABLE'}
        {cacheAge && ` • Updated ${formatAge(cacheAge)}`}
      </span>
    </div>
  );
}

export default StatusBadge;
