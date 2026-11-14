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
  alarmBit: boolean;
  testOn: boolean;
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
  hysteresis: number;
  ctRange: number;
  
  // Alarm Bits
  alarms: ModbusAlarms;
  rawRegisters?: Record<number, number>;
  
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

declare global {
  interface Window {
    electronAPI?: {
      appVersion?: string;
      platform?: string;
      db?: any;
      modbus?: {
        connect: (config?: Partial<ModbusConfig>) => Promise<boolean>;
        disconnect: () => Promise<boolean>;
        getStatus: () => Promise<ModbusStatus>;
        writeCoil: (address: number, state: boolean) => Promise<boolean>;
        writeCoilStatus: (address: number, state: boolean) => Promise<WriteCoilResult>;
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
