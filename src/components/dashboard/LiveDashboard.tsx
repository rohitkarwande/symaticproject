import React, { useState } from 'react';
import {
  Play,
  Square,
  Thermometer,
  AlertTriangle,
  Activity,
  Zap,
  Filter,
  PlusCircle,
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
    pulseCoilToModbus,
  } = useTestContext();

  const [showEndConfirmModal, setShowEndConfirmModal] = useState<boolean>(false);
  const [sensorFilterRange, setSensorFilterRange] = useState<
    'all' | '1-12' | '13-24' | '25-36' | '37-48' | 'hotspots'
  >('all');
  const [isStopping, setIsStopping] = useState(false);
  const [isStartingHw, setIsStartingHw] = useState(false);
  const [hasStartedHardware, setHasStartedHardware] = useState(false);

  // 1. Initial State: When no test is active, show ONLY "Create New Test"
  if (!isTestActive || !activeSession || activeSession.status !== 'running') {
    return (
      <div
        style={{
          padding: '40px 20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f7ff',
        }}
      >
        <div
          className="ind-card"
          style={{
            maxWidth: '540px',
            width: '100%',
            padding: '48px 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              border: '2px solid #2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '22px',
            }}
          >
            <Activity size={38} color="#2563eb" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
            Create New Test
          </h2>

          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            No temperature rise test session is currently active. Click below to configure customer details, equipment ratings, sensor channels, and operating parameters.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setActiveTab('new-test')}
            style={{
              padding: '14px 32px',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            <PlusCircle size={20} /> Create New Test
          </button>
        </div>
      </div>
    );
  }

  // 2. Active Test State: Render full live monitoring dashboard
  const sensorCount = Math.min(48, Math.max(1, Number(activeSession?.config?.specification?.sensorCount) || 48));
  const logIntervalMinutes = Math.max(0.1, Number(activeSession?.config?.specification?.logIntervalMinutes) || 1);
  const durationHrs = Number(activeSession?.config?.specification?.testDurationHours) || 1;
  const ambient = Number(activeSession?.config?.specification?.ambientTemp) || 25;
  const limitRise = Number(activeSession?.config?.specification?.limitTempRise) || 65;

  const activeSensors = (sensors || []).filter((s) => s.id <= sensorCount);

  // Live Modbus currents and setpoint
  const currents = modbusData?.currents || { r: 0.0, y: 0.0, b: 0.0 };
  const setpointCurrent =
    modbusData?.setpointCurrent && modbusData.setpointCurrent > 0
      ? modbusData.setpointCurrent
      : Number(activeSession?.config?.specification?.testCurrent) || 2000;

  // Hardware Coils Read States (Coils 0X: 1 = START, 0X: 2 = STOP, 0X: 10 = TEST_ON, 0X: 15 = TIMER_START)
  const isStartCoilActive = Boolean(modbusData?.coils?.[1] ?? modbusData?.coils?.start);
  const isStopCoilActive = Boolean(modbusData?.coils?.[2] ?? modbusData?.coils?.stop);
  const isTimerStartActive = Boolean(modbusData?.timerStart ?? modbusData?.coils?.[15]);
  const isHardwareRunning = hasStartedHardware || isStartCoilActive || isTimerStartActive;

  // Dimmer Zero and Dimmer Max Limit Switch Alarms (Coils 3..8)
  const isDimmerZeroActive = Boolean(
    modbusData?.dimmers?.rDimmerZero ||
    modbusData?.dimmers?.yDimmerZero ||
    modbusData?.dimmers?.bDimmerZero ||
    modbusData?.coils?.[3] ||
    modbusData?.coils?.[4] ||
    modbusData?.coils?.[5]
  );
  const isDimmerMaxActive = Boolean(
    modbusData?.dimmers?.rDimmerMax ||
    modbusData?.dimmers?.yDimmerMax ||
    modbusData?.dimmers?.bDimmerMax ||
    modbusData?.coils?.[6] ||
    modbusData?.coils?.[7] ||
    modbusData?.coils?.[8]
  );
  const isDimmerAlarmActive = isDimmerZeroActive || isDimmerMaxActive;

  // Filter out any over temperature limit alarm per user specification
  const validActiveAlarms = activeAlarms.filter(
    (a) => a.alarmId !== 1 && a.alarmCode !== 'ALM-01' && a.alarmName !== 'Over Temperature Limit'
  );

  // Alarm presence check (Any active alarm disables START button)
  const hasTriggeredAlarm =
    validActiveAlarms.length > 0 ||
    Boolean(modbusData?.coils?.[12]) ||
    Boolean(modbusData?.coils?.[13]) ||
    Boolean(modbusData?.impedanceAlarm) ||
    Boolean(modbusData?.noCurrentAlarm);

  // START button disabled condition
  const isStartDisabled = isHardwareRunning || isStartingHw || isDimmerAlarmActive || hasTriggeredAlarm;

  // Actual Hardware Timer registers: 4X: 58 (MIN) & 4X: 59 (HRS), 4X: 57 (SET_TIMER)
  const actTimerHrs = modbusData?.actTimerHrs ?? 0;
  const actTimerMin = modbusData?.actTimerMin ?? 0;
  const setTimerVal = modbusData?.setTimer && modbusData.setTimer > 0 ? modbusData.setTimer : durationHrs;

  // 6 Industrial Dimmer Cards (Wired to Coils 0X: 3..8 — Blinks when value is 1)
  const DIMMER_CARDS = [
    {
      key: 'rZero',
      label: 'R DIMMER ZERO',
      reg: '0X: 3',
      phase: 'R',
      phaseColor: '#ef4444',
      active: Boolean(modbusData?.dimmers?.rDimmerZero ?? modbusData?.coils?.[3]),
    },
    {
      key: 'yZero',
      label: 'Y DIMMER ZERO',
      reg: '0X: 4',
      phase: 'Y',
      phaseColor: '#f59e0b',
      active: Boolean(modbusData?.dimmers?.yDimmerZero ?? modbusData?.coils?.[4]),
    },
    {
      key: 'bZero',
      label: 'B DIMMER ZERO',
      reg: '0X: 5',
      phase: 'B',
      phaseColor: '#3b82f6',
      active: Boolean(modbusData?.dimmers?.bDimmerZero ?? modbusData?.coils?.[5]),
    },
    {
      key: 'rMax',
      label: 'R DIMMER MAX',
      reg: '0X: 6',
      phase: 'R',
      phaseColor: '#ef4444',
      active: Boolean(modbusData?.dimmers?.rDimmerMax ?? modbusData?.coils?.[6]),
    },
    {
      key: 'yMax',
      label: 'Y DIMMER MAX',
      reg: '0X: 7',
      phase: 'Y',
      phaseColor: '#f59e0b',
      active: Boolean(modbusData?.dimmers?.yDimmerMax ?? modbusData?.coils?.[7]),
    },
    {
      key: 'bMax',
      label: 'B DIMMER MAX',
      reg: '0X: 8',
      phase: 'B',
      phaseColor: '#3b82f6',
      active: Boolean(modbusData?.dimmers?.bDimmerMax ?? modbusData?.coils?.[8]),
    },
  ];

  const getDimmerCardStyle = (card: typeof DIMMER_CARDS[0], isTop: boolean) => ({
    backgroundColor: '#000000',
    color: '#ffffff',
    fontFamily: '"Times New Roman", Times, Georgia, serif',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '1.2px',
    textAlign: 'center' as const,
    padding: '10px 6px',
    borderBottom: isTop ? '1px solid #ffffff' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none' as const,
    minHeight: '40px',
    animation: card.active
      ? card.phase === 'R'
        ? 'dimmerBlinkRed 0.8s infinite alternate'
        : card.phase === 'Y'
          ? 'dimmerBlinkYellow 0.8s infinite alternate'
          : 'dimmerBlinkBlue 0.8s infinite alternate'
      : 'none',
    transition: 'all 0.2s ease',
  });

  const formatTime = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1. START TEST BUTTON: 1-Second Pulse to Coil 0X: 1
  const handleStartHardware = async () => {
    if (isHardwareRunning) return;
    setIsStartingHw(true);
    setHasStartedHardware(true);
    try {
      // 1-second momentary pulse: Coil 1 HIGH for 1s, then resets to LOW
      await pulseCoilToModbus(1, 1000);
    } finally {
      setIsStartingHw(false);
    }
  };

  // 2. STOP TEST BUTTON: 1-Second Pulse to Coil 0X: 2
  const handleEndTestConfirm = async () => {
    setShowEndConfirmModal(false);
    setIsStopping(true);
    try {
      // 1-second momentary pulse: Coil 2 HIGH for 1s, then resets to LOW
      await pulseCoilToModbus(2, 1000);
      setHasStartedHardware(false);
      endTestSession();
    } finally {
      setIsStopping(false);
    }
  };

  const filteredSensors = activeSensors.filter((s) => {
    if (sensorFilterRange === '1-12') return s.id >= 1 && s.id <= 12;
    if (sensorFilterRange === '13-24') return s.id >= 13 && s.id <= 24;
    if (sensorFilterRange === '25-36') return s.id >= 25 && s.id <= 36;
    if (sensorFilterRange === '37-48') return s.id >= 37 && s.id <= 48;
    if (sensorFilterRange === 'hotspots') return s.status === 'warning' || s.status === 'alarm' || s.maxTemp > 65;
    return true;
  });

  const chartData = (activeSession.temperatureLogs || []).map((log) => {
    const row: any = {
      time: log.timestamp,
    };
    if (log.temperatures) {
      Object.entries(log.temperatures).forEach(([ptId, temp]) => {
        const idNum = Number(ptId);
        if (idNum <= sensorCount) {
          row[`TEMP_${idNum}`] = temp;
        }
      });
    }
    return row;
  });

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto', backgroundColor: '#f0f7ff' }}>
      {/* TOP CONTROL BANNER HEADER */}
      <div
        className="ind-card"
        style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          border: '1px solid #bfdbfe',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="badge badge-normal" style={{ animation: 'pulse 2s infinite', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', fontWeight: 800 }}>
              <Activity size={14} /> LIVE MONITORING
            </span>
            <span className="font-mono" style={{ fontSize: '13px', color: '#64748b' }}>
              ID: <strong style={{ color: '#0f172a' }}>{activeSession.testId}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            {activeSession?.config?.customer?.customerName || 'Customer'}
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>
            {activeSession?.config?.equipment?.equipmentName || 'Equipment'} ({activeSession?.config?.equipment?.model || 'Model'})
          </p>
        </div>

        {/* Timers & THREE ACTION BUTTONS: START, STOP, NEW TEST */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Config Duration</div>
            <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{setTimerVal}h 00m</div>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '8px 14px', borderRadius: '6px', border: '1px solid #93c5fd', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#1d4ed8', textTransform: 'uppercase', fontWeight: 800 }}>Actual Timer</div>
            <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#1d4ed8' }}>
              {actTimerHrs}h {actTimerMin}m
            </div>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Next Report Log</div>
            <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
              {isTimerStartActive ? formatTime(nextLogCountdown) : 'Waiting'}
            </div>
          </div>

          {/* ACTION BUTTONS: START, STOP */}
          {/* 1. START TEST BUTTON */}
          <button
            className="btn btn-primary"
            onClick={handleStartHardware}
            disabled={isStartDisabled}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isStartDisabled ? '#14532d' : '#16a34a',
              borderColor: isStartDisabled ? '#166534' : '#22c55e',
              opacity: isStartDisabled ? 0.38 : 1,
              cursor: isStartDisabled ? 'not-allowed' : 'pointer',
              filter: isStartDisabled ? 'grayscale(50%)' : 'none',
              boxShadow: isStartDisabled ? 'none' : '0 2px 8px rgba(34, 197, 94, 0.35)',
              transition: 'all 0.25s ease',
            }}
            title={
              isHardwareRunning
                ? 'Test is currently running on hardware'
                : isDimmerAlarmActive
                  ? 'START disabled: Dimmer Zero / Dimmer Max limit switch active'
                  : hasTriggeredAlarm
                    ? 'START disabled: Active alarm present. Clear alarm before starting.'
                    : 'Start test on hardware'
            }
          >
            <Play size={16} />
            <span>START</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: isStartCoilActive ? '#22c55e' : isHardwareRunning ? '#15803d' : 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {isStartCoilActive ? 'HIGH' : isHardwareRunning ? 'ACTIVE' : 'LOW'}
            </span>
          </button>

          {/* 2. STOP TEST BUTTON */}
          <button
            className="btn btn-danger"
            onClick={() => setShowEndConfirmModal(true)}
            disabled={isStopping}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#dc2626',
              borderColor: '#ef4444',
              cursor: isStopping ? 'not-allowed' : 'pointer',
              opacity: isStopping ? 0.6 : 1,
              boxShadow: isHardwareRunning ? '0 0 14px rgba(239, 68, 68, 0.5)' : 'none',
              animation: isHardwareRunning ? 'pulse 2s infinite' : 'none',
              transition: 'all 0.25s ease',
            }}
            title="Conclude test and stop hardware"
          >
            <Square size={16} />
            <span>STOP</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: isStopCoilActive ? '#ef4444' : 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {isStopCoilActive ? 'HIGH' : 'LOW'}
            </span>
          </button>
        </div>
      </div>

      {/* PHASE ELECTRICAL CURRENTS & SETPOINT */}
      <div className="ind-card" style={{ marginBottom: '16px', padding: '16px 20px', backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#2563eb" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Phase Electrical Currents &amp; Setpoint
            </h3>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: modbusStatus.connected ? '#15803d' : '#b91c1c' }}>
            {modbusStatus.connected ? 'Hardware Online' : 'Hardware Disconnected'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {/* Current R Phase */}
          <div style={{ backgroundColor: '#fef2f2', padding: '12px 14px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>R-PHASE CURRENT</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: currents.r > 30000 ? '#dc2626' : '#0f172a' }}>
                {currents.r > 30000 ? `${currents.r.toFixed(1)} A` : `${currents.r.toFixed(1)} A`}
              </div>
              {currents.r > 30000 && (
                <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>R Phase Operating Current</div>
          </div>

          {/* Current Y Phase */}
          <div style={{ backgroundColor: '#fffbeb', padding: '12px 14px', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 800 }}>Y-PHASE CURRENT</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: currents.y > 30000 ? '#dc2626' : '#0f172a' }}>
                {currents.y > 30000 ? `${currents.y.toFixed(1)} A` : `${currents.y.toFixed(1)} A`}
              </div>
              {currents.y > 30000 && (
                <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Y Phase Operating Current</div>
          </div>

          {/* Current B Phase */}
          <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800 }}>B-PHASE CURRENT</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: currents.b > 30000 ? '#dc2626' : '#0f172a' }}>
                {currents.b > 30000 ? `${currents.b.toFixed(1)} A` : `${currents.b.toFixed(1)} A`}
              </div>
              {currents.b > 30000 && (
                <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                  FAIL
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>B Phase Operating Current</div>
          </div>

          {/* SET_CURRENT */}
          <div style={{ backgroundColor: '#ecfdf5', padding: '12px 14px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 800 }}>SET CURRENT</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
                {setpointCurrent.toFixed(1)} A
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Target Current Setpoint</div>
          </div>
        </div>

        {/* Row 2: Timer Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '12px' }}>
          {/* SET TIMER */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 800 }}>SET TIMER</div>
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              {setTimerVal} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Hrs</span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Programmed Test Duration</div>
          </div>

          {/* ACT TIMER (HOURS) */}
          <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800 }}>ACT TIMER (HOURS)</div>
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>
              {actTimerHrs} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Hrs</span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Actual Elapsed Hours</div>
          </div>

          {/* ACT TIMER (MINUTES) */}
          <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800 }}>ACT TIMER (MINUTES)</div>
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>
              {actTimerMin} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Min</span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Actual Elapsed Minutes</div>
          </div>

          {/* TIMER STATUS */}
          <div style={{ backgroundColor: isTimerStartActive ? '#ecfdf5' : '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: `1px solid ${isTimerStartActive ? '#a7f3d0' : '#cbd5e1'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: isTimerStartActive ? '#15803d' : '#64748b', fontWeight: 800 }}>TIMER STATUS</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isTimerStartActive ? '#16a34a' : '#94a3b8' }} />
              <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, color: isTimerStartActive ? '#15803d' : '#64748b' }}>
                {isTimerStartActive ? 'RUNNING' : 'WAITING'}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              {isTimerStartActive ? 'Data Logging Active' : 'Data Logging Paused'}
            </div>
          </div>
        </div>
      </div>

      {/* STATIC DIMMER CARDS (EXACT MATCH TO PANEL SPECIFICATION IMAGE) */}
      <div
        style={{
          marginBottom: '16px',
          backgroundColor: '#c0c0c0',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #94a3b8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            columnGap: '16px',
          }}
        >
          {/* Column 1: R DIMMER (ZERO on top, MAX on bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={getDimmerCardStyle(DIMMER_CARDS[0], true)}>
              R DIMMER ZERO
            </div>
            <div style={getDimmerCardStyle(DIMMER_CARDS[3], false)}>
              R DIMMER MAX
            </div>
          </div>

          {/* Column 2: Y DIMMER (ZERO on top, MAX on bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={getDimmerCardStyle(DIMMER_CARDS[1], true)}>
              Y DIMMER ZERO
            </div>
            <div style={getDimmerCardStyle(DIMMER_CARDS[4], false)}>
              Y DIMMER MAX
            </div>
          </div>

          {/* Column 3: B DIMMER (ZERO on top, MAX on bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={getDimmerCardStyle(DIMMER_CARDS[2], true)}>
              B DIMMER ZERO
            </div>
            <div style={getDimmerCardStyle(DIMMER_CARDS[5], false)}>
              B DIMMER MAX
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE ALARMS TICKER BAR */}
      {validActiveAlarms.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span style={{ fontWeight: 800 }}>ACTIVE ALARM ({validActiveAlarms.length}):</span>
            <span style={{ fontWeight: 600 }}>{validActiveAlarms[0]?.alarmName} — {validActiveAlarms[0]?.description}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => setActiveTab('alarms')} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#ffffff', borderColor: '#fca5a5', color: '#b91c1c' }}>
            View Alarms Log
          </button>
        </div>
      )}

      {/* 48 SENSOR GRID SECTION (ENLARGED BOXES & LARGER READABLE TYPOGRAPHY) */}
      <div className="ind-card" style={{ marginBottom: '20px', backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thermometer size={22} color="#2563eb" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {sensorCount} Active Temperature Points (TEMP_1..TEMP_{sensorCount})
            </h3>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
              (Ambient Baseline: {ambient}°C | Limit Rise: ΔT ≤ {limitRise}°C)
            </span>
          </div>

          {/* Sensor Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Filter size={15} color="#2563eb" />
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
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: sensorFilterRange === item.key ? '#2563eb' : '#cbd5e1',
                    backgroundColor: sensorFilterRange === item.key ? '#2563eb' : '#f8fafc',
                    color: sensorFilterRange === item.key ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    boxShadow: sensorFilterRange === item.key ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </div>

        {/* Sensor Grid Cards (ENLARGED BOXES: minmax(175px, 1fr) with HIGH-CONTRAST BIG FONT) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: '14px',
          }}
        >
          {filteredSensors.map((sensor) => {
            const isFail = sensor.status === 'fail' || sensor.isFailed || sensor.currentTemp >= 30000;
            const rise = Number((sensor.currentTemp - ambient).toFixed(1));
            const isWarning = sensor.status === 'warning';
            const isAlarm = sensor.status === 'alarm';

            let cardBg = '#ffffff';
            let cardBorder = '#bfdbfe';
            let statusColor = '#16a34a';

            if (isFail) {
              cardBg = '#fef2f2';
              cardBorder = '#ef4444';
              statusColor = '#dc2626';
            } else if (isAlarm) {
              cardBg = '#fef2f2';
              cardBorder = '#ef4444';
              statusColor = '#dc2626';
            } else if (isWarning) {
              cardBg = '#fffbeb';
              cardBorder = '#f59e0b';
              statusColor = '#d97706';
            }

            return (
              <div
                key={sensor.id}
                style={{
                  backgroundColor: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '124px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {sensor.id === 1 ? 'AMBIENT TEMPERATURE' : sensor.label}
                  </span>
                  {isFail ? (
                    <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                      FAIL
                    </span>
                  ) : (
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        boxShadow: `0 0 6px ${statusColor}`,
                      }}
                    />
                  )}
                </div>

                <div style={{ margin: '8px 0' }}>
                  {isFail ? (
                    <div>
                      <div className="font-mono" style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626' }}>
                        FAIL
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-mono" style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                        {sensor.currentTemp.toFixed(1)}°C
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: rise > limitRise ? '#dc2626' : '#2563eb' }}>
                        ΔT: +{rise}°C
                      </div>
                    </>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontWeight: 600 }}>
                  {isFail ? (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>SENSOR DISCONNECTED</span>
                  ) : (
                    <>Max: <strong className="font-mono" style={{ color: '#0f172a', fontWeight: 700 }}>{sensor.maxTemp.toFixed(1)}°C</strong></>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REAL-TIME TREND CHART SECTION */}
      <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={18} color="#2563eb" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Temperature Rise Trend Curves (°C)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Acceptance Threshold: {(ambient + limitRise).toFixed(1)}°C | Sampling: 1 Log / {logIntervalMinutes} Min | Hardware Poll: 500ms
          </span>
        </div>

        <div style={{ width: '100%', height: '280px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {activeSensors.slice(0, 12).map((sensor, idx) => {
                  const colors = [
                    '#ef4444', '#f59e0b', '#10b981', '#2563eb', '#8b5cf6', '#ec4899',
                    '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#6366f1', '#a855f7',
                  ];
                  return (
                    <Line
                      key={sensor.id}
                      type="monotone"
                      dataKey={`TEMP_${sensor.id}`}
                      stroke={colors[idx % colors.length]}
                      dot={false}
                      strokeWidth={2}
                      name={`PT-${sensor.id}`}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              <Activity size={32} style={{ marginBottom: '8px' }} color="#2563eb" />
              <div style={{ fontWeight: 600 }}>Trend curve will plot automatically as periodic logs are recorded.</div>
            </div>
          )}
        </div>
      </div>

      {/* PERIODIC TEMPERATURE REPORT LOG TABLE (LIVE LOGS FOR OFFICIAL PDF REPORT) */}
      <div className="ind-card" style={{ marginTop: '16px', marginBottom: '20px', backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#2563eb" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Periodic Temperature Report Log Table (PDF Report Records)
            </h3>
            <span className="badge badge-normal" style={{ fontSize: '12px', padding: '3px 10px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 800 }}>
              {activeSession.temperatureLogs.length} Records Logged
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: isTimerStartActive ? '#dcfce7' : '#f1f5f9',
                color: isTimerStartActive ? '#15803d' : '#64748b',
                border: `1px solid ${isTimerStartActive ? '#86efac' : '#cbd5e1'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isTimerStartActive ? '#16a34a' : '#94a3b8',
                }}
              />
              {isTimerStartActive ? 'TIMER ACTIVE — LOGGING' : 'TIMER INACTIVE — LOGGING PAUSED'}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Interval: 1 Log every {logIntervalMinutes} min | Next log:{' '}
            <strong className="font-mono" style={{ color: isTimerStartActive ? '#15803d' : '#64748b' }}>
              {isTimerStartActive ? formatTime(nextLogCountdown) : 'Waiting for Timer Start'}
            </strong>
          </span>
        </div>

        {activeSession.temperatureLogs.length > 0 ? (
          <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#eff6ff', borderBottom: '2px solid #bfdbfe', color: '#1e3a8a', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', position: 'sticky', top: 0, left: 0, backgroundColor: '#eff6ff', zIndex: 2, border: '1px solid #bfdbfe' }}>Time</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#b91c1c', position: 'sticky', top: 0, backgroundColor: '#eff6ff', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>R Current (A)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#b45309', position: 'sticky', top: 0, backgroundColor: '#eff6ff', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>Y Current (A)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#1d4ed8', position: 'sticky', top: 0, backgroundColor: '#eff6ff', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>B Current (A)</th>
                  {Array.from({ length: sensorCount }, (_, i) => (
                    <th key={i + 1} style={{ padding: '8px 10px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#eff6ff', whiteSpace: 'nowrap', color: '#1e3a8a', border: '1px solid #bfdbfe' }}>
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
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td className="font-mono" style={{ padding: '6px 12px', fontWeight: 700, color: '#0f172a', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', border: '1px solid #bfdbfe' }}>
                        {formatTimeOnly(log.timestamp)}
                      </td>
                      <td className="font-mono" style={{ padding: '6px 12px', textAlign: 'right', color: '#b91c1c', fontWeight: 700, border: '1px solid #bfdbfe' }}>{rVal}</td>
                      <td className="font-mono" style={{ padding: '6px 12px', textAlign: 'right', color: '#b45309', fontWeight: 700, border: '1px solid #bfdbfe' }}>{yVal}</td>
                      <td className="font-mono" style={{ padding: '6px 12px', textAlign: 'right', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe' }}>{bVal}</td>
                      {Array.from({ length: sensorCount }, (_, i) => {
                        const temp = log.temperatures ? log.temperatures[i + 1] : undefined;
                        const isFail = temp !== undefined && temp !== null && temp >= 30000;
                        const tempDisplay = isFail ? 'FAIL' : (temp !== undefined && temp !== null ? Number(temp).toFixed(1) : '-');
                        return (
                          <td
                            key={i + 1}
                            className="font-mono"
                            style={{
                              padding: '6px 10px',
                              textAlign: 'right',
                              color: isFail ? '#dc2626' : '#334155',
                              fontWeight: isFail ? 800 : 600,
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {isFail ? (
                              <span
                                style={{
                                  backgroundColor: '#fef2f2',
                                  border: '1px solid #fca5a5',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  color: '#dc2626',
                                  fontWeight: 800,
                                }}
                              >
                                FAIL
                              </span>
                            ) : (
                              tempDisplay
                            )}
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
          <div style={{ padding: '28px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <Activity size={24} color={isTimerStartActive ? '#16a34a' : '#94a3b8'} style={{ marginBottom: '6px' }} />
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
              {isTimerStartActive
                ? `Recording first periodic log in ${formatTime(nextLogCountdown)}...`
                : 'Awaiting Hardware Timer Start Signal'}
            </div>
            <div>
              {isTimerStartActive
                ? `Data logging is currently running every ${logIntervalMinutes} minute(s).`
                : 'Data logging starts automatically when the hardware timer starts.'}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM END TEST MODAL */}
      {showEndConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="ind-card"
            style={{
              width: '480px',
              padding: '28px',
              border: '1px solid #ef4444',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '14px' }}>
              <AlertTriangle size={26} />
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Confirm End Test Session</h3>
            </div>
            <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, margin: '0 0 22px 0' }}>
              Are you sure you want to conclude the temperature rise test session?
              <br />
              <strong style={{ color: '#0f172a' }}>
                This will stop hardware monitoring, finalize logging, and generate the final QA compliance report.
              </strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowEndConfirmModal(false)}
                disabled={isStopping}
              >
                Cancel / Resume Test
              </button>
              <button
                className="btn btn-danger"
                onClick={handleEndTestConfirm}
                disabled={isStopping}
                style={{ padding: '9px 22px', fontWeight: 700 }}
              >
                {isStopping ? 'Stopping Hardware...' : 'Yes, End Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
