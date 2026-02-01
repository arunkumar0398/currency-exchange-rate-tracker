import { useState, useEffect } from 'react';
import { FluentProvider, webLightTheme, Spinner } from '@fluentui/react-components';
import Header from './components/Header';
import StatusBadge from './components/StatusBadge';
import WarningBanner from './components/WarningBanner';
import RatesGrid from './components/RatesGrid';
import ErrorState from './components/ErrorState';
import { fetchRates } from './services/api';
import './App.css';

function App() {
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rates on mount and set up auto-refresh
  useEffect(() => {
    const loadRates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRates();
        setRatesData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadRates();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRates, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="app">
        <Header baseCurrency={ratesData?.base || 'USD'} />

        {loading && (
          <div className="loading-state">
            <Spinner size="large" label="Loading exchange rates..." />
          </div>
        )}

        {!loading && error && !ratesData && (
          <ErrorState message={error} />
        )}

        {!loading && ratesData && (
          <>
            <div className="status-section">
              <StatusBadge
                status={ratesData.status}
                cacheAge={ratesData.cacheAge}
              />
            </div>

            {ratesData.status === 'stale' && ratesData.warning && (
              <WarningBanner message={ratesData.warning} />
            )}

            {ratesData.status === 'unavailable' ? (
              <ErrorState
                message={ratesData.error}
                retryAfter={ratesData.retryAfter}
              />
            ) : (
              <RatesGrid base={ratesData.base} rates={ratesData.rates} />
            )}

            {ratesData.sources && ratesData.sources.length > 0 && (
              <div className="footer-info">
                <div className="sources-info">
                  <strong>Data Sources:</strong> {ratesData.sources.join(', ')}
                </div>
                {ratesData.resolution && (
                  <div className="resolution-info">
                    <strong>Resolution:</strong> {ratesData.resolution}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </FluentProvider>
  );
}

export default App;
