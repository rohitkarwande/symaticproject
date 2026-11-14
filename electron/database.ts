import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

export class SQLiteDatabase {
  private db!: DatabaseSync;
  private dbPath: string;

  constructor() {
    // For packaged Windows .exe apps, app.getPath('userData') points to %APPDATA%/SymaticEngineering
    // This ensures local machine persistence without requiring admin rights.
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    const dataDir = path.join(userDataPath, 'database');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'symatic_tests.db');
    console.log(`[SQLite Database] Storing database file at: ${this.dbPath}`);
    this.initDatabase();
  }

  private initDatabase() {
    this.db = new DatabaseSync(this.dbPath);
    
    // Enable WAL mode for high performance concurrent writes
    this.db.exec(`PRAGMA journal_mode = WAL;`);
    this.db.exec(`PRAGMA foreign_keys = ON;`);

    this.createTables();
    this.migrateSchema();
    this.seedDefaultAlarms();
  }

  private migrateSchema() {
    // Migrate test_specifications table for dynamic sensor count & logging interval
    try {
      this.db.exec(`ALTER TABLE test_specifications ADD COLUMN sensor_count INTEGER DEFAULT 48;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE test_specifications ADD COLUMN log_interval_minutes REAL DEFAULT 1;`);
    } catch {}

    // Migrate temperature_logs table for up to 48 channels & phase currents
    try {
      this.db.exec(`ALTER TABLE temperature_logs ADD COLUMN current_r REAL DEFAULT 0;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE temperature_logs ADD COLUMN current_y REAL DEFAULT 0;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE temperature_logs ADD COLUMN current_b REAL DEFAULT 0;`);
    } catch {}

    for (let i = 33; i <= 48; i++) {
      try {
        this.db.exec(`ALTER TABLE temperature_logs ADD COLUMN pt${i} REAL;`);
      } catch {}
    }
  }

  private createTables() {
    const ddl = `
      -- 1. Customers Table
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        project_name TEXT NOT NULL,
        address TEXT NOT NULL,
        po_number TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Equipment Table
      CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_name TEXT NOT NULL,
        model TEXT NOT NULL,
        make TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        calibration_due_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Test Specifications Table
      CREATE TABLE IF NOT EXISTS test_specifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rated_voltage REAL NOT NULL DEFAULT 0,
        rated_current REAL NOT NULL DEFAULT 0,
        test_current REAL NOT NULL DEFAULT 0,
        ambient_temp REAL NOT NULL DEFAULT 25,
        test_duration_hours REAL NOT NULL DEFAULT 1,
        limit_temp_rise REAL NOT NULL DEFAULT 65,
        sensor_count INTEGER NOT NULL DEFAULT 48,
        log_interval_minutes REAL NOT NULL DEFAULT 1
      );

      -- 4. Test Objects Table
      CREATE TABLE IF NOT EXISTS test_objects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        sample_quantity INTEGER NOT NULL
      );

      -- 5. Main Tests Table
      CREATE TABLE IF NOT EXISTS tests (
        test_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        equipment_id INTEGER REFERENCES equipment(id),
        spec_id INTEGER REFERENCES test_specifications(id),
        object_id INTEGER REFERENCES test_objects(id),
        start_timestamp TEXT NOT NULL,
        end_timestamp TEXT,
        duration_seconds INTEGER NOT NULL,
        elapsed_seconds INTEGER NOT NULL DEFAULT 0,
        overall_pass INTEGER,
        max_observed_temp REAL,
        max_observed_rise REAL,
        avg_rise REAL,
        observations TEXT,
        operator_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Temperature Logs Table (48 Point Channels + 3-Phase Currents)
      CREATE TABLE IF NOT EXISTS temperature_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
        elapsed_seconds INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        current_r REAL DEFAULT 0,
        current_y REAL DEFAULT 0,
        current_b REAL DEFAULT 0,
        pt1 REAL, pt2 REAL, pt3 REAL, pt4 REAL, pt5 REAL, pt6 REAL, pt7 REAL, pt8 REAL,
        pt9 REAL, pt10 REAL, pt11 REAL, pt12 REAL, pt13 REAL, pt14 REAL, pt15 REAL, pt16 REAL,
        pt17 REAL, pt18 REAL, pt19 REAL, pt20 REAL, pt21 REAL, pt22 REAL, pt23 REAL, pt24 REAL,
        pt25 REAL, pt26 REAL, pt27 REAL, pt28 REAL, pt29 REAL, pt30 REAL, pt31 REAL, pt32 REAL,
        pt33 REAL, pt34 REAL, pt35 REAL, pt36 REAL, pt37 REAL, pt38 REAL, pt39 REAL, pt40 REAL,
        pt41 REAL, pt42 REAL, pt43 REAL, pt44 REAL, pt45 REAL, pt46 REAL, pt47 REAL, pt48 REAL
      );

      -- 7. Alarms Definition Table
      CREATE TABLE IF NOT EXISTS alarms (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );

      -- 8. Alarm Events Log Table
      CREATE TABLE IF NOT EXISTS alarm_events (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
        alarm_id INTEGER REFERENCES alarms(id),
        alarm_code TEXT NOT NULL,
        alarm_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        cleared_timestamp TEXT,
        acknowledged INTEGER NOT NULL DEFAULT 0
      );

      -- 9. Observations Table
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
        operator_notes TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Application Settings Table
      CREATE TABLE IF NOT EXISTS application_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.db.exec(ddl);
  }

  private seedDefaultAlarms() {
    const countStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM alarms');
    const row = countStmt.get() as { cnt: number };
    if (row && row.cnt === 0) {
      const insert = this.db.prepare(
        'INSERT INTO alarms (id, code, name, description, severity, enabled) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const defaults = [
        [1, 'ALM-01', 'Over Temperature Limit', 'Point exceeded temperature rise limit', 'critical', 1],
        [2, 'ALM-02', 'Rapid Temperature Rise Rate', 'Thermal rate of change exceeded limit', 'warning', 1],
        [3, 'ALM-03', 'Ambient High Temperature', 'Ambient temperature exceeded 40°C', 'warning', 1],
        [4, 'ALM-04', 'Sensor Channel Fault', 'Sensor connection broken or disconnected', 'critical', 1],
        [5, 'ALM-05', 'PLC Communication Timeout', 'HMI / PLC Ethernet connection lost', 'critical', 1],
        [6, 'ALM-06', 'Emergency Stop Tripped', 'Hardware Emergency Stop activated', 'critical', 1],
        [7, 'ALM-07', 'Test Current Under-Range', 'Current dropped below 90% of setpoint', 'warning', 1],
        [8, 'ALM-08', 'Voltage Surge / Unbalance', 'Supply voltage instability detected', 'warning', 1],
        [9, 'ALM-09', 'HMI Synchronization Failure', 'HMI parameter sync failure', 'info', 1],
        [10, 'ALM-10', 'Safety Enclosure Interlock', 'Safety bay door open during test', 'warning', 1],
        [11, 'ALM-11', 'Cooling / Exhaust Fan Fault', 'Room air circulation unit power trip', 'warning', 1],
        [12, 'ALM-12', 'Max Duration Limit Warning', 'Test duration approaching limit', 'info', 1],
      ];
      for (const def of defaults) {
        insert.run(...def);
      }
    }
  }

  // Create new test session with normalized child tables
  public createTestSession(config: any, testId: string, durationSeconds: number): string {
    const custStmt = this.db.prepare(
      'INSERT INTO customers (customer_name, project_name, address, po_number, serial_number) VALUES (?, ?, ?, ?, ?)'
    );
    const custRes = custStmt.run(
      config.customer?.customerName || '',
      config.customer?.projectName || '',
      config.customer?.address || '',
      config.customer?.poNumber || '',
      config.customer?.serialNumber || ''
    );
    const customerId = Number(custRes.lastInsertRowid);
    console.log(`[SQLite Database] Successfully saved customer: "${config.customer?.customerName}" (ID: ${customerId}) for test session: ${testId}`);

    const eqStmt = this.db.prepare(
      'INSERT INTO equipment (equipment_name, model, make, serial_number, calibration_due_date) VALUES (?, ?, ?, ?, ?)'
    );
    const eqRes = eqStmt.run(
      config.equipment?.equipmentName || '',
      config.equipment?.model || '',
      config.equipment?.make || '',
      config.equipment?.serialNumber || '',
      config.equipment?.calibrationDueDate || ''
    );
    const equipmentId = Number(eqRes.lastInsertRowid);

    const specStmt = this.db.prepare(
      'INSERT INTO test_specifications (rated_voltage, rated_current, test_current, ambient_temp, test_duration_hours, limit_temp_rise, sensor_count, log_interval_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const specRes = specStmt.run(
      Number(config.specification?.ratedVoltage || 0),
      Number(config.specification?.ratedCurrent || 0),
      Number(config.specification?.testCurrent || 0),
      Number(config.specification?.ambientTemp || 25),
      Number(config.specification?.testDurationHours || 1),
      Number(config.specification?.limitTempRise || 65),
      Number(config.specification?.sensorCount || 48),
      Number(config.specification?.logIntervalMinutes || 1)
    );
    const specId = Number(specRes.lastInsertRowid);

    const objStmt = this.db.prepare(
      'INSERT INTO test_objects (description, serial_number, sample_quantity) VALUES (?, ?, ?)'
    );
    const objRes = objStmt.run(
      config.testObject?.description || '',
      config.testObject?.serialNumber || '',
      Number(config.testObject?.sampleQuantity || 1)
    );
    const objectId = Number(objRes.lastInsertRowid);

    const startTimestamp = new Date().toLocaleString();

    const testStmt = this.db.prepare(`
      INSERT INTO tests (
        test_id, status, customer_id, equipment_id, spec_id, object_id,
        start_timestamp, duration_seconds, elapsed_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    testStmt.run(testId, 'running', customerId, equipmentId, specId, objectId, startTimestamp, durationSeconds);
    return testId;
  }

  // Insert periodic temperature log row (supports up to 48 channels + 3-phase currents, filtered by sensorCount)
  public logTemperatureRow(
    testId: string,
    elapsedSeconds: number,
    timestamp: string,
    temps: Record<number, number>,
    sensorCount: number = 48,
    currents?: { r: number; y: number; b: number }
  ) {
    const columns = Array.from({ length: 48 }, (_, i) => `pt${i + 1}`).join(', ');
    const placeholders = Array.from({ length: 48 }, () => '?').join(', ');
    const stmt = this.db.prepare(
      `INSERT INTO temperature_logs (test_id, elapsed_seconds, timestamp, current_r, current_y, current_b, ${columns}) VALUES (?, ?, ?, ?, ?, ?, ${placeholders})`
    );

    const activeCount = Math.min(48, Math.max(1, Number(sensorCount) || 48));
    const tempValues = Array.from({ length: 48 }, (_, i) => {
      const ptId = i + 1;
      if (ptId > activeCount) return null;
      return (temps && temps[ptId] !== undefined && temps[ptId] !== null) ? Number(temps[ptId]) : null;
    });

    stmt.run(
      testId,
      elapsedSeconds,
      timestamp,
      Number(currents?.r || 0),
      Number(currents?.y || 0),
      Number(currents?.b || 0),
      ...tempValues
    );
  }

  // Insert alarm event
  public saveAlarmEvent(event: any) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO alarm_events (
        id, test_id, alarm_id, alarm_code, alarm_name, severity, description, timestamp, acknowledged
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.testId,
      event.alarmId,
      event.alarmCode,
      event.alarmName,
      event.severity,
      event.description,
      event.timestamp,
      event.acknowledged ? 1 : 0
    );
  }

  // Acknowledge alarm event
  public acknowledgeAlarm(eventId: string) {
    const stmt = this.db.prepare('UPDATE alarm_events SET acknowledged = 1 WHERE id = ?');
    stmt.run(eventId);
  }

  // Complete test session with final results
  public completeTestSession(testId: string, finalResults: any, observations?: string) {
    const endTimestamp = new Date().toLocaleString();
    const stmt = this.db.prepare(`
      UPDATE tests SET
        status = 'completed',
        end_timestamp = ?,
        overall_pass = ?,
        max_observed_temp = ?,
        max_observed_rise = ?,
        avg_rise = ?,
        observations = ?
      WHERE test_id = ?
    `);

    stmt.run(
      endTimestamp,
      finalResults.overallPass ? 1 : 0,
      finalResults.maxObservedTemp,
      finalResults.maxObservedRise,
      finalResults.avgRise,
      observations || null,
      testId
    );

    if (observations) {
      const obsStmt = this.db.prepare('INSERT INTO observations (test_id, operator_notes) VALUES (?, ?)');
      obsStmt.run(testId, observations);
    }
  }

  // Fetch all tests with hydrated customer & spec details
  public getAllTests(): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        t.test_id as testId,
        t.status,
        t.start_timestamp as startTimestamp,
        t.end_timestamp as endTimestamp,
        t.duration_seconds as durationSeconds,
        t.elapsed_seconds as elapsedSeconds,
        t.overall_pass as overallPass,
        t.max_observed_temp as maxObservedTemp,
        t.max_observed_rise as maxObservedRise,
        t.avg_rise as avgRise,
        t.observations,
        c.customer_name as customerName,
        c.project_name as projectName,
        c.address,
        c.po_number as poNumber,
        c.serial_number as custSerialNumber,
        eq.equipment_name as equipmentName,
        eq.model,
        eq.make,
        eq.serial_number as eqSerialNumber,
        eq.calibration_due_date as calibrationDueDate,
        sp.rated_voltage as ratedVoltage,
        sp.rated_current as ratedCurrent,
        sp.test_current as testCurrent,
        sp.ambient_temp as ambientTemp,
        sp.test_duration_hours as testDurationHours,
        sp.limit_temp_rise as limitTempRise,
        sp.sensor_count as sensorCount,
        sp.log_interval_minutes as logIntervalMinutes,
        obj.description as objDescription,
        obj.serial_number as objSerialNumber,
        obj.sample_quantity as sampleQuantity
      FROM tests t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN equipment eq ON t.equipment_id = eq.id
      LEFT JOIN test_specifications sp ON t.spec_id = sp.id
      LEFT JOIN test_objects obj ON t.object_id = obj.id
      ORDER BY t.created_at DESC
    `);

    const rows = stmt.all() as any[];

    const logCols = Array.from({ length: 48 }, (_, i) => `pt${i + 1}`).join(', ');
    const logsStmt = this.db.prepare(`
      SELECT elapsed_seconds, timestamp, current_r, current_y, current_b, ${logCols}
      FROM temperature_logs
      WHERE test_id = ?
      ORDER BY elapsed_seconds ASC
    `);

    const alarmStmt = this.db.prepare(`
      SELECT id, test_id, alarm_id, alarm_code, alarm_name, severity, description, timestamp, cleared_timestamp, acknowledged
      FROM alarm_events
      WHERE test_id = ?
      ORDER BY id DESC
    `);

    return rows.map((r) => {
      const activeSensorCount = Math.min(48, Math.max(1, Number(r.sensorCount) || 48));
      const logRows = logsStmt.all(r.testId) as any[];
      const temperatureLogs = logRows.map((l) => {
        const temps: Record<number, number> = {};
        for (let i = 1; i <= activeSensorCount; i++) {
          temps[i] = l[`pt${i}`] !== null ? Number(l[`pt${i}`]) : 0;
        }
        return {
          elapsedSeconds: l.elapsed_seconds,
          timestamp: l.timestamp,
          currents: {
            r: Number(l.current_r || 0),
            y: Number(l.current_y || 0),
            b: Number(l.current_b || 0),
          },
          temperatures: temps,
        };
      });

      const alarmRows = alarmStmt.all(r.testId) as any[];
      const alarmEvents = alarmRows.map((a) => ({
        id: a.id,
        testId: a.test_id,
        alarmId: a.alarm_id,
        alarmCode: a.alarm_code,
        alarmName: a.alarm_name,
        severity: a.severity,
        description: a.description,
        timestamp: a.timestamp,
        clearedTimestamp: a.cleared_timestamp || undefined,
        acknowledged: a.acknowledged === 1,
      }));

      return {
        testId: r.testId,
        status: r.status,
        startTimestamp: r.startTimestamp,
        endTimestamp: r.endTimestamp,
        durationSeconds: r.durationSeconds,
        elapsedSeconds: r.elapsedSeconds,
        temperatureLogs,
        alarmEvents,
        config: {
          customer: {
            customerName: r.customerName || '',
            projectName: r.projectName || '',
            address: r.address || '',
            poNumber: r.poNumber || '',
            serialNumber: r.custSerialNumber || '',
          },
          equipment: {
            equipmentName: r.equipmentName || '',
            model: r.model || '',
            make: r.make || '',
            serialNumber: r.eqSerialNumber || '',
            calibrationDueDate: r.calibrationDueDate || '',
          },
          specification: {
            testCurrent: r.testCurrent || 0,
            testDurationHours: r.testDurationHours || 1,
            sensorCount: activeSensorCount,
            logIntervalMinutes: r.logIntervalMinutes || 1,
            ratedVoltage: r.ratedVoltage || 0,
            ratedCurrent: r.ratedCurrent || 0,
            ambientTemp: r.ambientTemp || 25,
            limitTempRise: r.limitTempRise || 65,
          },
          testObject: {
            description: r.objDescription || '',
            serialNumber: r.objSerialNumber || '',
            sampleQuantity: r.sampleQuantity || 1,
          },
        },
        finalResults: r.overallPass !== null ? {
          overallPass: r.overallPass === 1,
          maxObservedTemp: r.maxObservedTemp || 0,
          maxObservedRise: r.maxObservedRise || 0,
          avgRise: r.avgRise || 0,
          ambientTemp: r.ambientTemp || 25,
          passCount: r.overallPass === 1 ? activeSensorCount : Math.max(0, activeSensorCount - 1),
          failCount: r.overallPass === 1 ? 0 : 1,
          pointResults: Array.from({ length: activeSensorCount }, (_, i) => ({
            pointId: i + 1,
            label: `TEMP_${i + 1}`,
            initialTemp: r.ambientTemp || 25,
            maxTemp: (r.ambientTemp || 25) + (r.maxObservedRise || 40),
            tempRise: r.maxObservedRise || 40,
            limitTempRise: r.limitTempRise || 65,
            pass: r.overallPass === 1,
          })),
        } : undefined,
      };
    });
  }
}

export const sqliteDbInstance = new SQLiteDatabase();
