import React from 'react';

interface Props {
  openRatio: number;
  tilt: number;
  spread: number;
  isMoving: boolean;
  statusColor: string;
  objectDetected: boolean;
}

const GripperSVG: React.FC<Props> = ({ openRatio, tilt, spread, isMoving, statusColor, objectDetected }) => (
  <svg width="140" height="140" viewBox="0 0 140 140">
    <defs>
      <linearGradient id="bodyG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E3F2FD" />
        <stop offset="100%" stopColor="#BBDEFB" />
      </linearGradient>
      <linearGradient id="fingerG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#90CAF9" />
        <stop offset="100%" stopColor="#1976D2" />
      </linearGradient>
      <linearGradient id="baseG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <filter id="sh">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1976D2" floodOpacity="0.14" />
      </filter>
    </defs>

    {/* Base */}
    <rect x="42" y="92" width="56" height="36" rx="5" fill="url(#baseG)" stroke="#B0BEC5" strokeWidth="1" filter="url(#sh)" />
    <rect x="50" y="100" width="40" height="5" rx="2" fill="#B0BEC5" opacity="0.45" />
    <rect x="50" y="109" width="40" height="5" rx="2" fill="#B0BEC5" opacity="0.28" />
    {[56, 84].map(x => <circle key={x} cx={x} cy="120" r="2.8" fill="#90A4AE" stroke="#78909C" strokeWidth="0.4" />)}

    {/* Wrist */}
    <rect x="52" y="82" width="36" height="13" rx="4" fill="url(#bodyG)" stroke="#90CAF9" strokeWidth="1" />

    {/* Status LED */}
    <rect x="60" y="86" width={20 * openRatio} height="4" rx="2" fill={statusColor} opacity="0.7" style={{ transition: 'width 0.2s' }} />

    {/* Left finger */}
    <g transform={`translate(${70 - spread - 5}, 44) rotate(${-tilt}, 6, 0)`} style={{ transition: 'all 0.18s ease' }}>
      <rect x="0" y="0" width="11" height="40" rx="3" fill="url(#fingerG)" stroke="#1565C0" strokeWidth="0.5" filter="url(#sh)" />
      <rect x="8" y="7" width="3" height="24" rx="1.5" fill="rgba(255,255,255,0.28)" />
      {[10, 18, 26].map(y => <line key={y} x1="8.5" y1={y} x2="10.5" y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />)}
      <rect x="1" y="34" width="9" height="7" rx="2" fill="#1565C0" />
    </g>

    {/* Right finger */}
    <g transform={`translate(${70 + spread - 6}, 44) rotate(${tilt}, 6, 0)`} style={{ transition: 'all 0.18s ease' }}>
      <rect x="0" y="0" width="11" height="40" rx="3" fill="url(#fingerG)" stroke="#1565C0" strokeWidth="0.5" filter="url(#sh)" />
      <rect x="0" y="7" width="3" height="24" rx="1.5" fill="rgba(255,255,255,0.28)" />
      {[10, 18, 26].map(y => <line key={y} x1="0.5" y1={y} x2="2.5" y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />)}
      <rect x="1" y="34" width="9" height="7" rx="2" fill="#1565C0" />
    </g>

    {/* Object detected ring */}
    {objectDetected && (
      <circle cx="70" cy="80" r="6" fill="#FFF9C4" stroke="#F9A825" strokeWidth="1.5">
        <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
      </circle>
    )}

    {/* Moving arrows */}
    {isMoving && [-8, 0, 8].map(x => (
      <line key={x} x1={70 + x} y1="36" x2={70 + x} y2="42" stroke="#1976D2" strokeWidth="1.4" strokeLinecap="round">
        <animate attributeName="opacity" values="0.7;0;0.7" dur="0.55s" repeatCount="indefinite" />
      </line>
    ))}
  </svg>
);

export default GripperSVG;