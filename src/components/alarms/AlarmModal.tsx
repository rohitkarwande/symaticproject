import React from 'react';
import { AlertTriangle, Play, Square, CheckCircle } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const AlarmModal: React.FC = () => {
  const { alarmPopupEvent, acknowledgeAlarm, endTestSession } = useTestContext();

  if (!alarmPopupEvent) return null;

  const isCritical = alarmPopupEvent.severity === 'critical';

  const handleContinueTesting = () => {
    acknowledgeAlarm(alarmPopupEvent.id);
  };

  const handleEndTestFromAlarm = () => {
    acknowledgeAlarm(alarmPopupEvent.id);
    endTestSession();
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

          <p style={{ fontSize: '14px', color: '#f8fafc', marginBottom: '14px', lineHeight: '1.4' }}>
            {alarmPopupEvent.description}
          </p>

          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span>Time: <strong style={{ color: '#f8fafc' }}>{alarmPopupEvent.timestamp}</strong></span>
            <span>Severity: <strong style={{ color: isCritical ? '#ef4444' : '#f59e0b', textTransform: 'uppercase' }}>{alarmPopupEvent.severity}</strong></span>
          </div>

          <p style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', margin: '0 0 10px 0' }}>
            Operator Action Required — Select how to proceed:
          </p>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            backgroundColor: '#0f172a',
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
