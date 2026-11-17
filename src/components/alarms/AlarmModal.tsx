import React, { useState } from 'react';
import { AlertTriangle, Play, Square, CheckCircle, RotateCcw } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const AlarmModal: React.FC = () => {
  const {
    alarmPopupEvent,
    acknowledgeAlarm,
    endTestSession,
    hardwarePopup,
    resetHardwarePopup,
  } = useTestContext();

  const [isResettingHw, setIsResettingHw] = useState<boolean>(false);

  // 1. Hardware Alarms & Cycle Completed Modal (IMPEDANCE_ALARM, NO_CURRENT_ALARM, CYCLE_COMPLITED)
  if (hardwarePopup) {
    const isAbort = hardwarePopup.isAbort;

    const handleHwReset = async () => {
      setIsResettingHw(true);
      try {
        await resetHardwarePopup();
      } finally {
        setIsResettingHw(false);
      }
    };

    return (
      <div className="modal-overlay" style={{ zIndex: 1200 }}>
        <div
          className="modal-content"
          style={{
            borderColor: isAbort ? '#ef4444' : '#10b981',
            maxWidth: '540px',
            boxShadow: isAbort
              ? '0 0 35px rgba(239, 68, 68, 0.45)'
              : '0 0 35px rgba(16, 185, 129, 0.35)',
          }}
        >
          <div
            className="modal-header"
            style={{ backgroundColor: isAbort ? '#7f1d1d' : '#064e3b' }}
          >
            <div
              className="modal-title"
              style={{ color: isAbort ? '#fecaca' : '#d1fae5' }}
            >
              {isAbort ? (
                <AlertTriangle size={22} color="#ef4444" />
              ) : (
                <CheckCircle size={22} color="#10b981" />
              )}
              {isAbort
                ? 'HARDWARE TRIP ALARM TRIGGERED'
                : 'HARDWARE TEST CYCLE COMPLETED'}
            </div>
          </div>

          <div className="modal-body">
            <h3
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: isAbort ? '#dc2626' : '#15803d',
                marginBottom: '8px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {hardwarePopup.title}
            </h3>

            <p style={{ fontSize: '14px', color: '#0f172a', marginBottom: '14px', lineHeight: '1.5' }}>
              {hardwarePopup.description}
            </p>

            <div
              style={{
                backgroundColor: isAbort ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${isAbort ? '#fecaca' : '#a7f3d0'}`,
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: isAbort ? '#991b1b' : '#065f46',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Status: <strong>{isAbort ? 'TRIP / ABORT' : 'NORMAL COMPLETION'}</strong></span>
                <span>Action: <strong>{isAbort ? 'Cycle Aborted' : 'Cycle Completed'}</strong></span>
              </div>
              <div>
                Clicking Continue will acknowledge the alarm on the hardware controller and open the test results.
              </div>
            </div>

            <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0' }}>
              Press the button below to continue to the test results:
            </p>
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #bfdbfe',
              padding: '16px 20px',
            }}
          >
            <button
              className={`btn ${isAbort ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleHwReset}
              disabled={isResettingHw}
              style={{
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isAbort ? '#dc2626' : '#16a34a',
                borderColor: isAbort ? '#b91c1c' : '#15803d',
              }}
            >
              <RotateCcw size={16} />
              <span>
                {isResettingHw
                  ? 'Processing...'
                  : 'CONTINUE TO RESULTS'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Standard Software Alarms Modal (Over-temperature limit alarm removed completely per user specification)
  if (!alarmPopupEvent || alarmPopupEvent.alarmId === 1 || alarmPopupEvent.alarmCode === 'ALM-01' || alarmPopupEvent.alarmName === 'Over Temperature Limit') return null;

  const isCritical = alarmPopupEvent.severity === 'critical';

  const handleContinueTesting = () => {
    acknowledgeAlarm(alarmPopupEvent.id);
  };

  const handleEndTestFromAlarm = () => {
    acknowledgeAlarm(alarmPopupEvent.id);
    endTestSession('aborted', alarmPopupEvent.alarmName);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          borderColor: isCritical ? '#ef4444' : '#f59e0b',
          maxWidth: '520px',
          boxShadow: isCritical
            ? '0 0 30px rgba(239, 68, 68, 0.4)'
            : '0 0 30px rgba(245, 158, 11, 0.3)',
        }}
      >
        <div
          className="modal-header"
          style={{ backgroundColor: isCritical ? '#7f1d1d' : '#78350f' }}
        >
          <div
            className="modal-title"
            style={{ color: isCritical ? '#fecaca' : '#fef3c7' }}
          >
            <AlertTriangle size={22} color={isCritical ? '#ef4444' : '#f59e0b'} />
            SYSTEM ALARM TRIGGERED — [{alarmPopupEvent.alarmCode}]
          </div>
        </div>

        <div className="modal-body">
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: isCritical ? '#f87171' : '#fbbf24',
              marginBottom: '8px',
            }}
          >
            {alarmPopupEvent.alarmName}
          </h3>

          <p style={{ fontSize: '14px', color: '#0f172a', marginBottom: '14px', lineHeight: '1.4' }}>
            {alarmPopupEvent.description}
          </p>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#475569',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span>Time: <strong style={{ color: '#0f172a' }}>{alarmPopupEvent.timestamp}</strong></span>
            <span>Severity: <strong style={{ color: isCritical ? '#ef4444' : '#f59e0b', textTransform: 'uppercase' }}>{alarmPopupEvent.severity}</strong></span>
          </div>

          <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: '0 0 10px 0' }}>
            Operator Action Required — Select how to proceed:
          </p>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #bfdbfe',
            padding: '16px 20px',
          }}
        >
          {/* Action 1: End Test Now */}
          <button
            className="btn btn-danger"
            onClick={handleEndTestFromAlarm}
            style={{ padding: '10px 18px', fontSize: '14px' }}
          >
            <Square size={16} /> END TEST NOW
          </button>

          {/* Action 2: Continue Testing */}
          <button
            className="btn btn-primary"
            onClick={handleContinueTesting}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            <Play size={16} /> CONTINUE TESTING
          </button>
        </div>
      </div>
    </div>
  );
};
