import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const NavGuardModal: React.FC = () => {
  const { showNavGuardModal, pendingNavTab, confirmNavAway, cancelNavAway } = useTestContext();

  if (!showNavGuardModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'var(--status-warning)' }}>
        <div className="modal-header" style={{ backgroundColor: '#78350f' }}>
          <div className="modal-title" style={{ color: '#fef3c7' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            Active Test Warning
          </div>
          <button
            onClick={cancelNavAway}
            style={{ background: 'none', border: 'none', color: '#fef3c7', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '14px', color: '#f8fafc', marginBottom: '12px' }}>
            A Temperature Rise Test is currently <strong>ACTIVE</strong> and logging sensor data.
          </p>
          <p style={{ fontSize: '13px', color: '#cbd5e1' }}>
            Are you sure you want to navigate to <strong>"{pendingNavTab?.toUpperCase()}"</strong>?
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Note: The test logging background loop will continue running, but we recommend staying on the Dashboard to monitor live alarms and temperature trends.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={cancelNavAway}>
            Stay on Dashboard
          </button>
          <button className="btn btn-warning" onClick={confirmNavAway}>
            Proceed to {pendingNavTab}
          </button>
        </div>
      </div>
    </div>
  );
};
