import React from 'react';
import { Box, Paper, Typography, Switch, Slider, Button, Chip } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

import { GripperState, DataPoint } from '../App';
import { PH11_SPEC, mAtoNm } from '../constants';

// ── Axis Limits ───────────────────────────────────────────────────────────────
const POS_MAX = 255;
const POS_MIN = -255;

const Y_MAX = 20;
const Y_MIN = -20;

const Y_RATED = PH11_SPEC.rated;
const Y_PEAK = PH11_SPEC.peak;

// ── Position Tooltip ──────────────────────────────────────────────────────────
const PosTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '1px solid #E0EAF4',
        borderRadius: 1,
        p: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.65rem',
          color: '#90A4AE',
          mb: 0.3,
        }}
      >
        t = {Number(label).toFixed(1)} s
      </Typography>

      {payload.map((p: any) => (
        <Typography
          key={p.name}
          sx={{
            fontSize: '0.7rem',
            color: p.color,
            fontWeight: 500,
          }}
        >
          {p.name}: {Math.round(p.value ?? 0)}
        </Typography>
      ))}
    </Box>
  );
};

// ── Force Tooltip ─────────────────────────────────────────────────────────────
const ForceTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const val: number = payload[0]?.value ?? 0;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '1px solid #E0EAF4',
        borderRadius: 1,
        p: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.65rem',
          color: '#90A4AE',
          mb: 0.3,
        }}
      >
        t = {Number(label).toFixed(1)} s
      </Typography>

      <Typography
        sx={{
          fontSize: '0.7rem',
          color: '#E64A19',
          fontWeight: 500,
        }}
      >
        {val.toFixed(2)} Nm
      </Typography>

      <Typography
        sx={{
          fontSize: '0.62rem',
          color: '#B0BEC5',
        }}
      >
        {Math.abs(val) <= Y_RATED
          ? '● Rated range'
          : Math.abs(val) <= Y_PEAK
          ? '▲ Over rated'
          : '⚠ Exceeded peak'}
      </Typography>
    </Box>
  );
};

// ── Clean Industrial Gripper SVG ──────────────────────────────────────────────
const GripperVisual: React.FC<{ position: number }> = ({ position }) => {
  // 0 close ~ 255 open
  const open = position / 255;
  const fingerOffset = open * 12;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <defs>
        <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5F7FA" />
          <stop offset="50%" stopColor="#CFD8DC" />
          <stop offset="100%" stopColor="#90A4AE" />
        </linearGradient>

        <linearGradient id="darkMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#546E7A" />
          <stop offset="100%" stopColor="#263238" />
        </linearGradient>

        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#90CAF9" />
          <stop offset="100%" stopColor="#1E88E5" />
        </linearGradient>

        <filter id="shadow">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      {/* background */}
      <rect
        x="8"
        y="8"
        width="74"
        height="74"
        rx="18"
        fill="#F8FAFC"
        stroke="#E3EAF2"
      />

      {/* soft glow */}
      <circle
        cx="45"
        cy="40"
        r="24"
        fill="#E3F2FD"
        opacity="0.7"
      />

      {/* base */}
      <g filter="url(#shadow)">
        <rect
          x="32"
          y="58"
          width="26"
          height="12"
          rx="5"
          fill="url(#darkMetal)"
        />

        <rect
          x="36"
          y="50"
          width="18"
          height="12"
          rx="4"
          fill="url(#metal)"
        />
      </g>

      {/* center rail */}
      <rect
        x="24"
        y="44"
        width="42"
        height="4"
        rx="2"
        fill="#90A4AE"
      />

      {/* LEFT FINGER */}
      <g transform={`translate(${-fingerOffset},0)`}>
        {/* arm */}
        <rect
          x="24"
          y="20"
          width="10"
          height="34"
          rx="4"
          fill="url(#metal)"
          stroke="#B0BEC5"
        />

        {/* jaw */}
        <rect
          x="30"
          y="18"
          width="8"
          height="10"
          rx="2"
          fill="url(#darkMetal)"
        />

        {/* grip pad */}
        <rect
          x="31"
          y="30"
          width="4"
          height="14"
          rx="2"
          fill="url(#accent)"
        />
      </g>

      {/* RIGHT FINGER */}
      <g transform={`translate(${fingerOffset},0)`}>
        {/* arm */}
        <rect
          x="56"
          y="20"
          width="10"
          height="34"
          rx="4"
          fill="url(#metal)"
          stroke="#B0BEC5"
        />

        {/* jaw */}
        <rect
          x="52"
          y="18"
          width="8"
          height="10"
          rx="2"
          fill="url(#darkMetal)"
        />

        {/* grip pad */}
        <rect
          x="55"
          y="30"
          width="4"
          height="14"
          rx="2"
          fill="url(#accent)"
        />
      </g>

      {/* center object */}
      <rect
        x="42"
        y="34"
        width="6"
        height="16"
        rx="2"
        fill="#42A5F5"
        opacity="0.9"
      />

      {/* motion indicators */}
      <path
        d={`M${36 - fingerOffset} 37 L${40 - fingerOffset} 37`}
        stroke="#42A5F5"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />

      <path
        d={`M${54 + fingerOffset} 37 L${50 + fingerOffset} 37`}
        stroke="#42A5F5"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
};

// ── Labeled Switch ────────────────────────────────────────────────────────────
const LabelSwitch: React.FC<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, disabled, onChange }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Typography
      sx={{
        fontSize: '0.72rem',
        color: disabled ? '#C5D0D8' : '#546E7A',
        fontWeight: 500,
      }}
    >
      {label}
    </Typography>

    <Switch
      size="small"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      sx={{
        '& .MuiSwitch-switchBase.Mui-checked': {
          color: '#1976D2',
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          bgcolor: '#90CAF9',
        },
      }}
    />
  </Box>
);

// ── Param Slider ─────────────────────────────────────────────────────────────
const ParamSlider: React.FC<{
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}> = ({ label, value, disabled, onChange }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: '0.67rem', color: '#90A4AE' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: disabled ? '#C5D0D8' : '#37474F' }}>
        {value}
        <span style={{ fontSize: '0.58rem', color: '#B0BEC5', marginLeft: 2 }}>/255</span>
      </Typography>
    </Box>
    <Slider
      size="small"
      min={0}
      max={255}
      value={value}
      disabled={disabled}
      onChange={(_, v) => onChange(v as number)}
      sx={{
        py: 0.5,
        color: disabled ? '#E0EAF4' : '#1976D2',
        '& .MuiSlider-thumb': { width: 11, height: 11, boxShadow: 'none' },
        '& .MuiSlider-rail': { bgcolor: '#E8EDF2' },
        '& .MuiSlider-track': { border: 'none' },
      }}
    />
  </Box>
);

// ── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  state: GripperState;
  updateState: (patch: Partial<GripperState>) => void;
  chartData: DataPoint[];
  isMoving: boolean;
}

const paperSx = {
  sx: {
    display: 'flex',
    flexDirection: 'column' as const,
    border: '1px solid #EEF2F7',
    borderRadius: 2,
    bgcolor: '#fff',
  },
};

const axisStyle = {
  tick: { fontSize: 9, fill: '#C5D0D8' },
  axisLine: false as const,
  tickLine: false as const,
};

const ControlTab: React.FC<Props> = ({ state, updateState, chartData }) => {
  const forceData = chartData.map(d => ({ ...d, forceNm: mAtoNm(d.current) }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.2, p: 1.5, overflow: 'hidden' }}>

      <Box sx={{ display: 'flex', gap: 1.2, flex: '0 0 68%', minHeight: 0 }}>

        {/* Position Chart */}
        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#1976D2' }}>
              Position Echo / Actual
            </Typography>
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
                <XAxis
                  dataKey="time"
                  tickFormatter={v => `${Number(v).toFixed(0)}s`}
                  {...axisStyle}
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, style: { fontSize: 9, fill: '#C5D0D8' } }}
                />
                <YAxis domain={[POS_MIN, POS_MAX]} tickCount={9} {...axisStyle} tickFormatter={v => `${v}`} />
                <Tooltip content={<PosTooltip />} />
                <ReferenceLine y={0} stroke="#E0EAF4" strokeWidth={1.5} />
                <Line type="monotoneX" dataKey="echo" stroke="#1976D2" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Echo" />
                <Line type="monotoneX" dataKey="actual" stroke="#43A047" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Force Chart */}
        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 14px 6px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#1976D2' }}>
              Force (Nm)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 2, bgcolor: '#E64A19', borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.6rem', color: '#B0BEC5' }}>Force</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forceData} margin={{ top: 2, right: 36, left: 2, bottom: 14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FA" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickFormatter={v => `${Number(v).toFixed(0)}s`}
                  {...axisStyle}
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, style: { fontSize: 9, fill: '#C5D0D8' } }}
                />
                <YAxis domain={[Y_MIN, Y_MAX]} tickCount={9} {...axisStyle} tickFormatter={v => `${v}`} unit=" Nm" />
                <Tooltip content={<ForceTooltip />} />
                <ReferenceLine y={0} stroke="#E0EAF4" strokeWidth={1.5} />
                <Line type="monotoneX" dataKey="forceNm" stroke="#E64A19" strokeWidth={2} dot={false} isAnimationActive={false} name="Force" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1.2, flex: 1, minHeight: 0 }}>

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: '0 0 160px', p: '14px 16px', justifyContent: 'center', gap: 1.4 }}>
          <LabelSwitch label="Activate" checked={state.activated}
            disabled={!state.connected || state.eStop}
            onChange={v => updateState({ activated: v, goToPosition: false })} />
          <Box sx={{ height: '1px', bgcolor: '#F0F4F8' }} />
          <LabelSwitch label="Go to Position" checked={state.goToPosition}
            disabled={!state.activated || state.eStop}
            onChange={v => updateState({ goToPosition: v })} />
        </Paper>

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 1, p: '12px 16px', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[{ label: 'OPEN', val: 0 }, { label: 'CLOSE', val: 255 }].map(({ label, val }) => {
              const active = state.positionRequest === val && state.goToPosition;
              return (
                <Button key={label} fullWidth size="small"
                  disabled={!state.goToPosition || state.eStop}
                  onClick={() => updateState({ positionRequest: val })}
                  sx={{
                    fontSize: '0.72rem', fontWeight: 700, py: 0.55, borderRadius: 1.5, boxShadow: 'none',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
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

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: '0 0 160px', p: '12px 14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            label={state.eStop ? 'E-Stop' : state.activated ? 'Active' : state.connected ? 'Online' : 'Offline'}
            size="small"
            sx={{
              alignSelf: 'flex-end', fontSize: '0.6rem', height: 18, fontWeight: 600,
              bgcolor: state.eStop ? '#FFEBEE' : state.activated ? '#E8F5E9' : state.connected ? '#E3F2FD' : '#F0F4F8',
              color: state.eStop ? '#C62828' : state.activated ? '#2E7D32' : state.connected ? '#1565C0' : '#90A4AE',
            }}
          />
          <GripperVisual position={state.positionActual} />
          <Box sx={{ display: 'flex', gap: 0.6, width: '100%' }}>
            {[
              { label: 'Echo', value: state.positionEcho, color: '#1976D2' },
              { label: 'Actual', value: state.positionActual, color: '#43A047' },
              { label: 'mA', value: state.currentActual, color: '#E64A19' },
            ].map(({ label, value, color }) => (
              <Box key={label} sx={{ flex: 1, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 1.5, py: 0.7 }}>
                <Typography sx={{ fontSize: '0.57rem', color: '#B0BEC5', mb: 0.2 }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ControlTab;