import type { SensorPoint, TemperatureLogRow } from '../../types/test';
import { getDatabaseProvider } from '../db/DatabaseService';

export class TemperatureLogger {
  private logIntervalSeconds = 60; // 1 Minute default as per specification
  private countdownSeconds = 60;
  private timerId: NodeJS.Timeout | null = null;
  private hasLoggedInitial = false;
  private onLogCommittedCallback?: (logRow: TemperatureLogRow) => void;
  private onCountdownTickCallback?: (secondsRemaining: number, isLoggingActive: boolean) => void;

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

  public setCountdownTickCallback(cb: (secondsRemaining: number, isLoggingActive: boolean) => void) {
    this.onCountdownTickCallback = cb;
  }

  public startLogging(
    testId: string,
    getSensors: () => SensorPoint[],
    getElapsedSeconds: () => number,
    logIntervalMinutes: number = 1,
    sensorCount: number = 48,
    getCurrents?: () => { r: number; y: number; b: number },
    isLoggingAllowed?: () => boolean
  ) {
    this.stopLogging();
    this.hasLoggedInitial = false;
    this.logIntervalSeconds = Math.max(1, Math.round((logIntervalMinutes || 1) * 60));
    this.countdownSeconds = this.logIntervalSeconds;

    const commitLogRow = async (elapsed: number) => {
      const allSensors = getSensors();
      const activeSensors = allSensors.filter((s) => s.id <= sensorCount);
      const timestamp = new Date().toLocaleTimeString();

      const tempMap = activeSensors.reduce((acc, curr) => {
        acc[curr.id] = curr.currentTemp;
        return acc;
      }, {} as Record<number, number>);

      const phaseCurrents = getCurrents ? getCurrents() : { r: 0, y: 0, b: 0 };

      const logRow: TemperatureLogRow = {
        timestamp,
        elapsedSeconds: elapsed,
        temperatures: tempMap,
        currents: phaseCurrents,
      };

      // Commit to database
      const dbProvider = getDatabaseProvider();
      await dbProvider.logTemperatureRow(testId, elapsed, timestamp, tempMap, sensorCount, phaseCurrents);

      if (this.onLogCommittedCallback) {
        this.onLogCommittedCallback(logRow);
      }
    };

    if (this.onCountdownTickCallback) {
      const initialAllowed = isLoggingAllowed ? isLoggingAllowed() : true;
      this.onCountdownTickCallback(this.countdownSeconds, initialAllowed);
    }

    this.timerId = setInterval(async () => {
      // Check TEST_ON coil (Coil 10): 1 = log data, 0 = do NOT log data
      const allowed = isLoggingAllowed ? isLoggingAllowed() : true;

      if (!allowed) {
        // Logging paused while TEST_ON is 0
        if (this.onCountdownTickCallback) {
          this.onCountdownTickCallback(this.countdownSeconds, false);
        }
        return;
      }

      // If logging just became active and initial baseline hasn't been logged yet, log it!
      if (!this.hasLoggedInitial) {
        this.hasLoggedInitial = true;
        await commitLogRow(getElapsedSeconds());
        this.countdownSeconds = this.logIntervalSeconds;
        if (this.onCountdownTickCallback) {
          this.onCountdownTickCallback(this.countdownSeconds, true);
        }
        return;
      }

      this.countdownSeconds -= 1;

      if (this.onCountdownTickCallback) {
        this.onCountdownTickCallback(this.countdownSeconds, true);
      }

      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = this.logIntervalSeconds;
        await commitLogRow(getElapsedSeconds());
      }
    }, 1000);
  }

  public stopLogging() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.hasLoggedInitial = false;
  }
}

export const temperatureLoggerSingleton = new TemperatureLogger();
