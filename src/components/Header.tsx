import React from 'react';
import { AppBar, Toolbar, Tabs, Tab, Box, Typography, Button, Chip, Tooltip } from '@mui/material';
import SettingsInputCompositeIcon from '@mui/icons-material/SettingsInputComposite';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { GripperState } from '../App';

interface Props {
  tab: number;
  setTab: (v: number) => void;
  state: GripperState;
  onConnect: () => void;
  onEStop: () => void;
  onResumeEStop: () => void;
}

const Header: React.FC<Props> = ({ tab, setTab, state, onConnect, onEStop, onResumeEStop }) => (
  <AppBar position="static" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #E0EAF4' }}>
    <Toolbar sx={{ minHeight: '52px !important', px: 2, gap: 2 }}>

      {/* Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'fit-content' }}>
        <SettingsInputCompositeIcon sx={{ color: '#1976D2', fontSize: 20 }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1A2A3A', whiteSpace: 'nowrap' }}>
          Gripper Control
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        '& .MuiTabs-indicator': { backgroundColor: '#1976D2', height: 2 },
        '& .MuiTab-root': {
          fontSize: '0.8rem', color: '#5A7A9A', minHeight: 52,
          textTransform: 'none', fontWeight: 500, minWidth: 0, px: 2,
          '&.Mui-selected': { color: '#1976D2', fontWeight: 600 },
        },
      }}>
        <Tab label="Control" />
        <Tab label="Modbus" />
        <Tab label="Device info" />
      </Tabs>

      <Box sx={{ flex: 1 }} />

      {/* Connect / Disconnect */}
      <Button
        variant={state.connected ? 'outlined' : 'contained'}
        size="small"
        onClick={onConnect}
        sx={{
          fontSize: '0.75rem', px: 2, height: 32,
          ...(state.connected
            ? { borderColor: '#B0BEC5', color: '#5A7A9A', '&:hover': { bgcolor: '#FFF3F3', borderColor: '#EF9A9A', color: '#D32F2F' } }
            : { bgcolor: '#1976D2', '&:hover': { bgcolor: '#1565C0' } }),
        }}
      >
        {state.connected ? 'Disconnect' : 'Connect'}
      </Button>

      {/* E-Stop */}
      {state.eStop ? (
        <Tooltip title="Click to resume operation">
          <Button
            variant="contained"
            size="small"
            onClick={onResumeEStop}
            sx={{
              bgcolor: '#FF8F00', color: '#fff', fontWeight: 700,
              fontSize: '0.72rem', px: 2, height: 32,
              animation: 'estopBlink 1s ease infinite',
              '@keyframes estopBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
              '&:hover': { bgcolor: '#E65100' },
            }}
          >
            RESUME
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Emergency Stop — halts all motion immediately">
          <span>
            <Button
              variant="contained"
              size="small"
              disabled={!state.connected}
              onClick={onEStop}
              startIcon={<PowerSettingsNewIcon sx={{ fontSize: '15px !important' }} />}
              sx={{
                bgcolor: '#D32F2F', color: '#fff', fontWeight: 700,
                fontSize: '0.72rem', px: 2, height: 32,
                '&:hover': { bgcolor: '#B71C1C' },
                '&.Mui-disabled': { bgcolor: '#FFCDD2', color: '#EF9A9A' },
              }}
            >
              E-STOP
            </Button>
          </span>
        </Tooltip>
      )}

      {/* Connection status */}
      <Chip
        size="small"
        icon={<Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: state.connected ? '#4CAF50' : '#9E9E9E', ml: '6px !important' }} />}
        label={state.connected ? state.port : 'Offline'}
        sx={{
          bgcolor: state.connected ? '#E8F5E9' : '#F5F5F5',
          color: state.connected ? '#2E7D32' : '#757575',
          border: `1px solid ${state.connected ? '#A5D6A7' : '#E0E0E0'}`,
          fontSize: '0.72rem', height: 24,
        }}
      />
    </Toolbar>
  </AppBar>
);

export default Header;