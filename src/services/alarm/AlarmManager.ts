import type { AlarmDefinition, AlarmEvent, SensorPoint } from '../../types/test';

export const INITIAL_12_ALARMS: AlarmDefinition[] = [
  {
    id: 1,
    code: 'ALM-01',
    name: 'Over Temperature Limit',
    description: 'One or more sensor points exceeded maximum allowable temperature threshold.',
    severity: 'critical',
    enabled: true,
    active: false,
  },
  {
    id: 2,
    code: 'ALM-02',
    name: 'Rapid Temperature Rise Rate',
    description: 'Thermal rate of change (°C/min) exceeded safety limit.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 3,
    code: 'ALM-03',
    name: 'Ambient High Temperature',
    description: 'Ambient testing chamber temperature exceeded 40°C.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 4,
    code: 'ALM-04',
    name: 'Sensor Channel Fault',
    description: 'Temperature sensor connection broken or reading out of physical bounds.',
    severity: 'critical',
    enabled: true,
    active: false,
  },
  {
    id: 5,
    code: 'ALM-05',
    name: 'PLC Communication Timeout',
    description: 'HMI / PLC Ethernet Modbus communication signal lost.',
    severity: 'critical',
    enabled: true,
    active: false,
  },
  {
    id: 6,
    code: 'ALM-06',
    name: 'Emergency Stop Tripped',
    description: 'Industrial panel hardware Emergency Stop switch activated.',
    severity: 'critical',
    enabled: true,
    active: false,
  },
  {
    id: 7,
    code: 'ALM-07',
    name: 'Test Current Under-Range',
    description: 'Injected test current dropped below 90% of configured setpoint.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 8,
    code: 'ALM-08',
    name: 'Voltage Surge / Unbalance',
    description: 'Supply voltage instability or phase imbalance detected.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 9,
    code: 'ALM-09',
    name: 'HMI Synchronization Failure',
    description: 'Bi-directional parameter sync with PLC HMI lost.',
    severity: 'info',
    enabled: true,
    active: false,
  },
  {
    id: 10,
    code: 'ALM-10',
    name: 'Safety Enclosure Interlock',
    description: 'Test bay safety door open during active test execution.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 11,
    code: 'ALM-11',
    name: 'Cooling / Exhaust Fan Fault',
    description: 'Test room air circulation unit power trip.',
    severity: 'warning',
    enabled: true,
    active: false,
  },
  {
    id: 12,
    code: 'ALM-12',
    name: 'Max Duration Limit Warning',
    description: 'Test duration approaching configured 24-hour limit.',
    severity: 'info',
    enabled: true,
    active: false,
  },
];

export class AlarmManager {
  private alarmDefinitions: AlarmDefinition[] = [...INITIAL_12_ALARMS];
  private activeEvents: AlarmEvent[] = [];
  private eventHistory: AlarmEvent[] = [];
  private onAlarmTriggeredCallback?: (event: AlarmEvent) => void;

  public setAlarmTriggerCallback(cb: (event: AlarmEvent) => void) {
    this.onAlarmTriggeredCallback = cb;
  }

  public getDefinitions(): AlarmDefinition[] {
    return [...this.alarmDefinitions];
  }

  public updateDefinition(updated: AlarmDefinition): void {
    this.alarmDefinitions = this.alarmDefinitions.map((def) =>
      def.id === updated.id ? updated : def
    );
  }

  public evaluateSensors(
    testId: string,
    sensors: SensorPoint[],
    ambientTemp: number,
    limitTempRise: number
  ): AlarmEvent[] {
    const newlyTriggered: AlarmEvent[] = [];

    // Check Alarm 1: Over Temperature Limit
    const overLimitPoint = sensors.find(
      (s) => s.currentTemp - ambientTemp > limitTempRise || s.currentTemp > 90
    );
    const alm1Def = this.alarmDefinitions.find((a) => a.id === 1);

    if (alm1Def && alm1Def.enabled) {
      if (overLimitPoint && !alm1Def.active) {
        alm1Def.active = true;
        const event: AlarmEvent = {
          id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          testId,
          alarmId: 1,
          alarmCode: alm1Def.code,
          alarmName: alm1Def.name,
          severity: alm1Def.severity,
          description: `${overLimitPoint.label} exceeded temperature rise limit (${overLimitPoint.currentTemp}°C vs Limit + Ambient ${(ambientTemp + limitTempRise).toFixed(1)}°C).`,
          timestamp: new Date().toLocaleTimeString(),
          acknowledged: false,
        };
        this.activeEvents.push(event);
        this.eventHistory.push(event);
        newlyTriggered.push(event);
        if (this.onAlarmTriggeredCallback) this.onAlarmTriggeredCallback(event);
      } else if (!overLimitPoint && alm1Def.active) {
        alm1Def.active = false;
      }
    }

    // Check Alarm 3: Ambient High
    const alm3Def = this.alarmDefinitions.find((a) => a.id === 3);
    if (alm3Def && alm3Def.enabled) {
      if (ambientTemp > 45 && !alm3Def.active) {
        alm3Def.active = true;
        const event: AlarmEvent = {
          id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          testId,
          alarmId: 3,
          alarmCode: alm3Def.code,
          alarmName: alm3Def.name,
          severity: alm3Def.severity,
          description: `Ambient temperature (${ambientTemp}°C) is above high threshold limit 45°C.`,
          timestamp: new Date().toLocaleTimeString(),
          acknowledged: false,
        };
        this.activeEvents.push(event);
        this.eventHistory.push(event);
        newlyTriggered.push(event);
        if (this.onAlarmTriggeredCallback) this.onAlarmTriggeredCallback(event);
      }
    }

    return newlyTriggered;
  }

  public triggerManualMockAlarm(testId: string, alarmId: number, details?: string): AlarmEvent | null {
    const def = this.alarmDefinitions.find((a) => a.id === alarmId);
    if (!def) return null;

    def.active = true;
    const event: AlarmEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      testId,
      alarmId: def.id,
      alarmCode: def.code,
      alarmName: def.name,
      severity: def.severity,
      description: details || def.description,
      timestamp: new Date().toLocaleTimeString(),
      acknowledged: false,
    };

    this.activeEvents.push(event);
    this.eventHistory.push(event);
    if (this.onAlarmTriggeredCallback) this.onAlarmTriggeredCallback(event);
    return event;
  }

  public acknowledgeAlarm(eventId: string): void {
    const event = this.activeEvents.find((e) => e.id === eventId);
    if (event) {
      event.acknowledged = true;
    }
    const hist = this.eventHistory.find((e) => e.id === eventId);
    if (hist) {
      hist.acknowledged = true;
    }
  }

  public getActiveEvents(): AlarmEvent[] {
    return [...this.activeEvents];
  }

  public getEventHistory(): AlarmEvent[] {
    return [...this.eventHistory];
  }
}

export const alarmManagerSingleton = new AlarmManager();
