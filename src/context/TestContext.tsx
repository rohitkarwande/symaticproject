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

  // Active Test state
  activeSession: TestSession | null;
  startTestSession: () => void;
  endTestSession: () => FinalTestResults;
  isTestActive: boolean;

  // Live sensor & alarms
  sensors: SensorPoint[];
  activeAlarms: AlarmEvent[];
  alarmPopupEvent: AlarmEvent | null;
  dismissAlarmPopup: () => void;
  acknowledgeAlarm: (eventId: string) => void;
  triggerMockAlarm: (alarmId: number, description?: string) => void;
  nextLogCountdown: number;

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

const DEFAULT_CONFIG: TestConfig = {
  customer: {
    customerName: 'Symatic Industrial Automation Ltd',
    projectName: 'Substation Transformer Feeder Panel',
    address: 'Plot 42, GIDC Industrial Estate, Vadodara, Gujarat',
    poNumber: 'PO-2026-8891',
    serialNumber: 'CUST-SN-9941',
  },
  equipment: {
    equipmentName: '33kV Vacuum Circuit Breaker Panel',
    model: 'VCB-33-2000A',
    make: 'Symatic Engineering',
    serialNumber: 'EQ-2026-VCB-004',
    calibrationDueDate: '2027-06-30',
  },
  specification: {
    ratedVoltage: 33000,
    ratedCurrent: 2000,
    testCurrent: 2000,
    ambientTemp: 28,
    testDurationHours: 2, // Default 2 hours (1-24 valid)
    limitTempRise: 65, // Acceptance criteria limit 65°C
  },
  testObject: {
    description: 'Copper Main Busbar Junction & Contacts Assembly',
    serialNumber: 'TO-BUSBAR-33KV-01',
    sampleQuantity: 1,
  },
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [draftConfig, setDraftConfig] = useState<TestConfig>(DEFAULT_CONFIG);

  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [sensors, setSensors] = useState<SensorPoint[]>([]);
  const [activeAlarms, setActiveAlarms] = useState<AlarmEvent[]>([]);
  const [alarmPopupEvent, setAlarmPopupEvent] = useState<AlarmEvent | null>(null);
  const [nextLogCountdown, setNextLogCountdown] = useState<number>(60);

  // Modbus Hardware Connection state
  const [modbusStatus, setModbusStatus] = useState<ModbusStatus>({
    connected: false,
    ip: '192.168.0.200',
    port: 502,
    slaveId: 1,
  });
  const [modbusData, setModbusData] = useState<ModbusDataPayload | null>(null);

  const [testHistory, setTestHistory] = useState<TestSession[]>([]);
  const [selectedHistoryTest, setSelectedHistoryTest] = useState<TestSession | null>(null);
  const [lastResults, setLastResults] = useState<FinalTestResults | null>(null);

  // Navigation Guard Modal
  const [showNavGuardModal, setShowNavGuardModal] = useState<boolean>(false);
  const [pendingNavTab, setPendingNavTab] = useState<ActiveTab | null>(null);

  const sensorService = getSensorService();
  const dbProvider = getDatabaseProvider();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isTestActive = activeSession?.status === 'running';

  // Load persisted historical tests & attach Modbus IPC listeners
  useEffect(() => {
    const ambient = Number(draftConfig.specification.ambientTemp) || 25;
    const initialSensors = sensorService.initialize(ambient);
    setSensors(initialSensors);

    // Fetch tests from database
    dbProvider.getAllTests().then((persistedTests) => {
      if (persistedTests && persistedTests.length > 0) {
        setTestHistory(persistedTests);
      }
    });

    alarmManagerSingleton.setAlarmTriggerCallback((evt) => {
      setActiveAlarms(alarmManagerSingleton.getActiveEvents());
      setAlarmPopupEvent(evt);
      dbProvider.saveAlarmEvent(evt);
    });

    temperatureLoggerSingleton.setCountdownTickCallback((secs) => {
      setNextLogCountdown(secs);
    });

    // Modbus TCP Listener (Electron environment)
    if (window.electronAPI?.modbus) {
      window.electronAPI.modbus.getStatus().then((status) => {
        if (status) setModbusStatus((prev) => ({ ...prev, ...status }));
      });

      const unsubData = window.electronAPI.modbus.onData((payload: ModbusDataPayload) => {
        setModbusData(payload);
        setModbusStatus((prev) => ({
          ...prev,
          connected: payload.connected,
          lastPollTimestamp: payload.timestamp,
        }));

        // Update sensor points live from real Modbus hardware temperature readings
        if (payload.temperatures) {
          const ambient = Number(draftConfig.specification.ambientTemp) || 25;
          const updated = sensorService.updateFromHardware(payload.temperatures, ambient);
          setSensors(updated);

          // If active test is running, sync sensors into activeSession and evaluate alarms
          setActiveSession((currentSession) => {
            if (currentSession && currentSession.status === 'running') {
              const sessionAmbient = Number(currentSession.config.specification.ambientTemp) || ambient;
              const limitRise = Number(currentSession.config.specification.limitTempRise) || 65;
              alarmManagerSingleton.evaluateSensors(currentSession.testId, updated, sessionAmbient, limitRise);
              return {
                ...currentSession,
                sensors: updated,
              };
            }
            return currentSession;
          });
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
          ? `✅ Written Coil status to Address ${address} (Modbus PDU ${pduAddress}, FC 05) = ${state ? 'ON (1 / 0xFF00)' : 'OFF (0 / 0x0000)'}`
          : `❌ Failed to write Coil status to Modbus address ${address}`,
        writtenCoils: [{ address, state }],
      };
    }
    return {
      success: false,
      message: `❌ Modbus TCP hardware unavailable. Run in Desktop Electron application.`,
      writtenCoils: [],
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
      message: `❌ Modbus TCP hardware unavailable. Run in Desktop Electron application.`,
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

  const resetWizard = () => {
    setWizardStep(1);
    setDraftConfig(DEFAULT_CONFIG);
  };

  const navigateWithGuard = (targetTab: ActiveTab): boolean => {
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

  // Start Test session with DB persistence & TemperatureLogger
  const startTestSession = () => {
    const durationHrs = Number(draftConfig.specification.testDurationHours) || 1;
    const durationSeconds = Math.round(durationHrs * 3600);
    const ambient = Number(draftConfig.specification.ambientTemp) || 25;

    const initialSensors = sensorService.initialize(ambient);
    const testId = `TRT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const startTimestamp = new Date().toLocaleString();
    const initialTempMap = initialSensors.reduce((acc, curr) => {
      acc[curr.id] = curr.currentTemp;
      return acc;
    }, {} as Record<number, number>);

    const initialLogRow: TemperatureLogRow = {
      timestamp: startTimestamp,
      elapsedSeconds: 0,
      temperatures: initialTempMap,
    };

    dbProvider.createTestSession(draftConfig, testId, durationSeconds).then(() => {
      dbProvider.logTemperatureRow(testId, 0, startTimestamp, initialTempMap);
    });

    const newSession: TestSession = {
      testId,
      status: 'running',
      config: JSON.parse(JSON.stringify(draftConfig)),
      startTimestamp,
      durationSeconds,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      sensors: initialSensors,
      temperatureLogs: [initialLogRow],
      alarmEvents: [],
    };

    setActiveSession(newSession);
    setSensors(initialSensors);
    setActiveAlarms([]);
    setLastResults(null);

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
      () => activeSession?.elapsedSeconds || 0
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

    let maxObservedTemp = 0;
    let maxObservedRise = 0;
    let totalRise = 0;
    let passCount = 0;
    let failCount = 0;

    const pointResults: PointTestResult[] = session.sensors.map((sensor) => {
      const isSensorFail = sensor.status === 'fail' || sensor.isFailed || sensor.currentTemp >= 30000;
      const initialTemp = sensor.initialTemp;
      const maxTemp = isSensorFail ? 0 : sensor.maxTemp;
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
    const avgRise = Number((totalRise / (session.sensors.length || 1)).toFixed(1));

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

  const endTestSession = (): FinalTestResults => {
    if (!activeSession) {
      throw new Error('No active test session to end.');
    }

    if (timerRef.current) clearInterval(timerRef.current);
    temperatureLoggerSingleton.stopLogging();

    const endTimestamp = new Date().toLocaleString();
    const finalRes = calculateFinalResults(activeSession);

    const completedSession: TestSession = {
      ...activeSession,
      status: 'completed',
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
        nextLogCountdown,
        modbusStatus,
        modbusData,
        connectModbus,
        disconnectModbus,
        writeModbusCoil,
        writeCoilStatusToModbus,
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
