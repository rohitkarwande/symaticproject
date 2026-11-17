export interface CustomerDetails {
  customerName: string;
  projectName: string;
  address: string;
  poNumber: string;
  serialNumber: string;
}

export interface EquipmentDetails {
  equipmentName: string;
  model: string;
  make: string;
  serialNumber: string;
  calibrationDueDate: string;
}

export interface TestSpecification {
  testCurrent: number | string;
  testDurationHours: number | string; // 1 to 24 hours
  sensorCount: number | string; // Number of active sensors (1 to 48)
  logIntervalMinutes: number | string; // Report data logging interval in minutes (e.g. 5)
  // Optional / internal defaults for backward compatibility
  ratedVoltage?: number | string;
  ratedCurrent?: number | string;
  ambientTemp?: number | string;
  limitTempRise?: number | string; // Acceptance Criteria limit in °C
}

export interface TestObjectDetails {
  description: string;
  serialNumber: string;
  sampleQuantity: number | string; // Positive integer
}

export interface TestConfig {
  customer: CustomerDetails;
  equipment: EquipmentDetails;
  specification: TestSpecification;
  testObject: TestObjectDetails;
}

export interface SensorPoint {
  id: number; // 1 to 48
  label: string; // "TEMP_1" ... "TEMP_48"
  currentTemp: number;
  maxTemp: number;
  initialTemp: number;
  status: 'normal' | 'warning' | 'alarm' | 'fail';
  isFailed?: boolean;
}

export type AlarmSeverity = 'critical' | 'warning' | 'info';

export interface AlarmDefinition {
  id: number;
  code: string;
  name: string;
  description: string;
  severity: AlarmSeverity;
  enabled: boolean;
  active: boolean;
}

export interface AlarmEvent {
  id: string;
  testId: string;
  alarmId: number;
  alarmCode: string;
  alarmName: string;
  severity: AlarmSeverity;
  description: string;
  timestamp: string;
  clearedTimestamp?: string;
  acknowledged: boolean;
}

export interface TemperatureLogRow {
  timestamp: string;
  elapsedSeconds: number;
  temperatures: Record<number, number>; // pointId -> temperature
  currents?: {
    r: number;
    y: number;
    b: number;
  };
}

export type TestStatus = 'idle' | 'configuring' | 'preview' | 'running' | 'paused' | 'completed' | 'cancelled' | 'aborted';

export interface PointTestResult {
  pointId: number;
  label: string;
  initialTemp: number;
  maxTemp: number;
  tempRise: number; // Formula: maxTemp - ambientTemp
  limitTempRise: number;
  pass: boolean;
}

export interface FinalTestResults {
  overallPass: boolean;
  maxObservedTemp: number;
  maxObservedRise: number;
  avgRise: number;
  ambientTemp: number;
  passCount: number;
  failCount: number;
  pointResults: PointTestResult[];
  cycleAborted?: boolean;
  abortReason?: string;
}

export interface TestSession {
  testId: string;
  status: TestStatus;
  config: TestConfig;
  startTimestamp?: string;
  endTimestamp?: string;
  durationSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  sensors: SensorPoint[];
  temperatureLogs: TemperatureLogRow[];
  alarmEvents: AlarmEvent[];
  observations?: string;
  operatorName?: string;
  finalResults?: FinalTestResults;
  abortReason?: string;
}
