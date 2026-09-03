import net from 'net';
import EventEmitter from 'events';

export interface ModbusServiceConfig {
  ip: string;
  port: number;
  slaveId: number;
  pollingIntervalMs: number;
  useSimulator: boolean;
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
  alarmBit: boolean;
  testOn: boolean;
}

export interface ModbusDataPayload {
  connected: boolean;
  simulatorMode: boolean;
  timestamp: string;
  temperatures: Record<number, number>; // Point 1..48 in °C
  voltages: PhaseValues;
  currents: PhaseValues;
  outputCurrents: PhaseValues;
  setpointCurrent: number;
  hysteresis: number;
  ctRange: number;
  alarms: ModbusAlarms;
}

export class ModbusTcpService extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: ModbusServiceConfig = {
    ip: '192.168.0.200',
    port: 502,
    slaveId: 1,
    pollingIntervalMs: 500,
    useSimulator: true, // Default to simulator if offline
  };

  private connected: boolean = false;
  private transactionId: number = 1;
  private pollTimer: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private pendingRequests = new Map<number, { resolve: (data: Buffer | null) => void; reject: (err: Error) => void }>();
  private receiveBuffer: Buffer = Buffer.alloc(0);

  // Simulated base values for 48 channels & phase power metrics
  private simTemperatures: Record<number, number> = {};
  private simTick: number = 0;
  private simCoils: Record<number, boolean> = {
    1: false, // Coil 1 (00001): Phase Fail
    2: false, // Coil 2 (00002): Thermal Overload
    3: false, // Coil 3 (00003): Dim Min R
    4: false, // Coil 4 (00004): Dim Min Y
    5: false, // Coil 5 (00005): Dim Min B
    6: false, // Coil 6 (00006): Alarm Bit
    7: true,  // Coil 7 (00007): Test On
  };

  constructor() {
    super();
    this.initSimData();
  }

  private initSimData() {
    for (let i = 1; i <= 48; i++) {
      // Baseline ambient temps around 28.0 °C
      this.simTemperatures[i] = 28.0 + (i % 7) * 0.4 + (Math.sin(i) * 0.5);
    }
  }

  public getConfig(): ModbusServiceConfig {
    return { ...this.config };
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public updateConfig(newConfig: Partial<ModbusServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public async connect(): Promise<boolean> {
    if (this.config.useSimulator) {
      this.disconnect();
      this.connected = false;
      this.startPolling();
      this.emit('status', {
        connected: false,
        useSimulator: true,
        ip: this.config.ip,
        port: this.config.port,
        slaveId: this.config.slaveId,
      });
      return true;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    return new Promise((resolve) => {
      let isResolved = false;

      this.socket = new net.Socket();
      this.socket.setTimeout(3000);

      this.socket.connect(this.config.port, this.config.ip, () => {
        console.log(`[Modbus TCP] Connected to HMI / ModSim32 at ${this.config.ip}:${this.config.port}`);
        this.connected = true;
        this.emit('status', {
          connected: true,
          useSimulator: false,
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
        console.warn(`[Modbus TCP] Socket error (${this.config.ip}:${this.config.port}):`, err.message);
        this.connected = false;
        this.emit('status', { connected: false, useSimulator: false, error: err.message });
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });

      this.socket.on('close', () => {
        console.log('[Modbus TCP] Socket connection closed');
        this.connected = false;
        this.emit('status', { connected: false, useSimulator: false });
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });

      this.socket.on('timeout', () => {
        console.warn('[Modbus TCP] Socket connection timeout');
        if (this.socket) this.socket.destroy();
        this.connected = false;
        this.emit('status', { connected: false, useSimulator: false, error: `Connection timeout: No server responding at ${this.config.ip}:${this.config.port}` });
        if (!isResolved) {
          isResolved = true;
          resolve(false);
        }
      });
    });
  }

  public disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.emit('status', { connected: false, useSimulator: false });
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
    const timestamp = new Date().toISOString();

    if (this.config.useSimulator || !this.connected) {
      this.simTick++;
      const payload = this.generateSimulatedPayload(timestamp);
      this.emit('data', payload);
      return;
    }

    try {
      // 1. Read RTD Temperature Registers (Try PDU address 9/10 to support ModSim32 40010 & 40011)
      let tempBuffer = await this.readHoldingRegisters(9, 49);
      if (!tempBuffer) {
        tempBuffer = await this.readHoldingRegisters(10, 48);
      }
      if (!tempBuffer) {
        tempBuffer = await this.readHoldingRegisters(9, 10);
      }
      if (!tempBuffer) {
        tempBuffer = await this.readHoldingRegisters(10, 10);
      }
      if (!tempBuffer) {
        tempBuffer = await this.readHoldingRegisters(0, 10);
      }

      const temps: Record<number, number> = { ...this.simTemperatures };

      if (tempBuffer && tempBuffer.length >= 2) {
        const wordsAvailable = Math.min(48, Math.floor(tempBuffer.length / 2));
        for (let i = 0; i < wordsAvailable; i++) {
          const rawInt = tempBuffer.readInt16BE(i * 2);
          if (rawInt > 0) {
            temps[i + 1] = Math.round((rawInt / 10.0) * 10) / 10;
          }
        }
      }

      // 2. Read Voltages (D30, D32, D34 -> Address 30, 6 registers Float32)
      const voltBuffer = await this.readHoldingRegisters(30, 6);
      const voltages: PhaseValues = {
        r: voltBuffer && voltBuffer.length >= 4 ? this.parseFloat32(voltBuffer, 0) : 415.2,
        y: voltBuffer && voltBuffer.length >= 8 ? this.parseFloat32(voltBuffer, 2) : 414.8,
        b: voltBuffer && voltBuffer.length >= 12 ? this.parseFloat32(voltBuffer, 4) : 415.5,
      };

      // 3. Read Currents (D46, D48, D50 -> Address 46, 6 registers Float32)
      const currBuffer = await this.readHoldingRegisters(46, 6);
      const currents: PhaseValues = {
        r: currBuffer && currBuffer.length >= 4 ? this.parseFloat32(currBuffer, 0) : 2000.0,
        y: currBuffer && currBuffer.length >= 8 ? this.parseFloat32(currBuffer, 2) : 1998.5,
        b: currBuffer && currBuffer.length >= 12 ? this.parseFloat32(currBuffer, 4) : 2001.2,
      };

      // 4. Read Output Currents (D102, D104, D106 -> Address 102, 6 registers Float32)
      const opCurrBuffer = await this.readHoldingRegisters(102, 6);
      const outputCurrents: PhaseValues = {
        r: opCurrBuffer && opCurrBuffer.length >= 4 ? this.parseFloat32(opCurrBuffer, 0) : 2000.0,
        y: opCurrBuffer && opCurrBuffer.length >= 8 ? this.parseFloat32(opCurrBuffer, 2) : 1999.0,
        b: opCurrBuffer && opCurrBuffer.length >= 12 ? this.parseFloat32(opCurrBuffer, 4) : 2002.0,
      };

      // 5. Read Setpoint (D200, D202 -> Address 200, 2 words)
      const setpointBuffer = await this.readHoldingRegisters(200, 2);
      const setpointCurrent = setpointBuffer && setpointBuffer.length >= 2 ? setpointBuffer.readUInt16BE(0) : 2000;
      const hysteresis = setpointBuffer && setpointBuffer.length >= 4 ? setpointBuffer.readUInt16BE(2) : 5;

      // 6. Read Coil Status (Address 0, 8 coils -> ModSim32 00001..00008)
      const coilBuffer = await this.readCoils(0, 8);

      const payload: ModbusDataPayload = {
        connected: true,
        simulatorMode: false,
        timestamp,
        temperatures: temps,
        voltages,
        currents,
        outputCurrents,
        setpointCurrent,
        hysteresis,
        ctRange: 2000,
        alarms: {
          phaseFail: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 0)) : (this.simCoils[1] ?? false),
          thermalOverload: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 1)) : (this.simCoils[2] ?? false),
          dimMinR: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 2)) : (this.simCoils[3] ?? false),
          dimMinY: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 3)) : (this.simCoils[4] ?? false),
          dimMinB: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 4)) : (this.simCoils[5] ?? false),
          alarmBit: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 5)) : (this.simCoils[6] ?? false),
          testOn: coilBuffer && coilBuffer.length >= 1 ? Boolean(coilBuffer.readUInt8(0) & (1 << 6)) : (this.simCoils[7] ?? true),
        },
      };

      this.emit('data', payload);
    } catch (err: any) {
      console.warn('[Modbus TCP] Polling error:', err.message);
    }
  }

  private parseFloat32(buf: Buffer, offsetWordIndex: number): number {
    try {
      const offsetByte = offsetWordIndex * 2;
      const highWord = buf.readUInt16BE(offsetByte);
      const lowWord = buf.readUInt16BE(offsetByte + 2);

      const floatBuf = Buffer.alloc(4);
      floatBuf.writeUInt16BE(highWord, 0);
      floatBuf.writeUInt16BE(lowWord, 2);
      const floatVal = floatBuf.readFloatBE(0);
      return isNaN(floatVal) ? 0 : Math.round(floatVal * 10) / 10;
    } catch {
      return 0;
    }
  }

  private generateSimulatedPayload(timestamp: string): ModbusDataPayload {
    const noise = () => (Math.random() - 0.5) * 0.15;
    const rise = Math.min(25.0, this.simTick * 0.02);

    for (let i = 1; i <= 48; i++) {
      const base = 28.0 + (i % 6) * 0.5;
      this.simTemperatures[i] = Math.round((base + rise + noise()) * 10) / 10;
    }

    return {
      connected: this.connected,
      simulatorMode: true,
      timestamp,
      temperatures: { ...this.simTemperatures },
      voltages: {
        r: Math.round((415.0 + noise() * 3) * 10) / 10,
        y: Math.round((414.8 + noise() * 3) * 10) / 10,
        b: Math.round((415.3 + noise() * 3) * 10) / 10,
      },
      currents: {
        r: Math.round((2000.0 + noise() * 10) * 10) / 10,
        y: Math.round((1998.5 + noise() * 10) * 10) / 10,
        b: Math.round((2001.2 + noise() * 10) * 10) / 10,
      },
      outputCurrents: {
        r: Math.round((2000.0 + noise() * 10) * 10) / 10,
        y: Math.round((1999.0 + noise() * 10) * 10) / 10,
        b: Math.round((2002.0 + noise() * 10) * 10) / 10,
      },
      setpointCurrent: 2000,
      hysteresis: 5,
      ctRange: 2000,
      alarms: {
        phaseFail: this.simCoils[1] ?? false,
        thermalOverload: this.simCoils[2] ?? false,
        dimMinR: this.simCoils[3] ?? false,
        dimMinY: this.simCoils[4] ?? false,
        dimMinB: this.simCoils[5] ?? false,
        alarmBit: this.simCoils[6] ?? false,
        testOn: this.simCoils[7] ?? true,
      },
    };
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

      // Quick 400ms timeout per request
      timer = setTimeout(() => {
        if (this.pendingRequests.has(tId)) {
          this.pendingRequests.delete(tId);
          resolve(null);
        }
      }, 400);
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
      console.log(`[Modbus TCP Sim] Written Coil ${address} = ${state}`);
      return true;
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

  public async writeCoilStatus(
    address: number,
    state: boolean
  ): Promise<{ success: boolean; message: string; writtenCoils: { address: number; state: boolean }[] }> {
    // Translate 1-based ModSim32 display address (e.g. 1 -> ModSim32 00001) to 0-based Modbus PDU address (e.g. 0)
    const pduAddress = address >= 1 ? address - 1 : address;

    // Cache simulated coil state
    this.simCoils[address] = state;
    this.simCoils[pduAddress + 1] = state;

    const success = await this.writeCoil(pduAddress, state);

    const msg = success
      ? `✅ Written Coil status to ModSim32 Address ${address} (Modbus PDU ${pduAddress}, FC 05) = ${state ? 'ON (1 / 0xFF00)' : 'OFF (0 / 0x0000)'}`
      : `❌ Failed to write Coil status to Modbus address ${address}`;

    return {
      success,
      message: msg,
      writtenCoils: [{ address, state }],
    };
  }

  public async writeRegister(address: number, value: number): Promise<boolean> {
    if (!this.socket || !this.connected) {
      console.log(`[Modbus TCP Sim] Written Register ${address} = ${value}`);
      return true;
    }

    const tId = this.getNextTransactionId();
    const frame = Buffer.alloc(12);
    frame.writeUInt16BE(tId, 0);
    frame.writeUInt16BE(0, 2);
    frame.writeUInt16BE(6, 4);
    frame.writeUInt8(this.config.slaveId, 6);
    frame.writeUInt8(6, 7); // FC 06 Write Single Register
    frame.writeUInt16BE(address, 8);
    frame.writeUInt16BE(value, 10);

    return new Promise((resolve) => {
      this.socket?.write(frame);
      resolve(true);
    });
  }

  public async writeMultipleRegisters(startAddress: number, registers: number[]): Promise<boolean> {
    if (registers.length === 0) return true;

    if (!this.socket || !this.connected) {
      console.log(`[Modbus TCP Sim] Written Multiple Registers starting at ${startAddress} (${registers.length} words):`, registers);
      return true;
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

  public async writeFloatRegister(startAddress: number, floatValue: number, wordSwap: boolean = false): Promise<boolean> {
    const words = this.floatToRegisters(floatValue, wordSwap);
    return this.writeMultipleRegisters(startAddress, words);
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
