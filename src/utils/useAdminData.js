import { useState, useEffect, useCallback } from 'react';
import * as ds from './adminDataStore';

export function useAdminData() {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(!ds.isLoaded());

  useEffect(() => {
    if (!ds.isLoaded()) {
      ds.loadAllData().then(() => setLoading(false)).catch(() => setLoading(false));
    }
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('trc-data-updated', handler);
    return () => window.removeEventListener('trc-data-updated', handler);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await ds.loadAllData();
    setLoading(false);
  }, []);

  return {
    loading,
    refresh,
    version,
    rates: ds.getRates(),
    payers: ds.getPayers(),
    contractPayers: ds.getContractPayers(),
    providers: ds.getProviders(),
    allProviders: ds.getAllProviders(),
    billingRules: ds.getBillingRules(),
    codeLabels: ds.getCodeLabels(),
    codeGroups: ds.getCodeGroups(),
    getSetting: ds.getSetting,
  };
}
