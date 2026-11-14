import type { TestConfig, TestSession, FinalTestResults, AlarmEvent } from '../../types/test';

export interface IDatabaseProvider {
  createTestSession(config: TestConfig, testId: string, durationSeconds: number): Promise<string>;
  logTemperatureRow(
    testId: string,
    elapsedSeconds: number,
    timestamp: string,
    temps: Record<number, number>,
    sensorCount?: number,
    currents?: { r: number; y: number; b: number }
  ): Promise<void>;
  saveAlarmEvent(event: AlarmEvent): Promise<void>;
  acknowledgeAlarm(eventId: string): Promise<void>;
  completeTestSession(testId: string, finalResults: FinalTestResults, observations?: string): Promise<void>;
  getAllTests(): Promise<TestSession[]>;
}
