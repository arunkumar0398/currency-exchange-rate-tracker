import React from 'react';
import { Dropdown, Option } from '@fluentui/react-components';
import { MoneyRegular } from '@fluentui/react-icons';
import './Header.css';

function Header({ baseCurrency = 'USD' }) {
  return (
    <header className="app-header">
      <div className="logo">
        <MoneyRegular className="logo-icon" />
        <span className="logo-text">AnchorFX</span>
      </div>
      <div className="base-currency">
        <span className="label">Base Currency:</span>
        <Dropdown
          value={baseCurrency}
          selectedOptions={[baseCurrency]}
          disabled
          className="currency-dropdown"
        >
          <Option value="USD">USD</Option>
        </Dropdown>
      </div>
    </header>
  );
}

export default Header;
