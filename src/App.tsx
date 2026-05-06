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
  positionRequest: number;   // 0=open, 255=close
  speed: number;
  force: number;
  positionEcho: number;      // 명령값 echo
  positionActual: number;    // 실제 피드백값
  currentActual: number;
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
    positionRequest: 0,
    speed: 128,
    force: 128,
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

  // Gripper motion simulation
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
        if (Math.abs(diff) < 2) {
          setIsMoving(false);
          return { ...prev, positionActual: prev.positionRequest, positionEcho: prev.positionRequest, currentActual: 0 };
        }
        setIsMoving(true);
        const step = (diff / Math.abs(diff)) * Math.min(Math.abs(diff), Math.max(2, (prev.speed / 255) * 10));
        const newActual = Math.round(prev.positionActual + step);
        const noise = (Math.random() - 0.5) * 3;
        return {
          ...prev,
          positionEcho: prev.positionRequest,
          positionActual: newActual,
          currentActual: Math.round(100 + (prev.force / 255) * 300 + noise * 20),
          objectDetected: newActual > 60 && newActual < 80 && Math.random() < 0.08,
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
        { time: elapsed, echo: state.positionEcho, actual: state.positionActual, current: state.currentActual },
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
        {tab === 1 && <DeviceInfoTab />}
        {tab === 2 && <ModbusTab state={state} updateState={updateState} />}
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