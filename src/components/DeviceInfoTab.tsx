import React, { useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';

const DeviceInfoTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const onRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      height: 28, fontSize: '0.82rem', bgcolor: '#fff',
      '& fieldset': { borderColor: '#CBD8E8' },
      '&.Mui-disabled fieldset': { borderColor: '#E0EAF4' },
    },
    '& .MuiInputBase-input': { py: 0.4, px: 1 },
    '& .MuiInputBase-input.Mui-disabled': { color: '#B0BEC5', WebkitTextFillColor: '#B0BEC5' },
  };

  const Row: React.FC<{ label: string; value: string; disabled?: boolean; width?: number }> =
    ({ label, value, disabled, width = 160 }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.4 }}>
        <Typography sx={{
          fontSize: '0.82rem', fontWeight: disabled ? 400 : 500,
          color: disabled ? '#B0BEC5' : '#1A2A3A',
          minWidth: 220,
        }}>
          {label}
        </Typography>
        <TextField defaultValue={value} disabled={disabled} size="small" sx={{ ...fieldSx, width }} />
      </Box>
    );

  return (
    <Box sx={{ p: 3, bgcolor: '#fff', height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 6 }}>

        {/* Left column */}
        <Box>
          <Row label="Firmware version" value="GC3-1.6.14" />
          <Row label="Device Firmware via Controller" value="N/A" disabled />
          <Row label="Unique ID" value="3aff57e4" />
        </Box>

        {/* Right column */}
        <Box>
          <Row label="Cycle count" value="4657" width={130} />
          <Row label="Odometer" value="573809" width={130} />
          <Box sx={{ mt: 0.5 }}>
            <Button
              variant="outlined" size="small"
              disabled={loading} onClick={onRefresh}
              sx={{
                fontSize: '0.75rem', borderColor: '#CBD8E8', color: '#1A2A3A',
                height: 28, px: 1.5,
                '&:hover': { borderColor: '#1976D2', color: '#1976D2', bgcolor: '#E3F2FD' },
              }}>
              {loading ? 'Refreshing...' : '↺ Refresh'}
            </Button>
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default DeviceInfoTab;