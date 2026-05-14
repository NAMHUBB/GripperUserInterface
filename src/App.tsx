import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import ControlTab from './components/ControlTab';
import DeviceInfoTab from './components/DeviceInfoTab';
import ModbusTab from './components/ModbusTab';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GripperState {
  connected:       boolean;
  port:            string;
  baudRate:        number;
  stopBit:         '1' | '2';
  parity:          'None' | 'Even' | 'Odd';
  slaveId:         number;
  termResistor:    boolean;
  activated:       boolean;
  goToPosition:    boolean;
  autoRelease:     boolean;
  autoReleaseDir:  'Open' | 'Close';
  positionRequest: number;   // 0 ~ 255
  speed:           number;   // 0 ~ 255
  force:           number;   // 0 ~ 255
  positionEcho:    number;
  positionActual:  number;
  currentActual:   number;
  objectDetected:  boolean;
  fault:           string | null;
  eStop:           boolean;
}

export interface DataPoint {
  time:    number;
  echo:    number;
  actual:  number;
  current: number;
}

interface PlotData {
  positionEcho:   number;
  positionActual: number;
  forceActual:    number;
}

const MAX_PTS = 255;

const INITIAL_STATE: GripperState = {
  connected:       false,
  port:            'COM8',
  baudRate:        115200,
  stopBit:         '1',
  parity:          'None',
  slaveId:         1,
  termResistor:    false,
  activated:       false,
  goToPosition:    false,
  autoRelease:     false,
  autoReleaseDir:  'Open',
  positionRequest: 0,     // 완전 열림
  speed:           128,   // 중간 속도 (255의 50%)
  force:           77,    // 적당한 힘  (255의 30%)
  positionEcho:    0,
  positionActual:  0,
  currentActual:   0,
  objectDetected:  false,
  fault:           null,
  eStop:           false,
};

// ── Action Request 비트 계산 (레지스터 1000) ──────────────────────────────────
// Bit 0 : rACT — Activate
// Bit 3 : rGTO — Go to Position
// Bit 4 : rATR — Auto-release
// Bit 5 : rARD — Auto-release direction (0=open, 1=close)
const buildActionBits = (s: GripperState): number => {
  let bits = 0;
  if (s.activated)              bits |= (1 << 0);
  if (s.goToPosition)           bits |= (1 << 3);
  if (s.autoRelease)            bits |= (1 << 4);
  if (s.autoReleaseDir === 'Close') bits |= (1 << 5);
  return bits;
};

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [tab, setTab]                   = useState(0);
  const [eStopAlert, setEStopAlert]     = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [state, setState]               = useState<GripperState>(INITIAL_STATE);
  const [isMoving, setIsMoving]         = useState(false);
  const [chartData, setChartData]       = useState<DataPoint[]>(() =>
    Array.from({ length: MAX_PTS }, (_, i) => ({ time: i * 0.15, echo: 0, actual: 0, current: 0 }))
  );

  const elapsedRef = useRef(0);

  // ── 1. 실시간 데이터 폴링 (150ms) ────────────────────────────────────────
  useEffect(() => {
    if (!state.connected) return;

    const iv = setInterval(async () => {
      try {
        const data = await invoke<PlotData>('modbus_read_plot_registers');

        elapsedRef.current += 0.15;
        const t = elapsedRef.current;

        setState(prev => {
          const moving = Math.abs(data.positionActual - prev.positionRequest) > 1;
          setIsMoving(moving);
          return {
            ...prev,
            positionEcho:   data.positionEcho,
            positionActual: data.positionActual,
            currentActual:  data.forceActual,
          };
        });

        setChartData(prev => [
          ...prev.slice(-(MAX_PTS - 1)),
          { time: t, echo: data.positionEcho, actual: data.positionActual, current: data.forceActual },
        ]);
      } catch (err) {
        console.error('Poll error:', err);
        setState(s => ({ ...s, connected: false, activated: false, goToPosition: false }));
        setIsMoving(false);
      }
    }, 150);

    return () => clearInterval(iv);
  }, [state.connected]);

  // ── 2. Action Request 전송 ────────────────────────────────────────────────
  useEffect(() => {
    if (!state.connected) return;
    const bits = buildActionBits(state);
    invoke('modbus_write_single_register', { address: 1000, value: bits })
      .catch(err => console.error('Action request write error:', err));
  }, [state.connected, state.activated, state.goToPosition, state.autoRelease, state.autoReleaseDir]);

  // ── 3. Position / Speed / Force 전송 ─────────────────────────────────────
  useEffect(() => {
    if (!state.connected || !state.goToPosition) return;
    const write = async () => {
      await invoke('modbus_write_single_register', { address: 1003, value: state.positionRequest });
      await invoke('modbus_write_single_register', { address: 1004, value: state.speed });
      await invoke('modbus_write_single_register', { address: 1005, value: state.force });
    };
    write().catch(err => console.error('Setpoint write error:', err));
  }, [state.connected, state.goToPosition, state.positionRequest, state.speed, state.force]);

  // ── 핸들러 ────────────────────────────────────────────────────────────────
  const updateState = useCallback((patch: Partial<GripperState>) =>
    setState(s => ({ ...s, ...patch })), []);

  const handleConnect = useCallback(async () => {
    if (state.connected) {
      try { await invoke('modbus_disconnect'); } catch (err) { console.error('Disconnect error:', err); }
      setState(s => ({ ...s, connected: false, activated: false, goToPosition: false, eStop: false }));
      setIsMoving(false);
    } else {
      try {
        await invoke('modbus_connect', {
          config: { comPort: state.port, baudRate: state.baudRate, slaveId: state.slaveId },
        });
        setState(s => ({ ...s, connected: true, eStop: false }));
        setConnectError(null);
      } catch (err) {
        setConnectError(typeof err === 'string' ? err : 'Connection failed');
        console.error('Connect error:', err);
      }
    }
  }, [state.connected, state.port, state.baudRate, state.slaveId]);

  const handleEStop = useCallback(async () => {
    try { await invoke('modbus_write_single_register', { address: 1000, value: 0 }); }
    catch (err) { console.error('E-Stop write error:', err); }
    setState(s => ({ ...s, eStop: true, goToPosition: false, currentActual: 0 }));
    setIsMoving(false);
    setEStopAlert(true);
  }, []);

  const handleResumeFromEStop = useCallback(() =>
    setState(s => ({ ...s, eStop: false })), []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F0F4F8', overflow: 'hidden' }}>
      <Header
        tab={tab} setTab={setTab} state={state}
        onConnect={handleConnect} onEStop={handleEStop} onResumeEStop={handleResumeFromEStop}
      />
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {tab === 0 && <ControlTab state={state} updateState={updateState} chartData={chartData} isMoving={isMoving} />}
        {tab === 1 && <ModbusTab state={state} updateState={updateState} />}
        {tab === 2 && <DeviceInfoTab />}
      </Box>
      <StatusBar state={state} isMoving={isMoving} />

      <Snackbar open={eStopAlert} autoHideDuration={3000} onClose={() => setEStopAlert(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setEStopAlert(false)} sx={{ fontWeight: 600 }}>
          Emergency Stop activated. All motion halted.
        </Alert>
      </Snackbar>
      <Snackbar open={!!connectError} autoHideDuration={4000} onClose={() => setConnectError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="warning" onClose={() => setConnectError(null)} sx={{ fontWeight: 600 }}>
          {connectError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;