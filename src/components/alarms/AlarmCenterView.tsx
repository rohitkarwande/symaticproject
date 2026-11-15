import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Sliders, FileSpreadsheet, History } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import { alarmManagerSingleton } from '../../services/alarm/AlarmManager';
import { generateAlarmCsv, downloadAlarmCsvFile } from '../../services/alarm/AlarmCsvExporter';
import type { AlarmDefinition } from '../../types/test';

export const AlarmCenterView: React.FC = () => {
  const { activeAlarms, acknowledgeAlarm, activeSession } = useTestContext();
  const [alarmDefs, setAlarmDefs] = useState<AlarmDefinition[]>(
    alarmManagerSingleton.getDefinitions()
  );

  const toggleAlarmEnable = (def: AlarmDefinition) => {
    const updated = { ...def, enabled: !def.enabled };
    alarmManagerSingleton.updateDefinition(updated);
    setAlarmDefs(alarmManagerSingleton.getDefinitions());
  };

  const eventHistory = alarmManagerSingleton.getEventHistory();

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            12 Industrial System Alarm Management Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Configure 12 system safety alarms, severity thresholds, and review active/historical events.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const csv = generateAlarmCsv(eventHistory, activeSession?.testId || 'TRT-SYSTEM');
              downloadAlarmCsvFile(csv, `TRT-AlarmLog-${activeSession?.testId || 'SYSTEM'}.csv`);
            }}
          >
            <FileSpreadsheet size={16} color="#16a34a" /> Export Alarm Log (CSV)
          </button>
        </div>
      </div>

      {/* Active Alarms Strip */}
      {activeAlarms.length > 0 ? (
        <div className="ind-card" style={{ marginBottom: '20px', borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Currently Active System Alarms ({activeAlarms.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#475569', borderBottom: '2px solid #fecaca', textTransform: 'uppercase', fontSize: '11px', backgroundColor: '#fee2e2' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Alarm Name</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Timestamp</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeAlarms.map((evt) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#ffffff' }}>
                  <td className="font-mono" style={{ padding: '8px 10px', fontWeight: 700, color: '#dc2626' }}>{evt.alarmCode}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{evt.alarmName}</td>
                  <td className="font-mono" style={{ padding: '8px 10px', color: '#475569' }}>{evt.timestamp}</td>
                  <td style={{ padding: '8px 10px', color: '#334155' }}>{evt.description}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span className={`badge ${evt.acknowledged ? 'badge-normal' : 'badge-alarm'}`}>
                      {evt.acknowledged ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {!evt.acknowledged && (
                      <button className="btn btn-warning" onClick={() => acknowledgeAlarm(evt.id)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        <CheckCircle size={14} /> Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ind-card" style={{ marginBottom: '20px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 600 }}>No active alarms currently present. System operating within normal safety limits.</span>
        </div>
      )}

      {/* 12 Alarm Definitions Config Table */}
      <div className="ind-card" style={{ marginBottom: '20px', backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#2563eb" /> 12 System Safety Alarm Definitions
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#eff6ff', borderBottom: '2px solid #bfdbfe', color: '#1e3a8a', textTransform: 'uppercase', fontSize: '11px' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>ID / Code</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Alarm Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Severity</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Enabled State</th>
            </tr>
          </thead>
          <tbody>
            {alarmDefs.map((def, idx) => (
              <tr key={def.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td className="font-mono" style={{ padding: '10px', fontWeight: 700, color: '#2563eb' }}>{def.code}</td>
                <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>{def.name}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{def.description}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span className={`badge ${def.severity === 'critical' ? 'badge-alarm' : def.severity === 'warning' ? 'badge-warning' : 'badge-normal'}`}>
                    {def.severity}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button
                    onClick={() => toggleAlarmEnable(def)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: def.enabled ? '#16a34a' : '#cbd5e1',
                      backgroundColor: def.enabled ? '#dcfce7' : '#f1f5f9',
                      color: def.enabled ? '#15803d' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {def.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historical Alarm Events Table */}
      <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#2563eb" /> Historical Alarm Event Log ({eventHistory.length})
        </h3>

        {eventHistory.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eff6ff', borderBottom: '2px solid #bfdbfe', color: '#1e3a8a', textTransform: 'uppercase', fontSize: '11px' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Event ID</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Alarm Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Trigger Time</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Severity</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              {eventHistory.map((evt, idx) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td className="font-mono" style={{ padding: '10px', color: '#64748b', fontSize: '11px' }}>{evt.id}</td>
                  <td className="font-mono" style={{ padding: '10px', fontWeight: 700, color: '#dc2626' }}>{evt.alarmCode}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>{evt.alarmName}</td>
                  <td className="font-mono" style={{ padding: '10px', color: '#334155' }}>{evt.timestamp}</td>
                  <td style={{ padding: '10px', color: '#334155' }}>{evt.description}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span className={`badge ${evt.severity === 'critical' ? 'badge-alarm' : evt.severity === 'warning' ? 'badge-warning' : 'badge-normal'}`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span className={`badge ${evt.acknowledged ? 'badge-normal' : 'badge-alarm'}`}>
                      {evt.acknowledged ? 'YES' : 'NO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
            No alarm events logged in the database yet.
          </div>
        )}
      </div>
    </div>
  );
};
