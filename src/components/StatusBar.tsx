import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { GripperState } from '../App';

interface Props { state: GripperState; isMoving: boolean }

const StatusBar: React.FC<Props> = ({ state, isMoving }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const items = [
    { label: state.connected ? `Connected · ${state.port}` : 'Disconnected', color: state.connected ? '#2E7D32' : '#9E9E9E' },
    { label: `Baud: 115200`, color: '#5A7A9A' },
    { label: isMoving ? '● Moving' : '○ Idle', color: isMoving ? '#1976D2' : '#9E9E9E' },
    ...(state.eStop ? [{ label: '⚠ E-STOP', color: '#E65100' }] : []),
  ];

  return (
    <Box sx={{ bgcolor: '#fff', borderTop: '1px solid #E0EAF4', px: 2, py: 0.7, display: 'flex', alignItems: 'center', gap: 3, position: 'relative' }}>
      {isMoving && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}>
          <LinearProgress sx={{ height: 2, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: '#1976D2' } }} />
        </Box>
      )}
      {items.map((item, i) => (
        <Typography key={i} sx={{ fontSize: '0.75rem', color: item.color, fontWeight: item.label.startsWith('⚠') ? 600 : 400 }}>
          {item.label}
        </Typography>
      ))}
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: '0.72rem', color: '#B0BEC5' }}>{time.toLocaleTimeString()}</Typography>
      <Typography sx={{ fontSize: '0.7rem', color: '#B0BEC5' }}>© All rights reserved.</Typography>
    </Box>
  );
};

export default StatusBar;