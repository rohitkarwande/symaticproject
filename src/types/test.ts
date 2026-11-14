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
  ratedVoltage: number | string;
  ratedCurrent: number | string;
  testCurrent: number | string;
  ambientTemp: number | string;
  testDurationHours: number | string; // 1 to 24 hours
  limitTempRise: number | string; // Acceptance Criteria limit in °C
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
}

export type TestStatus = 'idle' | 'configuring' | 'preview' | 'running' | 'paused' | 'completed' | 'cancelled';

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
}
