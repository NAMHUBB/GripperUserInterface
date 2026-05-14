import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, Switch, Slider, Button, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

import { GripperState, DataPoint } from '../App';
import { PH11_SPEC, mAtoNm } from '../constants';
import GripperViewer from './GripperViewer';
import { parseScript, runScript } from '../scriptRunner';

const POS_MAX = 255;
const POS_MIN = -255;
const Y_MAX = 20;
const Y_MIN = -20;
const Y_RATED = PH11_SPEC.rated;
const Y_PEAK = PH11_SPEC.peak;

// ── 자동완성 후보 (Robotiq 스타일 괄호 포함) ──────────────────────────────────
// cursorInside: true → 삽입 후 커서가 괄호 안에 위치
const ALL_COMMANDS = [
  { cmd: 'rq_activate_and_wait()',  hint: '그리퍼 활성화',         cursorInside: false },
  { cmd: 'rq_open_and_wait()',      hint: '완전 열기',             cursorInside: false },
  { cmd: 'rq_close_and_wait()',     hint: '완전 닫기',             cursorInside: false },
  { cmd: 'rq_move_and_wait()',      hint: '위치 이동 (0~255)',     cursorInside: true  },
  { cmd: 'rq_move_and_wait_norm()', hint: '위치 이동 % (0~100)',   cursorInside: true  },
  { cmd: 'rq_set_speed()',          hint: '속도 설정 (0~255)',     cursorInside: true  },
  { cmd: 'rq_set_speed_norm()',     hint: '속도 설정 % (0~100)',   cursorInside: true  },
  { cmd: 'rq_set_force()',          hint: '힘 설정 (0~255)',       cursorInside: true  },
  { cmd: 'rq_set_force_norm()',     hint: '힘 설정 % (0~100)',     cursorInside: true  },
  { cmd: 'rq_emergency_release()', hint: '비상 해제 (E-Stop)',     cursorInside: false },
  { cmd: 'rq_reset()',              hint: '재활성화',              cursorInside: false },
  { cmd: 'rq_is_object_detected()', hint: 'IF 조건에서 사용',      cursorInside: false },
  { cmd: 'LOG()',                   hint: '로그 메시지 출력',      cursorInside: true  },
  { cmd: 'WAIT()',                  hint: '대기 (ms)',             cursorInside: true  },
  { cmd: 'REPEAT()',                hint: 'n회 반복 시작',         cursorInside: true  },
  { cmd: 'END',                     hint: 'REPEAT 종료',           cursorInside: false },
  { cmd: 'IF rq_is_object_detected()', hint: '조건 분기 시작',    cursorInside: false },
  { cmd: 'ELSE',                    hint: '조건 불일치 블록',      cursorInside: false },
  { cmd: 'ENDIF',                   hint: 'IF 블록 종료',          cursorInside: false },
];

const COMMAND_DOCS = [
  {
    category: '표준 명령어',
    commands: [
      { cmd: 'rq_activate_and_wait()',  args: '',       desc: '그리퍼를 초기화하고 활성화합니다. 스크립트 시작 시 필수.' },
      { cmd: 'rq_open_and_wait()',      args: '',       desc: '그리퍼를 완전히 엽니다 (position = 0).' },
      { cmd: 'rq_close_and_wait()',     args: '',       desc: '그리퍼를 완전히 닫습니다 (position = 255).' },
      { cmd: 'rq_move_and_wait(pos)',   args: '0–255',  desc: '지정 위치로 이동. 예) rq_move_and_wait(128)' },
      { cmd: 'rq_move_and_wait_norm(pos)', args: '0–100', desc: '% 위치로 이동. 예) rq_move_and_wait_norm(50) → 127' },
      { cmd: 'rq_set_speed(speed)',     args: '0–255',  desc: '속도 설정. 예) rq_set_speed(200)' },
      { cmd: 'rq_set_speed_norm(speed)', args: '0–100', desc: '속도 % 설정. 예) rq_set_speed_norm(80) → 204' },
      { cmd: 'rq_set_force(force)',     args: '0–255',  desc: '힘 설정. 예) rq_set_force(100)' },
      { cmd: 'rq_set_force_norm(force)', args: '0–100', desc: '힘 % 설정. 예) rq_set_force_norm(40) → 102' },
    ],
  },
  {
    category: '추가 명령어',
    commands: [
      { cmd: 'rq_emergency_release()', args: '',        desc: '비상 해제(E-Stop). 즉시 모든 동작 중단.' },
      { cmd: 'rq_reset()',             args: '',        desc: '비활성화 후 재활성화.' },
      { cmd: 'LOG(message)',           args: 'text',    desc: '로그창에 메시지 출력. 예) LOG(그리핑 완료)' },
    ],
  },
  {
    category: '조건문',
    commands: [
      { cmd: 'IF rq_is_object_detected()', args: '', desc: '물체 감지 시 아래 블록 실행. ENDIF로 닫아야 함.' },
      { cmd: 'ELSE',                        args: '', desc: '물체 미감지 시 실행할 블록 (선택).' },
      { cmd: 'ENDIF',                       args: '', desc: 'IF 블록 종료.' },
    ],
  },
  {
    category: '흐름 제어',
    commands: [
      { cmd: 'WAIT(ms)',    args: 'ms',  desc: '밀리초 대기. 예) WAIT(1000) → 1초' },
      { cmd: 'REPEAT(n)',   args: 'n',   desc: 'n회 반복 시작. END로 닫아야 함.' },
      { cmd: 'END',         args: '',    desc: 'REPEAT 블록 종료.' },
    ],
  },
  {
    category: '기타',
    commands: [
      { cmd: '# 주석', args: '', desc: '실행 시 무시됨. 예) # 그리핑 시작' },
    ],
  },
];

const ScriptHelpModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
    slotProps={{ paper: { sx: { borderRadius: 2, maxHeight: '85vh' } } }}>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, fontSize: '0.9rem', fontWeight: 700, color: '#1A2A3A' }}>
      📋 스크립트 명령어 설명서
      <IconButton size="small" onClick={onClose} sx={{ color: '#90A4AE' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent sx={{ pt: 0 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#90A4AE', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          기본 실행 순서
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            { step: '1', label: '활성화',      code: 'rq_activate_and_wait()',                                                     color: '#1976D2', bg: '#E3F2FD' },
            { step: '2', label: '파라미터',    code: 'rq_set_speed_norm(80)\nrq_set_force_norm(40)',                               color: '#7B1FA2', bg: '#F3E5F5' },
            { step: '3', label: '동작 실행',   code: 'rq_open_and_wait()\nrq_close_and_wait()\nrq_move_and_wait_norm(50)',        color: '#2E7D32', bg: '#E8F5E9' },
            { step: '4', label: '조건 분기',   code: 'IF rq_is_object_detected()\n  LOG(잡힘)\nELSE\n  rq_open_and_wait()\nENDIF', color: '#F57C00', bg: '#FFF3E0' },
            { step: '5', label: '반복 (선택)', code: 'REPEAT(3)\n  ...\nEND',                                                      color: '#546E7A', bg: '#ECEFF1' },
          ].map(({ step, label, code, color, bg }, i) => (
            <Box key={step}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, mt: 0.3 }}>
                  {step}
                </Box>
                <Box sx={{ flex: 1, bgcolor: bg, borderRadius: 1.5, p: '6px 10px', border: `1px solid ${color}22` }}>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color, mb: 0.3 }}>{label}</Typography>
                  <Box sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#37474F', lineHeight: 1.7 }}>
                    {code.split('\n').map((line, j) => <Box key={j}>{line}</Box>)}
                  </Box>
                </Box>
              </Box>
              {i < 4 && <Box sx={{ pl: '9px', color: '#B0BEC5', fontSize: 14, lineHeight: 1 }}>↓</Box>}
            </Box>
          ))}
        </Box>
      </Box>
      {COMMAND_DOCS.map(({ category, commands }) => (
        <Box key={category} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#1976D2', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {category}
          </Typography>
          <Box sx={{ border: '1px solid #EEF2F7', borderRadius: 1.5, overflow: 'hidden' }}>
            {commands.map(({ cmd, args, desc }, i) => (
              <Box key={cmd} sx={{
                display: 'grid', gridTemplateColumns: '210px 55px 1fr',
                px: 1.5, py: 0.8, alignItems: 'center',
                bgcolor: i % 2 === 0 ? '#fff' : '#FAFBFC',
                borderBottom: i < commands.length - 1 ? '1px solid #F0F4F8' : 'none',
              }}>
                <Typography sx={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: '#5E35B1' }}>{cmd}</Typography>
                <Typography sx={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#E65100' }}>{args}</Typography>
                <Typography sx={{ fontSize: '0.65rem', color: '#546E7A' }}>{desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </DialogContent>
  </Dialog>
);

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

const paperSx = { sx: { display: 'flex', flexDirection: 'column' as const, border: '1px solid #EEF2F7', borderRadius: 2, bgcolor: '#fff' } };
const axisStyle = { tick: { fontSize: 9, fill: '#C5D0D8' }, axisLine: false as const, tickLine: false as const };

const ControlTab: React.FC<Props> = ({ state, updateState, chartData, isMoving }) => {
  const forceData = chartData.map(d => ({ ...d, forceNm: mAtoNm(d.current) }));

  const statusColor = state.eStop ? '#C62828'
    : state.activated ? '#43A047'
    : state.connected ? '#1976D2'
    : '#90A4AE';

  const [scriptText, setScriptText]       = useState('');
  const [logs, setLogs]                   = useState<string[]>([]);
  const [running, setRunning]             = useState(false);
  const [parseErrors, setParseErrors]     = useState<{ line: number; message: string }[]>([]);
  const [helpOpen, setHelpOpen]           = useState(false);
  const [suggestions, setSuggestions]     = useState<typeof ALL_COMMANDS>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  const stopSignalRef = useRef({ stopped: false });
  const logEndRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const stateRef      = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // 방향키 선택 시 자동 스크롤
  useEffect(() => {
    if (!dropdownRef.current || suggestions.length === 0) return;
    const items = dropdownRef.current.querySelectorAll('[data-suggestion-item]');
    const selected = items[suggestionIdx] as HTMLElement;
    selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [suggestionIdx, suggestions]);

  const addLog = (msg: string) => {
    const now = new Date();
    const ts = `${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setLogs(prev => [...prev.slice(-199), `[${ts}] ${msg}`]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const getCurrentWord = useCallback((val: string, cursor: number) => {
    const textBefore = val.slice(0, cursor);
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    return textBefore.slice(lineStart).trimStart();
  }, []);

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setScriptText(val);
    setParseErrors([]);
    const cursor = e.target.selectionStart ?? 0;
    const word = getCurrentWord(val, cursor);
    // 괄호 이전 단어만 매칭 (예: rq_move_and_wait( 입력 중)
    const wordForMatch = word.replace(/\(.*$/, '');
    if (wordForMatch.length >= 2 && !wordForMatch.includes(' ')) {
      const matches = ALL_COMMANDS.filter(c => {
        const cmdBase = c.cmd.replace(/\(.*$/, '').toLowerCase();
        return cmdBase.startsWith(wordForMatch.toLowerCase()) && cmdBase !== wordForMatch.toLowerCase();
      });
      setSuggestions(matches);
      setSuggestionIdx(0);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = useCallback((item: typeof ALL_COMMANDS[0]) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const val = scriptText;
    const textBefore = val.slice(0, cursor);
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    const lineText = textBefore.slice(lineStart);
    const indent = lineText.match(/^(\s*)/)?.[1] ?? '';
    const currentWord = lineText.trimStart();

    const newVal = val.slice(0, lineStart + indent.length) + item.cmd + val.slice(lineStart + indent.length + currentWord.length);
    setScriptText(newVal);
    setSuggestions([]);

    // cursorInside: true → 괄호 안으로 커서 이동
    const insertedLen = item.cmd.length;
    const cursorOffset = item.cursorInside ? insertedLen - 1 : insertedLen;
    const newCursor = lineStart + indent.length + cursorOffset;

    setTimeout(() => {
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
      textareaRef.current?.focus();
    }, 0);
  }, [scriptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      applySuggestion(suggestions[suggestionIdx]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIdx(i => Math.max(i - 1, 0));
    }
  };

  const handleRun = async () => {
    const { commands, errors } = parseScript(scriptText);
    setParseErrors(errors);
    if (errors.length > 0) { addLog(`❌ 파싱 오류 ${errors.length}건 — 실행 중단`); return; }
    if (!state.connected)   { addLog('❌ 연결되지 않음 — Connect 먼저 하세요'); return; }
    setLogs([]);
    setRunning(true);
    stopSignalRef.current = { stopped: false };
    addLog('▶ 스크립트 시작');
    try {
      await runScript(commands, {
        updateState,
        getState: () => stateRef.current,
        onLog: addLog,
        stopSignal: stopSignalRef.current,
      });
    } finally { setRunning(false); }
  };

  const handleStop = () => { stopSignalRef.current.stopped = true; setRunning(false); };

  const handleClear = () => {
    setScriptText('');
    setLogs([]);
    setParseErrors([]);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.2, p: 1.5, overflow: 'hidden' }}>

      <ScriptHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 상단: 차트 */}
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

      {/* 하단: 3분할 */}
      <Box sx={{ display: 'flex', gap: 1.2, flex: 1, minHeight: 0 }}>

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 3.5, p: '10px 12px' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <GripperViewer
              openRatio={state.positionActual / 255} tilt={0} spread={0}
              isMoving={isMoving} statusColor={statusColor}
              objectDetected={state.objectDetected}
              connected={state.connected} activated={state.activated} eStop={state.eStop}
            />
          </Box>
        </Paper>

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 3, p: '12px 14px', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, pb: 1, borderBottom: '1px solid #F0F4F8' }}>
            <LabelSwitch label="Activate" checked={state.activated}
              disabled={!state.connected || state.eStop}
              onChange={v => updateState({ activated: v, goToPosition: false })} />
            <LabelSwitch label="Go to Position" checked={state.goToPosition}
              disabled={!state.activated || state.eStop}
              onChange={v => updateState({ goToPosition: v })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, py: 1 }}>
            {[{ label: 'OPEN', val: 0 }, { label: 'CLOSE', val: 255 }].map(({ label, val }) => {
              const active = state.positionRequest === val && state.goToPosition;
              return (
                <Button key={label} fullWidth size="small"
                  disabled={!state.goToPosition || state.eStop}
                  onClick={() => updateState({ positionRequest: val })}
                  sx={{
                    fontSize: '0.78rem', fontWeight: 200, py: 1, borderRadius: 1.5, boxShadow: 'none',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, flex: 1, justifyContent: 'center' }}>
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

        <Paper elevation={0} {...paperSx} sx={{ ...paperSx.sx, flex: 3.5, p: '10px 12px', gap: 0.8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1A2A3A' }}>Script</Typography>
              <Button size="small" onClick={() => setHelpOpen(true)}
                sx={{ minWidth: 0, width: 20, height: 20, p: 0, borderRadius: '50%', bgcolor: '#EEF2F7', color: '#546E7A', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1, '&:hover': { bgcolor: '#E3F2FD', color: '#1976D2' } }}>
                ?
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.6 }}>
              <Button size="small" onClick={handleClear}
                sx={{ fontSize: '0.65rem', py: 0.2, px: 1, minWidth: 0, color: '#B0BEC5', '&:hover': { color: '#E53935' } }}>
                Clear
              </Button>
              {running ? (
                <Button size="small" onClick={handleStop}
                  sx={{ fontSize: '0.68rem', py: 0.3, px: 1.2, minWidth: 0, bgcolor: '#FFEBEE', color: '#C62828', borderRadius: 1.5, '&:hover': { bgcolor: '#FFCDD2' } }}>
                  ■ Stop
                </Button>
              ) : (
                <Button size="small" onClick={handleRun}
                  sx={{ fontSize: '0.68rem', py: 0.3, px: 1.2, minWidth: 0, bgcolor: '#E3F2FD', color: '#1976D2', borderRadius: 1.5, '&:hover': { bgcolor: '#BBDEFB' } }}>
                  ▶ Run
                </Button>
              )}
            </Box>
          </Box>

          {parseErrors.length > 0 && (
            <Box sx={{ bgcolor: '#FFF3E0', borderRadius: 1, p: '4px 8px', flexShrink: 0 }}>
              {parseErrors.map((e, i) => (
                <Typography key={i} sx={{ fontSize: '0.62rem', color: '#E65100' }}>
                  Line {e.line}: {e.message}
                </Typography>
              ))}
            </Box>
          )}

          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={scriptText}
                onChange={handleScriptChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                spellCheck={false}
                placeholder={'# 스크립트를 입력하세요'}
                style={{
                  width: '100%', height: '100%', resize: 'none',
                  border: '1px solid #EEF2F7', borderRadius: 6,
                  padding: '8px 10px', fontSize: 12,
                  fontFamily: 'monospace', lineHeight: 1.6,
                  color: '#1A2A3A', background: '#FAFBFC',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />

              {suggestions.length > 0 && (
                <Box ref={dropdownRef} sx={{
                  position: 'absolute', top: 4, left: 4, right: 4,
                  bgcolor: '#fff', border: '1px solid #90CAF9',
                  borderRadius: 1.5, boxShadow: '0 4px 20px rgba(25,118,210,0.15)',
                  zIndex: 100, maxHeight: 200, overflowY: 'auto',
                }}>
                  <Box sx={{ px: 1.5, py: 0.5, bgcolor: '#E3F2FD', borderBottom: '1px solid #BBDEFB', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.58rem', color: '#1976D2', fontWeight: 700 }}>
                      자동완성 ({suggestions.length}개)
                    </Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: '#90CAF9' }}>
                      ↑↓ 이동 &nbsp;·&nbsp; Tab/Enter 선택 &nbsp;·&nbsp; Esc 닫기
                    </Typography>
                  </Box>
                  {suggestions.map((s, i) => (
                    <Box key={s.cmd} data-suggestion-item="true"
                      onMouseDown={() => applySuggestion(s)}
                      sx={{
                        px: 1.5, py: 0.9, cursor: 'pointer',
                        bgcolor: i === suggestionIdx ? '#E3F2FD' : 'transparent',
                        borderLeft: i === suggestionIdx ? '3px solid #1976D2' : '3px solid transparent',
                        borderBottom: i < suggestions.length - 1 ? '1px solid #F0F4F8' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.1s',
                        '&:hover': { bgcolor: '#E3F2FD', borderLeft: '3px solid #90CAF9' },
                      }}>
                      <Typography sx={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: i === suggestionIdx ? 700 : 500, color: i === suggestionIdx ? '#1565C0' : '#5E35B1' }}>
                        {s.cmd}
                      </Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: i === suggestionIdx ? '#1976D2' : '#90A4AE', ml: 1, fontWeight: i === suggestionIdx ? 600 : 400 }}>
                        {s.hint}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ height: 80, overflowY: 'auto', bgcolor: '#F0F4F8', borderRadius: 1.5, p: '4px 8px', flexShrink: 0 }}>
              {logs.length === 0 && (
                <Typography sx={{ fontSize: '0.62rem', color: '#B0BEC5', mt: 0.5 }}>실행 로그가 여기에 표시됩니다.</Typography>
              )}
              {logs.map((l, i) => (
                <Typography key={i} sx={{
                  fontSize: '0.62rem', fontFamily: 'monospace', lineHeight: 1.7,
                  color: l.includes('❌') ? '#E53935' : l.includes('✔') ? '#388E3C' : l.includes('🚨') ? '#C62828' : '#546E7A',
                }}>
                  {l}
                </Typography>
              ))}
              <div ref={logEndRef} />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ControlTab;