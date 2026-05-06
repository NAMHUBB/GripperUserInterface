import React, { useState } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, Button,
  Checkbox, FormControlLabel, Paper, Divider, Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckIcon from '@mui/icons-material/Check';
import { GripperState } from '../App';

interface Props { state: GripperState; updateState: (p: Partial<GripperState>) => void }

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

const ModbusTab: React.FC<Props> = ({ state, updateState }) => {
  const [params, setParams] = useState({ stopBit: '1', parity: 'Nc', slaveId: '9', termResistor: true });
  const [status, setStatus] = useState<string | null>(null);

  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(null), 1500); };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      height: 28, fontSize: '0.82rem', bgcolor: '#fff',
      '& fieldset': { borderColor: '#CBD8E8' },
      '&:hover fieldset': { borderColor: '#90CAF9' },
    },
    '& .MuiInputBase-input': { py: 0.4, px: 1 },
  };
  const selectSx = {
    height: 28, fontSize: '0.82rem', bgcolor: '#fff',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD8E8' },
    '& .MuiSelect-select': { py: 0.4, px: 1 },
  };
  const btnSx = {
    fontSize: '0.75rem', borderColor: '#CBD8E8', color: '#1A2A3A', height: 28, px: 1.5,
    '&:hover': { borderColor: '#1976D2', color: '#1976D2', bgcolor: '#E3F2FD' },
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%', overflow: 'hidden' }}>
      {/* LEFT: Connection settings */}
      <Box sx={{ p: 2.5, borderRight: '1px solid #E0EAF4', bgcolor: '#fff', overflowY: 'auto' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A2A3A', mb: 1.5 }}>Modbus RTU</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {[
            { label: 'Baud Rate', content: <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#1A2A3A' }}>115200</Typography> },
            { label: 'Stop Bit', content: <Select value={params.stopBit} onChange={e => setParams(s => ({ ...s, stopBit: e.target.value }))} size="small" sx={{ ...selectSx, width: 80 }}>{['1','2'].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>{v}</MenuItem>)}</Select> },
            { label: 'Parity', content: <Select value={params.parity} onChange={e => setParams(s => ({ ...s, parity: e.target.value }))} size="small" sx={{ ...selectSx, width: 80 }}>{['Nc','Even','Odd'].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>{v}</MenuItem>)}</Select> },
            { label: 'Slave Id', content: <TextField value={params.slaveId} onChange={e => setParams(s => ({ ...s, slaveId: e.target.value }))} size="small" sx={{ ...fieldSx, width: 80 }} /> },
          ].map(({ label, content }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#1A2A3A', fontWeight: 500 }}>{label}</Typography>
              {content}
            </Box>
          ))}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#1A2A3A', fontWeight: 500 }}>Termination Resistor</Typography>
            <Checkbox checked={params.termResistor} onChange={e => setParams(s => ({ ...s, termResistor: e.target.checked }))}
              size="small" sx={{ p: '3px', color: '#90A4AE', '&.Mui-checked': { color: '#1976D2' } }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="outlined" size="small" onClick={() => flash('Refreshed')} startIcon={<RefreshIcon sx={{ fontSize: '13px !important' }} />} sx={btnSx}>Refresh</Button>
          <Button variant="outlined" size="small" onClick={() => { setParams({ stopBit:'1', parity:'Nc', slaveId:'9', termResistor:true }); flash('Reset'); }} startIcon={<RestoreIcon sx={{ fontSize: '13px !important' }} />} sx={btnSx}>Default</Button>
          <Button variant="outlined" size="small" onClick={() => flash('Applied')} startIcon={<CheckIcon sx={{ fontSize: '13px !important' }} />} sx={{ ...btnSx, borderColor: '#BBDEFB', color: '#1976D2', '&:hover': { bgcolor: '#E3F2FD', borderColor: '#1976D2' } }}>Apply</Button>
        </Box>

        {status && <Typography sx={{ fontSize: '0.72rem', color: '#388E3C', mt: 1 }}>✓ {status}</Typography>}
      </Box>

      {/* RIGHT: Register table */}
      <Box sx={{ p: 2.5, bgcolor: '#FAFBFC', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A2A3A' }}>Modbus Monitor</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#90A4AE' }}>Input Register (2000-2007), Holding Register (1000-1007)</Typography>
          </Box>
          <Chip label={state.connected ? 'Live' : 'Offline'} size="small"
            sx={{ bgcolor: state.connected ? '#E8F5E9' : '#F5F5F5', color: state.connected ? '#2E7D32' : '#9E9E9E', border: `1px solid ${state.connected ? '#A5D6A7' : '#E0E0E0'}`, fontSize: '0.7rem' }} />
        </Box>

        <Paper sx={{ overflow: 'hidden', border: '1px solid #E0EAF4' }}>
          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 80px 1fr 140px', px: 1.5, py: 0.8, bgcolor: '#F0F4F8', borderBottom: '1px solid #E0EAF4' }}>
            {['Address', 'Format', 'Comment', 'Value'].map(h => (
              <Typography key={h} sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#5A7A9A' }}>{h}</Typography>
            ))}
          </Box>
          {registers.map((r, i) => (
            <Box key={r.addr} sx={{
              display: 'grid', gridTemplateColumns: '70px 80px 1fr 140px',
              px: 1.5, py: 0.7, alignItems: 'center',
              bgcolor: i % 2 === 0 ? '#fff' : '#FAFBFC',
              borderBottom: i < registers.length - 1 ? '1px solid #EEF2F7' : 'none',
              '&:hover': { bgcolor: '#EBF3FF' },
            }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: r.addr >= 2000 ? '#1976D2' : '#5E35B1', fontFamily: 'monospace' }}>
                {r.addr}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Select value={r.format} size="small" sx={{ height: 22, fontSize: '0.68rem', '& .MuiSelect-select': { py: 0.2, px: 0.6 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E0EAF4' } }}>
                  <MenuItem value="Dec16" sx={{ fontSize: '0.72rem' }}>Dec16</MenuItem>
                  <MenuItem value="Bin16" sx={{ fontSize: '0.72rem' }}>Bin16</MenuItem>
                  <MenuItem value="Hex16" sx={{ fontSize: '0.72rem' }}>Hex16</MenuItem>
                </Select>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: '#1A2A3A' }}>{r.comment}</Typography>
              <TextField defaultValue={r.value} size="small" sx={{
                '& .MuiOutlinedInput-root': { height: 22, fontSize: '0.72rem', fontFamily: 'monospace', '& fieldset': { borderColor: '#E0EAF4' } },
                '& .MuiInputBase-input': { py: 0.15, px: 0.8 },
              }} />
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
};

export default ModbusTab;