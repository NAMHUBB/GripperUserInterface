import React, { useState } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, Button,
  Checkbox, Paper, Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckIcon from '@mui/icons-material/Check';
import { GripperState } from '../App';

interface Props { state: GripperState; updateState: (p: Partial<GripperState>) => void }

const BAUD_RATES = ['9600', '19200', '38400', '57600', '115200', '230400'];

const registers = [
  { addr: 2000, format: 'Bin16', comment: 'Status',          value: '0000000000000000' },
  { addr: 2001, format: 'Dec16', comment: 'Reserved',        value: '0' },
  { addr: 2002, format: 'Dec16', comment: 'Fault',           value: '0' },
  { addr: 2003, format: 'Dec16', comment: 'Position Echo',   value: '0' },
  { addr: 2004, format: 'Dec16', comment: 'Position Actual', value: '0' },
  { addr: 2005, format: 'Dec16', comment: 'Force Actual',    value: '0' },
  { addr: 2006, format: 'Dec16', comment: 'Open Pos Echo',   value: '0' },
  { addr: 2007, format: 'Dec16', comment: 'Reserved',        value: '0' },
  { addr: 1000, format: 'Bin16', comment: 'Action Request',  value: '0' },
  { addr: 1001, format: 'Dec16', comment: 'Reserved',        value: '0' },
  { addr: 1002, format: 'Dec16', comment: 'Reserved',        value: '0' },
  { addr: 1003, format: 'Dec16', comment: 'Position Set',    value: '0' },
  { addr: 1004, format: 'Dec16', comment: 'Speed Set',       value: '0' },
  { addr: 1005, format: 'Dec16', comment: 'Force Set',       value: '0' },
  { addr: 1006, format: 'Dec16', comment: 'Open Pos Set',    value: '0' },
  { addr: 1007, format: 'Dec16', comment: 'Reserved',        value: '0' },
];

// Default params — baudRate is now part of state so it can be applied to connection
const DEFAULT_PARAMS = {
  baudRate: '115200',   // selectable: 9600 / 19200 / 38400 / 57600 / 115200 / 230400
  stopBit: '1',
  parity: 'Nc',
  slaveId: '9',
  termResistor: true,
};

const ModbusTab: React.FC<Props> = ({ state }) => {
  const [params, setParams]   = useState(DEFAULT_PARAMS);
  const [applied, setApplied] = useState(DEFAULT_PARAMS); // last applied snapshot
  const [status, setStatus]   = useState<string | null>(null);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1600);
  };

  const handleApply = () => {
    setApplied({ ...params });
    flash('Applied');
  };

  const handleDefault = () => {
    setParams(DEFAULT_PARAMS);
    flash('Reset to default');
  };

  // Shared Select style
  const selectSx = {
    height: 28, fontSize: '0.82rem', bgcolor: '#fff',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD8E8' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90CAF9' },
    '& .MuiSelect-select': { py: 0.4, px: 1 },
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      height: 28, fontSize: '0.82rem', bgcolor: '#fff',
      '& fieldset': { borderColor: '#CBD8E8' },
      '&:hover fieldset': { borderColor: '#90CAF9' },
    },
    '& .MuiInputBase-input': { py: 0.4, px: 1 },
  };

  const btnSx = {
    fontSize: '0.75rem', borderColor: '#CBD8E8', color: '#1A2A3A', height: 28, px: 1.5,
    '&:hover': { borderColor: '#1976D2', color: '#1976D2', bgcolor: '#E3F2FD' },
  };

  // Rows: label + control
  const rows: { label: string; control: React.ReactNode }[] = [
    {
      label: 'Baud Rate',
      control: (
        <Select
          value={params.baudRate}
          onChange={e => setParams(s => ({ ...s, baudRate: e.target.value }))}
          size="small"
          sx={{ ...selectSx, width: 100 }}
        >
          {BAUD_RATES.map(v => (
            <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>{v}</MenuItem>
          ))}
        </Select>
      ),
    },
    {
      label: 'Stop Bit',
      control: (
        <Select
          value={params.stopBit}
          onChange={e => setParams(s => ({ ...s, stopBit: e.target.value }))}
          size="small"
          sx={{ ...selectSx, width: 80 }}
        >
          {['1', '2'].map(v => (
            <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>{v}</MenuItem>
          ))}
        </Select>
      ),
    },
    {
      label: 'Parity',
      control: (
        <Select
          value={params.parity}
          onChange={e => setParams(s => ({ ...s, parity: e.target.value }))}
          size="small"
          sx={{ ...selectSx, width: 80 }}
        >
          {['Nc', 'Even', 'Odd'].map(v => (
            <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>{v}</MenuItem>
          ))}
        </Select>
      ),
    },
    {
      label: 'Slave Id',
      control: (
        <TextField
          value={params.slaveId}
          onChange={e => setParams(s => ({ ...s, slaveId: e.target.value }))}
          size="small"
          sx={{ ...fieldSx, width: 80 }}
        />
      ),
    },
    {
      label: 'Termination Resistor',
      control: (
        <Checkbox
          checked={params.termResistor}
          onChange={e => setParams(s => ({ ...s, termResistor: e.target.checked }))}
          size="small"
          sx={{ p: '3px', color: '#90A4AE', '&.Mui-checked': { color: '#1976D2' } }}
        />
      ),
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT: Connection settings ────────────────────────────────────── */}
      <Box sx={{ p: 2.5, borderRight: '1px solid #E0EAF4', bgcolor: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A2A3A', mb: 1.5 }}>
          Modbus RTU
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {rows.map(({ label, control }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#1A2A3A', fontWeight: 500 }}>{label}</Typography>
              {control}
            </Box>
          ))}
        </Box>

        {/* Applied summary */}
        <Box sx={{ mt: 2, p: 1.2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #EEF2F7' }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#90A4AE', mb: 0.6, fontWeight: 600, letterSpacing: '0.04em' }}>
            ACTIVE SETTINGS
          </Typography>
          {[
            { k: 'Baud Rate', v: applied.baudRate },
            { k: 'Stop Bit',  v: applied.stopBit },
            { k: 'Parity',    v: applied.parity },
            { k: 'Slave Id',  v: applied.slaveId },
          ].map(({ k, v }) => (
            <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#90A4AE' }}>{k}</Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#1A2A3A', fontFamily: 'monospace' }}>{v}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="outlined" size="small"
            onClick={() => flash('Refreshed')}
            startIcon={<RefreshIcon sx={{ fontSize: '13px !important' }} />}
            sx={btnSx}>
            Refresh
          </Button>
          <Button variant="outlined" size="small"
            onClick={handleDefault}
            startIcon={<RestoreIcon sx={{ fontSize: '13px !important' }} />}
            sx={btnSx}>
            Default
          </Button>
          <Button variant="outlined" size="small"
            onClick={handleApply}
            startIcon={<CheckIcon sx={{ fontSize: '13px !important' }} />}
            sx={{ ...btnSx, borderColor: '#BBDEFB', color: '#1976D2', '&:hover': { bgcolor: '#E3F2FD', borderColor: '#1976D2' } }}>
            Apply
          </Button>
        </Box>

        {status && (
          <Typography sx={{ fontSize: '0.72rem', color: '#388E3C', mt: 1 }}>✓ {status}</Typography>
        )}
      </Box>

      {/* ── RIGHT: Register table ─────────────────────────────────────────── */}
      <Box sx={{ p: 2.5, bgcolor: '#FAFBFC', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A2A3A' }}>
              Modbus Monitor
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#90A4AE' }}>
              Input Register (2000–2007) · Holding Register (1000–1007)
            </Typography>
          </Box>
          <Chip
            label={state.connected ? `Live · ${applied.baudRate}` : 'Offline'}
            size="small"
            sx={{
              bgcolor: state.connected ? '#E8F5E9' : '#F5F5F5',
              color:   state.connected ? '#2E7D32' : '#9E9E9E',
              border: `1px solid ${state.connected ? '#A5D6A7' : '#E0E0E0'}`,
              fontSize: '0.7rem',
            }}
          />
        </Box>

        <Paper sx={{ overflow: 'hidden', border: '1px solid #E0EAF4' }}>
          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 90px 1fr 150px', px: 1.5, py: 0.8, bgcolor: '#F0F4F8', borderBottom: '1px solid #E0EAF4' }}>
            {['Address', 'Format', 'Comment', 'Value'].map(h => (
              <Typography key={h} sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#5A7A9A' }}>{h}</Typography>
            ))}
          </Box>

          {registers.map((r, i) => (
            <Box
              key={r.addr}
              sx={{
                display: 'grid', gridTemplateColumns: '70px 90px 1fr 150px',
                px: 1.5, py: 0.7, alignItems: 'center',
                bgcolor: i % 2 === 0 ? '#fff' : '#FAFBFC',
                borderBottom: i < registers.length - 1 ? '1px solid #EEF2F7' : 'none',
                '&:hover': { bgcolor: '#EBF3FF' },
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace', color: r.addr >= 2000 ? '#1976D2' : '#5E35B1' }}>
                {r.addr}
              </Typography>

              <Select
                defaultValue={r.format}
                size="small"
                sx={{
                  height: 22, fontSize: '0.68rem',
                  '& .MuiSelect-select': { py: 0.2, px: 0.6 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0EAF4' },
                }}
              >
                {['Dec16', 'Bin16', 'Hex16'].map(f => (
                  <MenuItem key={f} value={f} sx={{ fontSize: '0.72rem' }}>{f}</MenuItem>
                ))}
              </Select>

              <Typography sx={{ fontSize: '0.75rem', color: '#1A2A3A' }}>{r.comment}</Typography>

              <TextField
                defaultValue={r.value}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 22, fontSize: '0.72rem', fontFamily: 'monospace',
                    '& fieldset': { borderColor: '#E0EAF4' },
                    '&:hover fieldset': { borderColor: '#90CAF9' },
                  },
                  '& .MuiInputBase-input': { py: 0.15, px: 0.8 },
                }}
              />
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
};

export default ModbusTab;