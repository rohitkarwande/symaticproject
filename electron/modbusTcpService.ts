import net from 'net';
import EventEmitter from 'events';

export interface ModbusServiceConfig {
  ip: string;
  port: number;
  slaveId: number;
  pollingIntervalMs: number;
}

export interface PhaseValues {
  r: number;
  y: number;
  b: number;
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

export interface ModbusDataPayload {
  connected: boolean;
  timestamp: string;
  temperatures: Record<number, number>; // Point 1..48 in °C (from Holding Registers 1..48)
  rawTemperatures?: Record<number, number>;
  voltages: PhaseValues;
  currents: PhaseValues; // R, Y, B (from Holding Registers 49, 51, 53)
  outputCurrents: PhaseValues;
  setpointCurrent: number;
  setTimer?: number;        // 4X: 57 (SET_TIMER)
  actTimerMin?: number;     // 4X: 58 (ACT_TIMER_MIN)
  actTimerHrs?: number;     // 4X: 59 (ACT_TIMER_HRS)
  hysteresis: number;
  ctRange: number;
  alarms: ModbusAlarms;
  rawRegisters?: Record<number, number>;
  coils?: Record<number | string, boolean>;
  dimmers?: DimmerStatus;
  testOn?: boolean;         // 0X: 10
  alarmReset?: boolean;     // 0X: 11
  impedanceAlarm?: boolean; // 0X: 12
  noCurrentAlarm?: boolean; // 0X: 13
  cycleCompleted?: boolean; // 0X: 14
  timerStart?: boolean;     // 0X: 15
}

export const PREDEFINED_MODBUS_IP = '192.168.0.200';
export const PREDEFINED_MODBUS_PORT = 502;
export const PREDEFINED_MODBUS_SLAVE_ID = 1;

export class ModbusTcpService extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: ModbusServiceConfig = {
    ip: PREDEFINED_MODBUS_IP,
    port: PREDEFINED_MODBUS_PORT,
    slaveId: PREDEFINED_MODBUS_SLAVE_ID,
    pollingIntervalMs: 500,
  };

  private connected: boolean = false;
  private transactionId: number = 1;
  private pollTimer: NodeJS.Timeout | null = null;
  private autoReconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private failedPollCount: number = 0;
  private isPolling: boolean = false;
  private detectedPduOffset: number | null = null;
  private detectedCoilPduOffset: number | null = null;
  private pendingRequests = new Map<number, { resolve: (data: Buffer | null) => void; reject: (err: Error) => void }>();
  private receiveBuffer: Buffer = Buffer.alloc(0);

  constructor() {
    super();
    this.startAutoConnectLoop();
  }

  public getConfig(): ModbusServiceConfig {
    return { ...this.config };
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public updateConfig(newConfig: Partial<ModbusServiceConfig>) {
    this.config = {
      ...this.config,
      ip: PREDEFINED_MODBUS_IP,
      port: PREDEFINED_MODBUS_PORT,
      slaveId: PREDEFINED_MODBUS_SLAVE_ID,
      ...newConfig,
    };
  }

  public startAutoConnectLoop() {
    if (this.autoReconnectTimer) return;
    this.autoReconnectTimer = setInterval(async () => {
      if (!this.connected && !this.isConnecting) {
        this.isConnecting = true;
        try {
          await this.connect();
        } catch {
          // Retry on next interval
        } finally {
          this.isConnecting = false;
        }
      }
    }, 1500);
  }

  public async connect(): Promise<boolean> {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    return new Promise((resolve) => {
      let isResolved = false;

      this.socket = new net.Socket();
      this.socket.setTimeout(2500);

      this.socket.connect(this.config.port, this.config.ip, () => {
        console.log(`[Modbus TCP] Connected to hardware at ${this.config.ip}:${this.config.port}`);
        this.connected = true;
        this.failedPollCount = 0;
        this.detectedPduOffset = null;
        this.detectedCoilPduOffset = null;
        this.socket?.setTimeout(0); // Disable idle timeout once connected
        this.emit('status', {
          connected: true,
          ip: this.config.ip,
          port: this.config.port,
          slaveId: this.config.slaveId,
          error: undefined,
        });
        this.startPolling();
        if (!isResolved) {
          isResolved = true;
          resolve(true);
        }
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (err) => {
        this.handleDisconnect(err.message);
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });

      this.socket.on('close', () => {
        this.handleDisconnect('Socket connection closed');
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });

      this.socket.on('timeout', () => {
        this.handleDisconnect(`Connection timeout at ${this.config.ip}:${this.config.port}`);
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });
    });
  }

  public handleDisconnect(reason?: string) {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    const wasConnected = this.connected;
    this.connected = false;
    this.detectedPduOffset = null;
    this.detectedCoilPduOffset = null;
    this.failedPollCount = 0;

    if (wasConnected) {
      console.warn(`[Modbus TCP] Hardware disconnected: ${reason || 'cable removed'}`);
      this.emit('status', { connected: false, error: reason });
      this.emit('data', {
        connected: false,
        timestamp: new Date().toISOString(),
        temperatures: {},
        currents: { r: 0, y: 0, b: 0 },
        voltages: { r: 0, y: 0, b: 0 },
        outputCurrents: { r: 0, y: 0, b: 0 },
        setpointCurrent: 0,
        hysteresis: 0,
        ctRange: 2000,
        alarms: { phaseFail: false, thermalOverload: false, dimMinR: false, dimMinY: false, dimMinB: false, alarmBit: false, testOn: false },
        coils: {},
        dimmers: { rDimmerZero: false, yDimmerZero: false, bDimmerZero: false, rDimmerMax: false, yDimmerMax: false, bDimmerMax: false },
      });
    }
  }

  public disconnect() {
    this.handleDisconnect('User requested disconnect');
  }

  private startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(async () => {
      if (this.isPolling) return; // Prevent overlapping poll cycles
      this.isPolling = true;
      try {
        await this.pollData();
      } catch (err: any) {
        console.warn('[Modbus TCP] Poll error:', err.message);
      } finally {
        this.isPolling = false;
      }
    }, this.config.pollingIntervalMs);
  }

  private async pollData() {
    if (!this.socket || !this.connected) {
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      // Hardware Register Mapping from CSV:
      // TEMP_1 .. TEMP_48: Holding Registers 4X 1..48 (1 word each)
      // Current R Phase_OP_MTR: Holding Register 4X 49 (2 words, 32-bit Float)
      // Current Y Phase_OP_MTR: Holding Register 4X 51 (2 words, 32-bit Float)
      // Current B Phase_OP_MTR: Holding Register 4X 53 (2 words, 32-bit Float)
      // SET_CURRENT: Holding Register 4X 55 (2 words, 32-bit Float)
      // SET_TIMER: Holding Register 4X 57 (1 word, Word)
      // ACT_TIMER_MIN: Holding Register 4X 58 (1 word, Word)
      // ACT_TIMER_HRS: Holding Register 4X 59 (1 word, Word)
      // Total contiguous span: 60 holding registers (120 bytes)

      let bulkBuffer: Buffer | null = null;
      let startPdu = this.detectedPduOffset ?? 0;

      if (this.detectedPduOffset !== null) {
        // Use cached PDU offset
        bulkBuffer = await this.readHoldingRegisters(this.detectedPduOffset, 60);
      } else {
        // Auto-detect: Try 1-based PDU address 0 (4X 1 = PDU 0) for 60 registers
        bulkBuffer = await this.readHoldingRegisters(0, 60);
        if (bulkBuffer && bulkBuffer.length >= 120) {
          startPdu = 0;
          this.detectedPduOffset = 0;
        } else {
          // Try 0-based PDU address 1 (4X 1 = PDU 1) for 60 registers
          bulkBuffer = await this.readHoldingRegisters(1, 60);
          if (bulkBuffer && bulkBuffer.length >= 120) {
            startPdu = 1;
            this.detectedPduOffset = 1;
          }
        }
      }

      // If bulk 60-register read failed (e.g. PLC max packet limitation), split into chunks
      let tempBuffer: Buffer | null = null;
      let currentBuffer: Buffer | null = null;

      if (!bulkBuffer) {
        const offset = this.detectedPduOffset ?? 0;
        // Read 48 temperature registers
        tempBuffer = await this.readHoldingRegisters(offset, 48);
        if (!tempBuffer && this.detectedPduOffset === null) {
          tempBuffer = await this.readHoldingRegisters(1, 48);
          if (tempBuffer && tempBuffer.length >= 96) {
            startPdu = 1;
            this.detectedPduOffset = 1;
          }
        }
        // Read 12 registers (Starting at Address 49: R, Y, B currents + SET_CURRENT + SET_TIMER + ACT_TIMERS)
        const currentPdu = (this.detectedPduOffset ?? startPdu) === 0 ? 48 : 49;
        currentBuffer = await this.readHoldingRegisters(currentPdu, 12);
      }

      // Check if hardware stopped responding (Ethernet cable disconnected)
      if (!bulkBuffer && !tempBuffer && !currentBuffer) {
        this.failedPollCount++;
        if (this.failedPollCount >= 2) {
          this.handleDisconnect('Ethernet cable disconnected / controller offline');
          return;
        }
      } else {
        this.failedPollCount = 0;
      }

      const temps: Record<number, number> = {};
      const rawTemps: Record<number, number> = {};
      const rawRegs: Record<number, number> = {};

      // Parse 48 RTD Temperature Channels
      const tBuf = bulkBuffer || tempBuffer;
      if (tBuf && tBuf.length >= 2) {
        const wordsAvailable = Math.min(48, Math.floor(tBuf.length / 2));
        for (let i = 0; i < wordsAvailable; i++) {
          const rawInt = tBuf.readInt16BE(i * 2);
          const channelId = i + 1;
          rawTemps[channelId] = rawInt;
          rawRegs[channelId] = rawInt;

          // Convert raw integer to temperature in °C
          // User specification: "temperature will come like 254 so we have to consider 25.4 degree celcius"
          // Condition: "if current at any point comes above 30000 show fail in ui for that sensor(point)"
          let calculatedTemp = 0;
          if (rawInt >= 30000) {
            calculatedTemp = 30000; // Flagged as fail for UI
          } else {
            calculatedTemp = Math.round((rawInt / 10.0) * 10) / 10;
          }
          temps[channelId] = calculatedTemp;
        }
      }

      // Parse 3-Phase Currents (Registers 49, 51, 53 — 2 words each Word-Swapped Float32 CD AB) and SET_CURRENT (Register 55)
      // Plus SET_TIMER (57), ACT_TIMER_MIN (58), ACT_TIMER_HRS (59)
      const cBuf = bulkBuffer ? bulkBuffer.subarray(96, 120) : currentBuffer;
      let currR = 0;
      let currY = 0;
      let currB = 0;
      let setpointCurrent = 0;
      let setTimer = 0;
      let actTimerMin = 0;
      let actTimerHrs = 0;

      if (cBuf && cBuf.length >= 12) {
        rawRegs[49] = cBuf.readUInt16BE(0);
        rawRegs[50] = cBuf.readUInt16BE(2);
        rawRegs[51] = cBuf.readUInt16BE(4);
        rawRegs[52] = cBuf.readUInt16BE(6);
        rawRegs[53] = cBuf.readUInt16BE(8);
        rawRegs[54] = cBuf.readUInt16BE(10);

        currR = this.parse32BitValue(cBuf, 0);
        currY = this.parse32BitValue(cBuf, 4);
        currB = this.parse32BitValue(cBuf, 8);

        if (cBuf.length >= 16) {
          rawRegs[55] = cBuf.readUInt16BE(12);
          rawRegs[56] = cBuf.readUInt16BE(14);
          setpointCurrent = this.parse32BitValue(cBuf, 12);
        }

        if (cBuf.length >= 18) {
          rawRegs[57] = cBuf.readUInt16BE(16);
          setTimer = rawRegs[57];
        }
        if (cBuf.length >= 20) {
          rawRegs[58] = cBuf.readUInt16BE(18);
          actTimerMin = rawRegs[58];
        }
        if (cBuf.length >= 22) {
          rawRegs[59] = cBuf.readUInt16BE(20);
          actTimerHrs = rawRegs[59];
        }
      }

      const currents: PhaseValues = {
        r: currR,
        y: currY,
        b: currB,
      };

      // --- Read Coils 0X 1..16 (START=1, STOP=2, ALARM_DIM_MIN_R=3..5, DIMMER_MAX_SW_R=6..8, AUTO_MANUAL=9, TEST_ON=10, ALARM_RESET=11, IMPEDANCE_ALARM=12, NO_CURRENT_ALARM=13, CYCLE_COMPLITED=14, TIMER_START=15) ---
      let coilBuffer: Buffer | null = null;
      if (this.detectedCoilPduOffset !== null) {
        coilBuffer = await this.readCoils(this.detectedCoilPduOffset, 16);
      } else {
        coilBuffer = await this.readCoils(0, 16);
        if (coilBuffer && coilBuffer.length >= 2) {
          this.detectedCoilPduOffset = 0;
        } else {
          coilBuffer = await this.readCoils(1, 16);
          if (coilBuffer && coilBuffer.length >= 2) {
            this.detectedCoilPduOffset = 1;
          }
        }
      }

      const coilsMap: Record<number, boolean> = {};
      if (coilBuffer && coilBuffer.length >= 1) {
        for (let i = 0; i < Math.min(16, coilBuffer.length * 8); i++) {
          const byteIdx = Math.floor(i / 8);
          const bitIdx = i % 8;
          coilsMap[i + 1] = Boolean((coilBuffer[byteIdx] >> bitIdx) & 1);
        }
      }

      const startCoil = Boolean(coilsMap[1]);
      const stopCoil = Boolean(coilsMap[2]);
      const dimMinR = Boolean(coilsMap[3]);
      const dimMinY = Boolean(coilsMap[4]);
      const dimMinB = Boolean(coilsMap[5]);
      const dimMaxR = Boolean(coilsMap[6]);
      const dimMaxY = Boolean(coilsMap[7]);
      const dimMaxB = Boolean(coilsMap[8]);
      const autoManual = Boolean(coilsMap[9]);
      const testOn = Boolean(coilsMap[10]);             // 0X: 10 (TEST_ON)
      const alarmReset = Boolean(coilsMap[11]);         // 0X: 11 (ALARM_RESET)
      const impedanceAlarm = Boolean(coilsMap[12]);     // 0X: 12 (IMPEDANCE_ALARM)
      const noCurrentAlarm = Boolean(coilsMap[13]);     // 0X: 13 (NO_CURRENT_ALARM)
      const cycleCompleted = Boolean(coilsMap[14]);     // 0X: 14 (CYCLE_COMPLITED)
      const timerStart = Boolean(coilsMap[15]);         // 0X: 15 (TIMER_START)

      const payload: ModbusDataPayload = {
        connected: true,
        timestamp,
        temperatures: temps,
        rawTemperatures: rawTemps,
        voltages: { r: 0, y: 0, b: 0 },
        currents,
        outputCurrents: currents,
        setpointCurrent,
        setTimer,
        actTimerMin,
        actTimerHrs,
        hysteresis: 0,
        ctRange: 2000,
        rawRegisters: rawRegs,
        testOn,
        alarmReset,
        impedanceAlarm,
        noCurrentAlarm,
        cycleCompleted,
        timerStart,
        coils: {
          ...coilsMap,
          start: startCoil,
          stop: stopCoil,
          dimMinR,
          dimMinY,
          dimMinB,
          dimMaxR,
          dimMaxY,
          dimMaxB,
          autoManual,
          testOn,
          alarmReset,
          impedanceAlarm,
          noCurrentAlarm,
          cycleCompleted,
          timerStart,
          10: testOn,
          11: alarmReset,
          12: impedanceAlarm,
          13: noCurrentAlarm,
          14: cycleCompleted,
          15: timerStart,
        },
        dimmers: {
          rDimmerZero: dimMinR,
          yDimmerZero: dimMinY,
          bDimmerZero: dimMinB,
          rDimmerMax: dimMaxR,
          yDimmerMax: dimMaxY,
          bDimmerMax: dimMaxB,
        },
        alarms: {
          phaseFail: false,
          thermalOverload: false,
          dimMinR,
          dimMinY,
          dimMinB,
          dimMaxR,
          dimMaxY,
          dimMaxB,
          alarmBit: dimMinR || dimMinY || dimMinB || dimMaxR || dimMaxY || dimMaxB || impedanceAlarm || noCurrentAlarm,
          testOn,
          start: startCoil,
          stop: stopCoil,
          autoManual,
          alarmReset,
          impedanceAlarm,
          noCurrentAlarm,
          cycleCompleted,
          timerStart,
        },
      };

      this.emit('data', payload);
    } catch (err: any) {
      console.warn('[Modbus TCP] Polling error:', err.message);
    }
  }

  private parse32BitValue(buf: Buffer, offsetByte: number): number {
    try {
      if (offsetByte + 4 > buf.length) return 0.0;

      const w0 = buf.readUInt16BE(offsetByte);     // Word 0 (CD)
      const w1 = buf.readUInt16BE(offsetByte + 2); // Word 1 (AB)

      // User specification: "current format is Word-Swapped Float32 (CD AB)"
      // Put AB (Word 1) in high order and CD (Word 0) in low order to decode IEEE 754 Float32
      const swapBuf = Buffer.alloc(4);
      swapBuf.writeUInt16BE(w1, 0);
      swapBuf.writeUInt16BE(w0, 2);
      const floatVal = swapBuf.readFloatBE(0);

      if (!isNaN(floatVal) && isFinite(floatVal) && Math.abs(floatVal) <= 1000000) {
        return Math.round(floatVal * 10) / 10;
      }

      // Secondary check: Standard Big-Endian Float32 (AB CD) fallback
      const floatBE = buf.readFloatBE(offsetByte);
      if (!isNaN(floatBE) && isFinite(floatBE) && Math.abs(floatBE) <= 1000000) {
        return Math.round(floatBE * 10) / 10;
      }

      // Integer fallback (if words contain raw integer current)
      const uintVal = (w1 << 16) | w0;
      if (uintVal > 0 && uintVal <= 1000000) {
        return Math.round(uintVal * 10) / 10;
      }

      return 0.0;
    } catch {
      return 0.0;
    }
  }

  // --- Native Modbus TCP MBAP Low-Level Framing ---
  private async readHoldingRegisters(startAddress: number, quantity: number): Promise<Buffer | null> {
    if (!this.socket || !this.connected) return null;

    const tId = this.getNextTransactionId();
    const requestFrame = Buffer.alloc(12);

    // MBAP Header
    requestFrame.writeUInt16BE(tId, 0); // Transaction ID
    requestFrame.writeUInt16BE(0, 2);   // Protocol ID (0 = Modbus)
    requestFrame.writeUInt16BE(6, 4);   // Length (6 bytes follow)
    requestFrame.writeUInt8(this.config.slaveId, 6); // Slave Unit ID

    // PDU
    requestFrame.writeUInt8(3, 7);              // Function Code 03 (Read Holding Registers)
    requestFrame.writeUInt16BE(startAddress, 8); // Start Address
    requestFrame.writeUInt16BE(quantity, 10);   // Quantity

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | null = null;

      this.pendingRequests.set(tId, {
        resolve: (data: Buffer | null) => {
          if (timer) clearTimeout(timer);
          if (data && data.length >= 9 && data.readUInt8(7) === 3) {
            const byteCount = data.readUInt8(8);
            const regBuffer = data.subarray(9, 9 + byteCount);
            resolve(regBuffer);
          } else {
            resolve(null);
          }
        },
        reject: () => {
          if (timer) clearTimeout(timer);
          resolve(null);
        },
      });

      this.socket?.write(requestFrame, (err) => {
        if (err) {
          if (timer) clearTimeout(timer);
          this.pendingRequests.delete(tId);
          resolve(null);
        }
      });

      // 1200ms timeout per request to allow thorough PLC scan cycle
      timer = setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(null);
        }
      }, 1200);
    });
  }

  private async readCoils(startAddress: number, quantity: number): Promise<Buffer | null> {
    if (!this.socket || !this.connected) return null;

    const tId = this.getNextTransactionId();
    const requestFrame = Buffer.alloc(12);

    requestFrame.writeUInt16BE(tId, 0);
    requestFrame.writeUInt16BE(0, 2);
    requestFrame.writeUInt16BE(6, 4);
    requestFrame.writeUInt8(this.config.slaveId, 6);

    requestFrame.writeUInt8(1, 7);              // FC 01 (Read Coil Status)
    requestFrame.writeUInt16BE(startAddress, 8); // Start Address
    requestFrame.writeUInt16BE(quantity, 10);   // Quantity of Coils

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | null = null;

      this.pendingRequests.set(tId, {
        resolve: (data: Buffer | null) => {
          if (timer) clearTimeout(timer);
          if (data && data.length >= 9 && data.readUInt8(7) === 1) {
            const byteCount = data.readUInt8(8);
            const coilBuffer = data.subarray(9, 9 + byteCount);
            resolve(coilBuffer);
          } else {
            resolve(null);
          }
        },
        reject: () => {
          if (timer) clearTimeout(timer);
          resolve(null);
        },
      });

      this.socket?.write(requestFrame, (err) => {
        if (err) {
          if (timer) clearTimeout(timer);
          this.pendingRequests.delete(tId);
          resolve(null);
        }
      });

      timer = setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(null);
        }
      }, 400);
    });
  }

  public async writeCoil(address: number, state: boolean): Promise<boolean> {
    if (!this.socket || !this.connected) {
      return false;
    }

    const tId = this.getNextTransactionId();
    const frame = Buffer.alloc(12);
    frame.writeUInt16BE(tId, 0);
    frame.writeUInt16BE(0, 2);
    frame.writeUInt16BE(6, 4);
    frame.writeUInt8(this.config.slaveId, 6);
    frame.writeUInt8(5, 7); // FC 05 Write Single Coil
    frame.writeUInt16BE(address, 8);
    frame.writeUInt16BE(state ? 0xff00 : 0x0000, 10);

    return new Promise((resolve) => {
      this.pendingRequests.set(tId, {
        resolve: () => resolve(true),
        reject: () => resolve(false),
      });

      this.socket?.write(frame, (err) => {
        if (err) {
          this.pendingRequests.delete(tId);
          resolve(false);
        }
      });

      setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(true);
        }
      }, 400);
    });
  }

  public async readCoilsPublic(
    startAddress: number,
    quantity: number
  ): Promise<{ success: boolean; coils: Record<number, boolean>; buffer?: number[] }> {
    const pduAddress = (this.detectedCoilPduOffset ?? 0) === 1 ? startAddress : (startAddress >= 1 ? startAddress - 1 : startAddress);
    const buf = await this.readCoils(pduAddress, quantity);
    if (!buf) {
      return { success: false, coils: {} };
    }
    const coils: Record<number, boolean> = {};
    for (let i = 0; i < Math.min(quantity, buf.length * 8); i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      coils[startAddress + i] = Boolean((buf[byteIdx] >> bitIdx) & 1);
    }
    return { success: true, coils, buffer: Array.from(buf) };
  }

  public async writeCoilStatus(
    address: number,
    state: boolean
  ): Promise<{ success: boolean; message: string; writtenCoils: { address: number; state: boolean }[] }> {
    const pduAddress = (this.detectedCoilPduOffset ?? 0) === 1 ? address : (address >= 1 ? address - 1 : address);
    const success = await this.writeCoil(pduAddress, state);

    const msg = success
      ? `✅ Written Coil status to Address ${address} (Modbus PDU ${pduAddress}, FC 05) = ${state ? 'ON (1 / 0xFF00)' : 'OFF (0 / 0x0000)'}`
      : `❌ Failed to write Coil status to Modbus address ${address} (Hardware offline or not responding)`;

    return {
      success,
      message: msg,
      writtenCoils: [{ address, state }],
    };
  }

  public async pulseCoil(
    address: number,
    durationMs: number = 1000
  ): Promise<{ success: boolean; message: string }> {
    const pduAddress = (this.detectedCoilPduOffset ?? 0) === 1 ? address : (address >= 1 ? address - 1 : address);
    // 1. Assert Coil HIGH (1)
    const onOk = await this.writeCoil(pduAddress, true);
    // 2. Wait duration (1 second)
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    // 3. Reset Coil LOW (0)
    const offOk = await this.writeCoil(pduAddress, false);

    const msg = onOk && offOk
      ? `✅ Pulsed Coil 0X: ${address} (HIGH for ${durationMs}ms, then reset to LOW)`
      : `⚠️ Pulsed Coil 0X: ${address} (HIGH: ${onOk ? 'OK' : 'FAIL'}, LOW: ${offOk ? 'OK' : 'FAIL'})`;

    return {
      success: onOk && offOk,
      message: msg,
    };
  }

  public async writeRegister(address: number, value: number): Promise<boolean> {
    if (!this.socket || !this.connected) {
      return false;
    }

    const pduAddress = (this.detectedPduOffset ?? 0) === 1 ? address : (address >= 1 ? address - 1 : address);
    const tId = this.getNextTransactionId();
    const frame = Buffer.alloc(12);
    frame.writeUInt16BE(tId, 0);
    frame.writeUInt16BE(0, 2);
    frame.writeUInt16BE(6, 4);
    frame.writeUInt8(this.config.slaveId, 6);
    frame.writeUInt8(6, 7); // FC 06 Write Single Register
    frame.writeUInt16BE(pduAddress, 8);
    frame.writeUInt16BE(Math.round(value) & 0xffff, 10);

    return new Promise((resolve) => {
      this.pendingRequests.set(tId, {
        resolve: () => resolve(true),
        reject: () => resolve(false),
      });

      this.socket?.write(frame, (err) => {
        if (err) {
          this.pendingRequests.delete(tId);
          resolve(false);
        }
      });

      setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(true);
        }
      }, 400);
    });
  }

  public async writeMultipleRegisters(startAddress: number, registers: number[]): Promise<boolean> {
    if (registers.length === 0) return true;

    if (!this.socket || !this.connected) {
      return false;
    }

    const quantity = registers.length;
    const byteCount = quantity * 2;
    const frameLength = 13 + byteCount;
    const frame = Buffer.alloc(frameLength);

    const tId = this.getNextTransactionId();
    frame.writeUInt16BE(tId, 0);
    frame.writeUInt16BE(0, 2);
    frame.writeUInt16BE(7 + byteCount, 4);
    frame.writeUInt8(this.config.slaveId, 6);
    frame.writeUInt8(16, 7); // FC 16 (0x10) Write Multiple Registers
    frame.writeUInt16BE(startAddress, 8);
    frame.writeUInt16BE(quantity, 10);
    frame.writeUInt8(byteCount, 12);

    for (let i = 0; i < quantity; i++) {
      frame.writeUInt16BE(registers[i] & 0xffff, 13 + i * 2);
    }

    return new Promise((resolve) => {
      this.pendingRequests.set(tId, {
        resolve: () => resolve(true),
        reject: () => resolve(false),
      });

      this.socket?.write(frame, (err) => {
        if (err) {
          this.pendingRequests.delete(tId);
          resolve(false);
        }
      });

      setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(true); // Modbus TCP FC16 write complete
        }
      }, 400);
    });
  }

  public floatToRegisters(floatValue: number, wordSwap: boolean = false): [number, number] {
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(floatValue, 0);
    const w0 = buf.readUInt16BE(0);
    const w1 = buf.readUInt16BE(2);
    return wordSwap ? [w1, w0] : [w0, w1];
  }

  public async writeFloatRegister(startAddress: number, floatValue: number, wordSwap: boolean = true): Promise<boolean> {
    const pduAddress = (this.detectedPduOffset ?? 0) === 1 ? startAddress : (startAddress >= 1 ? startAddress - 1 : startAddress);
    const words = this.floatToRegisters(floatValue, wordSwap);
    console.log(`[Modbus TCP] Writing Float32 to Register 4X: ${startAddress} (PDU ${pduAddress}): ${floatValue} (WordSwap: ${wordSwap}, Words: [0x${words[0].toString(16)}, 0x${words[1].toString(16)}])`);
    return this.writeMultipleRegisters(pduAddress, words);
  }

  public async writeTestSpecification(
    spec: { ratedVoltage: number; ratedCurrent: number; testCurrent: number },
    startAddress: number = 201,
    format: 'int' | 'float' = 'float',
    wordSwap: boolean = false
  ): Promise<{ success: boolean; message: string; writtenRegisters: { address: number; val: number }[] }> {
    const { ratedVoltage, ratedCurrent, testCurrent } = spec;
    const registers: number[] = [];
    const writtenRegisters: { address: number; val: number }[] = [];

    // Translate 1-based ModSim32 display address (e.g. 201 -> ModSim32 40201) to 0-based Modbus PDU address (e.g. 200)
    const pduAddress = startAddress >= 1 ? startAddress - 1 : startAddress;

    if (format === 'int') {
      const vInt = Math.round(Number(ratedVoltage) || 0);
      const rCurrInt = Math.round(Number(ratedCurrent) || 0);
      const tCurrInt = Math.round(Number(testCurrent) || 0);

      registers.push(vInt & 0xffff);
      registers.push(rCurrInt & 0xffff);
      registers.push(tCurrInt & 0xffff);

      writtenRegisters.push(
        { address: startAddress, val: vInt },
        { address: startAddress + 1, val: rCurrInt },
        { address: startAddress + 2, val: tCurrInt }
      );
    } else {
      const vWords = this.floatToRegisters(Number(ratedVoltage) || 0, wordSwap);
      const rWords = this.floatToRegisters(Number(ratedCurrent) || 0, wordSwap);
      const tWords = this.floatToRegisters(Number(testCurrent) || 0, wordSwap);

      registers.push(...vWords, ...rWords, ...tWords);

      writtenRegisters.push(
        { address: startAddress, val: vWords[0] },
        { address: startAddress + 1, val: vWords[1] },
        { address: startAddress + 2, val: rWords[0] },
        { address: startAddress + 3, val: rWords[1] },
        { address: startAddress + 4, val: tWords[0] },
        { address: startAddress + 5, val: tWords[1] }
      );
    }

    const success = await this.writeMultipleRegisters(pduAddress, registers);

    const modeText = format === 'int' ? '16-bit Integer' : '32-bit Float';
    const msg = success
      ? `✅ Written ${modeText} specs to ModSim32 Address ${startAddress} (Modbus PDU ${pduAddress}, ${registers.length} words)`
      : `❌ Failed to write ${modeText} specs to Modbus address ${startAddress}`;

    return { success, message: msg, writtenRegisters };
  }

  private handleData(data: Buffer) {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);

    while (this.receiveBuffer.length >= 7) {
      const transactionId = this.receiveBuffer.readUInt16BE(0);
      const length = this.receiveBuffer.readUInt16BE(4);
      const fullFrameLength = 6 + length;

      if (this.receiveBuffer.length >= fullFrameLength) {
        const frame = this.receiveBuffer.subarray(0, fullFrameLength);
        this.receiveBuffer = this.receiveBuffer.subarray(fullFrameLength);

        const handler = this.pendingRequests.get(transactionId);
        if (handler) {
          this.pendingRequests.delete(transactionId);

          const fnCode = frame.readUInt8(7);
          if (fnCode >= 0x80) {
            // Modbus Exception Response (e.g. 0x83 = Illegal Data Address)
            handler.resolve(null);
          } else {
            handler.resolve(frame);
          }
        }
      } else {
        break;
      }
    }
  }

  public async testDiagnostic(ip: string, port: number): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const testSocket = new net.Socket();
      testSocket.setTimeout(2500);

      testSocket.connect(port, ip, () => {
        testSocket.destroy();
        resolve({ success: true, message: `✅ TCP Socket connected successfully to ${ip}:${port}!` });
      });

      testSocket.on('error', (err) => {
        testSocket.destroy();
        resolve({ success: false, message: `❌ Socket Error on ${ip}:${port} (${err.message})` });
      });

      testSocket.on('timeout', () => {
        testSocket.destroy();
        resolve({ success: false, message: `⚠️ Connection Timeout on ${ip}:${port} (No Modbus TCP server responding on this port)` });
      });
    });
  }

  private getNextTransactionId(): number {
    this.transactionId = (this.transactionId % 65535) + 1;
    return this.transactionId;
  }
}

export const modbusTcpServiceSingleton = new ModbusTcpService();
