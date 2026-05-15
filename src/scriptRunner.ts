import { invoke } from '@tauri-apps/api/core';
import { GripperState } from './App';

// ── 지원 명령어 (Robotiq 함수 기반) ──────────────────────────────────────────
// 괄호 있음/없음 모두 지원: rq_open_and_wait() 또는 rq_open_and_wait
//
// [표준 명령어]
// rq_activate_and_wait()           - 그리퍼 초기화 및 활성화
// rq_open_and_wait()               - 완전 열기 (position=0)
// rq_close_and_wait()              - 완전 닫기 (position=255)
// rq_move_and_wait(pos)            - 위치 이동 (0~255)
// rq_move_and_wait_norm(pos)       - 위치 이동 % (0~100)
// rq_set_speed(speed)              - 속도 설정 (0~255)
// rq_set_speed_norm(speed)         - 속도 설정 % (0~100)
// rq_set_force(force)              - 힘 설정 (0~255)
// rq_set_force_norm(force)         - 힘 설정 % (0~100)
//
// [추가 명령어]
// rq_emergency_release()           - 비상 해제 (E-Stop)
// rq_reset()                       - 비활성화 후 재활성화
// LOG(message)                     - 로그 출력
//
// [조건문]
// IF rq_is_object_detected()       - 물체 감지 시 실행
//   ...
// ELSE
//   ...
// ENDIF
//
// [흐름 제어]
// WAIT(ms)                         - 밀리초 대기
// REPEAT(n) ... END                - n회 반복
// # 주석

export type Command =
  | { type: 'ACTIVATE' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'MOVE';       value: number }
  | { type: 'MOVE_NORM';  value: number }
  | { type: 'SPEED';      value: number }
  | { type: 'SPEED_NORM'; value: number }
  | { type: 'FORCE';      value: number }
  | { type: 'FORCE_NORM'; value: number }
  | { type: 'EMERGENCY' }
  | { type: 'RESET' }
  | { type: 'LOG';        message: string }
  | { type: 'WAIT';       ms: number }
  | { type: 'REPEAT';     count: number; block: Command[] }
  | { type: 'IF_OBJECT';  thenBlock: Command[]; elseBlock: Command[] }

export interface ParseError { line: number; message: string }
export interface ParseResult { commands: Command[]; errors: ParseError[] }

type BlockFrame =
  | { kind: 'REPEAT'; count: number; block: Command[] }
  | { kind: 'IF'; thenBlock: Command[]; elseBlock: Command[]; inElse: boolean }

// ── 라인 파서: rq_cmd(arg) 또는 rq_cmd arg 모두 처리 ─────────────────────────
function parseLine(raw: string): { name: string; args: string[] } {
  // 인라인 주석 제거
  const line = raw.split('#')[0].trim();

  // 괄호 스타일: rq_move_and_wait(128) 또는 LOG(hello world)
  const parenMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)\s*$/);
  if (parenMatch) {
    const name = parenMatch[1].toLowerCase();
    const argStr = parenMatch[2].trim();
    const args = argStr ? argStr.split(/\s*,\s*|\s+/).filter(Boolean) : [];
    return { name, args };
  }

  // 스페이스 스타일: rq_move_and_wait 128
  const parts = line.split(/\s+/);
  return {
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
  };
}

// ── 파서 ──────────────────────────────────────────────────────────────────────
export function parseScript(text: string): ParseResult {
  const lines = text.split('\n');
  const errors: ParseError[] = [];
  const commands: Command[] = [];
  const blockStack: BlockFrame[] = [];

  const push = (cmd: Command) => {
    if (blockStack.length === 0) { commands.push(cmd); return; }
    const top = blockStack[blockStack.length - 1];
    if (top.kind === 'REPEAT') { top.block.push(cmd); }
    else if (top.kind === 'IF') {
      if (top.inElse) top.elseBlock.push(cmd);
      else top.thenBlock.push(cmd);
    }
  };

  const checkNorm = (val: number, cmd: string, ln: number) => {
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push({ line: ln, message: `${cmd} 값은 0~100 정수(%)여야 합니다.` });
      return false;
    }
    return true;
  };

  const checkReg = (val: number, cmd: string, ln: number) => {
    if (isNaN(val) || val < 0 || val > 255) {
      errors.push({ line: ln, message: `${cmd} 값은 0~255 정수여야 합니다.` });
      return false;
    }
    return true;
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;

    // IF 조건문 특수 처리 (IF rq_is_object_detected())
    const ifMatch = raw.match(/^if\s+rq_is_object_detected\s*\(\s*\)\s*$/i)
      || raw.match(/^if\s+rq_is_object_detected\s*$/i);
    if (ifMatch) {
      blockStack.push({ kind: 'IF', thenBlock: [], elseBlock: [], inElse: false });
      continue;
    }

    const { name, args } = parseLine(raw);

    switch (name) {
      case 'rq_activate_and_wait': push({ type: 'ACTIVATE' }); break;
      case 'rq_open_and_wait':     push({ type: 'OPEN' }); break;
      case 'rq_close_and_wait':    push({ type: 'CLOSE' }); break;
      case 'rq_emergency_release': push({ type: 'EMERGENCY' }); break;
      case 'rq_reset':             push({ type: 'RESET' }); break;

      case 'rq_move_and_wait': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkReg(val, 'rq_move_and_wait', lineNum)) push({ type: 'MOVE', value: val });
        break;
      }
      case 'rq_move_and_wait_norm': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkNorm(val, 'rq_move_and_wait_norm', lineNum)) push({ type: 'MOVE_NORM', value: val });
        break;
      }
      case 'rq_set_speed': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkReg(val, 'rq_set_speed', lineNum)) push({ type: 'SPEED', value: val });
        break;
      }
      case 'rq_set_speed_norm': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkNorm(val, 'rq_set_speed_norm', lineNum)) push({ type: 'SPEED_NORM', value: val });
        break;
      }
      case 'rq_set_force': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkReg(val, 'rq_set_force', lineNum)) push({ type: 'FORCE', value: val });
        break;
      }
      case 'rq_set_force_norm': {
        const val = parseInt(args[0] ?? '', 10);
        if (checkNorm(val, 'rq_set_force_norm', lineNum)) push({ type: 'FORCE_NORM', value: val });
        break;
      }

      case 'log': {
        // LOG(message) 또는 LOG message
        const message = args.join(' ');
        push({ type: 'LOG', message });
        break;
      }

      case 'wait': {
        const ms = parseInt(args[0] ?? '', 10);
        if (isNaN(ms) || ms < 0) errors.push({ line: lineNum, message: 'WAIT 값은 0 이상 정수(ms)여야 합니다.' });
        else push({ type: 'WAIT', ms });
        break;
      }

      case 'repeat': {
        const count = parseInt(args[0] ?? '', 10);
        if (isNaN(count) || count < 1) errors.push({ line: lineNum, message: 'REPEAT 값은 1 이상 정수여야 합니다.' });
        else blockStack.push({ kind: 'REPEAT', count, block: [] });
        break;
      }
      case 'end': {
        const top = blockStack[blockStack.length - 1];
        if (!top || top.kind !== 'REPEAT') errors.push({ line: lineNum, message: 'END에 대응하는 REPEAT가 없습니다.' });
        else { blockStack.pop(); push({ type: 'REPEAT', count: top.count, block: top.block }); }
        break;
      }

      case 'else': {
        const top = blockStack[blockStack.length - 1];
        if (!top || top.kind !== 'IF') errors.push({ line: lineNum, message: 'ELSE에 대응하는 IF가 없습니다.' });
        else top.inElse = true;
        break;
      }
      case 'endif': {
        const top = blockStack[blockStack.length - 1];
        if (!top || top.kind !== 'IF') errors.push({ line: lineNum, message: 'ENDIF에 대응하는 IF가 없습니다.' });
        else { blockStack.pop(); push({ type: 'IF_OBJECT', thenBlock: top.thenBlock, elseBlock: top.elseBlock }); }
        break;
      }

      default:
        errors.push({ line: lineNum, message: `알 수 없는 명령어: ${lines[i].trim().split(/[\s(]/)[0]}` });
    }
  }

  for (const frame of blockStack) {
    if (frame.kind === 'REPEAT') errors.push({ line: lines.length, message: 'REPEAT 블록이 END 없이 끝났습니다.' });
    if (frame.kind === 'IF')     errors.push({ line: lines.length, message: 'IF 블록이 ENDIF 없이 끝났습니다.' });
  }

  return { commands, errors };
}

// ── 실행기 ────────────────────────────────────────────────────────────────────
export interface RunnerOptions {
  updateState: (patch: Partial<GripperState>) => void;
  getState:    () => GripperState;
  onLog:       (msg: string) => void;
  stopSignal:  { stopped: boolean };
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const toReg = (pct: number) => Math.round(pct / 100 * 255);

async function execCommands(commands: Command[], opts: RunnerOptions, depth = 0): Promise<void> {
  const { updateState, getState, onLog, stopSignal } = opts;

  for (const cmd of commands) {
    if (stopSignal.stopped) { onLog('⏹ 중지됨'); return; }

    switch (cmd.type) {
      case 'ACTIVATE':
        updateState({ activated: true, goToPosition: true });
        onLog('✅ rq_activate_and_wait()');
        await sleep(500);
        break;
      case 'OPEN':
        updateState({ positionRequest: 0 });
        onLog('🔓 rq_open_and_wait()');
        break;
      case 'CLOSE':
        updateState({ positionRequest: 255 });
        onLog('🔒 rq_close_and_wait()');
        break;
      case 'MOVE':
        updateState({ positionRequest: cmd.value });
        onLog(`📐 rq_move_and_wait(${cmd.value})`);
        break;
      case 'MOVE_NORM': {
        const pos = toReg(cmd.value);
        updateState({ positionRequest: pos });
        onLog(`📐 rq_move_and_wait_norm(${cmd.value}) → ${pos}`);
        break;
      }
      case 'SPEED':
        updateState({ speed: cmd.value });
        onLog(`⚡ rq_set_speed(${cmd.value})`);
        break;
      case 'SPEED_NORM': {
        const spd = toReg(cmd.value);
        updateState({ speed: spd });
        onLog(`⚡ rq_set_speed_norm(${cmd.value}) → ${spd}`);
        break;
      }
      case 'FORCE':
        updateState({ force: cmd.value });
        onLog(`💪 rq_set_force(${cmd.value})`);
        break;
      case 'FORCE_NORM': {
        const frc = toReg(cmd.value);
        updateState({ force: frc });
        onLog(`💪 rq_set_force_norm(${cmd.value}) → ${frc}`);
        break;
      }
      case 'EMERGENCY':
        try {
          // ✅ 하드웨어에 즉시 E-Stop (레지스터 1000 = 0)
          await invoke('modbus_write_single_register', { address: 1000, value: 0 });
        } catch (err) {
          onLog(`⚠️ E-Stop 하드웨어 쓰기 실패: ${err}`);
        }
        updateState({ eStop: true, goToPosition: false, activated: false });
        onLog('🚨 rq_emergency_release() — E-Stop 발동');
        break;
      case 'RESET':
        updateState({ activated: false, goToPosition: false });
        onLog('🔄 rq_reset() — 비활성화 중...');
        await sleep(500);
        updateState({ activated: true, goToPosition: true, eStop: false });
        onLog('🔄 rq_reset() — 재활성화 완료');
        await sleep(500);
        break;
      case 'LOG':
        onLog(`💬 ${cmd.message}`);
        break;
      case 'WAIT':
        onLog(`⏳ WAIT(${cmd.ms}ms)`);
        await sleep(cmd.ms);
        break;
      case 'REPEAT':
        for (let i = 0; i < cmd.count; i++) {
          if (stopSignal.stopped) return;
          onLog(`🔁 REPEAT ${i + 1}/${cmd.count}`);
          await execCommands(cmd.block, opts, depth + 1);
        }
        break;
      case 'IF_OBJECT': {
        const detected = getState().objectDetected;
        onLog(`🔍 IF rq_is_object_detected() → ${detected ? '감지됨 ✅' : '미감지 ❌'}`);
        const block = detected ? cmd.thenBlock : cmd.elseBlock;
        if (block.length > 0) await execCommands(block, opts, depth + 1);
        break;
      }
    }
  }
}

export async function runScript(commands: Command[], opts: RunnerOptions): Promise<void> {
  await execCommands(commands, opts);
  if (!opts.stopSignal.stopped) opts.onLog('✔ 완료');
}
