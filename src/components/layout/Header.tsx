import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Bell, Clock, Cpu, Network, RefreshCw, Sliders, X } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import symaticLogo from '../../assets/symatic_logo.jpg';

export const Header: React.FC = () => {
  const { activeSession, isTestActive, activeAlarms, modbusStatus, connectModbus, disconnectModbus } = useTestContext();
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
    setMsg('Connecting to Hardware Controller...');
    try {
      const success = await connectModbus({
        ip: modbusStatus.ip || '192.168.0.200',
        port: modbusStatus.port || 502,
        slaveId: modbusStatus.slaveId || 1,
      });
      if (success) {
        setMsg('✓ Connected to Hardware Controller');
      } else {
        setMsg('⚠️ Failed to connect to Hardware Controller. Check physical Ethernet cable.');
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
        height: '76px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #bfdbfe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        userSelect: 'none',
        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.05)',
      }}
    >
      {/* Brand & Prominently Sized Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img
          src={symaticLogo}
          alt="Symatic Logo"
          style={{
            height: '64px',
            maxHeight: '66px',
            width: 'auto',
            objectFit: 'contain',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            padding: '2px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
          }}
        />
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
            Temperature Rise Test System
          </h1>
          <p style={{ fontSize: '12px', color: '#2563eb', margin: '2px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
            Symatic Industrial Automation &amp; QA Verification
          </p>
        </div>
      </div>

      {/* System Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Modbus Hardware Status Badge */}
        <div
          onClick={() => setShowModbusModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: modbusStatus.connected
              ? '#ecfdf5'
              : '#fef2f2',
            border: `1px solid ${modbusStatus.connected ? '#86efac' : '#fca5a5'}`,
            color: modbusStatus.connected ? '#15803d' : '#b91c1c',
            transition: 'all 0.2s ease',
          }}
          title="Hardware Connection Status"
        >
          <Network size={16} />
          {modbusStatus.connected
            ? 'HARDWARE CONNECTED'
            : 'HARDWARE OFFLINE'}
        </div>

        {/* Test Session Badge */}
        {isTestActive ? (
          <div
            className="badge badge-normal"
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              animation: 'pulse 2s infinite',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              borderColor: '#93c5fd',
              fontWeight: 800,
            }}
          >
            <Activity size={16} />
            TEST ACTIVE: {activeSession?.testId}
          </div>
        ) : (
          <div className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '7px 14px', fontWeight: 700 }}>
            <ShieldCheck size={16} color="#2563eb" />
            SYSTEM READY
          </div>
        )}

        {/* Alarms Counter */}
        {(() => {
          const filteredActiveAlarms = activeAlarms.filter(
            (a) => a.alarmId !== 1 && a.alarmCode !== 'ALM-01' && a.alarmName !== 'Over Temperature Limit'
          );
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                className={`badge ${filteredActiveAlarms.length > 0 ? 'badge-alarm' : 'badge-normal'}`}
                style={{ padding: '7px 14px' }}
              >
                <Bell size={15} />
                {filteredActiveAlarms.length} ALARM{filteredActiveAlarms.length !== 1 ? 'S' : ''}
              </div>
            </div>
          );
        })()}

        {/* Live Clock */}
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1e3a8a',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: '#eff6ff',
            padding: '7px 14px',
            borderRadius: '5px',
            border: '1px solid #bfdbfe',
          }}
        >
          <Clock size={15} color="#2563eb" />
          {currentTime}
        </div>
      </div>

      {/* QUICK MODBUS CONNECTION MODAL */}
      {showModbusModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', backgroundColor: '#ffffff' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f7ff', borderBottom: '1px solid #bfdbfe' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Network size={20} color="#2563eb" />
                Hardware Controller Connection
              </div>
              <button
                onClick={() => setShowModbusModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ color: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Current Hardware Status:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backgroundColor: modbusStatus.connected
                      ? '#ecfdf5'
                      : '#fef2f2',
                    color: modbusStatus.connected ? '#15803d' : '#b91c1c',
                    border: `1px solid ${modbusStatus.connected ? '#86efac' : '#fca5a5'}`,
                  }}
                >
                  {modbusStatus.connected
                    ? '🟢 CONNECTED (PLC HARDWARE)'
                    : '🔴 HARDWARE OFFLINE'}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                Hardware Interface: <strong style={{ color: '#0f172a' }}>Industrial Controller (Port 502)</strong> | Unit ID: <strong style={{ color: '#0f172a' }}>1</strong>
              </div>

              {msg && (
                <div style={{ fontSize: '12px', marginBottom: '14px', fontWeight: 600, color: msg.includes('✓') ? '#15803d' : msg.includes('❌') || msg.includes('⚠️') ? '#b91c1c' : '#d97706' }}>
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
                  Connect Hardware
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleDisconnectHardware}
                  disabled={connecting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: '#b91c1c', borderColor: '#fca5a5' }}
                >
                  Disconnect Hardware
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
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
