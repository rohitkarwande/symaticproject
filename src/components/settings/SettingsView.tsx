import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Cpu, CheckCircle, AlertCircle, Power, PowerOff } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const SettingsView: React.FC = () => {
  const { modbusStatus, connectModbus, disconnectModbus } = useTestContext();

  const [ipAddress, setIpAddress] = useState<string>(modbusStatus.ip || '192.168.0.200');
  const [port, setPort] = useState<number>(modbusStatus.port || 502);
  const [slaveId, setSlaveId] = useState<number>(modbusStatus.slaveId || 1);
  const [modbusConnecting, setModbusConnecting] = useState<boolean>(false);
  const [modbusDisconnecting, setModbusDisconnecting] = useState<boolean>(false);
  const [modbusMsg, setModbusMsg] = useState<string>('');

  const [runningDiag, setRunningDiag] = useState<boolean>(false);
  const [diagResults, setDiagResults] = useState<string[]>([]);

  useEffect(() => {
    if (modbusStatus.ip) setIpAddress(modbusStatus.ip);
    if (modbusStatus.port) setPort(modbusStatus.port);
    if (modbusStatus.slaveId) setSlaveId(modbusStatus.slaveId);
  }, [modbusStatus]);

  const handleApplyModbusConfig = async () => {
    setModbusConnecting(true);
    setModbusMsg(`Connecting to Modbus TCP server at ${ipAddress}:${port}...`);
    try {
      const success = await connectModbus({
        ip: ipAddress,
        port: Number(port),
        slaveId: Number(slaveId),
      });

      if (success) {
        setModbusMsg(`✓ Successfully connected to Modbus TCP hardware at ${ipAddress}:${port}`);
      } else {
        setModbusMsg(`❌ Connection failed: Unable to connect to ${ipAddress}:${port}. Please verify IP address and Ethernet cable.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setModbusMsg(`❌ Connection Error: ${msg}`);
    } finally {
      setModbusConnecting(false);
    }
  };

  const handleDisconnectModbus = async () => {
    setModbusDisconnecting(true);
    setModbusMsg('Disconnecting from Modbus TCP hardware...');
    try {
      await disconnectModbus();
      setModbusMsg('Modbus TCP client disconnected.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setModbusMsg(`❌ Disconnect Error: ${msg}`);
    } finally {
      setModbusDisconnecting(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResults([`Probing target host ${ipAddress} on port ${port}...`]);
    try {
      if (window.electronAPI?.modbus?.testDiagnostic) {
        const res = await window.electronAPI.modbus.testDiagnostic(ipAddress, Number(port));
        setDiagResults([
          res.success
            ? `✓ Port ${port}: Socket OPEN and responsive to Modbus TCP handshakes`
            : `❌ Port ${port}: Closed or unreachable (${res.message || 'Connection refused'})`,
        ]);
      } else {
        const success = await connectModbus({
          ip: ipAddress,
          port: Number(port),
          slaveId: Number(slaveId),
        });
        setDiagResults([
          success
            ? `✓ Port ${port}: Connection established successfully`
            : `❌ Port ${port}: Connection failed or timed out`,
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDiagResults([`❌ Diagnostic error: ${msg}`]);
    } finally {
      setRunningDiag(false);
    }
  };

  const getModbusMsgColor = (msg: string): string => {
    if (msg.includes('✓') || msg.toLowerCase().includes('connected')) return '#16a34a';
    if (msg.includes('❌') || msg.toLowerCase().includes('disconnected') || msg.toLowerCase().includes('failed')) return '#dc2626';
    return '#2563eb';
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          System Settings
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
          Configure Ethernet Modbus TCP connection to PLC / HMI hardware.
        </p>
      </div>

      {/* MODBUS TCP HARDWARE INTEGRATION CARD */}
      <div
        className="ind-card"
        style={{
          maxWidth: '850px',
          borderColor: modbusStatus.connected ? '#16a34a' : '#bfdbfe',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 10px rgba(37, 99, 235, 0.06)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid #bfdbfe',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: modbusStatus.connected ? '#dcfce7' : '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Network size={24} color={modbusStatus.connected ? '#16a34a' : '#2563eb'} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Modbus TCP Hardware Connection
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Ethernet Modbus TCP / IP (48 RTD Temperature Channels, 3-Phase Electrical Telemetry & Coils)
              </p>
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: '5px',
                backgroundColor: modbusStatus.connected ? '#dcfce7' : '#fee2e2',
                color: modbusStatus.connected ? '#15803d' : '#b91c1c',
                border: `1.5px solid ${modbusStatus.connected ? '#86efac' : '#fca5a5'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {modbusStatus.connected ? (
                <>
                  <CheckCircle size={15} /> CONNECTED (ONLINE)
                </>
              ) : (
                <>
                  <AlertCircle size={15} /> DISCONNECTED (OFFLINE)
                </>
              )}
            </span>
          </div>
        </div>

        {/* Form Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              PLC / HMI IP Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="font-mono"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.0.200"
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Modbus TCP Port <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="font-mono"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="502"
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Slave ID / Station No <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="font-mono"
              value={slaveId}
              onChange={(e) => setSlaveId(Number(e.target.value))}
              placeholder="1"
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
              }}
            />
          </div>
        </div>

        {/* Live Feedback Banner */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: getModbusMsgColor(modbusMsg) }}>
            {modbusMsg || `Target: ${ipAddress}:${port} (Station ID: ${slaveId}) — Ready to connect`}
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Poll Interval: <strong>500ms</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRunDiagnostic}
            disabled={runningDiag}
            style={{ fontSize: '13px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Cpu size={15} className={runningDiag ? 'spin' : ''} />
            {runningDiag ? 'Probing Port...' : 'Test Socket Port'}
          </button>

          {/* Connect Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyModbusConfig}
            disabled={modbusConnecting || modbusStatus.connected}
            style={{
              fontSize: '13px',
              padding: '9px 20px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: modbusStatus.connected ? '#15803d' : '#16a34a',
              borderColor: modbusStatus.connected ? '#166534' : '#15803d',
              cursor: modbusConnecting || modbusStatus.connected ? 'not-allowed' : 'pointer',
              opacity: modbusConnecting ? 0.7 : modbusStatus.connected ? 0.38 : 1,
              filter: modbusStatus.connected ? 'grayscale(40%)' : 'none',
              boxShadow: modbusStatus.connected ? 'none' : '0 2px 8px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.25s ease',
            }}
            title={modbusStatus.connected ? 'Hardware is currently connected and communicating' : 'Connect to Modbus TCP Hardware'}
          >
            <Power size={15} className={modbusConnecting ? 'spin' : ''} />
            {modbusConnecting ? 'Connecting...' : modbusStatus.connected ? 'Connected' : 'Connect'}
          </button>

          {/* Disconnect Button */}
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDisconnectModbus}
            disabled={modbusDisconnecting || !modbusStatus.connected}
            style={{
              fontSize: '13px',
              padding: '9px 18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#dc2626',
              borderColor: '#b91c1c',
              cursor: !modbusStatus.connected || modbusDisconnecting ? 'not-allowed' : 'pointer',
              opacity: !modbusStatus.connected || modbusDisconnecting ? 0.45 : 1,
            }}
          >
            <PowerOff size={15} className={modbusDisconnecting ? 'spin' : ''} />
            {modbusDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>

        {/* Diagnostic Results Console */}
        {diagResults.length > 0 && (
          <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '12px' }}>
            <div style={{ fontWeight: 800, color: '#1e40af', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>
              Socket Diagnostic Log:
            </div>
            {diagResults.map((resLine, idx) => (
              <div key={idx} className="font-mono" style={{ color: resLine.includes('✓') ? '#16a34a' : '#dc2626', margin: '2px 0' }}>
                {resLine}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
