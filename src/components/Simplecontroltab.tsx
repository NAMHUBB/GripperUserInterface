import React from 'react';
import { Box, Paper, Typography, Checkbox, FormControlLabel, Button, Slider, Chip } from '@mui/material';
import { GripperState, DataPoint } from '../App';
import GripperSVG from './GripperSVG';
import PositionChart from './PositionChart';
import CurrentChart from './CurrentChart';

interface Props {
  state: GripperState;
  updateState: (p: Partial<GripperState>) => void;
  chartData: DataPoint[];
  isMoving: boolean;
}

const InitPanel: React.FC<Props> = ({ state, updateState }) => {
  const disabled = !state.connected;
  const Row: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> =
    ({ label, checked, onChange, disabled: d }) => (
      <FormControlLabel
        control={<Checkbox checked={checked} disabled={d} size="small" onChange={e => onChange(e.target.checked)} sx={{ color: '#90A4AE', '&.Mui-checked': { color: '#1976D2' } }} />}
        label={<Typography sx={{ fontSize: '0.82rem', color: d ? '#B0BEC5' : '#1A2A3A' }}>{label}</Typography>}
        sx={{ mx: 0, mb: 0.3, display: 'flex', alignItems: 'center' }}
      />
    );
  return (
    <Paper sx={{ p: 2, bgcolor: '#fff', height: '100%' }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#1976D2', mb: 1.2, pb: 0.6, borderBottom: '1px solid #E0EAF4' }}>Initialization & Status</Typography>
      <Row label="Activate" checked={state.activated} disabled={disabled} onChange={v => updateState({ activated: v, goToPosition: v ? state.goToPosition : false })} />
      <Row label="Go to Position" checked={state.goToPosition} disabled={disabled || !state.activated} onChange={v => updateState({ goToPosition: v })} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
        <Row label="Auto-release" checked={state.autoRelease} disabled={disabled || !state.activated} onChange={v => updateState({ autoRelease: v })} />
        <Button size="small" variant="outlined" disabled={!state.autoRelease || disabled}
          onClick={() => updateState({ autoReleaseDir: state.autoReleaseDir === 'Open' ? 'Close' : 'Open' })}
          sx={{ fontSize: '0.7rem', py: 0.15, px: 1, minWidth: 0, borderColor: '#BBDEFB', color: '#1976D2', height: 24, '&:hover': { bgcolor: '#E3F2FD' } }}>
          {state.autoReleaseDir}
        </Button>
      </Box>
      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {state.eStop && <Chip label="⚠ E-STOP Active" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80', fontWeight: 600, fontSize: '0.72rem' }} />}
        {state.fault && <Chip label={`✕ Fault: ${state.fault}`} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', fontSize: '0.72rem' }} />}
        {state.objectDetected && <Chip label="● Object Detected" size="small" sx={{ bgcolor: '#FFF9C4', color: '#F57F17', border: '1px solid #FFF176', fontSize: '0.72rem' }} />}
      </Box>
    </Paper>
  );
};

const ControlPanel: React.FC<Props> = ({ state, updateState }) => {
  const disabled = !state.connected || !state.activated;
  const presets = [
    { label: 'OPEN', value: 0, color: '#1976D2' },
    // { label: 'HALF', value: 128, color: '#5E35B1' },
    { label: 'CLOSE', value: 255, color: '#455A64' },
  ];
  const ParamRow: React.FC<{ label: string; value: number; color?: string; onChange: (v: number) => void }> =
    ({ label, value, color = '#1976D2', onChange }) => (
      <Box sx={{ mb: 1.4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#5A7A9A' }}>{label}</Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1A2A3A' }}>{value}<span style={{ color: '#90A4AE', fontSize: '0.68rem' }}> /255</span></Typography>
        </Box>
        <Slider value={value} min={0} max={255} step={1} disabled={disabled} onChange={(_, v) => onChange(v as number)}
          sx={{ color, py: 0.6, '& .MuiSlider-thumb': { width: 14, height: 14 }, '& .MuiSlider-rail': { bgcolor: '#CBD8E8' } }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE' }}>← MIN</Typography>
          <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE' }}>MAX →</Typography>
        </Box>
      </Box>
    );
  return (
    <Paper sx={{ p: 2, bgcolor: '#fff', height: '100%' }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#1976D2', mb: 1.2, pb: 0.6, borderBottom: '1px solid #E0EAF4' }}>Control Parameters</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.8 }}>
        {presets.map(p => (
          <Button key={p.label} variant={state.positionRequest === p.value ? 'contained' : 'outlined'} size="small" disabled={disabled}
            onClick={() => updateState({ positionRequest: p.value })}
            sx={{ flex: 1, fontSize: '0.72rem', fontWeight: 600, py: 0.6, ...(state.positionRequest === p.value ? { bgcolor: p.color, '&:hover': { bgcolor: p.color } } : { borderColor: '#CBD8E8', color: '#5A7A9A', '&:hover': { borderColor: p.color, color: p.color, bgcolor: `${p.color}10` } }) }}>
            {p.label}
          </Button>
        ))}
      </Box>
      <Box sx={{ mb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#5A7A9A' }}>Position</Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgb(26, 42, 58)' }}>{state.positionRequest}<span style={{ color: '#90A4AE', fontSize: '0.68rem' }}> /255</span></Typography>
        </Box>
        <Slider value={state.positionRequest} min={0} max={255} step={1} disabled={disabled} onChange={(_, v) => updateState({ positionRequest: v as number })}
          sx={{ color: '#1976D2', py: 0.6, '& .MuiSlider-thumb': { width: 14, height: 14 }, '& .MuiSlider-rail': { bgcolor: '#CBD8E8' } }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE' }}>← OPEN</Typography>
          <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE' }}>CLOSE →</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 1.2 }}>
        <ParamRow label="Speed" value={state.speed} color="#388E3C" onChange={v => updateState({ speed: v })} />
        <ParamRow label="Force" value={state.force} color="#E64A19" onChange={v => updateState({ force: v })} />
      </Box>
    </Paper>
  );
};

const FeedbackPanel: React.FC<Props> = ({ state, isMoving }) => {
  const openRatio = state.positionActual / 255;
  const spread = 12 + openRatio * 40;
  const tilt = openRatio * 20;
  const statusColor = !state.connected ? '#9E9E9E' : state.eStop ? '#FF8F00' : state.objectDetected ? '#F9A825' : isMoving ? '#1976D2' : '#4CAF50';
  const statusLabel = !state.connected ? 'Offline' : state.eStop ? 'E-STOP' : state.objectDetected ? 'Object' : isMoving ? 'Moving' : 'Ready';
  return (
    <Paper sx={{ p: 1.5, bgcolor: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 0.6, borderBottom: '1px solid #E0EAF4' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#1976D2' }}>Gripper</Typography>
        <Chip label={statusLabel} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}50` }} />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GripperSVG openRatio={openRatio} tilt={tilt} spread={spread} isMoving={isMoving} statusColor={statusColor} objectDetected={state.objectDetected} />
      </Box>
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        {[
          { label: 'Echo', value: state.positionEcho, color: '#1976D2' },
          { label: 'Actual', value: state.positionActual, color: '#388E3C' },
          { label: 'Current', value: `${state.currentActual}mA`, color: '#E64A19' },
        ].map(item => (
          <Box key={item.label} sx={{ flex: 1, p: 0.8, bgcolor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E0EAF4', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.62rem', color: '#90A4AE' }}>{item.label}</Typography>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: item.color }}>{item.value}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

const SimpleControlTab: React.FC<Props> = ({ state, updateState, chartData, isMoving }) => {
  const props = { state, updateState, chartData, isMoving };
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 200px', gap: 1.5 }}>
        <InitPanel {...props} />
        <ControlPanel {...props} />
        <FeedbackPanel {...props} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, flex: 1, minHeight: 0 }}>
        <PositionChart chartData={chartData} />
        <CurrentChart chartData={chartData} />
      </Box>
    </Box>
  );
};

export default SimpleControlTab;