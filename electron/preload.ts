import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: '1.0.0',
  platform: process.platform,
  db: {
    createTestSession: (config: any, testId: string, durationSeconds: number) =>
      ipcRenderer.invoke('db:createTestSession', config, testId, durationSeconds),
    logTemperatureRow: (testId: string, elapsedSeconds: number, timestamp: string, temps: any, sensorCount?: number, currents?: any) =>
      ipcRenderer.invoke('db:logTemperatureRow', testId, elapsedSeconds, timestamp, temps, sensorCount, currents),
    saveAlarmEvent: (event: any) => ipcRenderer.invoke('db:saveAlarmEvent', event),
    acknowledgeAlarm: (eventId: string) => ipcRenderer.invoke('db:acknowledgeAlarm', eventId),
    completeTestSession: (testId: string, finalResults: any, observations?: string) =>
      ipcRenderer.invoke('db:completeTestSession', testId, finalResults, observations),
    getAllTests: () => ipcRenderer.invoke('db:getAllTests'),
  },
  modbus: {
    connect: (config?: any) => ipcRenderer.invoke('modbus:connect', config),
    disconnect: () => ipcRenderer.invoke('modbus:disconnect'),
    getStatus: () => ipcRenderer.invoke('modbus:getStatus'),
    writeCoil: (address: number, state: boolean) => ipcRenderer.invoke('modbus:writeCoil', address, state),
    writeCoilStatus: (address: number, state: boolean) => ipcRenderer.invoke('modbus:writeCoilStatus', address, state),
    writeRegister: (address: number, value: number) => ipcRenderer.invoke('modbus:writeRegister', address, value),
    writeMultipleRegisters: (startAddress: number, registers: number[]) =>
      ipcRenderer.invoke('modbus:writeMultipleRegisters', startAddress, registers),
    writeFloatRegister: (address: number, value: number, wordSwap?: boolean) =>
      ipcRenderer.invoke('modbus:writeFloatRegister', address, value, wordSwap),
    writeTestSpecification: (spec: any, startAddress?: number, format?: 'int' | 'float', wordSwap?: boolean) =>
      ipcRenderer.invoke('modbus:writeTestSpecification', spec, startAddress, format, wordSwap),
    testDiagnostic: (ip: string, port: number) => ipcRenderer.invoke('modbus:testDiagnostic', ip, port),
    onData: (callback: (payload: any) => void) => {
      const listener = (_evt: any, data: any) => callback(data);
      ipcRenderer.on('modbus:data', listener);
      return () => ipcRenderer.removeListener('modbus:data', listener);
    },
    onStatus: (callback: (status: any) => void) => {
      const listener = (_evt: any, status: any) => callback(status);
      ipcRenderer.on('modbus:status', listener);
      return () => ipcRenderer.removeListener('modbus:status', listener);
    },
  },
});
