import type { SensorPoint } from '../../types/test';

export interface ISensorDataService {
  /**
   * Initializes or resets sensor data to baseline ambient temperature.
   */
  initialize(ambientTemp?: number): SensorPoint[];

  /**
   * Returns current snapshot of all 48 temperature points.
   */
  getSnapshot(): SensorPoint[];

  /**
   * Updates mock readings for one ticker step.
   * @param elapsedSeconds Elapsed test duration in seconds
   * @param ambientTemp Set ambient baseline temperature
   */
  tick(elapsedSeconds: number, ambientTemp: number): SensorPoint[];

  /**
   * Set simulation speed multiplier or pause status.
   */
  setSimulationSpeed(multiplier: number): void;

  /**
   * Get active simulation speed multiplier.
   */
  getSimulationSpeed?(): number;
}
