import type { SensorPoint, TemperatureLogRow } from '../../types/test';
import { getDatabaseProvider } from '../db/DatabaseService';

export class TemperatureLogger {
  private logIntervalSeconds = 60; // 1 Minute default as per specification
  private countdownSeconds = 60;
  private timerId: NodeJS.Timeout | null = null;
  private onLogCommittedCallback?: (logRow: TemperatureLogRow) => void;
  private onCountdownTickCallback?: (secondsRemaining: number) => void;

  public setIntervalSeconds(interval: number) {
    this.logIntervalSeconds = Math.max(1, interval);
    this.countdownSeconds = this.logIntervalSeconds;
  }

  public getIntervalSeconds(): number {
    return this.logIntervalSeconds;
  }

  public setLogCommittedCallback(cb: (logRow: TemperatureLogRow) => void) {
    this.onLogCommittedCallback = cb;
  }

  public setCountdownTickCallback(cb: (secondsRemaining: number) => void) {
    this.onCountdownTickCallback = cb;
  }

  public startLogging(
    testId: string,
    getSensors: () => SensorPoint[],
    getElapsedSeconds: () => number
  ) {
    this.stopLogging();
    this.countdownSeconds = this.logIntervalSeconds;

    this.timerId = setInterval(async () => {
      this.countdownSeconds -= 1;

      if (this.onCountdownTickCallback) {
        this.onCountdownTickCallback(this.countdownSeconds);
      }

      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = this.logIntervalSeconds;

        const currentSensors = getSensors();
        const elapsed = getElapsedSeconds();
        const timestamp = new Date().toLocaleTimeString();

        const tempMap = currentSensors.reduce((acc, curr) => {
          acc[curr.id] = curr.currentTemp;
          return acc;
        }, {} as Record<number, number>);

        const logRow: TemperatureLogRow = {
          timestamp,
          elapsedSeconds: elapsed,
          temperatures: tempMap,
        };

        // Commit to database
        const dbProvider = getDatabaseProvider();
        await dbProvider.logTemperatureRow(testId, elapsed, timestamp, tempMap);

        if (this.onLogCommittedCallback) {
          this.onLogCommittedCallback(logRow);
        }
      }
    }, 1000);
  }

  public stopLogging() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const temperatureLoggerSingleton = new TemperatureLogger();
