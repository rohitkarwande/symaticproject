import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { sqliteDbInstance } from './database.js';
import { modbusTcpServiceSingleton } from './modbusTcpService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function registerIpcHandlers() {
  // --- Database IPC Handlers ---
  ipcMain.handle('db:createTestSession', async (_evt, config, testId, durationSeconds) => {
    return sqliteDbInstance.createTestSession(config, testId, durationSeconds);
  });

  ipcMain.handle('db:logTemperatureRow', async (_evt, testId, elapsedSeconds, timestamp, temps) => {
    return sqliteDbInstance.logTemperatureRow(testId, elapsedSeconds, timestamp, temps);
  });

  ipcMain.handle('db:saveAlarmEvent', async (_evt, event) => {
    return sqliteDbInstance.saveAlarmEvent(event);
  });

  ipcMain.handle('db:acknowledgeAlarm', async (_evt, eventId) => {
    return sqliteDbInstance.acknowledgeAlarm(eventId);
  });

  ipcMain.handle('db:completeTestSession', async (_evt, testId, finalResults, observations) => {
    return sqliteDbInstance.completeTestSession(testId, finalResults, observations);
  });

  ipcMain.handle('db:getAllTests', async () => {
    return sqliteDbInstance.getAllTests();
  });

  // --- Modbus TCP Hardware IPC Handlers ---
  ipcMain.handle('modbus:connect', async (_evt, config) => {
    if (config) {
      modbusTcpServiceSingleton.updateConfig(config);
    }
    return modbusTcpServiceSingleton.connect();
  });

  ipcMain.handle('modbus:disconnect', async () => {
    modbusTcpServiceSingleton.disconnect();
    return true;
  });

  ipcMain.handle('modbus:getStatus', async () => {
    return {
      connected: modbusTcpServiceSingleton.isConnected(),
      ...modbusTcpServiceSingleton.getConfig(),
    };
  });

  ipcMain.handle('modbus:writeCoil', async (_evt, address: number, state: boolean) => {
    return modbusTcpServiceSingleton.writeCoil(address, state);
  });

  ipcMain.handle('modbus:writeCoilStatus', async (_evt, address: number, state: boolean) => {
    return modbusTcpServiceSingleton.writeCoilStatus(address, state);
  });

  ipcMain.handle('modbus:writeRegister', async (_evt, address: number, value: number) => {
    return modbusTcpServiceSingleton.writeRegister(address, value);
  });

  ipcMain.handle('modbus:writeMultipleRegisters', async (_evt, startAddress: number, registers: number[]) => {
    return modbusTcpServiceSingleton.writeMultipleRegisters(startAddress, registers);
  });

  ipcMain.handle('modbus:writeFloatRegister', async (_evt, address: number, value: number, wordSwap?: boolean) => {
    return modbusTcpServiceSingleton.writeFloatRegister(address, value, wordSwap);
  });

  ipcMain.handle('modbus:writeTestSpecification', async (_evt, spec: any, startAddress?: number, format?: 'int' | 'float', wordSwap?: boolean) => {
    return modbusTcpServiceSingleton.writeTestSpecification(spec, startAddress, format, wordSwap);
  });

  ipcMain.handle('modbus:testDiagnostic', async (_evt, ip: string, port: number) => {
    return modbusTcpServiceSingleton.testDiagnostic(ip, port);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'Symatic Engineering - Temperature Rise Test System',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/';
  const isDev = process.env.NODE_ENV === 'development' || true;

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove default window menu for clean industrial UX
  mainWindow.setMenu(null);

  // Pipe Modbus live data stream to React renderer
  modbusTcpServiceSingleton.on('data', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('modbus:data', payload);
    }
  });

  modbusTcpServiceSingleton.on('status', (statusPayload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('modbus:status', statusPayload);
    }
  });

  // Start polling default or simulator data on app start
  modbusTcpServiceSingleton.updateConfig({
    ip: '192.168.0.200',
    port: 502,
    slaveId: 1,
    pollingIntervalMs: 500,
    useSimulator: true,
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
