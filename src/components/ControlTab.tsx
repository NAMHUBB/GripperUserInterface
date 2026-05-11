import React from 'react';
import { Box, Paper, Typography, Switch, Slider, Button } from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

import { GripperState, DataPoint } from '../App';
import { PH11_SPEC, mAtoNm } from '../constants';
import GripperViewer from './GripperViewer';

const POS_MAX = 255;
const POS_MIN = -255;
const Y_MAX = 20;
const Y_MIN = -20;
const Y_RATED = PH11_SPEC.rated;
const Y_PEAK = PH11_SPEC.peak;

const PosTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #E0EAF4', borderRadius: 1, p: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE', mb: 0.3 }}>t = {Number(label).toFixed(1)} s</Typography>
      {payload.map((p: any) => (
        <Typography key={p.name} sx={{ fontSize: '0.7rem', color: p.color, fontWeight: 500 }}>
          {p.name}: {Math.round(p.value ?? 0)}
        </Typography>
      ))}
    </Box>
  );
};

const ForceTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val: number = payload[0]?.value ?? 0;
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #E0EAF4', borderRadius: 1, p: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE', mb: 0.3 }}>t = {Number(label).toFixed(1)} s</Typography>
      <Typography sx={{ fontSize: '0.7rem', color: '#E64A19', fontWeight: 500 }}>{val.toFixed(2)} Nm</Typography>
      <Typography sx={{ fontSize: '0.62rem', color: '#B0BEC5' }}>
        {Math.abs(val) <= Y_RATED ? '● Rated range' : Math.abs(val) <= Y_PEAK ? '▲ Over rated' : '⚠ Exceeded peak'}
      </Typography>
    </Box>
  );
};

const LabelSwitch: React.FC<{ label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({ label, checked, disabled, onChange }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <Typography sx={{ fontSize: '0.72rem', color: disabled ? '#C5D0D8' : '#546E7A', fontWeight: 500 }}>{label}</Typography>
    <Switch size="small" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1976D2' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#90CAF9' } }} />
  </Box>
);

const ParamSlider: React.FC<{ label: string; value: number; disabled?: boolean; onChange: (v: number) => void }> = ({ label, value, disabled, onChange }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: '0.67rem', color: '#90A4AE' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: disabled ? '#C5D0D8' : '#37474F' }}>
        {value}<span style={{ fontSize: '0.58rem', color: '#B0BEC5', marginLeft: 2 }}>/255</span>
      </Typography>
    </Box>
    <Slider size="small" min={0} max={255} value={value} disabled={disabled} onChange={(_, v) => onChange(v as number)}
      sx={{ py: 0.5, color: disabled ? '#E0EAF4' : '#1976D2', '& .MuiSlider-thumb': { width: 11, height: 11, boxShadow: 'none' }, '& .MuiSlider-rail': { bgcolor: '#E8EDF2' }, '& .MuiSlider-track': { border: 'none' } }} />
  </Box>
);

interface Props {
  state: GripperState;
  updateState: (patch: Partial<GripperState>) => void;
  chartData: DataPoint[];
  isMoving: boolean;
}

const paperSx = {
  sx: { display: 'flex', flexDirection: 'column' as const, border: '1px solid #EEF2F7', borderRadius: 2, bgcolor: '#fff' },
};

const axisStyle = {
  tick: { fontSize: 9, fill: '#C5D0D8' },
  axisLine: false as const,
  tickLine: false as const,
};

const ControlTab: React.FC<Props> = ({ state, updateState, chartData, isMoving }) => {
  const forceData = chartData.map(d => ({ ...d, forceNm: mAtoNm(d.current) }));

  const statusColor = state.eStop ? '#C62828'
    : state.activated ? '#43A047'
    : state.connected ? '#1976D2'
    : '#90A4AE';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.2, p: 1.5, overflow: 'hidden' }}>

      {/* 차트 영역 */}
      <Box sx={{ display: 'flex', gap: 1.2, flex: 1, minHeight: 0 }}>
        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#1976D2' }}>Position Echo / Actual</Typography>
            <Box sx={{ display: 'flex', gap: 1.2 }}>
              {[{ c: '#1976D2', l: 'Echo' }, { c: '#43A047', l: 'Actual' }].map(({ c, l }) => (
                <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 2, bgcolor: c, borderRadius: 1 }} />
                  <Typography sx={{ fontSize: '0.6rem', color: '#B0BEC5' }}>{l}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 6, left: -14, bottom: 14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FA" vertical={false} />
                <XAxis dataKey="time" tickFormatter={v => `${Number(v).toFixed(0)}s`} {...axisStyle}
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, style: { fontSize: 9, fill: '#C5D0D8' } }} />
                <YAxis domain={[POS_MIN, POS_MAX]} tickCount={9} {...axisStyle} tickFormatter={v => `${v}`} />
                <Tooltip content={<PosTooltip />} />
                <ReferenceLine y={0} stroke="#E0EAF4" strokeWidth={1.5} />
                <Line type="monotoneX" dataKey="echo" stroke="#1976D2" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Echo" />
                <Line type="monotoneX" dataKey="actual" stroke="#43A047" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#1976D2' }}>Force (Nm)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 2, bgcolor: '#E64A19', borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.6rem', color: '#B0BEC5' }}>Force</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forceData} margin={{ top: 2, right: 36, left: 2, bottom: 14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FA" vertical={false} />
                <XAxis dataKey="time" tickFormatter={v => `${Number(v).toFixed(0)}s`} {...axisStyle}
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, style: { fontSize: 9, fill: '#C5D0D8' } }} />
                <YAxis domain={[Y_MIN, Y_MAX]} tickCount={9} {...axisStyle} tickFormatter={v => `${v}`} unit=" Nm" />
                <Tooltip content={<ForceTooltip />} />
                <ReferenceLine y={0} stroke="#E0EAF4" strokeWidth={1.5} />
                <Line type="monotoneX" dataKey="forceNm" stroke="#E64A19" strokeWidth={2} dot={false} isAnimationActive={false} name="Force" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* 컨트롤 영역 */}
      <Box sx={{ display: 'flex', gap: 1.2, flex: 1, minHeight: 0 }}>

        {/* ✅ 통합 패널: Activate + OPEN/CLOSE + 슬라이더 */}
        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px', justifyContent: 'space-between' }}>

          {/* Activate / Go to Position 스위치 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1.2, borderBottom: '1px solid #F0F4F8' }}>
            <LabelSwitch label="Activate" checked={state.activated}
              disabled={!state.connected || state.eStop}
              onChange={v => updateState({ activated: v, goToPosition: false })} />
            <LabelSwitch label="Go to Position" checked={state.goToPosition}
              disabled={!state.activated || state.eStop}
              onChange={v => updateState({ goToPosition: v })} />
          </Box>

          {/* OPEN / CLOSE 버튼 */}
          <Box sx={{ display: 'flex', gap: 1, pt: 0.8 }}>
            {[{ label: 'OPEN', val: 0 }, { label: 'CLOSE', val: 255 }].map(({ label, val }) => {
              const active = state.positionRequest === val && state.goToPosition;
              return (
                <Button key={label} fullWidth size="small"
                  disabled={!state.goToPosition || state.eStop}
                  onClick={() => updateState({ positionRequest: val })}
                  sx={{
                    fontSize: '0.78rem', fontWeight: 300, py: 1.2, borderRadius: 1.5, boxShadow: 'none',
                    ...(active
                      ? { bgcolor: '#1976D2', color: '#fff', '&:hover': { bgcolor: '#1565C0', boxShadow: 'none' } }
                      : { bgcolor: '#F5F7FA', color: '#90A4AE', border: '1px solid #E8EDF2', '&:hover': { bgcolor: '#EEF2F7', boxShadow: 'none' } }),
                    '&.Mui-disabled': { bgcolor: '#F5F7FA', color: '#C5D0D8', border: '1px solid #EEF2F7' },
                  }}>
                  {label}
                </Button>
              );
            })}
          </Box>

          {/* 슬라이더 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, flex: 1, justifyContent: 'center' }}>
            <ParamSlider label="Position" value={state.positionRequest}
              disabled={!state.goToPosition || state.eStop}
              onChange={v => updateState({ positionRequest: v })} />
            <ParamSlider label="Speed" value={state.speed}
              disabled={!state.activated || state.eStop}
              onChange={v => updateState({ speed: v })} />
            <ParamSlider label="Force" value={state.force}
              disabled={!state.activated || state.eStop}
              onChange={v => updateState({ force: v })} />
          </Box>
        </Paper>

        {/* 우측 GripperViewer 패널 */}
        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <GripperViewer
              openRatio={state.positionActual / 255}
              tilt={0}
              spread={0}
              isMoving={isMoving}
              statusColor={statusColor}
              objectDetected={false}
              connected={state.connected}
              activated={state.activated}
              eStop={state.eStop}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ControlTab;