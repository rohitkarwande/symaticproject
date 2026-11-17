export interface ModbusConfig {
  ip: string;
  port: number;
  slaveId: number;
  pollingIntervalMs: number;
}

export interface ModbusAlarms {
  phaseFail: boolean;
  thermalOverload: boolean;
  dimMinR: boolean;
  dimMinY: boolean;
  dimMinB: boolean;
  dimMaxR?: boolean;
  dimMaxY?: boolean;
  dimMaxB?: boolean;
  alarmBit: boolean;
  testOn: boolean;
  start?: boolean;
  stop?: boolean;
  autoManual?: boolean;
  alarmReset?: boolean;     // 0X: 11 (ALARM_RESET)
  impedanceAlarm?: boolean; // 0X: 12 (IMPEDANCE_ALARM)
  noCurrentAlarm?: boolean; // 0X: 13 (NO_CURRENT_ALARM)
  cycleCompleted?: boolean; // 0X: 14 (CYCLE_COMPLITED)
  timerStart?: boolean;     // 0X: 15 (TIMER_START)
}

export interface DimmerStatus {
  rDimmerZero: boolean;
  yDimmerZero: boolean;
  bDimmerZero: boolean;
  rDimmerMax: boolean;
  yDimmerMax: boolean;
  bDimmerMax: boolean;
}

export interface PhaseValues {
  r: number;
  y: number;
  b: number;
}

export interface ModbusDataPayload {
  connected: boolean;
  timestamp: string;
  
  // 48 RTD Temperature Channels (1..48 in °C from Holding Registers 1..48)
  temperatures: Record<number, number>;
  rawTemperatures?: Record<number, number>;
  
  // Phase Measurements (Float32 values in A from Holding Registers 49, 51, 53)
  voltages: PhaseValues;
  currents: PhaseValues;
  outputCurrents: PhaseValues;
  
  // Controls & Parameters
  setpointCurrent: number;
  setTimer?: number;        // 4X: 57 (SET_TIMER) [Word, Read/Write]
  actTimerMin?: number;     // 4X: 58 (ACT_TIMER_MIN) [Word, Read]
  actTimerHrs?: number;     // 4X: 59 (ACT_TIMER_HRS) [Word, Read]
  hysteresis: number;
  ctRange: number;
  
  // Alarm Bits & Coils
  alarms: ModbusAlarms;
  rawRegisters?: Record<number, number>;
  coils?: Record<number | string, boolean>;
  dimmers?: DimmerStatus;
  testOn?: boolean;         // 0X: 10 (TEST_ON)
  alarmReset?: boolean;     // 0X: 11 (ALARM_RESET)
  impedanceAlarm?: boolean; // 0X: 12 (IMPEDANCE_ALARM)
  noCurrentAlarm?: boolean; // 0X: 13 (NO_CURRENT_ALARM)
  cycleCompleted?: boolean; // 0X: 14 (CYCLE_COMPLITED)
  timerStart?: boolean;     // 0X: 15 (TIMER_START) — Controls automated logging
  
  // HMI Text String Parameters
  customerName?: string;
  objDetails?: string;
  objSr?: string;
  objModel?: string;
  testedBy?: string;
}

export interface ModbusStatus {
  connected: boolean;
  ip: string;
  port: number;
  slaveId: number;
  lastPollTimestamp?: string;
  error?: string;
}

export type ModbusRegisterFormat = 'int' | 'float';

export interface WriteSpecResult {
  success: boolean;
  message: string;
  writtenRegisters: { address: number; val: number }[];
}

export interface WriteCoilResult {
  success: boolean;
  message: string;
  writtenCoils: { address: number; state: boolean }[];
}

export interface ReadCoilsResult {
  success: boolean;
  coils: Record<number, boolean>;
  buffer?: number[];
}

declare global {
  interface Window {
    electronAPI?: {
      appVersion?: string;
      platform?: string;
      exportPdf?: (filename: string) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>;
      db?: any;
      modbus?: {
        connect: (config?: Partial<ModbusConfig>) => Promise<boolean>;
        disconnect: () => Promise<boolean>;
        getStatus: () => Promise<ModbusStatus>;
        readCoils: (startAddress: number, quantity: number) => Promise<ReadCoilsResult>;
        writeCoil: (address: number, state: boolean) => Promise<boolean>;
        writeCoilStatus: (address: number, state: boolean) => Promise<WriteCoilResult>;
        pulseCoil: (address: number, durationMs?: number) => Promise<{ success: boolean; message: string }>;
        writeRegister: (address: number, value: number) => Promise<boolean>;
        writeMultipleRegisters: (startAddress: number, registers: number[]) => Promise<boolean>;
        writeFloatRegister: (address: number, value: number, wordSwap?: boolean) => Promise<boolean>;
        writeTestSpecification: (
          spec: { ratedVoltage: number; ratedCurrent: number; testCurrent: number },
          startAddress?: number,
          format?: ModbusRegisterFormat,
          wordSwap?: boolean
        ) => Promise<WriteSpecResult>;
        testDiagnostic: (ip: string, port: number) => Promise<{ success: boolean; message: string }>;
        onData: (callback: (payload: ModbusDataPayload) => void) => () => void;
        onStatus: (callback: (status: ModbusStatus) => void) => () => void;
      };
    };
  }
}
