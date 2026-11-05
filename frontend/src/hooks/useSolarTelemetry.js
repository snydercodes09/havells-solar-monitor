import { useState, useEffect, useRef, useCallback } from 'react';

export function useSolarTelemetry() {
  const [liveData, setLiveData] = useState({
    active_power: 3120.0,
    pv1_voltage: 285.0,
    pv1_current: 5.68,
    pv1_power: 1618.0,
    pv2_voltage: 281.0,
    pv2_current: 5.34,
    pv2_power: 1502.0,
    grid_voltage: 231.2,
    grid_current: 13.5,
    grid_frequency: 50.02,
    today_energy: 14.85,
    total_energy: 4834.8,
    module_temp: 44.5,
    inner_temp: 36.2,
    bus_voltage: 382.0,
    status: 'Normal',
    source: 'Connecting...'
  });

  const [connStatus, setConnStatus] = useState('connecting'); // 'live_ws' | 'polling_fallback' | 'reconnecting'
  const [todayCurve, setTodayCurve] = useState([]);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [summary, setSummary] = useState({
    lifetime_kwh: 4834.8,
    lifetime_earnings: 36986.0,
    month_kwh: 445.0,
    month_earnings: 3404.0,
    lifetime_co2_kg: 3964.0,
    trees_equivalent: 182.0
  });
  const [config, setConfig] = useState({
    tariff_rate: 7.65,
    apdcl_circle: 'APDCL',
    apdcl_subdivision: 'APDCL Domestic',
    apdcl_tariff_category: 'LT-II Domestic (Net Metered)',
    inverter_model: 'Havells Enviro Pro GTi',
    inverter_sn: 'AFDOALB2PNAPJ78',
    simulation_mode: true,
    selected_com_port: ''
  });
  const [availablePorts, setAvailablePorts] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastMessageTimeRef = useRef(Date.now());

  // 1. Fetch REST Data
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
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

  // 2. Poll Status Fallback
  const pollStatusOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        lastMessageTimeRef.current = Date.now();
      }
    } catch (e) {
      // Network hiccup, will retry
    }
  }, []);

  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setConnStatus('polling_fallback');
    pollingIntervalRef.current = setInterval(pollStatusOnce, 1200);
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
        // Exponential backoff reconnect
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
    }, 45000);

    return () => {
      clearInterval(watchdog);
      clearInterval(bgSync);
      stopPollingFallback();
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [fetchConfig, fetchSummary, fetchHistory, fetchPorts, connectWebSocket, startPollingFallback, stopPollingFallback]);

  const updateConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        fetchSummary();
        fetchHistory();
      }
    } catch (e) {
      console.error('[Config Update Error]', e);
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
    refreshHistory: fetchHistory
  };
}
