import type { SensorPoint } from '../../types/test';

export interface ISensorDataService {
  /**
   * Initializes or resets sensor data to baseline ambient temperature for 48 channels.
   */
  initialize(ambientTemp?: number): SensorPoint[];

  /**
   * Returns current snapshot of all 48 temperature points.
   */
  getSnapshot(): SensorPoint[];

  /**
   * Updates sensor points from real hardware Modbus temperature telemetry.
   */
  updateFromHardware(temperatures: Record<number, number>, ambientTemp?: number): SensorPoint[];
}
