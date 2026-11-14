import type { IDatabaseProvider } from './IDatabaseProvider';
import type { TestConfig, TestSession, FinalTestResults, AlarmEvent } from '../../types/test';



export class ElectronDatabaseProvider implements IDatabaseProvider {
  public async createTestSession(config: TestConfig, testId: string, durationSeconds: number): Promise<string> {
    if (window.electronAPI?.db) {
      return await window.electronAPI.db.createTestSession(config, testId, durationSeconds);
    }
    return testId;
  }

  public async logTemperatureRow(testId: string, elapsedSeconds: number, timestamp: string, temps: Record<number, number>): Promise<void> {
    if (window.electronAPI?.db) {
      await window.electronAPI.db.logTemperatureRow(testId, elapsedSeconds, timestamp, temps);
    }
  }

  public async saveAlarmEvent(event: AlarmEvent): Promise<void> {
    if (window.electronAPI?.db) {
      await window.electronAPI.db.saveAlarmEvent(event);
    }
  }

  public async acknowledgeAlarm(eventId: string): Promise<void> {
    if (window.electronAPI?.db) {
      await window.electronAPI.db.acknowledgeAlarm(eventId);
    }
  }

  public async completeTestSession(testId: string, finalResults: FinalTestResults, observations?: string): Promise<void> {
    if (window.electronAPI?.db) {
      await window.electronAPI.db.completeTestSession(testId, finalResults, observations);
    }
  }

  public async getAllTests(): Promise<TestSession[]> {
    if (window.electronAPI?.db) {
      return await window.electronAPI.db.getAllTests();
    }
    return [];
  }
}
