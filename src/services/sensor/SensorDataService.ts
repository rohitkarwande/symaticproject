import type { ISensorDataService } from './types';
import { MockSensorDataService } from './MockSensorDataService';

class SensorDataServiceProvider {
  private activeService: ISensorDataService;

  constructor() {
    // Default to Mock for Phase 1. Ready to swap to ModbusTcpService in Phase 6.
    this.activeService = new MockSensorDataService();
  }

  public getService(): ISensorDataService {
    return this.activeService;
  }

  public setService(service: ISensorDataService): void {
    this.activeService = service;
  }
}

export const sensorServiceSingleton = new SensorDataServiceProvider();
export const getSensorService = () => sensorServiceSingleton.getService();
