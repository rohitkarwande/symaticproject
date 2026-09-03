import React, { useState, useEffect, useRef } from 'react';
import { Settings, Cpu, Database, Network, CheckCircle, RefreshCw, Table, Radio, Sliders, AlertCircle, Zap } from 'lucide-react';
import { getSensorService } from '../../services/sensor/SensorDataService';
import { getDatabaseProvider } from '../../services/db/DatabaseService';
import { useTestContext } from '../../context/TestContext';

interface TableSchemaInfo {
  name: string;
  description: string;
  columns: string[];
}

const DB_TABLE_SCHEMAS: TableSchemaInfo[] = [
  {
    name: 'customers',
    description: 'Stores customer details, facility addresses, PO numbers, and serials.',
    columns: ['id INTEGER PRIMARY KEY', 'customer_name TEXT', 'project_name TEXT', 'address TEXT', 'po_number TEXT', 'serial_number TEXT', 'created_at TEXT'],
  },
  {
    name: 'equipment',
    description: 'Stores tested equipment model, make, serial, and calibration dates.',
    columns: ['id INTEGER PRIMARY KEY', 'equipment_name TEXT', 'model TEXT', 'make TEXT', 'serial_number TEXT', 'calibration_due_date TEXT'],
  },
  {
    name: 'test_specifications',
    description: 'Stores operating setpoints, voltage, current, duration, and limit rise.',
    columns: ['id INTEGER PRIMARY KEY', 'rated_voltage REAL', 'rated_current REAL', 'test_current REAL', 'ambient_temp REAL', 'test_duration_hours REAL', 'limit_temp_rise REAL'],
  },
  {
    name: 'test_objects',
    description: 'Stores tested sample object descriptions and sample quantities.',
    columns: ['id INTEGER PRIMARY KEY', 'description TEXT', 'serial_number TEXT', 'sample_quantity INTEGER'],
  },
  {
    name: 'tests',
    description: 'Main session records, timestamps, status, overall PASS/FAIL result.',
    columns: ['test_id TEXT PRIMARY KEY', 'status TEXT', 'customer_id INTEGER', 'equipment_id INTEGER', 'spec_id INTEGER', 'object_id INTEGER', 'start_timestamp TEXT', 'end_timestamp TEXT', 'duration_seconds INTEGER', 'overall_pass INTEGER', 'max_observed_temp REAL', 'max_observed_rise REAL', 'observations TEXT'],
  },
  {
    name: 'temperature_logs',
    description: '1-minute logging table containing 48 temperature point channels.',
    columns: ['id INTEGER PRIMARY KEY', 'test_id TEXT', 'elapsed_seconds INTEGER', 'timestamp TEXT', 'pt1 REAL .. pt48 REAL (48 Channels)'],
  },
  {
    name: 'alarms',
    description: 'Stores 12 pre-configured system alarm safety definitions.',
    columns: ['id INTEGER PRIMARY KEY', 'code TEXT UNIQUE', 'name TEXT', 'description TEXT', 'severity TEXT', 'enabled INTEGER'],
  },
  {
    name: 'alarm_events',
    description: 'Logs triggered alarm instances and operator acknowledgement status.',
    columns: ['id TEXT PRIMARY KEY', 'test_id TEXT', 'alarm_id INTEGER', 'alarm_code TEXT', 'alarm_name TEXT', 'severity TEXT', 'timestamp TEXT', 'acknowledged INTEGER'],
  },
];

export const SettingsView: React.FC = () => {
  const sensorService = getSensorService();
  const dbProvider = getDatabaseProvider();
  const { modbusStatus, connectModbus, disconnectModbus, writeTestSpecificationToModbus, writeCoilStatusToModbus, draftConfig } = useTestContext();

  const [ipAddress, setIpAddress] = useState<string>(modbusStatus.ip || '192.168.0.200');
  const [port, setPort] = useState<number>(modbusStatus.port || 502);
  const [slaveId, setSlaveId] = useState<number>(modbusStatus.slaveId || 1);
  const [useSimulator, setUseSimulator] = useState<boolean>(modbusStatus.useSimulator ?? true);

  // Modbus Specification Register Writer State (Address 201+)
  const [regStartAddress, setRegStartAddress] = useState<number | string>(201);
  const [regFormat, setRegFormat] = useState<'int' | 'float'>('float');
  const [regWordSwap, setRegWordSwap] = useState<boolean>(false);
  const [regVoltage, setRegVoltage] = useState<number | string>(Number(draftConfig.specification.ratedVoltage) || 33000);
  const [regRatedCurrent, setRegRatedCurrent] = useState<number | string>(Number(draftConfig.specification.ratedCurrent) || 2000);
  const [regTestCurrent, setRegTestCurrent] = useState<number | string>(Number(draftConfig.specification.testCurrent) || 2000);
  const [writeRegMsg, setWriteRegMsg] = useState<string>('');
  const [writingRegs, setWritingRegs] = useState<boolean>(false);
  const [writtenRegLog, setWrittenRegLog] = useState<{ address: number; val: number }[]>([]);

  // Modbus Coil Status Writer State (Address 1..65535, 0xxxx Coils)
  const [coilAddress, setCoilAddress] = useState<number | string>(1);
  const [coilState, setCoilState] = useState<boolean>(true);
  const [writeCoilMsg, setWriteCoilMsg] = useState<string>('');
  const [writingCoils, setWritingCoils] = useState<boolean>(false);
  const [writtenCoilLog, setWrittenCoilLog] = useState<{ address: number; state: boolean }[]>([
    { address: 1, state: true },
    { address: 2, state: false },
  ]);

  const isInitialRegMount = useRef(true);
  const isInitialCoilMount = useRef(true);

  const handleWriteSpecificationRegisters = async (vOverride?: number, rOverride?: number, tOverride?: number) => {
    const v = vOverride !== undefined ? vOverride : Number(regVoltage);
    const r = rOverride !== undefined ? rOverride : Number(regRatedCurrent);
    const t = tOverride !== undefined ? tOverride : Number(regTestCurrent);
    const addr = Number(regStartAddress) || 201;

    if (isNaN(v) || isNaN(r) || isNaN(t)) return;

    setWritingRegs(true);
    try {
      const res = await writeTestSpecificationToModbus(
        { ratedVoltage: v, ratedCurrent: r, testCurrent: t },
        addr,
        regFormat,
        regWordSwap
      );
      setWriteRegMsg(res.message);
      setWrittenRegLog(res.writtenRegisters || []);
    } catch (err: any) {
      setWriteRegMsg(`❌ Error writing registers: ${err.message}`);
    } finally {
      setWritingRegs(false);
    }
  };

  const handleWriteCoilStatus = async (targetAddress?: number, targetState?: boolean) => {
    const addr = targetAddress !== undefined ? targetAddress : Number(coilAddress);
    const st = targetState !== undefined ? targetState : coilState;

    if (isNaN(addr) || addr < 1) return;

    setWritingCoils(true);
    try {
      const res = await writeCoilStatusToModbus(addr, st);
      setWriteCoilMsg(res.message);
      setWrittenCoilLog((prev) => {
        const filtered = prev.filter((c) => c.address !== addr);
        return [{ address: addr, state: st }, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      setWriteCoilMsg(`❌ Error writing coil status: ${err.message}`);
    } finally {
      setWritingCoils(false);
    }
  };

  // REALTIME AUTO-SYNC EFFECT FOR HOLDING REGISTERS (as user types)
  useEffect(() => {
    if (isInitialRegMount.current) {
      isInitialRegMount.current = false;
      return;
    }
    if (regVoltage === '' || regRatedCurrent === '' || regTestCurrent === '') return;
    const v = Number(regVoltage);
    const r = Number(regRatedCurrent);
    const t = Number(regTestCurrent);

    if (isNaN(v) || isNaN(r) || isNaN(t)) return;

    const timer = setTimeout(() => {
      handleWriteSpecificationRegisters(v, r, t);
    }, 200);

    return () => clearTimeout(timer);
  }, [regVoltage, regRatedCurrent, regTestCurrent, regStartAddress, regFormat, regWordSwap]);

  // REALTIME AUTO-SYNC EFFECT FOR COIL STATUS (as address or state changes)
  useEffect(() => {
    if (isInitialCoilMount.current) {
      isInitialCoilMount.current = false;
      return;
    }
    if (coilAddress === '') return;
    const addr = Number(coilAddress);
    if (isNaN(addr) || addr < 1) return;

    const timer = setTimeout(() => {
      handleWriteCoilStatus(addr, coilState);
    }, 200);

    return () => clearTimeout(timer);
  }, [coilAddress, coilState]);

  const [dbStatus, setDbStatus] = useState<{
    providerName: string;
    filePath: string;
    totalTestsCount: number;
    dbStatusMsg: string;
  }>({
    providerName: typeof window !== 'undefined' && window.electronAPI?.db ? 'Electron Native SQLite (node:sqlite)' : 'Web Storage Provider',
    filePath: typeof window !== 'undefined' && window.electronAPI?.db ? '%APPDATA%/SymaticEngineering/database/symatic_tests.db' : 'Browser LocalStorage Engine',
    totalTestsCount: 0,
    dbStatusMsg: 'CONNECTED & ONLINE',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [showSchemaModal, setShowSchemaModal] = useState<boolean>(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(sensorService.getSimulationSpeed?.() || 1);
  const [modbusConnecting, setModbusConnecting] = useState<boolean>(false);
  const [modbusMsg, setModbusMsg] = useState<string>('');
  const [diagResults, setDiagResults] = useState<string[]>([]);
  const [runningDiag, setRunningDiag] = useState<boolean>(false);

  const handleRunDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResults(['Testing Modbus TCP server ports...']);

    const targets = [
      { ip: ipAddress, port: Number(port) },
      { ip: '127.0.0.1', port: 502 },
      { ip: '127.0.0.1', port: 5020 },
    ];

    const results: string[] = [];

    for (const t of targets) {
      if (window.electronAPI?.modbus?.testDiagnostic) {
        const res = await window.electronAPI.modbus.testDiagnostic(t.ip, t.port);
        results.push(res.message);
      } else {
        results.push('ℹ️ Web environment active. Run in desktop Electron app for direct socket testing.');
        break;
      }
    }

    setDiagResults(results);
    setRunningDiag(false);
  };

  const refreshDbStats = async () => {
    setLoading(true);
    try {
      const tests = await dbProvider.getAllTests();
      setDbStatus((prev) => ({
        ...prev,
        totalTestsCount: tests.length,
        dbStatusMsg: 'HEALTHY — WAL MODE ACTIVE',
      }));
    } catch {
      setDbStatus((prev) => ({
        ...prev,
        dbStatusMsg: 'ERROR CHECKING DATABASE',
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDbStats();
  }, []);

  const handleApplyModbusConfig = async () => {
    setModbusConnecting(true);
    setModbusMsg('Connecting to Modbus TCP server...');

    try {
      const success = await connectModbus({
        ip: ipAddress,
        port: Number(port),
        slaveId: Number(slaveId),
        useSimulator,
      });

      if (success) {
        setModbusMsg(useSimulator ? '✓ Modbus TCP Simulator Mode Active' : `✓ Connected to Flexem HMI at ${ipAddress}:${port}`);
      } else {
        setModbusMsg(`⚠️ Failed to connect to ${ipAddress}:${port}. Check cable & IP.`);
      }
    } catch (err: any) {
      setModbusMsg(`❌ Connection error: ${err.message}`);
    } finally {
      setModbusConnecting(false);
    }
  };

  const handleDisconnectModbus = async () => {
    await disconnectModbus();
    setModbusMsg(`Disconnected from Flexem HMI (${ipAddress}:${port})`);
  };

  useEffect(() => {
    if (modbusStatus.connected) {
      setModbusMsg(modbusStatus.useSimulator ? '✓ Modbus TCP Simulator Mode Active' : `✓ Connected to Flexem HMI at ${modbusStatus.ip || ipAddress}:${modbusStatus.port || port}`);
    } else if (modbusStatus.error) {
      setModbusMsg(`❌ Connection error: ${modbusStatus.error}`);
    } else if (!modbusStatus.connected && !modbusStatus.useSimulator) {
      setModbusMsg(`Disconnected from Flexem HMI (${ipAddress}:${port})`);
    }
  }, [modbusStatus.connected, modbusStatus.useSimulator, modbusStatus.ip, modbusStatus.port, modbusStatus.error, ipAddress, port]);

  const getModbusMsgColor = (msg: string) => {
    if (msg.includes('✓')) return '#34d399';
    if (msg.includes('❌') || msg.toLowerCase().includes('disconnected') || msg.includes('⚠️')) return '#f87171';
    return '#fbbf24';
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
          Hardware Settings & System Diagnostics
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
          Configure Flexem HMI Modbus TCP IP address, 48-channel RTD mapping, and database persistence.
        </p>
      </div>

      {/* MODBUS TCP HARDWARE INTEGRATION CARD */}
      <div
        className="ind-card"
        style={{
          marginBottom: '20px',
          borderColor: modbusStatus.connected ? '#10b981' : '#3b82f6',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={22} color={modbusStatus.connected ? '#10b981' : '#3b82f6'} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Flexem HMI Modbus TCP Hardware Integration
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Ethernet Communication (48 RTD Temperature Channels, 32-bit Float32 Voltages & Currents)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: modbusStatus.connected
                  ? 'rgba(16, 185, 129, 0.2)'
                  : useSimulator
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                color: modbusStatus.connected ? '#34d399' : useSimulator ? '#fbbf24' : '#f87171',
                border: `1px solid ${modbusStatus.connected ? '#10b981' : useSimulator ? '#f59e0b' : '#ef4444'}`,
              }}
            >
              {modbusStatus.connected
                ? '🟢 CONNECTED (REAL HMI)'
                : useSimulator
                ? '🟡 SIMULATOR MODE ACTIVE'
                : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Form Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Flexem HMI IP Address
            </label>
            <input
              type="text"
              className="font-mono"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.0.200"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Modbus TCP Port
            </label>
            <input
              type="number"
              className="font-mono"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="502"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Slave Unit ID (Station No)
            </label>
            <input
              type="number"
              className="font-mono"
              value={slaveId}
              onChange={(e) => setSlaveId(Number(e.target.value))}
              placeholder="1"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Operating Mode
            </label>
            <select
              value={useSimulator ? 'sim' : 'real'}
              onChange={(e) => setUseSimulator(e.target.value === 'sim')}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            >
              <option value="real">Real Hardware / Ethernet HMI</option>
              <option value="sim">Modbus Slave Simulator Mode</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: getModbusMsgColor(modbusMsg) }}>
            {modbusMsg || `Target: ${ipAddress}:${port} (Slave ID ${slaveId})`}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleRunDiagnostic}
              disabled={runningDiag}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Cpu size={14} className={runningDiag ? 'spin' : ''} />
              {runningDiag ? 'Testing Ports...' : 'Run Socket Diagnostic'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleApplyModbusConfig}
              disabled={modbusConnecting}
              style={{ fontSize: '12px', padding: '6px 16px' }}
            >
              <RefreshCw size={14} className={modbusConnecting ? 'spin' : ''} />
              {modbusConnecting ? 'Connecting...' : 'Apply & Connect Modbus'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDisconnectModbus}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Disconnect
            </button>
          </div>
        </div>

        {diagResults.length > 0 && (
          <div style={{ marginTop: '14px', backgroundColor: '#020617', padding: '12px', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '12px' }}>
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>
              TCP Socket Port Diagnostic Log:
            </div>
            {diagResults.map((resLine, idx) => (
              <div key={idx} className="font-mono" style={{ color: resLine.includes('✅') ? '#34d399' : resLine.includes('❌') ? '#f87171' : '#fbbf24', margin: '2px 0' }}>
                {resLine}
              </div>
            ))}
          </div>
        )}

        {/* MODBUS SLAVE SIMULATOR REFERENCE TABLE */}
        <div style={{ marginTop: '16px', backgroundColor: '#0f172a', borderRadius: '4px', padding: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} /> Modbus Slave Simulator Register Setup Guide
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
            To test using <strong>Modbus Slave</strong> software on PC, configure TCP Server port <code>502</code> and set up the following Holding Registers:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '4px', border: '1px solid #334155' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>40011 to 40058 (LW 10-57):</span>
              <br />
              48 RTD Temps (Raw Int, divide by 10 e.g. <code>254</code> = 25.4°C)
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '4px', border: '1px solid #334155' }}>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>40031, 40033, 40035 (D30, 32, 34):</span>
              <br />
              R-Y-B Phase Voltages (32-bit Float32, e.g. <code>415.2 V</code>)
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '4px', border: '1px solid #334155' }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>40047, 40049, 40051 (D46, 48, 50):</span>
              <br />
              R-Y-B Phase Currents (32-bit Float32, e.g. <code>2000.0 A</code>)
            </div>
          </div>
        </div>
      </div>

      {/* MODBUS SPECIFICATION REGISTER WRITER (Address 201+) */}
      <div
        className="ind-card"
        style={{
          marginBottom: '20px',
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#a78bfa" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Modbus Register Writer — Test Specifications (ModSim32 Integration)
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Write Rated Voltage, Rated Current &amp; Test Current to Modbus TCP holding registers (Starting Address 201+)
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={12} /> REALTIME AUTO-SYNC ACTIVE
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#c4b5fd',
                border: '1px solid #8b5cf6',
              }}
            >
              FC 16 WRITE MULTIPLE REGISTERS
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Starting Modbus Address
            </label>
            <input
              type="number"
              className="form-input font-mono"
              value={regStartAddress}
              onChange={(e) => setRegStartAddress(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Data Format &amp; Byte Order
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <select
                className="form-input"
                value={regFormat}
                onChange={(e) => setRegFormat(e.target.value as 'int' | 'float')}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', backgroundColor: '#0f172a', color: '#f8fafc' }}
              >
                <option value="float">32-Bit Float (2 Words/Val)</option>
                <option value="int">16-Bit Integer (1 Word/Val)</option>
              </select>

              {regFormat === 'float' && (
                <label style={{ fontSize: '10px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={regWordSwap}
                    onChange={(e) => setRegWordSwap(e.target.checked)}
                  />
                  Swap Float Words (CD AB)
                </label>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Rated Voltage (V)
            </label>
            <input
              type="number"
              className="form-input font-mono"
              value={regVoltage}
              onChange={(e) => setRegVoltage(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Rated Current (A)
            </label>
            <input
              type="number"
              className="form-input font-mono"
              value={regRatedCurrent}
              onChange={(e) => setRegRatedCurrent(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Test Current (A)
            </label>
            <input
              type="number"
              className="form-input font-mono"
              value={regTestCurrent}
              onChange={(e) => setRegTestCurrent(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: writeRegMsg.includes('✅') || writeRegMsg.includes('⚡') ? '#34d399' : writeRegMsg.includes('❌') ? '#f87171' : '#a78bfa' }}>
            {writeRegMsg || `Configured: Write starting at Address ${regStartAddress} in ${regFormat === 'int' ? '16-bit Integer' : '32-bit Float'} mode`}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleWriteSpecificationRegisters()}
            disabled={writingRegs}
            style={{ fontSize: '13px', padding: '8px 20px', backgroundColor: '#8b5cf6', borderColor: '#7c3aed' }}
          >
            <RefreshCw size={15} className={writingRegs ? 'spin' : ''} />
            {writingRegs ? 'Writing Registers...' : 'Force Write to ModSim32 (201+)'}
          </button>
        </div>

        {/* MODSIM32 DISPLAY FORMAT INSTRUCTION ALERT */}
        <div style={{ marginTop: '14px', backgroundColor: '#020617', padding: '12px', borderRadius: '4px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} color="#f59e0b" /> ModSim32 Display Setup (Crucial for Correct Display):
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
            If ModSim32 shows large numbers like <code>216269363</code> or skips line numbers (e.g. <code>40202:</code> missing), ModSim32 display format is set to <strong>Long Integer</strong>.
            <br />
            To fix this: Click <strong>Display</strong> menu in ModSim32 top menu bar and select:
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li><strong>Decimal:</strong> Use when Data Format is set to <code>16-Bit Integer</code> (shows <code>40201: 33000</code>, <code>40202: 2000</code>, <code>40203: 2000</code>).</li>
              <li><strong>Floating Point:</strong> Use when Data Format is set to <code>32-Bit Float</code> (shows <code>40201: 33000.00</code>, <code>40203: 2000.00</code>, <code>40205: 2000.00</code>).</li>
            </ul>
          </div>

          {writtenRegLog.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #334155' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', marginBottom: '6px', textTransform: 'uppercase' }}>
                Last Written Modbus Registers Map (Starting Address {regStartAddress}):
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {writtenRegLog.map((r, i) => (
                  <div key={i} className="font-mono" style={{ backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', border: '1px solid #475569' }}>
                    <span style={{ color: '#38bdf8' }}>Reg {r.address} (40{r.address}):</span> <strong style={{ color: '#facc15' }}>{r.val}</strong> (0x{r.val.toString(16).toUpperCase().padStart(4, '0')})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODBUS COIL STATUS WRITER (Address 00001+) */}
      <div
        className="ind-card"
        style={{
          marginBottom: '20px',
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} color="#22d3ee" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Modbus Coil Status Writer (ModSim32 Integration — 0xxxx Coils)
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Write discrete binary state (ON/OFF) to Modbus TCP coils (Address 1+ / PDU 0+ / ModSim 00001+)
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={12} /> REALTIME AUTO-SYNC ACTIVE
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                color: '#67e8f9',
                border: '1px solid #06b6d4',
              }}
            >
              FC 05 WRITE SINGLE COIL
            </span>
          </div>
        </div>

        {/* PRESET QUICK CONTROL BUTTONS */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Quick System Control Presets (Click to instantly write):
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Coil 1: Phase Fail ON', addr: 1, val: true, color: '#ef4444' },
              { label: 'Coil 1: Phase Fail OFF', addr: 1, val: false, color: '#10b981' },
              { label: 'Coil 2: Thermal Overload ON', addr: 2, val: true, color: '#ef4444' },
              { label: 'Coil 2: Thermal Overload OFF', addr: 2, val: false, color: '#10b981' },
              { label: 'Coil 6: Alarm Active ON', addr: 6, val: true, color: '#f59e0b' },
              { label: 'Coil 7: Test Run ON', addr: 7, val: true, color: '#3b82f6' },
              { label: 'Coil 7: Test Run OFF', addr: 7, val: false, color: '#64748b' },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn"
                onClick={() => {
                  setCoilAddress(p.addr);
                  setCoilState(p.val);
                  handleWriteCoilStatus(p.addr, p.val);
                }}
                disabled={writingCoils}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  backgroundColor: '#0f172a',
                  color: p.color,
                  borderColor: '#334155',
                  fontWeight: 600,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM MANUAL COIL WRITE FORM */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Coil Address (ModSim32 0xxxx)
            </label>
            <input
              type="number"
              min="1"
              max="65536"
              className="form-input font-mono"
              value={coilAddress}
              onChange={(e) => setCoilAddress(e.target.value)}
              placeholder="e.g. 1 (00001)"
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Desired Coil Status Value
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCoilState(true)}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: coilState ? '#10b981' : '#0f172a',
                  color: coilState ? '#ffffff' : '#94a3b8',
                  borderColor: coilState ? '#059669' : '#334155',
                }}
              >
                ON (1 / 0xFF00)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCoilState(false)}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: !coilState ? '#ef4444' : '#0f172a',
                  color: !coilState ? '#ffffff' : '#94a3b8',
                  borderColor: !coilState ? '#dc2626' : '#334155',
                }}
              >
                OFF (0 / 0x0000)
              </button>
            </div>
          </div>

          <div>
            <button
              className="btn btn-primary"
              onClick={() => handleWriteCoilStatus()}
              disabled={writingCoils}
              style={{ width: '100%', fontSize: '13px', padding: '8px 16px', backgroundColor: '#06b6d4', borderColor: '#0891b2' }}
            >
              <RefreshCw size={15} className={writingCoils ? 'spin' : ''} />
              {writingCoils ? 'Writing Coil...' : 'Write Coil Status'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: writeCoilMsg.includes('✅') ? '#34d399' : writeCoilMsg.includes('❌') ? '#f87171' : '#22d3ee' }}>
            {writeCoilMsg || `Configured: Write Coil Address ${coilAddress} = ${coilState ? 'ON (1)' : 'OFF (0)'}`}
          </div>
        </div>

        {/* MODSIM32 COIL SETUP ALERT */}
        <div style={{ marginTop: '14px', backgroundColor: '#020617', padding: '12px', borderRadius: '4px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#22d3ee', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} color="#22d3ee" /> ModSim32 0xxxx Coil Table Mapping:
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
            In ModSim32, set <strong>Modbus Point Type</strong> to <code>01: COIL STATUS</code>.
            <br />
            Address <code>1</code> in UI corresponds to ModSim32 <code>00001</code> (Modbus PDU Address 0).
          </div>

          {writtenCoilLog.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #334155' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#67e8f9', marginBottom: '6px', textTransform: 'uppercase' }}>
                Recent Modbus Coils Status Map:
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {writtenCoilLog.map((c, i) => (
                  <div key={i} className="font-mono" style={{ backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', border: '1px solid #475569' }}>
                    <span style={{ color: '#38bdf8' }}>Coil {c.address} (0000{c.address}):</span>{' '}
                    <strong style={{ color: c.state ? '#34d399' : '#f87171' }}>{c.state ? 'ON (1)' : 'OFF (0)'}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQLITE DATABASE DIAGNOSTICS CARD */}
      <div
        className="ind-card"
        style={{
          marginBottom: '20px',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} color="#10b981" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              SQLite Database Persistence Status
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowSchemaModal(true)} style={{ fontSize: '12px', padding: '4px 12px' }}>
              <Table size={14} /> View Database Schema
            </button>
            <button className="btn btn-secondary" onClick={refreshDbStats} disabled={loading} style={{ fontSize: '12px', padding: '4px 12px' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Checking...' : 'Refresh DB Stats'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '8px 0', color: '#94a3b8', width: '40%' }}>Database Engine:</td>
                  <td style={{ padding: '8px 0', fontWeight: 700, color: '#10b981' }}>{dbStatus.providerName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '8px 0', color: '#94a3b8' }}>Storage File Path:</td>
                  <td className="font-mono" style={{ padding: '8px 0', fontSize: '12px', color: '#3b82f6' }}>{dbStatus.filePath}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#94a3b8' }}>Database Health:</td>
                  <td style={{ padding: '8px 0', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={15} /> {dbStatus.dbStatusMsg}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '4px',
              border: '1px solid #334155',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Persisted Tests in DB</div>
            <div className="font-mono" style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
              {dbStatus.totalTestsCount}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981' }}>
              ✓ Automatically saved to local machine disk
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Software Platform Card */}
        <div className="ind-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <Cpu size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Application Build</h3>
          </div>

          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>System Application:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>Symatic Temperature Rise Test v1.0</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Protocol Engine:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: '#10b981' }}>Native Modbus TCP (Ethernet / Net Socket)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Desktop Shell:</td>
                <td style={{ padding: '8px 0', color: '#cbd5e1' }}>Electron + Vite + React TypeScript</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Offline Operation:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#10b981' }}>100% Offline Capable — No Internet Needed</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Simulation Speed Control */}
        <div className="ind-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Thermal Speed Multiplier
            </h3>
            <span className="badge badge-normal" style={{ fontSize: '12px', color: '#10b981', borderColor: '#10b981' }}>
              ACTIVE SPEED: {currentSpeed}x
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
            Accelerates mock thermal heating curves for demonstration and testing.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Real Time (1x)', val: 1 },
              { label: 'Fast (10x)', val: 10 },
              { label: 'Accelerated (30x)', val: 30 },
              { label: 'Maximum (60x)', val: 60 },
            ].map((item) => {
              const isActive = currentSpeed === item.val;
              return (
                <button
                  key={item.val}
                  className="btn"
                  onClick={() => {
                    sensorService.setSimulationSpeed(item.val);
                    setCurrentSpeed(item.val);
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? '#2563eb' : '#1e293b',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    borderColor: isActive ? '#3b82f6' : '#334155',
                  }}
                >
                  {item.label} {isActive ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SQLITE SCHEMA INSPECTION MODAL */}
      {showSchemaModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Table size={20} color="#10b981" />
                SQLite Database Schema Inspector
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {DB_TABLE_SCHEMAS.map((tbl) => (
                  <div
                    key={tbl.name}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong className="font-mono" style={{ color: '#3b82f6', fontSize: '14px' }}>
                        TABLE {tbl.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{tbl.description}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {tbl.columns.map((col, idx) => (
                        <span
                          key={idx}
                          className="font-mono"
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#1e293b',
                            color: '#cbd5e1',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            border: '1px solid #334155',
                          }}
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowSchemaModal(false)}>
                Close Schema Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
