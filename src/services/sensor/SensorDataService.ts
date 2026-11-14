import type { SensorPoint } from '../../types/test';
import type { ISensorDataService } from './types';

export class HardwareSensorDataService implements ISensorDataService {
  private sensors: SensorPoint[] = [];

  constructor() {
    this.initialize(25);
  }

  public initialize(ambientTemp = 25): SensorPoint[] {
    this.sensors = [];

    // Initialize 48 RTD temperature channels corresponding to hardware Modbus registers (TEMP_1..TEMP_48)
    for (let i = 1; i <= 48; i++) {
      this.sensors.push({
        id: i,
        label: `TEMP_${i}`,
        initialTemp: ambientTemp,
        currentTemp: ambientTemp,
        maxTemp: ambientTemp,
        status: 'normal',
      });
    }

    return [...this.sensors];
  }

  public getSnapshot(): SensorPoint[] {
    return [...this.sensors];
  }

  public updateFromHardware(temperatures: Record<number, number>, ambientTemp = 25): SensorPoint[] {
    this.sensors = this.sensors.map((sensor) => {
      const realTemp = temperatures[sensor.id];
      if (realTemp === undefined || isNaN(realTemp)) {
        return sensor;
      }

      // User rule: "if current at any point comes above 30000 show fail in ui for that sensor(point)"
      if (realTemp >= 30000) {
        return {
          ...sensor,
          currentTemp: realTemp,
          status: 'fail',
          isFailed: true,
        };
      }

      const maxTemp = Math.max(sensor.maxTemp, realTemp);
      const tempRise = Number((realTemp - ambientTemp).toFixed(1));

      let status: 'normal' | 'warning' | 'alarm' = 'normal';
      if (tempRise > 55 || realTemp > 85) {
        status = 'alarm';
      } else if (tempRise > 45 || realTemp > 75) {
        status = 'warning';
      }

      return {
        ...sensor,
        currentTemp: realTemp,
        maxTemp,
        status,
        isFailed: false,
      };
    });

    return [...this.sensors];
  }
}

class SensorDataServiceProvider {
  private activeService: ISensorDataService;

  constructor() {
    this.activeService = new HardwareSensorDataService();
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
