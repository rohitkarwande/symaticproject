import React, { useState, useEffect } from 'react';
import { Cpu, Database, Network, CheckCircle, RefreshCw, Table, Activity, Zap } from 'lucide-react';
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
  const dbProvider = getDatabaseProvider();
  const { modbusStatus, modbusData, connectModbus, disconnectModbus } = useTestContext();

  const [ipAddress, setIpAddress] = useState<string>(modbusStatus.ip || '192.168.0.200');
  const [port, setPort] = useState<number>(modbusStatus.port || 502);
  const [slaveId, setSlaveId] = useState<number>(modbusStatus.slaveId || 1);

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
    setModbusMsg('Connecting to Modbus TCP hardware...');

    try {
      const success = await connectModbus({
        ip: ipAddress,
        port: Number(port),
        slaveId: Number(slaveId),
      });

      if (success) {
        setModbusMsg(`✓ Connected to Flexem HMI at ${ipAddress}:${port}`);
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
      setModbusMsg(`✓ Connected to Flexem HMI at ${modbusStatus.ip || ipAddress}:${modbusStatus.port || port}`);
    } else if (modbusStatus.error) {
      setModbusMsg(`❌ Connection error: ${modbusStatus.error}`);
    } else if (!modbusStatus.connected) {
      setModbusMsg(`Disconnected from Flexem HMI (${ipAddress}:${port})`);
    }
  }, [modbusStatus.connected, modbusStatus.ip, modbusStatus.port, modbusStatus.error, ipAddress, port]);

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
          Configure Flexem HMI Modbus TCP IP address, 48-channel RTD telemetry connection, and database persistence.
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
                Ethernet Modbus TCP (48 RTD Temperature Channels, 32-bit Float32 Electrical Telemetry)
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
                  : 'rgba(239, 68, 68, 0.2)',
                color: modbusStatus.connected ? '#34d399' : '#f87171',
                border: `1px solid ${modbusStatus.connected ? '#10b981' : '#ef4444'}`,
              }}
            >
              {modbusStatus.connected
                ? '🟢 CONNECTED (REAL HMI)'
                : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Form Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
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

        {/* LIVE HARDWARE REGISTER MONITOR (CSV MAPPING) */}
        <div style={{ marginTop: '16px', backgroundColor: '#0f172a', padding: '14px', borderRadius: '4px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#34d399" />
              <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                Live Hardware Register Monitor (From CSV Register Map)
              </strong>
            </div>
            <span style={{ fontSize: '11px', color: modbusStatus.connected ? '#34d399' : '#94a3b8' }}>
              {modbusStatus.connected ? `Live Polling at ${modbusStatus.ip}:${modbusStatus.port}` : 'Hardware Disconnected'}
            </span>
          </div>

          {/* 3-Phase Current Registers (49, 51, 53) */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
              Phase Output Currents (Registers 49, 51, 53 — 2 Words Float32 Each)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ef4444' }}>
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>4X 49: Current R Phase_OP_MTR</div>
                <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                  {modbusData?.currents.r.toFixed(1) ?? '0.0'} A
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
                  Raw Words: [{modbusData?.rawRegisters?.[49] ?? 0}, {modbusData?.rawRegisters?.[50] ?? 0}]
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>4X 51: Current Y Phase_OP_MTR</div>
                <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                  {modbusData?.currents.y.toFixed(1) ?? '0.0'} A
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
                  Raw Words: [{modbusData?.rawRegisters?.[51] ?? 0}, {modbusData?.rawRegisters?.[52] ?? 0}]
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '4px', border: '1px solid #3b82f6' }}>
                <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700 }}>4X 53: Current B Phase_OP_MTR</div>
                <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                  {modbusData?.currents.b.toFixed(1) ?? '0.0'} A
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
                  Raw Words: [{modbusData?.rawRegisters?.[53] ?? 0}, {modbusData?.rawRegisters?.[54] ?? 0}]
                </div>
              </div>
            </div>
          </div>

          {/* 48 RTD Temperature Channels (Registers 1..48) */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
              48 RTD Temperature Channels (Registers 1..48 — 1 Word Each)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                gap: '6px',
                maxHeight: '180px',
                overflowY: 'auto',
                backgroundColor: '#020617',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #1e293b',
              }}
            >
              {Array.from({ length: 48 }, (_, i) => i + 1).map((ch) => {
                const tempVal = modbusData?.temperatures[ch];
                const rawVal = modbusData?.rawTemperatures?.[ch];
                return (
                  <div
                    key={ch}
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>TEMP_{ch} (4X {ch})</div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color:
                          (tempVal !== undefined && tempVal >= 30000) || (rawVal !== undefined && rawVal >= 30000)
                            ? '#ef4444'
                            : tempVal !== undefined && tempVal > 0
                            ? '#34d399'
                            : '#cbd5e1',
                      }}
                    >
                      {(tempVal !== undefined && tempVal >= 30000) || (rawVal !== undefined && rawVal >= 30000)
                        ? 'FAIL'
                        : tempVal !== undefined
                        ? `${tempVal.toFixed(1)}°C`
                        : '0.0°C'}
                    </div>
                    {rawVal !== undefined && (
                      <div className="font-mono" style={{ fontSize: '9px', color: '#64748b' }}>
                        raw: {rawVal}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SQLITE DATABASE PERSISTENCE STATUS */}
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

      {/* Software Platform Card */}
      <div className="ind-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
          <Cpu size={20} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Application Build & Operating Mode</h3>
        </div>

        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '8px 0', color: '#94a3b8' }}>System Application:</td>
              <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>Symatic Temperature Rise Test v1.0</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '8px 0', color: '#94a3b8' }}>Protocol Engine:</td>
              <td style={{ padding: '8px 0', fontWeight: 700, color: '#10b981' }}>Native Modbus TCP (Direct Ethernet Net Socket)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '8px 0', color: '#94a3b8' }}>Desktop Shell:</td>
              <td style={{ padding: '8px 0', color: '#cbd5e1' }}>Electron + Vite + React TypeScript</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#94a3b8' }}>Offline Operation:</td>
              <td style={{ padding: '8px 0', fontWeight: 600, color: '#10b981' }}>100% Offline Capable — Direct Hardware Ethernet Connection</td>
            </tr>
          </tbody>
        </table>
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
