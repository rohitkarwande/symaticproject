import type { IDatabaseProvider } from './IDatabaseProvider';
import type { TestConfig, TestSession, FinalTestResults, AlarmEvent } from '../../types/test';

const STORAGE_KEY = 'symatic_test_history_db';

export class WebDatabaseProvider implements IDatabaseProvider {
  private getStoredTests(): TestSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStoredTests(tests: TestSession[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    } catch (e) {
      console.warn('[WebDatabaseProvider] Failed to save localStorage:', e);
    }
  }

  public async createTestSession(config: TestConfig, testId: string, durationSeconds: number): Promise<string> {
    const tests = this.getStoredTests();
    const newSession: TestSession = {
      testId,
      status: 'running',
      config,
      startTimestamp: new Date().toLocaleString(),
      durationSeconds,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      sensors: [],
      temperatureLogs: [],
      alarmEvents: [],
    };
    tests.unshift(newSession);
    this.saveStoredTests(tests);
    return testId;
  }

  public async logTemperatureRow(
    testId: string,
    elapsedSeconds: number,
    timestamp: string,
    temps: Record<number, number>,
    sensorCount?: number,
    currents?: { r: number; y: number; b: number }
  ): Promise<void> {
    const tests = this.getStoredTests();
    const target = tests.find((t) => t.testId === testId);
    if (target) {
      const filteredTemps: Record<number, number> = {};
      const maxSens = sensorCount || 48;
      Object.entries(temps).forEach(([idStr, val]) => {
        const id = Number(idStr);
        if (id <= maxSens) {
          filteredTemps[id] = val;
        }
      });
      target.temperatureLogs.push({
        elapsedSeconds,
        timestamp,
        temperatures: filteredTemps,
        currents: currents || { r: 0, y: 0, b: 0 },
      });
      this.saveStoredTests(tests);
    }
  }

  public async saveAlarmEvent(event: AlarmEvent): Promise<void> {
    const tests = this.getStoredTests();
    const target = tests.find((t) => t.testId === event.testId);
    if (target) {
      target.alarmEvents.push(event);
      this.saveStoredTests(tests);
    }
  }

  public async acknowledgeAlarm(eventId: string): Promise<void> {
    const tests = this.getStoredTests();
    for (const t of tests) {
      const evt = t.alarmEvents.find((e) => e.id === eventId);
      if (evt) {
        evt.acknowledged = true;
        this.saveStoredTests(tests);
        break;
      }
    }
  }

  public async completeTestSession(testId: string, finalResults: FinalTestResults, observations?: string): Promise<void> {
    const tests = this.getStoredTests();
    const target = tests.find((t) => t.testId === testId);
    if (target) {
      target.status = 'completed';
      target.endTimestamp = new Date().toLocaleString();
      target.finalResults = finalResults;
      target.observations = observations;
      this.saveStoredTests(tests);
    }
  }

  public async getAllTests(): Promise<TestSession[]> {
    return this.getStoredTests();
  }
}
