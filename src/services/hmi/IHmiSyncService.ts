import type { TestConfig, SensorPoint, AlarmEvent } from '../../types/test';

export interface IHmiSyncService {
  /**
   * Connects to HMI TCP/IP service.
   */
  connect(host: string, port: number): Promise<boolean>;

  /**
   * Disconnects from HMI.
   */
  disconnect(): Promise<void>;

  /**
   * Synchronizes desktop configured test parameters down to the HMI/PLC.
   */
  sendTestConfigToHmi(config: TestConfig): Promise<boolean>;

  /**
   * Receives HMI entered test parameters up to desktop application.
   */
  subscribeHmiConfigChanges(callback: (configPartial: Partial<TestConfig>) => void): void;

  /**
   * Sends desktop alarm acknowledge signal to HMI PLC.
   */
  sendAlarmAcknowledgeToHmi(alarmCode: string): Promise<boolean>;

  /**
   * Returns current TCP sync connection status.
   */
  isConnected(): boolean;
}
