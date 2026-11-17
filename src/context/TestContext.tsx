import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type {
  TestConfig,
  TestSession,
  SensorPoint,
  AlarmEvent,
  FinalTestResults,
  PointTestResult,
  TemperatureLogRow,
} from '../types/test';
import type { ModbusDataPayload, ModbusStatus } from '../types/modbus';
import { getSensorService } from '../services/sensor/SensorDataService';
import { alarmManagerSingleton } from '../services/alarm/AlarmManager';
import { getDatabaseProvider } from '../services/db/DatabaseService';
import { temperatureLoggerSingleton } from '../services/logging/TemperatureLogger';

export type ActiveTab = 'dashboard' | 'new-test' | 'preview' | 'history' | 'alarms' | 'settings' | 'results';

export interface HardwarePopupState {
  type: 'impedance_alarm' | 'no_current_alarm' | 'cycle_completed';
  title: string;
  code: string;
  description: string;
  isAbort: boolean;
}

interface TestContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navigateWithGuard: (targetTab: ActiveTab) => boolean;

  // Wizard state
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  draftConfig: TestConfig;
  setDraftConfig: React.Dispatch<React.SetStateAction<TestConfig>>;
  updateDraftConfig: <K extends keyof TestConfig>(section: K, values: Partial<TestConfig[K]>) => void;
  resetWizard: () => void;
  clearDraftConfig: () => void;
  restorePreviousConfig: () => boolean;
  hasPreviousConfig: boolean;

  // Active Test state
  activeSession: TestSession | null;
  startTestSession: () => void;
  endTestSession: (status?: 'completed' | 'aborted', abortReason?: string) => FinalTestResults;
  isTestActive: boolean;

  // Live sensor & alarms
  sensors: SensorPoint[];
  activeAlarms: AlarmEvent[];
  alarmPopupEvent: AlarmEvent | null;
  dismissAlarmPopup: () => void;
  acknowledgeAlarm: (eventId: string) => void;
  triggerMockAlarm: (alarmId: number, description?: string) => void;
  hardwarePopup: HardwarePopupState | null;
  resetHardwarePopup: () => Promise<void>;
  nextLogCountdown: number;
  isLoggingActive: boolean;

  // Modbus Hardware Connection State
  modbusStatus: ModbusStatus;
  modbusData: ModbusDataPayload | null;
  connectModbus: (config?: Partial<ModbusStatus>) => Promise<boolean>;
  disconnectModbus: () => Promise<void>;
  writeModbusCoil: (address: number, state: boolean) => Promise<boolean>;
  writeCoilStatusToModbus: (
    address: number,
    state: boolean
  ) => Promise<{ success: boolean; message: string; writtenCoils: { address: number; state: boolean }[] }>;
  pulseCoilToModbus: (
    address: number,
    durationMs?: number
  ) => Promise<{ success: boolean; message: string }>;
  readCoilsFromModbus: (
    startAddress?: number,
    quantity?: number
  ) => Promise<{ success: boolean; coils: Record<number, boolean>; buffer?: number[] }>;
  writeFloatRegisterToModbus: (
    address: number,
    value: number,
    wordSwap?: boolean
  ) => Promise<boolean>;
  writeSetCurrentToModbus: (
    current: number
  ) => Promise<{ success: boolean; message: string }>;
  writeSetTimerToModbus: (
    duration: number
  ) => Promise<{ success: boolean; message: string }>;
  writeTestSpecificationToModbus: (
    spec?: { ratedVoltage: number; ratedCurrent: number; testCurrent: number },
    startAddress?: number,
    format?: 'int' | 'float',
    wordSwap?: boolean
  ) => Promise<{ success: boolean; message: string; writtenRegisters: { address: number; val: number }[] }>;

  // History & Results
  testHistory: TestSession[];
  selectedHistoryTest: TestSession | null;
  setSelectedHistoryTest: (test: TestSession | null) => void;
  lastResults: FinalTestResults | null;
  setLastResults: (res: FinalTestResults | null) => void;

  // Navigation guard modal state
  showNavGuardModal: boolean;
  pendingNavTab: ActiveTab | null;
  confirmNavAway: () => void;
  cancelNavAway: () => void;
}

const BLANK_CONFIG: TestConfig = {
  customer: {
    customerName: '',
    projectName: '',
    address: '',
    poNumber: '',
    serialNumber: '',
  },
  equipment: {
    equipmentName: 'Temperature Rise Tester',
    model: '',
    make: '',
    serialNumber: '',
    calibrationDueDate: '',
  },
  specification: {
    testCurrent: '',
    testDurationHours: 1, // Default 1 hour
    sensorCount: 48, // Default 48 channels
    logIntervalMinutes: 1, // Default 1 min logging
    ratedVoltage: '',
    ratedCurrent: '',
    ambientTemp: 25,
    limitTempRise: 65,
  },
  testObject: {
    description: '',
    serialNumber: '',
    sampleQuantity: 1,
  },
};

const STORAGE_KEY_PREVIOUS_CONFIG = 'symatic_previous_test_config';

const getInitialConfig = (): TestConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREVIOUS_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.customer && parsed?.equipment && parsed?.specification && parsed?.testObject) {
        parsed.equipment.equipmentName = 'Temperature Rise Tester';
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse previous test config from localStorage:', err);
  }
  return BLANK_CONFIG;
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [draftConfig, setDraftConfig] = useState<TestConfig>(getInitialConfig);
  const [hasPreviousConfig, setHasPreviousConfig] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY_PREVIOUS_CONFIG));
    } catch {
      return false;
    }
  });

  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [sensors, setSensors] = useState<SensorPoint[]>([]);
  const [activeAlarms, setActiveAlarms] = useState<AlarmEvent[]>([]);
  const [alarmPopupEvent, setAlarmPopupEvent] = useState<AlarmEvent | null>(null);
  const [hardwarePopup, setHardwarePopup] = useState<HardwarePopupState | null>(null);
  const hardwareTriggeredRef = useRef<{ impedance: boolean; noCurrent: boolean; cycleCompleted: boolean }>({
    impedance: false,
    noCurrent: false,
    cycleCompleted: false,
  });
  const [nextLogCountdown, setNextLogCountdown] = useState<number>(60);
  const [isLoggingActive, setIsLoggingActive] = useState<boolean>(false);

  // Modbus Hardware Connection state
  const [modbusStatus, setModbusStatus] = useState<ModbusStatus>({
    connected: false,
    ip: '192.168.0.200',
    port: 502,
    slaveId: 1,
  });
  const [modbusData, setModbusData] = useState<ModbusDataPayload | null>(null);
  const modbusDataRef = useRef<ModbusDataPayload | null>(null);

  const [testHistory, setTestHistory] = useState<TestSession[]>([]);
  const [selectedHistoryTest, setSelectedHistoryTest] = useState<TestSession | null>(null);
  const [lastResults, setLastResults] = useState<FinalTestResults | null>(null);

  // Navigation Guard Modal
  const [showNavGuardModal, setShowNavGuardModal] = useState<boolean>(false);
  const [pendingNavTab, setPendingNavTab] = useState<ActiveTab | null>(null);

  const sensorService = getSensorService();
  const dbProvider = getDatabaseProvider();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionRef = useRef<TestSession | null>(null);
  activeSessionRef.current = activeSession;

  const isTestActive = activeSession?.status === 'running';

  const dimmerAlarmTriggeredRef = useRef<{ [k: string]: boolean }>({
    rZero: false,
    yZero: false,
    bZero: false,
    rMax: false,
    yMax: false,
    bMax: false,
  });

  // Load persisted historical tests & attach Modbus IPC listeners
  useEffect(() => {
    const ambient = Number(draftConfig.specification.ambientTemp) || 25;
    const initialSensors = sensorService.initialize(ambient);
    const initialCount = Math.min(48, Math.max(1, Number(draftConfig.specification.sensorCount) || 48));
    setSensors(initialSensors.filter((s) => s.id <= initialCount));

    // Fetch tests from database
    dbProvider.getAllTests().then((persistedTests) => {
      if (persistedTests && persistedTests.length > 0) {
        setTestHistory(persistedTests);
        if (!localStorage.getItem(STORAGE_KEY_PREVIOUS_CONFIG) && persistedTests[0]?.config) {
          try {
            localStorage.setItem(STORAGE_KEY_PREVIOUS_CONFIG, JSON.stringify(persistedTests[0].config));
            setHasPreviousConfig(true);
          } catch {}
        }
      }
    });

    alarmManagerSingleton.setAlarmTriggerCallback((evt) => {
      // Over temperature limit alarm removed completely per user specification
      if (evt.alarmId === 1 || evt.alarmCode === 'ALM-01' || evt.alarmName === 'Over Temperature Limit') {
        return;
      }
      setActiveAlarms(alarmManagerSingleton.getActiveEvents());
      setAlarmPopupEvent(evt);
      dbProvider.saveAlarmEvent(evt);
    });

    temperatureLoggerSingleton.setCountdownTickCallback((secs, isLoggingActive) => {
      setNextLogCountdown(secs);
      setIsLoggingActive(isLoggingActive);
    });

    // Modbus TCP Listener (Electron environment)
    if (window.electronAPI?.modbus) {
      window.electronAPI.modbus.getStatus().then((status) => {
        if (status) setModbusStatus((prev) => ({ ...prev, ...status }));
      });

      const unsubData = window.electronAPI.modbus.onData((payload: ModbusDataPayload) => {
        setModbusData(payload);
        modbusDataRef.current = payload;
        setModbusStatus((prev) => ({
          ...prev,
          connected: payload.connected,
          lastPollTimestamp: payload.timestamp,
        }));

        // Update sensor points live from real Modbus hardware temperature readings
        if (payload.temperatures) {
          const ambient = Number(draftConfig.specification.ambientTemp) || 25;
          const updated = sensorService.updateFromHardware(payload.temperatures, ambient);

          // If active test is running, sync sensors into activeSession and evaluate alarms
          setActiveSession((currentSession) => {
            const activeCount = currentSession
              ? Math.min(48, Math.max(1, Number(currentSession.config.specification.sensorCount) || 48))
              : Math.min(48, Math.max(1, Number(draftConfig.specification.sensorCount) || 48));

            const activeSensors = updated.filter((s) => s.id <= activeCount);
            setSensors(activeSensors);

            if (currentSession && currentSession.status === 'running') {
              const sessionAmbient = Number(currentSession.config.specification.ambientTemp) || ambient;
              const limitRise = Number(currentSession.config.specification.limitTempRise) || 65;
              alarmManagerSingleton.evaluateSensors(currentSession.testId, activeSensors, sessionAmbient, limitRise);
              return {
                ...currentSession,
                sensors: activeSensors,
              };
            }
            return currentSession;
          });
        }

        // Evaluate incoming hardware START, STOP, ALARMS & CYCLE_COMPLITED coils from PLC (Read support)
        if (payload.coils) {
          const isHardwareStop = Boolean(payload.coils.stop || payload.coils[2]);
          if (isHardwareStop && activeSessionRef.current?.status === 'running') {
            console.log('[Modbus TCP] Received STOP coil signal from PLC hardware (0X: 2). Ending test session...');
            endTestSession('completed');
          }

          // Dimmer Alarms tracking (Coils 3..8: R/Y/B Dimmer Zero and R/Y/B Dimmer Max)
          const rZero = Boolean(payload.coils[3] ?? payload.coils.dimMinR);
          const yZero = Boolean(payload.coils[4] ?? payload.coils.dimMinY);
          const bZero = Boolean(payload.coils[5] ?? payload.coils.dimMinB);
          const rMax = Boolean(payload.coils[6] ?? payload.coils.dimMaxR);
          const yMax = Boolean(payload.coils[7] ?? payload.coils.dimMaxY);
          const bMax = Boolean(payload.coils[8] ?? payload.coils.dimMaxB);

          // Dimmer limits track state for dashboard indicators & START button lock (not recorded in alarm logs per user request)
          dimmerAlarmTriggeredRef.current = {
            rZero,
            yZero,
            bZero,
            rMax,
            yMax,
            bMax,
          };

          // 1. IMPEDANCE_ALARM (0X: 12)
          const isImpedance = Boolean(payload.coils[12] ?? payload.coils.impedanceAlarm);
          if (isImpedance && activeSessionRef.current?.status === 'running' && !hardwareTriggeredRef.current.impedance) {
            hardwareTriggeredRef.current.impedance = true;
            console.warn('[Modbus TCP] IMPEDANCE_ALARM triggered from PLC!');
            const testId = activeSessionRef.current.testId;
            const impEvt: AlarmEvent = {
              id: `EVT-IMP-${Date.now()}`,
              testId,
              alarmId: 12,
              alarmCode: 'ALM-IMP',
              alarmName: 'Impedance Alarm',
              severity: 'critical',
              description: 'CURRENT SETPOINT NOT ACHIEVED',
              timestamp: new Date().toLocaleTimeString(),
              acknowledged: false,
            };
            alarmManagerSingleton.recordAlarmEvent(impEvt);
            dbProvider.saveAlarmEvent(impEvt);
            setActiveAlarms((prev) => [...prev.filter((e) => e.alarmCode !== 'ALM-IMP'), impEvt]);

            setHardwarePopup({
              type: 'impedance_alarm',
              title: 'IMPEDANCE ALARM',
              code: 'ALM-IMP',
              description: 'CURRENT SETPOINT NOT ACHIEVED',
              isAbort: true,
            });
          } else if (!isImpedance) {
            hardwareTriggeredRef.current.impedance = false;
          }

          // 2. NO_CURRENT_ALARM (0X: 13)
          const isNoCurrent = Boolean(payload.coils[13] ?? payload.coils.noCurrentAlarm);
          if (isNoCurrent && activeSessionRef.current?.status === 'running' && !hardwareTriggeredRef.current.noCurrent) {
            hardwareTriggeredRef.current.noCurrent = true;
            console.warn('[Modbus TCP] NO_CURRENT_ALARM triggered from PLC!');
            const testId = activeSessionRef.current.testId;
            const noCurrEvt: AlarmEvent = {
              id: `EVT-NOCURR-${Date.now()}`,
              testId,
              alarmId: 13,
              alarmCode: 'ALM-NOCURR',
              alarmName: 'No Current Alarm',
              severity: 'critical',
              description: 'NO CURRENT FLOW',
              timestamp: new Date().toLocaleTimeString(),
              acknowledged: false,
            };
            alarmManagerSingleton.recordAlarmEvent(noCurrEvt);
            dbProvider.saveAlarmEvent(noCurrEvt);
            setActiveAlarms((prev) => [...prev.filter((e) => e.alarmCode !== 'ALM-NOCURR'), noCurrEvt]);

            setHardwarePopup({
              type: 'no_current_alarm',
              title: 'NO CURRENT ALARM',
              code: 'ALM-NOCURR',
              description: 'NO CURRENT FLOW',
              isAbort: true,
            });
          } else if (!isNoCurrent) {
            hardwareTriggeredRef.current.noCurrent = false;
          }

          // 3. CYCLE_COMPLITED (0X: 14)
          const isCycleComp = Boolean(payload.coils[14] ?? payload.coils.cycleCompleted);
          if (isCycleComp && activeSessionRef.current?.status === 'running' && !hardwareTriggeredRef.current.cycleCompleted) {
            hardwareTriggeredRef.current.cycleCompleted = true;
            console.log('[Modbus TCP] CYCLE_COMPLITED triggered from PLC!');
            const testId = activeSessionRef.current.testId;
            const cycleEvt: AlarmEvent = {
              id: `EVT-CYCLE-${Date.now()}`,
              testId,
              alarmId: 14,
              alarmCode: 'ALM-CYCLE',
              alarmName: 'Cycle Completed',
              severity: 'info',
              description: 'Hardware test cycle completed signal received.',
              timestamp: new Date().toLocaleTimeString(),
              acknowledged: true,
            };
            alarmManagerSingleton.recordAlarmEvent(cycleEvt);
            dbProvider.saveAlarmEvent(cycleEvt);
            setActiveAlarms((prev) => [...prev.filter((e) => e.alarmCode !== 'ALM-CYCLE'), cycleEvt]);

            setHardwarePopup({
              type: 'cycle_completed',
              title: 'CYCLE COMPLETED',
              code: 'ALM-CYCLE',
              description: 'The temperature rise test cycle has successfully completed on the hardware controller.',
              isAbort: false,
            });
          } else if (!isCycleComp) {
            hardwareTriggeredRef.current.cycleCompleted = false;
          }
        }
      });

      const unsubStatus = window.electronAPI.modbus.onStatus((status: ModbusStatus) => {
        setModbusStatus((prev) => ({ ...prev, ...status }));
      });

      return () => {
        unsubData();
        unsubStatus();
      };
    }
  }, []);

  const connectModbus = async (configPartial?: Partial<ModbusStatus>): Promise<boolean> => {
    const updatedStatus = { ...modbusStatus, ...configPartial };
    setModbusStatus(updatedStatus);

    if (window.electronAPI?.modbus) {
      const success = await window.electronAPI.modbus.connect(updatedStatus);
      return success;
    }
    return false;
  };

  const disconnectModbus = async (): Promise<void> => {
    if (window.electronAPI?.modbus) {
      await window.electronAPI.modbus.disconnect();
    }
    setModbusStatus((prev) => ({ ...prev, connected: false }));
  };

  const writeModbusCoil = async (address: number, state: boolean): Promise<boolean> => {
    if (window.electronAPI?.modbus) {
      return window.electronAPI.modbus.writeCoil(address, state);
    }
    return false;
  };

  const writeCoilStatusToModbus = async (address: number, state: boolean) => {
    const pduAddress = address >= 1 ? address - 1 : address;
    if (window.electronAPI?.modbus?.writeCoilStatus) {
      return await window.electronAPI.modbus.writeCoilStatus(address, state);
    } else if (window.electronAPI?.modbus?.writeCoil) {
      const ok = await window.electronAPI.modbus.writeCoil(pduAddress, state);
      return {
        success: ok,
        message: ok
          ? `✅ Updated Coil ${address} = ${state ? 'ON' : 'OFF'}`
          : `❌ Failed to update Coil ${address}`,
        writtenCoils: [{ address, state }],
      };
    }
    return {
      success: false,
      message: `❌ Hardware unavailable. Run in Desktop Electron application.`,
      writtenCoils: [],
    };
  };

  const pulseCoilToModbus = async (address: number, durationMs: number = 1000) => {
    if (window.electronAPI?.modbus?.pulseCoil) {
      return await window.electronAPI.modbus.pulseCoil(address, durationMs);
    } else {
      await writeCoilStatusToModbus(address, true);
      await new Promise((r) => setTimeout(r, durationMs));
      await writeCoilStatusToModbus(address, false);
      return {
        success: true,
        message: `Pulsed signal ${address} (HIGH for ${durationMs}ms then reset to LOW)`,
      };
    }
  };

  const readCoilsFromModbus = async (startAddress: number = 1, quantity: number = 16) => {
    if (window.electronAPI?.modbus?.readCoils) {
      return await window.electronAPI.modbus.readCoils(startAddress, quantity);
    }
    return { success: false, coils: {} };
  };

  const writeFloatRegisterToModbus = async (address: number, value: number, wordSwap: boolean = true) => {
    if (window.electronAPI?.modbus?.writeFloatRegister) {
      return await window.electronAPI.modbus.writeFloatRegister(address, value, wordSwap);
    }
    return false;
  };

  const writeSetCurrentToModbus = async (current: number): Promise<{ success: boolean; message: string }> => {
    if (window.electronAPI?.modbus?.writeFloatRegister) {
      // SET_CURRENT register is 4X: 55, length 2 words, Word-Swapped Float32 (CD AB)
      const ok = await window.electronAPI.modbus.writeFloatRegister(55, current, true);
      return {
        success: ok,
        message: ok
          ? `✅ Successfully updated SET CURRENT: ${current.toFixed(1)} A`
          : `❌ Failed to update SET CURRENT (Hardware offline or not responding)`,
      };
    }
    return {
      success: false,
      message: `❌ Desktop Electron environment required for hardware write`,
    };
  };

  const writeSetTimerToModbus = async (duration: number): Promise<{ success: boolean; message: string }> => {
    if (window.electronAPI?.modbus?.writeRegister) {
      // SET_TIMER register is 4X: 57, length 1 word (FC 06 Write Single Register)
      const ok = await window.electronAPI.modbus.writeRegister(57, Math.round(duration));
      return {
        success: ok,
        message: ok
          ? `✅ Successfully updated SET TIMER: ${duration} hours`
          : `❌ Failed to update SET TIMER (Hardware offline or not responding)`,
      };
    }
    return {
      success: false,
      message: `❌ Desktop Electron environment required for hardware write`,
    };
  };

  const writeTestSpecificationToModbus = async (
    spec?: { ratedVoltage: number; ratedCurrent: number; testCurrent: number },
    startAddress: number = 201,
    format: 'int' | 'float' = 'float',
    wordSwap: boolean = false
  ) => {
    const targetSpec = spec || {
      ratedVoltage: Number(draftConfig.specification.ratedVoltage) || 0,
      ratedCurrent: Number(draftConfig.specification.ratedCurrent) || 0,
      testCurrent: Number(draftConfig.specification.testCurrent) || 0,
    };

    if (window.electronAPI?.modbus?.writeTestSpecification) {
      return await window.electronAPI.modbus.writeTestSpecification(targetSpec, startAddress, format, wordSwap);
    }

    return {
      success: false,
      message: `❌ Hardware unavailable. Run in Desktop Electron application.`,
      writtenRegisters: [],
    };
  };

  const updateDraftConfig = <K extends keyof TestConfig>(
    section: K,
    values: Partial<TestConfig[K]>
  ) => {
    setDraftConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  };

  const clearDraftConfig = () => {
    setWizardStep(1);
    setDraftConfig(BLANK_CONFIG);
  };

  const restorePreviousConfig = (): boolean => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREVIOUS_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.customer && parsed?.equipment && parsed?.specification && parsed?.testObject) {
          setDraftConfig(parsed);
          setHasPreviousConfig(true);
          return true;
        }
      }
    } catch {}
    if (testHistory.length > 0 && testHistory[0]?.config) {
      setDraftConfig(testHistory[0].config);
      try {
        localStorage.setItem(STORAGE_KEY_PREVIOUS_CONFIG, JSON.stringify(testHistory[0].config));
        setHasPreviousConfig(true);
      } catch {}
      return true;
    }
    return false;
  };

  const resetWizard = () => {
    setWizardStep(1);
    const restored = restorePreviousConfig();
    if (!restored) {
      setDraftConfig(BLANK_CONFIG);
    }
  };

  const navigateWithGuard = (targetTab: ActiveTab): boolean => {
    if (targetTab === 'new-test') {
      if (isTestActive) return false;
      setActiveTab('new-test');
      return true;
    }
    if (isTestActive && targetTab !== 'dashboard') {
      setPendingNavTab(targetTab);
      setShowNavGuardModal(true);
      return false;
    }
    setActiveTab(targetTab);
    return true;
  };

  const confirmNavAway = () => {
    if (pendingNavTab) {
      setActiveTab(pendingNavTab);
    }
    setShowNavGuardModal(false);
    setPendingNavTab(null);
  };

  const cancelNavAway = () => {
    setShowNavGuardModal(false);
    setPendingNavTab(null);
  };

  // Start Test session with DB persistence & TemperatureLogger (Hardware coils are controlled on Dashboard)
  const startTestSession = () => {
    const durationHrs = Number(draftConfig.specification.testDurationHours) || 1;
    const durationSeconds = Math.round(durationHrs * 3600);
    const ambient = Number(draftConfig.specification.ambientTemp) || 25;
    const sensorCount = Math.min(48, Math.max(1, Number(draftConfig.specification.sensorCount) || 48));
    const logIntervalMinutes = Math.max(0.1, Number(draftConfig.specification.logIntervalMinutes) || 1);

    const allSensors = sensorService.initialize(ambient);
    const initialSensors = allSensors.filter((s) => s.id <= sensorCount);
    const testId = `TRT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const startTimestamp = new Date().toLocaleString();

    // Save current config as previously entered config
    try {
      localStorage.setItem(STORAGE_KEY_PREVIOUS_CONFIG, JSON.stringify(draftConfig));
      setHasPreviousConfig(true);
    } catch {}

    // Create session in local database (without logging temperature row until TIMER_START is 1)
    dbProvider.createTestSession(draftConfig, testId, durationSeconds);

    // Clean alarm state for new test session
    alarmManagerSingleton.resetForNewTest(testId);
    dimmerAlarmTriggeredRef.current = { rZero: false, yZero: false, bZero: false, rMax: false, yMax: false, bMax: false };
    hardwareTriggeredRef.current = { impedance: false, noCurrent: false, cycleCompleted: false };
    setHardwarePopup(null);

    const newSession: TestSession = {
      testId,
      status: 'running',
      config: JSON.parse(JSON.stringify(draftConfig)),
      startTimestamp,
      durationSeconds,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      sensors: initialSensors,
      temperatureLogs: [], // Clean initialization: only starts logging when Coil 15 (TIMER_START) is 1
      alarmEvents: [],
    };

    setActiveSession(newSession);
    setSensors(initialSensors);
    setActiveAlarms([]);
    setLastResults(null);
    setNextLogCountdown(Math.round(logIntervalMinutes * 60));
    setIsLoggingActive(false);

    temperatureLoggerSingleton.setLogCommittedCallback((logRow) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          temperatureLogs: [...prev.temperatureLogs, logRow],
        };
      });
    });

    temperatureLoggerSingleton.startLogging(
      testId,
      () => sensorService.getSnapshot(),
      () => activeSessionRef.current?.elapsedSeconds || 0,
      logIntervalMinutes,
      sensorCount,
      () => modbusDataRef.current?.currents || { r: 0, y: 0, b: 0 },
      () => Boolean(modbusDataRef.current?.timerStart ?? modbusDataRef.current?.coils?.[15])
    );

    setActiveTab('dashboard');
  };

  // Live Timer loop (1 second elapsed countdown)
  useEffect(() => {
    if (activeSession?.status === 'running') {
      timerRef.current = setInterval(() => {
        setActiveSession((prev) => {
          if (!prev || prev.status !== 'running') return prev;

          const newElapsed = prev.elapsedSeconds + 1;
          const newRemaining = Math.max(0, prev.durationSeconds - newElapsed);

          return {
            ...prev,
            elapsedSeconds: newElapsed,
            remainingSeconds: newRemaining,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession?.status]);

  const calculateFinalResults = (session: TestSession): FinalTestResults => {
    const ambientTemp = Number(session.config.specification.ambientTemp) || 25;
    const limitTempRise = Number(session.config.specification.limitTempRise) || 65;
    const sensorCount = Math.min(48, Math.max(1, Number(session.config.specification.sensorCount) || session.sensors.length || 48));
    const activeSensors = session.sensors.filter((s) => s.id <= sensorCount);

    let maxObservedTemp = 0;
    let maxObservedRise = 0;
    let totalRise = 0;
    let passCount = 0;
    let failCount = 0;

    const pointResults: PointTestResult[] = activeSensors.map((sensor) => {
      const isSensorFail = sensor.status === 'fail' || sensor.isFailed || sensor.currentTemp >= 30000 || sensor.maxTemp >= 30000;
      const initialTemp = sensor.initialTemp;
      const maxTemp = sensor.maxTemp;
      const tempRise = isSensorFail ? 0 : Number((maxTemp - ambientTemp).toFixed(1));
      const pass = !isSensorFail && tempRise <= limitTempRise;

      if (pass) passCount++;
      else failCount++;

      if (!isSensorFail) {
        if (maxTemp > maxObservedTemp) maxObservedTemp = maxTemp;
        if (tempRise > maxObservedRise) maxObservedRise = tempRise;
        totalRise += tempRise;
      }

      return {
        pointId: sensor.id,
        label: sensor.label,
        initialTemp,
        maxTemp,
        tempRise,
        limitTempRise,
        pass,
      };
    });

    const overallPass = failCount === 0;
    const avgRise = Number((totalRise / (activeSensors.length || 1)).toFixed(1));

    return {
      overallPass,
      maxObservedTemp,
      maxObservedRise,
      avgRise,
      ambientTemp,
      passCount,
      failCount,
      pointResults,
    };
  };

  const endTestSession = (status: 'completed' | 'aborted' = 'completed', abortReason?: string): FinalTestResults => {
    // 1-Second Pulse to STOP coil (0X: 2) and reset START (0X: 1)
    pulseCoilToModbus(2, 1000);
    writeCoilStatusToModbus(1, false);

    if (!activeSession) {
      throw new Error('No active test session to end.');
    }

    if (timerRef.current) clearInterval(timerRef.current);
    temperatureLoggerSingleton.stopLogging();
    setIsLoggingActive(false);

    const endTimestamp = new Date().toLocaleString();
    const finalRes = calculateFinalResults(activeSession);
    if (status === 'aborted') {
      finalRes.overallPass = false;
      finalRes.cycleAborted = true;
      finalRes.abortReason = abortReason;
    }

    const completedSession: TestSession = {
      ...activeSession,
      status,
      abortReason,
      endTimestamp,
      finalResults: finalRes,
      alarmEvents: alarmManagerSingleton.getEventHistory(),
    };

    setActiveSession(completedSession);
    setLastResults(finalRes);

    dbProvider.completeTestSession(activeSession.testId, finalRes, activeSession.observations);
    dbProvider.getAllTests().then((tests) => setTestHistory(tests));

    setActiveTab('results');
    return finalRes;
  };

  const resetHardwarePopup = async () => {
    if (!hardwarePopup) return;

    const currentPopup = hardwarePopup;
    setHardwarePopup(null);

    // Pulse ALARM_RESET register (Coil 0X: 11) for 1 second
    await pulseCoilToModbus(11, 1000);

    if (currentPopup.isAbort) {
      endTestSession('aborted', currentPopup.description || currentPopup.title);
    } else {
      endTestSession('completed');
    }

    setActiveTab('results');
  };

  const dismissAlarmPopup = () => {
    setAlarmPopupEvent(null);
  };

  const acknowledgeAlarm = (eventId: string) => {
    alarmManagerSingleton.acknowledgeAlarm(eventId);
    setActiveAlarms(alarmManagerSingleton.getActiveEvents());
    dbProvider.acknowledgeAlarm(eventId);
    if (alarmPopupEvent?.id === eventId) {
      setAlarmPopupEvent(null);
    }
  };

  const triggerMockAlarm = (alarmId: number, description?: string) => {
    if (activeSession) {
      alarmManagerSingleton.triggerManualMockAlarm(activeSession.testId, alarmId, description);
    }
  };

  return (
    <TestContext.Provider
      value={{
        activeTab,
        setActiveTab,
        navigateWithGuard,
        wizardStep,
        setWizardStep,
        draftConfig,
        setDraftConfig,
        updateDraftConfig,
        resetWizard,
        clearDraftConfig,
        restorePreviousConfig,
        hasPreviousConfig,
        activeSession,
        startTestSession,
        endTestSession,
        isTestActive,
        sensors,
        activeAlarms,
        alarmPopupEvent,
        dismissAlarmPopup,
        acknowledgeAlarm,
        triggerMockAlarm,
        hardwarePopup,
        resetHardwarePopup,
        nextLogCountdown,
        isLoggingActive,
        modbusStatus,
        modbusData,
        connectModbus,
        disconnectModbus,
        writeModbusCoil,
        writeCoilStatusToModbus,
        pulseCoilToModbus,
        readCoilsFromModbus,
        writeFloatRegisterToModbus,
        writeSetCurrentToModbus,
        writeSetTimerToModbus,
        writeTestSpecificationToModbus,
        testHistory,
        selectedHistoryTest,
        setSelectedHistoryTest,
        lastResults,
        setLastResults,
        showNavGuardModal,
        pendingNavTab,
        confirmNavAway,
        cancelNavAway,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTestContext = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTestContext must be used within a TestProvider');
  }
  return context;
};
