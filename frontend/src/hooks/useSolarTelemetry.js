import { useState, useEffect, useRef, useCallback } from 'react';

export function useSolarTelemetry() {
  const [liveData, setLiveData] = useState({
    active_power: null,
    pv1_voltage: null,
    pv1_current: null,
    pv1_power: null,
    pv2_voltage: null,
    pv2_current: null,
    pv2_power: null,
    grid_voltage: null,
    grid_current: null,
    grid_frequency: null,
    today_energy: null,
    total_energy: null,
    module_temp: null,
    inner_temp: null,
    bus_voltage: null,
    home_load: null,
    grid_import: null,
    grid_export: null,
    status: 'Connecting...',
    source: 'Connecting...',
    is_hardware_online: false,
    has_ct_meter: false,
    is_simulation: false,
    is_load_estimated: false
  });

  const [connStatus, setConnStatus] = useState('connecting'); // 'live_ws' | 'polling_fallback' | 'reconnecting'
  const [todayCurve, setTodayCurve] = useState([]);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [summary, setSummary] = useState({
    lifetime_kwh: null,
    lifetime_earnings: null,
    month_kwh: null,
    month_earnings: null,
    today_kwh: null,
    lifetime_co2_kg: null,
    trees_equivalent: null,
    has_ct_meter: false
  });
  const [config, setConfig] = useState({
    tariff_rate: 7.65,
    apdcl_circle: 'APDCL',
    apdcl_subdivision: 'APDCL Domestic',
    apdcl_tariff_category: 'LT-II Domestic (Net Metered)',
    inverter_model: 'Havells Enviro Pro GTi',
    inverter_sn: 'AFDOALB2PNAPJ78',
    rated_capacity_w: 3300,
    simulation_mode: false,
    selected_com_port: '',
    modbus_port: '',
    baud_rate: 9600,
    slave_id: 1,
    has_ct_meter: false,
    meter_model: 'None',
    meter_slave_id: 2
  });
  const [availablePorts, setAvailablePorts] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [meterSyncSummary, setMeterSyncSummary] = useState(null);
  const [tariffConfig, setTariffConfig] = useState(null);
  const [billingReconciliation, setBillingReconciliation] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastMessageTimeRef = useRef(Date.now());

  const normalizeConfig = (raw) => {
    if (!raw) return {};
    return {
      ...raw,
      has_ct_meter: raw.has_ct_meter === true || raw.has_ct_meter === 'true',
      simulation_mode: raw.simulation_mode === true || raw.simulation_mode === 'true'
    };
  };

  // 1. Fetch REST Data
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(normalizeConfig(data));
      }
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchMeterReadings = useCallback(async () => {
    try {
      const [readingsRes, syncRes, billingRes] = await Promise.all([
        fetch('/api/meter/readings'),
        fetch('/api/meter/sync-summary'),
        fetch('/api/billing/reconciliation')
      ]);
      if (readingsRes.ok) setMeterReadings(await readingsRes.json());
      if (syncRes.ok) setMeterSyncSummary(await syncRes.json());
      if (billingRes.ok) setBillingReconciliation(await billingRes.json());
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        fetch('/api/billing/tariff-config'),
        fetch('/api/billing/reconciliation')
      ]);
      if (tRes.ok) setTariffConfig(await tRes.json());
      if (bRes.ok) setBillingReconciliation(await bRes.json());
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const [todayRes, dailyRes, monthRes] = await Promise.all([
        fetch('/api/history/today'),
        fetch('/api/history/daily?days=30'),
        fetch('/api/history/monthly')
      ]);
      if (todayRes.ok) setTodayCurve(await todayRes.json());
      if (dailyRes.ok) setDailyHistory(await dailyRes.json());
      if (monthRes.ok) setMonthlyHistory(await monthRes.json());
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch('/api/ports');
      if (res.ok) {
        const data = await res.json();
        setAvailablePorts(data);
      }
    } catch (e) {
      // Silently retry later
    }
  }, []);

  const fetchHistoryLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (e) {
      // Silently retry later
    }
  }, []);

  // 2. Poll Status Fallback
  const pollStatusOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        setConnStatus('polling_fallback');
        lastMessageTimeRef.current = Date.now();
      } else {
        setConnStatus('reconnecting');
      }
    } catch (e) {
      setConnStatus('reconnecting');
    }
  }, []);

  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setConnStatus('polling_fallback');
    pollingIntervalRef.current = setInterval(pollStatusOnce, 1500);
  }, [pollStatusOnce]);

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // 3. WebSocket Auto-Reconnecting Manager
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnStatus('live_ws');
        stopPollingFallback();
        lastMessageTimeRef.current = Date.now();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLiveData(data);
          lastMessageTimeRef.current = Date.now();
        } catch (e) {
          console.error('[WS Parse]', e);
        }
      };

      ws.onerror = () => {
        startPollingFallback();
      };

      ws.onclose = () => {
        startPollingFallback();
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };
    } catch (e) {
      startPollingFallback();
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2500);
    }
  }, [startPollingFallback, stopPollingFallback]);

  // Initial Boot & Background Sync
  useEffect(() => {
    fetchConfig();
    fetchSummary();
    fetchHistory();
    fetchPorts();
    fetchHistoryLogs();
    fetchMeterReadings();
    fetchBillingData();
    connectWebSocket();

    // Health-check: If no WS message received for > 3.5s, trigger polling fallback automatically
    const watchdog = setInterval(() => {
      const now = Date.now();
      if (now - lastMessageTimeRef.current > 3500) {
        startPollingFallback();
      }
    }, 2000);

    // Background sync: update history & summary every 45 seconds without needing user refresh
    const bgSync = setInterval(() => {
      fetchSummary();
      fetchHistory();
      fetchPorts();
      fetchHistoryLogs();
      fetchMeterReadings();
      fetchBillingData();
    }, 45000);

    return () => {
      clearInterval(watchdog);
      clearInterval(bgSync);
      stopPollingFallback();
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [fetchConfig, fetchSummary, fetchHistory, fetchPorts, fetchHistoryLogs, fetchMeterReadings, fetchBillingData, connectWebSocket, startPollingFallback, stopPollingFallback]);

  const updateConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(normalizeConfig(data.config));
        fetchSummary();
        fetchHistory();
        return { success: true };
      }
      return { success: false, error: 'Server returned error status' };
    } catch (e) {
      console.error('[Config Update Error]', e);
      return { success: false, error: e.message };
    }
  };

  const updateTariffConfig = async (newCfg) => {
    try {
      const res = await fetch('/api/billing/tariff-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchBillingData();
        return { success: true, tariff_config: data.tariff_config };
      }
      return { success: false, error: data.detail || 'Failed to update tariff config' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const calculateCustomBill = async (params) => {
    try {
      const res = await fetch('/api/billing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const addMeterReading = async (readingData) => {
    try {
      const res = await fetch('/api/meter/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readingData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMeterReadings();
        await fetchBillingData();
        return { success: true, reading: data.reading };
      }
      return { success: false, error: data.detail || data.message || 'Failed to save meter reading' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteMeterReading = async (id) => {
    try {
      const res = await fetch(`/api/meter/readings/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchMeterReadings();
        await fetchBillingData();
        return { success: true };
      }
      return { success: false, error: 'Failed to delete reading' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return {
    liveData,
    connStatus,
    todayCurve,
    dailyHistory,
    monthlyHistory,
    summary,
    config,
    availablePorts,
    updateConfig,
    saveConfig: updateConfig,
    historyLogs,
    isDbConnected: connStatus !== 'reconnecting',
    refreshHistory: fetchHistory,
    meterReadings,
    meterSyncSummary,
    fetchMeterReadings,
    addMeterReading,
    deleteMeterReading,
    tariffConfig,
    billingReconciliation,
    fetchBillingData,
    updateTariffConfig,
    calculateCustomBill
  };
}
