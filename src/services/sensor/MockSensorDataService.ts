import type { SensorPoint } from '../../types/test';
import type { ISensorDataService } from './types';

export class MockSensorDataService implements ISensorDataService {
  private sensors: SensorPoint[] = [];
  private pointHeatFactors: number[] = [];
  private speedMultiplier = 1;

  constructor() {
    this.initialize(25);
  }

  public initialize(ambientTemp = 25): SensorPoint[] {
    this.sensors = [];
    this.pointHeatFactors = [];

    // Support up to 48 RTD temperature channels as per HMI Tag Library
    for (let i = 1; i <= 48; i++) {
      // Variations in heat generation per point (hotspots vs outer points)
      const isHotspot = (i >= 8 && i <= 14) || (i >= 20 && i <= 26) || (i >= 34 && i <= 40);
      const heatRate = isHotspot ? 28 + Math.random() * 12 : 15 + Math.random() * 10;
      this.pointHeatFactors.push(heatRate);

      const initial = Number((ambientTemp + (Math.random() * 0.8 - 0.4)).toFixed(1));

      this.sensors.push({
        id: i,
        label: `Point ${i}`,
        initialTemp: initial,
        currentTemp: initial,
        maxTemp: initial,
        status: 'normal',
      });
    }

    return [...this.sensors];
  }

  public getSnapshot(): SensorPoint[] {
    return [...this.sensors];
  }

  public tick(elapsedSeconds: number, ambientTemp: number): SensorPoint[] {
    const hours = (elapsedSeconds * this.speedMultiplier) / 3600;

    this.sensors = this.sensors.map((sensor, index) => {
      const maxRisePotential = this.pointHeatFactors[index];
      const timeConstantTau = 1.2; // thermal constant in hours
      
      const calculatedRise = maxRisePotential * (1 - Math.exp(-hours / timeConstantTau));
      const noise = (Math.random() - 0.5) * 0.35;
      const currentTemp = Number((ambientTemp + calculatedRise + noise).toFixed(1));
      const maxTemp = Math.max(sensor.maxTemp, currentTemp);

      let status: 'normal' | 'warning' | 'alarm' = 'normal';
      const tempRise = currentTemp - ambientTemp;

      if (tempRise > 55 || currentTemp > 85) {
        status = 'alarm';
      } else if (tempRise > 45 || currentTemp > 75) {
        status = 'warning';
      }

      return {
        ...sensor,
        currentTemp,
        maxTemp,
        status,
      };
    });

    return [...this.sensors];
  }

  public setSimulationSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, multiplier);
  }

  public getSimulationSpeed(): number {
    return this.speedMultiplier;
  }
}
