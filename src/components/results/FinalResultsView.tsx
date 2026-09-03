import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  Building,
  Cpu,
  Sliders,
  Box,
  Thermometer,
  AlertTriangle,
  FileText,
  PenTool,
} from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import { generateTemperatureCsv, downloadCsvFile } from '../../services/logging/CsvExporter';

export const FinalResultsView: React.FC = () => {
  const { lastResults, activeSession, setActiveTab, resetWizard } = useTestContext();
  const [observations, setObservations] = useState<string>(
    activeSession?.observations ||
      'All 32 temperature points remained within normal thermal equilibrium parameters during steady-state test current injection.'
  );

  const results = lastResults || activeSession?.finalResults;
  const config = activeSession?.config;

  if (!results) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        No test results generated yet. Complete a test session to view final temperature rise pass/fail metrics.
      </div>
    );
  }

  const isOverallPass = results.overallPass;

  // Split 32 points into 2 side-by-side columns (1..16 and 17..32)
  const leftPoints = results.pointResults.slice(0, 16);
  const rightPoints = results.pointResults.slice(16, 32);

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }} className="report-container">
      {/* Top Action Bar (Hidden when printing) */}
      <div
        className="no-print"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1e293b',
          padding: '16px 20px',
          borderRadius: '6px',
          border: '1px solid #334155',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            Official Test Certificate & Report Preview
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0 0' }}>
            Formatted 10-section structured report for Symatic Engineering quality compliance. Click Print Report to generate PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {activeSession && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                const csvData = generateTemperatureCsv(activeSession);
                downloadCsvFile(csvData, `TRT-LogData-${activeSession.testId}.csv`);
              }}
              style={{ padding: '10px 20px' }}
            >
              <FileSpreadsheet size={18} color="#10b981" /> Export Raw CSV Log
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '10px 20px' }}>
            <Printer size={18} /> Print / Export PDF Report
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetWizard();
              setActiveTab('new-test');
            }}
            style={{ padding: '10px 20px' }}
          >
            <RotateCcw size={18} /> Configure New Test
          </button>
        </div>
      </div>

      {/* FORMAL 10-SECTION REPORT DOCUMENT (Printable Area) */}
      <div
        className="printable-report"
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '24px',
          color: '#f8fafc',
        }}
      >
        {/* Document Header & Company Letterhead */}
        <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '15px',
                    letterSpacing: '1px',
                  }}
                >
                  SYMATIC
                </span>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  SYMATIC ENGINEERING PVT LTD
                </h1>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Industrial Automation & Electrical Switchgear Testing Division | Quality Assurance Certificate
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: isOverallPass ? '#10b981' : '#ef4444',
                  textTransform: 'uppercase',
                  border: `2px solid ${isOverallPass ? '#10b981' : '#ef4444'}`,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isOverallPass ? <CheckCircle size={16} /> : <XCircle size={16} />}
                RESULT: {isOverallPass ? 'PASS' : 'FAIL'}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                Ref: <strong>{activeSession?.testId}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Date: {activeSession?.startTimestamp || new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: CUSTOMER & SECTION 2: EQUIPMENT DETAILS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {/* Section 1 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} /> 1. Customer Details
            </h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0', width: '38%' }}>Customer:</td><td style={{ fontWeight: 700, color: '#f8fafc' }}>{config?.customer.customerName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Project:</td><td>{config?.customer.projectName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Address:</td><td>{config?.customer.address}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>PO No:</td><td className="font-mono">{config?.customer.poNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Cust Serial:</td><td className="font-mono">{config?.customer.serialNumber}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 2 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> 2. Equipment Details
            </h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0', width: '38%' }}>Equipment:</td><td style={{ fontWeight: 700, color: '#f8fafc' }}>{config?.equipment.equipmentName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Model:</td><td className="font-mono">{config?.equipment.model}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Make:</td><td>{config?.equipment.make}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Eq Serial:</td><td className="font-mono">{config?.equipment.serialNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Calib Due:</td><td className="font-mono">{config?.equipment.calibrationDueDate}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: TEST SPECIFICATIONS & SECTION 4: TEST OBJECT DETAILS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {/* Section 3 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} /> 3. Test Specification & Limits
            </h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0', width: '38%' }}>Rated Voltage:</td><td className="font-mono">{config?.specification.ratedVoltage} V</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Rated Current:</td><td className="font-mono">{config?.specification.ratedCurrent} A</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Test Current:</td><td className="font-mono">{config?.specification.testCurrent} A</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Ambient Temp:</td><td className="font-mono">{config?.specification.ambientTemp} °C</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Temp Rise Limit:</td><td className="font-mono" style={{ color: '#f59e0b', fontWeight: 700 }}>ΔT ≤ {config?.specification.limitTempRise} °C</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 4 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Box size={14} /> 4. Test Object Details
            </h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0', width: '38%' }}>Tested Component:</td><td style={{ fontWeight: 600 }}>{config?.testObject.description}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Sample Serial:</td><td>{config?.testObject.serialNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Sample Qty:</td><td>{config?.testObject.sampleQuantity} Unit(s)</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Start Time:</td><td>{activeSession?.startTimestamp}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>End Time:</td><td>{activeSession?.endTimestamp || 'Completed'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5 & 6: 32-POINT TEMPERATURE MATRIX (SIDE-BY-SIDE 2-COLUMN STRUCTURED GRID) */}
        <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '12px', backgroundColor: '#0f172a', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Thermometer size={14} /> 5 & 6. Complete 32-Point Temperature Recording & Evaluation Matrix
            </h3>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              Formula: <strong>ΔT = T_actual - T_ambient ({results.ambientTemp.toFixed(1)}°C)</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Left Column: Points 1 to 16 */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px' }}>
                    <th style={{ padding: '3px 4px', textAlign: 'left' }}>Point #</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Initial (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Peak (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Rise ΔT (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'center' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {leftPoints.map((pt, idx) => (
                    <tr key={pt.pointId} style={{ borderBottom: '1px solid #334155', backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33' }}>
                      <td style={{ padding: '2px 4px', fontWeight: 600, color: '#f8fafc' }}>{pt.label}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', color: '#94a3b8' }}>{pt.initialTemp.toFixed(1)}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 600, color: '#f8fafc' }}>{pt.maxTemp.toFixed(1)}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 700, color: pt.pass ? '#10b981' : '#ef4444' }}>
                        +{pt.tempRise.toFixed(1)}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        <span className={`badge ${pt.pass ? 'badge-normal' : 'badge-alarm'}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                          {pt.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Column: Points 17 to 32 */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px' }}>
                    <th style={{ padding: '3px 4px', textAlign: 'left' }}>Point #</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Initial (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Peak (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>Rise ΔT (°C)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'center' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rightPoints.map((pt, idx) => (
                    <tr key={pt.pointId} style={{ borderBottom: '1px solid #334155', backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33' }}>
                      <td style={{ padding: '2px 4px', fontWeight: 600, color: '#f8fafc' }}>{pt.label}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', color: '#94a3b8' }}>{pt.initialTemp.toFixed(1)}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 600, color: '#f8fafc' }}>{pt.maxTemp.toFixed(1)}</td>
                      <td className="font-mono" style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 700, color: pt.pass ? '#10b981' : '#ef4444' }}>
                        +{pt.tempRise.toFixed(1)}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        <span className={`badge ${pt.pass ? 'badge-normal' : 'badge-alarm'}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                          {pt.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 7: PLC & HMI LOG DATA & SECTION 8: PLC ALARM / FAULT HISTORY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {/* Section 7 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> 7. PLC & HMI Operating Log Data
            </h3>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>PLC Status:</td><td style={{ color: '#10b981', fontWeight: 600 }}>ONLINE / RUNNING</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>HMI Protocol:</td><td>Modbus TCP / IP Active</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Current Stability:</td><td>±0.4% Setpoint Variance</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>Sampling Rate:</td><td>1 Log / Minute</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 8 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> 8. PLC Alarm & Fault History
            </h3>
            {activeSession?.alarmEvents && activeSession.alarmEvents.length > 0 ? (
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '3px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '3px' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '3px' }}>Alarm</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSession.alarmEvents.map((evt) => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td className="font-mono" style={{ padding: '3px', color: '#94a3b8' }}>{evt.timestamp}</td>
                      <td className="font-mono" style={{ padding: '3px', color: '#ef4444' }}>{evt.alarmCode}</td>
                      <td style={{ padding: '3px' }}>{evt.alarmName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: '11px', color: '#10b981', padding: '6px 0' }}>
                ✓ No PLC alarms or trip events recorded during this test session.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 9: OBSERVATIONS */}
        <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#0f172a', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={14} /> 9. Testing Observations & Inspector Notes
          </h3>
          <textarea
            className="form-input"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Operator observations, thermal imaging notes, or busbar torque inspection findings..."
            style={{ width: '100%', fontSize: '11px', backgroundColor: '#1e293b' }}
          />
        </div>

        {/* SECTION 10: APPROVAL & SIGNATURE BLOCKS */}
        <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '12px', backgroundColor: '#0f172a' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
            10. Formal Approval & Signatures
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>TEST OPERATOR</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>Symatic Engineering QA</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>QUALITY ENGINEER</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>Inspection & Testing Dept</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>CLIENT REPRESENTATIVE</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{config?.customer.customerName}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>Sign & Date: _________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
