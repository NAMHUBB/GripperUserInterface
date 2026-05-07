import React, { useState, useEffect, useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import SimpleControlTab from './components/SimplecontrolTab';
import DeviceInfoTab from './components/DeviceInfoTab';
import ModbusTab from './components/ModbusTab';

export interface GripperState {
  connected: boolean;
  port: string;
  activated: boolean;
  goToPosition: boolean;
  autoRelease: boolean;
  autoReleaseDir: 'Open' | 'Close';
  positionRequest: number;   // 0=open, 100=close
  speed: number;             // 0~100
  force: number;             // 0~100
  positionEcho: number;
  positionActual: number;
  currentActual: number;     // mA (motor current)
  objectDetected: boolean;
  fault: string | null;
  eStop: boolean;
}

export interface DataPoint {
  time: number;
  echo: number;
  actual: number;
  current: number;
}

const MAX_PTS = 100;

// EYOU PH11 spec constants (PH11B-51-C / PH11B-101-C)
const RATED_TORQUE_NM  = 3.5;   // Nm — rated torque (PH11B-51-C)
const PEAK_TORQUE_NM   = 17.0;  // Nm — instantaneous max (PH11B-51-C)
// mA at full force setting (100/100), used for Nm conversion in chart
const FULL_FORCE_MA    = 2000;  // ~2 A = rated current (approximate)

export const mAtoNm = (mA: number): number =>
  parseFloat(((mA / FULL_FORCE_MA) * RATED_TORQUE_NM).toFixed(3));

export const PH11_SPEC = { rated: RATED_TORQUE_NM, peak: PEAK_TORQUE_NM };

const App: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [eStopAlert, setEStopAlert] = useState(false);

  const [state, setState] = useState<GripperState>({
    connected: false,
    port: 'COM8',
    activated: false,
    goToPosition: false,
    autoRelease: false,
    autoReleaseDir: 'Open',
    positionRequest: 0,   // open
    speed: 50,            // mid speed
    force: 30,            // moderate force
    positionEcho: 0,
    positionActual: 0,
    currentActual: 0,
    objectDetected: false,
    fault: null,
    eStop: false,
  });

  const [chartData, setChartData] = useState<DataPoint[]>(() =>
    Array.from({ length: MAX_PTS }, (_, i) => ({
      time: i * 0.15,
      echo: 0, actual: 0, current: 0,
    }))
  );

  const [isMoving, setIsMoving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Gripper motion simulation (max position = 100)
  useEffect(() => {
    if (!state.connected || !state.activated || !state.goToPosition || state.eStop) {
      setIsMoving(false);
      return;
    }
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      setState(prev => {
        const diff = prev.positionRequest - prev.positionActual;
        if (Math.abs(diff) < 1) {
          setIsMoving(false);
          return {
            ...prev,
            positionActual: prev.positionRequest,
            positionEcho: prev.positionRequest,
            currentActual: 0,
          };
        }
        setIsMoving(true);
        const step = (diff / Math.abs(diff)) * Math.min(Math.abs(diff), Math.max(1, (prev.speed / 100) * 5));
        const newActual = Math.round(prev.positionActual + step);
        const noise = (Math.random() - 0.5) * 2;
        // Current proportional to force setting; FULL_FORCE_MA at force=100
        const baseCurrent = (prev.force / 100) * FULL_FORCE_MA;
        return {
          ...prev,
          positionEcho: prev.positionRequest,
          positionActual: newActual,
          currentActual: Math.round(Math.max(0, baseCurrent + noise * 40)),
          objectDetected: newActual > 30 && newActual < 50 && Math.random() < 0.08,
        };
      });
    }, 60);
    return () => { cancelled = true; clearInterval(interval); };
  }, [state.positionRequest, state.activated, state.goToPosition, state.connected, state.eStop, state.speed]);

  // Chart updater
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => e + 0.15);
      setChartData(prev => [
        ...prev.slice(-(MAX_PTS - 1)),
        {
          time: elapsed,
          echo: state.positionEcho,
          actual: state.positionActual,
          current: state.currentActual,
        },
      ]);
    }, 150);
    return () => clearInterval(interval);
  }, [state.positionEcho, state.positionActual, state.currentActual, elapsed]);

  const updateState = useCallback((patch: Partial<GripperState>) => {
    setState(s => ({ ...s, ...patch }));
  }, []);

  const handleEStop = useCallback(() => {
    setState(s => ({ ...s, eStop: true, goToPosition: false, currentActual: 0 }));
    setIsMoving(false);
    setEStopAlert(true);
  }, []);

  const handleResumeFromEStop = useCallback(() => {
    setState(s => ({ ...s, eStop: false }));
  }, []);

  const handleConnect = useCallback(() => {
    setState(s => ({ ...s, connected: !s.connected, activated: false, goToPosition: false, eStop: false }));
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F0F4F8', overflow: 'hidden' }}>
      <Header
        tab={tab} setTab={setTab}
        state={state}
        onConnect={handleConnect}
        onEStop={handleEStop}
        onResumeEStop={handleResumeFromEStop}
      />

      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {tab === 0 && <SimpleControlTab state={state} updateState={updateState} chartData={chartData} isMoving={isMoving} />}
        {tab === 1 && <ModbusTab state={state} updateState={updateState} />}
        {tab === 2 && <DeviceInfoTab />}
      </Box>

      <StatusBar state={state} isMoving={isMoving} />

      <Snackbar open={eStopAlert} autoHideDuration={3000} onClose={() => setEStopAlert(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setEStopAlert(false)} sx={{ fontWeight: 600 }}>
          Emergency Stop activated. All motion halted.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;