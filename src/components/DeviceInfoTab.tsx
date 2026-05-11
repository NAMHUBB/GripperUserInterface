import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

// ── 사양 데이터 ───────────────────────────────────────────────────────────────
const MODEL_SPECS = [
  { key: 'Rated Torque',              value: '3.5 Nm',   highlight: true  },
  { key: 'Start-Stop Peak Torque',    value: '8.3 Nm',   highlight: false },
  { key: 'Avg. Max Torque',           value: '5.5 Nm',   highlight: false },
  { key: 'Instantaneous Max Torque',  value: '17.0 Nm',  highlight: true  },
  { key: 'Rated Speed',               value: '60 rpm',   highlight: false },
  { key: 'Speed Ratio',               value: '51 : 1',   highlight: false },
  { key: 'Rated Power',               value: '50 W',     highlight: false },
  { key: 'Working Voltage',           value: '24 ~ 36 V',highlight: false },
  { key: 'Motor Type',       value: 'Inner Rotor Torque Motor' },
  { key: 'Communication',   value: 'CANopen'                  },
  { key: 'Encoder Type',    value: 'Dual Magnetic Encoder'    },
  { key: 'Encoder Accuracy',value: '19-bit'                   },
  { key: 'Diameter (OD)',   value: 'Ø 52 mm'                  },
  { key: 'Inner Diameter',  value: '6 mm'                     },
  { key: 'Weight',          value: '455 g'                    },
  { key: 'Reverse Backlash',value: '15 arcsec'                },
  { key: 'Working Temp.',   value: '-20 ~ 80 °C'              },
  { key: 'Working Noise',   value: '< 60 dB  (@30 cm)'        },
];

// ── 색상 ──────────────────────────────────────────────────────────────────────
const BLUE       = '#1976D2';
const BLUE_LIGHT = '#E3F2FD';
const BLUE_MID   = '#90CAF9';
const GRAY       = '#546E7A';
const GRAY_LIGHT = '#F8FAFC';
const DARK       = '#1A2A3A';
const LINE       = '#E0EAF4';

// ── 공통 Row ──────────────────────────────────────────────────────────────────
const SpecRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}> = ({ label, value, highlight, last }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    py: 0.7,
    borderBottom: last ? 'none' : `1px solid ${LINE}`,
  }}>
    <Typography sx={{ fontSize: '0.72rem', color: GRAY }}>{label}</Typography>
    <Typography sx={{
      fontSize: '0.72rem', fontWeight: highlight ? 700 : 500,
      color: highlight ? BLUE : DARK,
      fontFamily: 'monospace',
    }}>
      {value}
    </Typography>
  </Box>
);

// ── Component ─────────────────────────────────────────────────────────────────
const DeviceInfoTab: React.FC = () => (
  <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: '#fff', p: 3 }}>

    {/* ── 헤더 ── */}
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: BLUE,
        letterSpacing: '0.1em', mb: 0.4 }}>
        MOTOR SPECIFICATION
      </Typography>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: DARK, lineHeight: 1.3 }}>
        EYOU PH11 Series
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: GRAY, mt: 0.3 }}>
        Harmonic Drive Actuator with Integrated Brake
      </Typography>
    </Box>

    <Divider sx={{ mb: 2.5, borderColor: LINE }} />

    {/* ── 2컬럼 레이아웃: 모델 카드 | 공통 사양 ── */}
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, alignItems: 'start' }}>

      {/* 왼쪽: 모델 카드 (PH11B-51-C) */}
      <Box sx={{ border: `1px solid ${LINE}`, borderRadius: 2, overflow: 'hidden' }}>

        {/* 카드 헤더 */}
        <Box sx={{ bgcolor: BLUE, px: 2, py: 1.2 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', mb: 0.2 }}>
            PH11B-51-C
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: BLUE_LIGHT }}>
            51:1 Harmonic Drive · 60 rpm · CANopen
          </Typography>
        </Box>

        {/* 카드 바디 */}
        <Box sx={{ px: 2, py: 0.5, bgcolor: GRAY_LIGHT }}>
          {MODEL_SPECS.map((s, i) => (
            <SpecRow
              key={s.key}
              label={s.key}
              value={s.value}
              highlight={s.highlight}
              last={i === MODEL_SPECS.length - 1}
            />
          ))}
        </Box>
      </Box>

      {/* 오른쪽: 공통 사양 */}
      <Box>
      </Box>
    </Box>
  </Box>
);

export default DeviceInfoTab;