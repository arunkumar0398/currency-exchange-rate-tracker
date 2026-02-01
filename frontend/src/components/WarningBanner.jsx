import React from 'react';
import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { Warning24Regular } from '@fluentui/react-icons';
import './WarningBanner.css';

function WarningBanner({ message }) {
  return (
    <MessageBar intent="warning" className="warning-banner">
      <MessageBarBody>
        <div className="warning-content">
          <Warning24Regular className="warning-icon" />
          <span>{message}</span>
        </div>
      </MessageBarBody>
    </MessageBar>
  );
}

export default WarningBanner;
