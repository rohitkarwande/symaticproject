import React, { useState } from 'react';
import {
  Clock,
  Square,
  Thermometer,
  AlertTriangle,
  Activity,
  Play,
  Zap,
  Filter,
  Gauge,
  ZapOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useTestContext } from '../../context/TestContext';

export const LiveDashboard: React.FC = () => {
  const {
    activeSession,
    isTestActive,
    sensors,
    activeAlarms,
    endTestSession,
    setActiveTab,
    triggerMockAlarm,
    nextLogCountdown,
    modbusData,
    modbusStatus,
  } = useTestContext();

  const [showEndConfirmModal, setShowEndConfirmModal] = useState<boolean>(false);
  const [sensorFilterRange, setSensorFilterRange] = useState<
    'all' | '1-12' | '13-24' | '25-36' | '37-48' | 'hotspots'
  >('all');

  const formatTime = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndTestConfirm = () => {
    setShowEndConfirmModal(false);
    endTestSession();
  };

  const filteredSensors = sensors.filter((s) => {
    if (sensorFilterRange === '1-12') return s.id >= 1 && s.id <= 12;
    if (sensorFilterRange === '13-24') return s.id >= 13 && s.id <= 24;
    if (sensorFilterRange === '25-36') return s.id >= 25 && s.id <= 36;
    if (sensorFilterRange === '37-48') return s.id >= 37 && s.id <= 48;
    if (sensorFilterRange === 'hotspots') return s.status === 'warning' || s.status === 'alarm' || s.maxTemp > 65;
    return true;
  });

  const chartData = activeSession?.temperatureLogs.map((log) => {
    const row: any = {
      time: log.timestamp,
    };
    Object.entries(log.temperatures).forEach(([ptId, temp]) => {
      row[`Pt ${ptId}`] = temp;
    });
    return row;
  }) || [];

  if (!isTestActive || !activeSession || activeSession.status !== 'running') {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Activity size={48} color="#64748b" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '22px', color: '#f8fafc', margin: 0 }}>No Active Test Running</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '460px', margin: '8px 0 24px 0' }}>
          Configure customer specifications and operating parameters to launch a 48-point Temperature Rise Test.
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab('new-test')} style={{ padding: '12px 24px' }}>
          <Play size={18} /> Create New Test
        </button>
      </div>
    );
  }

  const durationHrs = Number(activeSession?.config.specification.testDurationHours) || 1;
  const ambient = Number(activeSession?.config.specification.ambientTemp) || 25;
  const limitRise = Number(activeSession?.config.specification.limitTempRise) || 65;

  const voltages = modbusData?.voltages || { r: 415.2, y: 414.8, b: 415.5 };
  const currents = modbusData?.currents || { r: 2000.0, y: 1998.5, b: 2001.2 };

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      {/* Top Control Banner Header */}
      <div
        className="ind-card"
        style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="badge badge-normal" style={{ animation: 'pulse 2s infinite' }}>
              <Activity size={14} /> LIVE MONITORING
            </span>
            <span className="font-mono" style={{ fontSize: '13px', color: '#94a3b8' }}>
              ID: <strong style={{ color: '#f8fafc' }}>{activeSession?.testId}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            {activeSession?.config.customer.customerName}
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
            {activeSession?.config.equipment.equipmentName} ({activeSession?.config.equipment.model})
          </p>
        </div>

        {/* Timers Cluster */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 16px', borderRadius: '4px', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Configured</div>
            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{durationHrs}h 00m</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '10px 16px', borderRadius: '4px', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Elapsed Time</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>{formatTime(activeSession?.elapsedSeconds || 0)}</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '10px 16px', borderRadius: '4px', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Remaining</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{formatTime(activeSession?.remainingSeconds || 0)}</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '10px 16px', borderRadius: '4px', border: '1px solid #10b981', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Next DB Log</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{nextLogCountdown}s</div>
          </div>

          <button className="btn btn-danger" onClick={() => setShowEndConfirmModal(true)} style={{ padding: '12px 20px', fontSize: '14px', marginLeft: '12px' }}>
            <Square size={16} /> END TEST
          </button>
        </div>
      </div>

      {/* MODBUS TCP PHASE METRICS CARD (VOLTAGES & CURRENTS) */}
      <div className="ind-card" style={{ marginBottom: '16px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Modbus TCP Phase Electrical Telemetry (Float32)
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: modbusStatus.connected ? '#34d399' : '#fbbf24' }}>
            {modbusStatus.connected ? `Modbus IP: ${modbusStatus.ip}:${modbusStatus.port}` : 'Modbus TCP Simulator Active'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>R-PHASE VOLTAGE</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{voltages.r.toFixed(1)} V</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>Y-PHASE VOLTAGE</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{voltages.y.toFixed(1)} V</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700 }}>B-PHASE VOLTAGE</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{voltages.b.toFixed(1)} V</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>R-PHASE CURRENT</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{currents.r.toFixed(1)} A</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>Y-PHASE CURRENT</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{currents.y.toFixed(1)} A</div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700 }}>B-PHASE CURRENT</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{currents.b.toFixed(1)} A</div>
          </div>
        </div>
      </div>

      {/* Active Alarms Ticker Bar */}
      {activeAlarms.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--status-alarm-bg)',
            border: '1px solid var(--status-alarm)',
            borderRadius: '4px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span style={{ fontWeight: 700 }}>ACTIVE ALARM ({activeAlarms.length}):</span>
            <span>{activeAlarms[0]?.alarmName} — {activeAlarms[0]?.description}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => setActiveTab('alarms')} style={{ fontSize: '12px', padding: '4px 10px' }}>
            View Alarms Log
          </button>
        </div>
      )}

      {/* 48 SENSOR GRID SECTION */}
      <div className="ind-card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid #334155',
            paddingBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thermometer size={20} color="#3b82f6" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              48 Temperature Points Matrix (Flexem LW 10..57)
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              (Ambient Baseline: {ambient}°C | Limit Rise: ΔT ≤ {limitRise}°C)
            </span>
          </div>

          {/* Sensor Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Filter size={14} color="#94a3b8" />
            {(['all', '1-12', '13-24', '25-36', '37-48', 'hotspots'] as const).map((rng) => (
              <button
                key={rng}
                onClick={() => setSensorFilterRange(rng)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '3px',
                  border: '1px solid',
                  borderColor: sensorFilterRange === rng ? '#2563eb' : '#334155',
                  backgroundColor: sensorFilterRange === rng ? '#2563eb' : '#0f172a',
                  color: sensorFilterRange === rng ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {rng}
              </button>
            ))}

            <button
              onClick={() => triggerMockAlarm(1, 'Manual Over Temperature test alarm triggered by operator.')}
              style={{
                marginLeft: '12px',
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                border: '1px solid #ef4444',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} /> Test Alarm
            </button>
          </div>
        </div>

        {/* Sensor Grid Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '10px',
          }}
        >
          {filteredSensors.map((sensor) => {
            const rise = Number((sensor.currentTemp - ambient).toFixed(1));
            const isWarning = sensor.status === 'warning';
            const isAlarm = sensor.status === 'alarm';

            let cardBg = '#0f172a';
            let cardBorder = '#334155';
            let statusColor = '#10b981';

            if (isAlarm) {
              cardBg = 'rgba(239, 68, 68, 0.15)';
              cardBorder = '#ef4444';
              statusColor = '#ef4444';
            } else if (isWarning) {
              cardBg = 'rgba(245, 158, 11, 0.12)';
              cardBorder = '#f59e0b';
              statusColor = '#f59e0b';
            }

            return (
              <div
                key={sensor.id}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: '4px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '92px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                    {sensor.label}
                  </span>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                    }}
                  />
                </div>

                <div style={{ margin: '6px 0' }}>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                    {sensor.currentTemp.toFixed(1)}°C
                  </div>
                  <div style={{ fontSize: '11px', color: rise > limitRise ? '#ef4444' : '#94a3b8' }}>
                    ΔT: +{rise}°C
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  Max: <strong className="font-mono" style={{ color: '#cbd5e1' }}>{sensor.maxTemp.toFixed(1)}°C</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REAL-TIME TREND CHART SECTION */}
      <div className="ind-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Temperature Rise Trend Curves (°C)
            </h3>
            {sensors.length > 0 && (() => {
              const maxSens = sensors.reduce((prev, curr) => (curr.currentTemp > prev.currentTemp ? curr : prev), sensors[0]);
              return (
                <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  PEAK HOTSPOT: {maxSens.label} ({maxSens.currentTemp.toFixed(1)}°C)
                </span>
              );
            })()}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Acceptance Threshold: {(ambient + limitRise).toFixed(1)}°C | Sampling: 1 Log / Min
          </span>
        </div>

        <div style={{ width: '100%', height: '280px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={ambient + limitRise} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Limit (${(ambient + limitRise).toFixed(1)}°C)`, fill: '#ef4444', fontSize: 11 }} />
                <Line type="monotone" dataKey="Pt 1" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Pt 12" stroke="#10b981" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Pt 24" stroke="#f59e0b" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Pt 36" stroke="#ec4899" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Pt 48" stroke="#8b5cf6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '13px',
                backgroundColor: '#0f172a',
                borderRadius: '4px',
              }}
            >
              Sampling temperature curves... Trend graph updates as minute records accrue.
            </div>
          )}
        </div>
      </div>

      {/* END TEST CONFIRMATION MODAL */}
      {showEndConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ backgroundColor: '#7f1d1d' }}>
              <div className="modal-title" style={{ color: '#fecaca' }}>
                <AlertTriangle size={20} color="#ef4444" />
                Confirm End Test Session
              </div>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '15px', color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>
                Are you sure you want to end this test?
              </p>
              <p style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Ending the test will stop temperature logging, freeze maximum recorded values, calculate final PASS/FAIL temperature rise results (ΔT = T_actual - T_ambient), and produce the test report summary.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEndConfirmModal(false)}>
                Cancel (Continue Test)
              </button>
              <button className="btn btn-danger" onClick={handleEndTestConfirm}>
                Yes, End Test Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
