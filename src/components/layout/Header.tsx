import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Bell, Clock, Cpu, Network, RefreshCw, Sliders, Settings as SettingsIcon, X } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const Header: React.FC = () => {
  const { activeSession, isTestActive, activeAlarms, modbusStatus, connectModbus, disconnectModbus, setActiveTab } = useTestContext();
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [showModbusModal, setShowModbusModal] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConnectHardware = async () => {
    setConnecting(true);
    setMsg(`Connecting to Modbus TCP Hardware at ${modbusStatus.ip || '192.168.0.200'}:${modbusStatus.port || 502}...`);
    try {
      const success = await connectModbus({
        ip: modbusStatus.ip || '192.168.0.200',
        port: modbusStatus.port || 502,
        slaveId: modbusStatus.slaveId || 1,
      });
      if (success) {
        setMsg(`✓ Connected to ${modbusStatus.ip}:${modbusStatus.port}`);
      } else {
        setMsg(`⚠️ Failed to connect to ${modbusStatus.ip}:${modbusStatus.port}. Check physical cable.`);
      }
    } catch (err: any) {
      setMsg(`❌ Connection error: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectHardware = async () => {
    await disconnectModbus();
    setMsg('Disconnected from Modbus TCP hardware');
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        userSelect: 'none',
      }}
    >
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontWeight: 800,
            fontSize: '16px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Cpu size={20} />
          SYMATIC
        </div>
        <div>
          <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            SYMATIC ENGINEERING PVT LTD
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Temperature Rise Test System — Industrial Operations
          </p>
        </div>
      </div>

      {/* System Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Modbus Hardware Status Badge */}
        <div
          onClick={() => setShowModbusModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: modbusStatus.connected
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${modbusStatus.connected ? '#10b981' : '#ef4444'}`,
            color: modbusStatus.connected ? '#34d399' : '#f87171',
            transition: 'all 0.2s ease',
          }}
          title="Click to manage Modbus TCP hardware connection"
        >
          <Network size={15} />
          {modbusStatus.connected
            ? `TCP CONNECTED (${modbusStatus.ip})`
            : 'MODBUS OFFLINE'}
        </div>

        {/* Test Session Badge */}
        {isTestActive ? (
          <div
            className="badge badge-normal"
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              animation: 'pulse 2s infinite',
            }}
          >
            <Activity size={16} />
            TEST ACTIVE: {activeSession?.testId}
          </div>
        ) : (
          <div className="badge" style={{ backgroundColor: '#334155', color: '#94a3b8', padding: '6px 12px' }}>
            <ShieldCheck size={16} />
            SYSTEM READY
          </div>
        )}

        {/* Alarms Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className={`badge ${activeAlarms.length > 0 ? 'badge-alarm' : 'badge-normal'}`}
            style={{ padding: '6px 12px' }}
          >
            <Bell size={15} />
            {activeAlarms.length} ALARM{activeAlarms.length !== 1 ? 'S' : ''}
          </div>
        </div>

        {/* Live Clock */}
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#cbd5e1',
            fontSize: '13px',
            backgroundColor: '#1e293b',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #334155',
          }}
        >
          <Clock size={15} color="#94a3b8" />
          {currentTime}
        </div>
      </div>

      {/* QUICK MODBUS CONNECTION MODAL */}
      {showModbusModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network size={20} color="#3b82f6" />
                Modbus TCP Connection Controls
              </div>
              <button
                onClick={() => setShowModbusModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '4px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Current Hardware Status:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
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
                    : '🔴 MODBUS OFFLINE'}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
                Target IP: <strong>{modbusStatus.ip || '192.168.0.200'}</strong> | Port: <strong>{modbusStatus.port || 502}</strong> | Unit ID: <strong>{modbusStatus.slaveId || 1}</strong>
              </div>

              {msg && (
                <div style={{ fontSize: '12px', marginBottom: '14px', color: msg.includes('✓') ? '#34d399' : msg.includes('❌') || msg.includes('⚠️') ? '#f87171' : '#fbbf24' }}>
                  {msg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleConnectHardware}
                  disabled={connecting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                >
                  <RefreshCw size={16} className={connecting ? 'spin' : ''} />
                  Connect Modbus TCP Hardware
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleDisconnectHardware}
                  disabled={connecting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: '#f87171', borderColor: '#ef4444' }}
                >
                  Disconnect Modbus Hardware
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setActiveTab('settings');
                  setShowModbusModal(false);
                }}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <SettingsIcon size={14} /> Full Hardware Settings
              </button>
              <button className="btn btn-primary" onClick={() => setShowModbusModal(false)} style={{ fontSize: '12px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
