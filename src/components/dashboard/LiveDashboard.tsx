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
  FileText,
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
import { formatTimeOnly } from '../../utils/formatTime';

export const LiveDashboard: React.FC = () => {
  const {
    activeSession,
    isTestActive,
    sensors,
    activeAlarms,
    endTestSession,
    setActiveTab,
    nextLogCountdown,
    modbusData,
    modbusStatus,
  } = useTestContext();

  const [showEndConfirmModal, setShowEndConfirmModal] = useState<boolean>(false);
  const [sensorFilterRange, setSensorFilterRange] = useState<
    'all' | '1-12' | '13-24' | '25-36' | '37-48' | 'hotspots'
  >('all');

  const sensorCount = Math.min(48, Math.max(1, Number(activeSession?.config.specification.sensorCount) || 48));
  const logIntervalMinutes = Math.max(0.1, Number(activeSession?.config.specification.logIntervalMinutes) || 1);
  const activeSensors = sensors.filter((s) => s.id <= sensorCount);

  const formatTime = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndTestConfirm = () => {
    setShowEndConfirmModal(false);
    endTestSession();
  };

  const filteredSensors = activeSensors.filter((s) => {
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
      const idNum = Number(ptId);
      if (idNum <= sensorCount) {
        row[`TEMP_${idNum}`] = temp;
      }
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

  const currents = modbusData?.currents || { r: 0.0, y: 0.0, b: 0.0 };

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
            <div style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Next Report Log</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{formatTime(nextLogCountdown)}</div>
          </div>

          <button className="btn btn-danger" onClick={() => setShowEndConfirmModal(true)} style={{ padding: '12px 20px', fontSize: '14px', marginLeft: '12px' }}>
            <Square size={16} /> END TEST
          </button>
        </div>
      </div>

      {/* MODBUS TCP PHASE CURRENTS CARD */}
      <div className="ind-card" style={{ marginBottom: '16px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Modbus TCP Phase Electrical Currents (Float32 CD AB)
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: modbusStatus.connected ? '#34d399' : '#f87171' }}>
            {modbusStatus.connected ? `Modbus IP: ${modbusStatus.ip}:${modbusStatus.port}` : 'Modbus TCP Disconnected'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '4px', border: `1px solid ${currents.r > 30000 ? '#ef4444' : '#ef4444'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>R-PHASE CURRENT (4X 49)</div>
              {currents.r > 30000 && (
                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: currents.r > 30000 ? '#ef4444' : '#34d399' }}>
              {currents.r > 30000 ? `${currents.r.toFixed(1)} A [FAIL]` : `${currents.r.toFixed(1)} A`}
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '4px', border: `1px solid ${currents.y > 30000 ? '#ef4444' : '#f59e0b'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Y-PHASE CURRENT (4X 51)</div>
              {currents.y > 30000 && (
                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: currents.y > 30000 ? '#ef4444' : '#34d399' }}>
              {currents.y > 30000 ? `${currents.y.toFixed(1)} A [FAIL]` : `${currents.y.toFixed(1)} A`}
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '4px', border: `1px solid ${currents.b > 30000 ? '#ef4444' : '#3b82f6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>B-PHASE CURRENT (4X 53)</div>
              {currents.b > 30000 && (
                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: currents.b > 30000 ? '#ef4444' : '#34d399' }}>
              {currents.b > 30000 ? `${currents.b.toFixed(1)} A [FAIL]` : `${currents.b.toFixed(1)} A`}
            </div>
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
              {sensorCount} Active Temperature Points (TEMP_1..TEMP_{sensorCount})
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              (Ambient Baseline: {ambient}°C | Limit Rise: ΔT ≤ {limitRise}°C)
            </span>
          </div>

          {/* Sensor Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Filter size={14} color="#94a3b8" />
            {[
              { key: 'all' as const, label: 'ALL', show: true },
              { key: '1-12' as const, label: '1-12', show: sensorCount > 12 },
              { key: '13-24' as const, label: '13-24', show: sensorCount >= 13 },
              { key: '25-36' as const, label: '25-36', show: sensorCount >= 25 },
              { key: '37-48' as const, label: '37-48', show: sensorCount >= 37 },
              { key: 'hotspots' as const, label: 'HOTSPOTS', show: true },
            ]
              .filter((item) => item.show)
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSensorFilterRange(item.key)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: sensorFilterRange === item.key ? '#2563eb' : '#334155',
                    backgroundColor: sensorFilterRange === item.key ? '#2563eb' : '#0f172a',
                    color: sensorFilterRange === item.key ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </button>
              ))}
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
            const isFail = sensor.status === 'fail' || sensor.isFailed || sensor.currentTemp >= 30000;
            const rise = Number((sensor.currentTemp - ambient).toFixed(1));
            const isWarning = sensor.status === 'warning';
            const isAlarm = sensor.status === 'alarm';

            let cardBg = '#0f172a';
            let cardBorder = '#334155';
            let statusColor = '#10b981';

            if (isFail) {
              cardBg = 'rgba(239, 68, 68, 0.22)';
              cardBorder = '#ef4444';
              statusColor = '#ef4444';
            } else if (isAlarm) {
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
                  {isFail ? (
                    <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                      FAIL
                    </span>
                  ) : (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                      }}
                    />
                  )}
                </div>

                <div style={{ margin: '6px 0' }}>
                  {isFail ? (
                    <div>
                      <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>
                        FAIL
                      </div>
                      <div style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 600 }}>
                        Value &gt; 30000
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                        {sensor.currentTemp.toFixed(1)}°C
                      </div>
                      <div style={{ fontSize: '11px', color: rise > limitRise ? '#ef4444' : '#94a3b8' }}>
                        ΔT: +{rise}°C
                      </div>
                    </>
                  )}
                </div>

                <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  {isFail ? (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>SENSOR DISCONNECTED</span>
                  ) : (
                    <>Max: <strong className="font-mono" style={{ color: '#cbd5e1' }}>{sensor.maxTemp.toFixed(1)}°C</strong></>
                  )}
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
            {activeSensors.length > 0 && (() => {
              const maxSens = activeSensors.reduce((prev, curr) => (curr.currentTemp > prev.currentTemp ? curr : prev), activeSensors[0]);
              return (
                <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  PEAK HOTSPOT: {maxSens.label} ({maxSens.currentTemp.toFixed(1)}°C)
                </span>
              );
            })()}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Acceptance Threshold: {(ambient + limitRise).toFixed(1)}°C | Sampling: 1 Log / {logIntervalMinutes} Min (Report) | Hardware Poll: 500ms
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
                {(() => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
                  const targetSensors = activeSensors.length <= 6
                    ? activeSensors
                    : [
                        activeSensors[0],
                        activeSensors[Math.floor(activeSensors.length * 0.25)],
                        activeSensors[Math.floor(activeSensors.length * 0.5)],
                        activeSensors[Math.floor(activeSensors.length * 0.75)],
                        activeSensors[activeSensors.length - 1],
                      ].filter((s, idx, arr) => s && arr.findIndex((x) => x?.id === s?.id) === idx);

                  return targetSensors.map((s, idx) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.label}
                      name={s.label}
                      stroke={colors[idx % colors.length]}
                      dot={false}
                      strokeWidth={2}
                    />
                  ));
                })()}
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

      {/* PERIODIC LOGGED DATA TABLE (LOG INTERVAL SAMPLES) */}
      <div className="ind-card" style={{ marginTop: '20px' }}>
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
            <FileText size={18} color="#10b981" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Periodic Logged Records (Interval: Every {logIntervalMinutes} min)
            </h3>
            <span className="badge badge-normal" style={{ fontSize: '11px', padding: '2px 8px' }}>
              {activeSession?.temperatureLogs.length || 0} LOGS RECORDED
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
            Next log in: {formatTime(nextLogCountdown)}
          </span>
        </div>

        {activeSession?.temperatureLogs && activeSession.temperatureLogs.length > 0 ? (
          <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '10px' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', position: 'sticky', top: 0, left: 0, backgroundColor: '#1e293b', zIndex: 2 }}>Time</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444', position: 'sticky', top: 0, backgroundColor: '#1e293b' }}>R Current (A)</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#eab308', position: 'sticky', top: 0, backgroundColor: '#1e293b' }}>Y Current (A)</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: '#3b82f6', position: 'sticky', top: 0, backgroundColor: '#1e293b' }}>B Current (A)</th>
                  {Array.from({ length: sensorCount }, (_, i) => (
                    <th key={i + 1} style={{ padding: '6px 8px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#1e293b' }}>
                      TEMP_{i + 1} (°C)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSession.temperatureLogs.map((log, idx) => {
                  const rVal = log.currents?.r !== undefined ? Number(log.currents.r).toFixed(2) : (modbusData?.currents.r.toFixed(2) || '0.00');
                  const yVal = log.currents?.y !== undefined ? Number(log.currents.y).toFixed(2) : (modbusData?.currents.y.toFixed(2) || '0.00');
                  const bVal = log.currents?.b !== undefined ? Number(log.currents.b).toFixed(2) : (modbusData?.currents.b.toFixed(2) || '0.00');
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #334155',
                        backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33',
                      }}
                    >
                      <td className="font-mono" style={{ padding: '6px 10px', fontWeight: 600, color: '#f8fafc', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33' }}>
                        {formatTimeOnly(log.timestamp)}
                      </td>
                      <td className="font-mono" style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444' }}>{rVal}</td>
                      <td className="font-mono" style={{ padding: '6px 10px', textAlign: 'right', color: '#eab308' }}>{yVal}</td>
                      <td className="font-mono" style={{ padding: '6px 10px', textAlign: 'right', color: '#3b82f6' }}>{bVal}</td>
                      {Array.from({ length: sensorCount }, (_, i) => {
                        const temp = log.temperatures[i + 1];
                        const tempDisplay = temp !== undefined && temp !== null ? Number(temp).toFixed(1) : '-';
                        return (
                          <td key={i + 1} className="font-mono" style={{ padding: '6px 8px', textAlign: 'right', color: '#cbd5e1' }}>
                            {tempDisplay}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#0f172a', borderRadius: '4px' }}>
            No report logs committed yet. First periodic log will record in {formatTime(nextLogCountdown)}.
          </div>
        )}
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
