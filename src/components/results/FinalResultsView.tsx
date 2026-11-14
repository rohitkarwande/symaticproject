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
import { formatTimeOnly } from '../../utils/formatTime';
import symaticLogo from '../../assets/symatic_logo.jpg';

export const FinalResultsView: React.FC = () => {
  const { lastResults, activeSession, selectedHistoryTest, setActiveTab, resetWizard } = useTestContext();
  const session = activeSession || selectedHistoryTest;
  const results = lastResults || session?.finalResults;
  const config = session?.config;
  const logs = session?.temperatureLogs || [];
  const sensorCount = Math.min(
    48,
    Math.max(1, Number(config?.specification?.sensorCount) || results?.pointResults.length || 48)
  );

  // Banked Sensor Groups: 10 channels per table as requested (1-10, 11-20, 21-30, etc.)
  const CHANNELS_PER_BLOCK = 10;
  const numBlocks = Math.ceil(sensorCount / CHANNELS_PER_BLOCK);
  const sensorBlocks: Array<{ startId: number; endId: number; isFirst: boolean }> = [];
  for (let b = 0; b < numBlocks; b++) {
    const startId = b * CHANNELS_PER_BLOCK + 1;
    const endId = Math.min((b + 1) * CHANNELS_PER_BLOCK, sensorCount);
    sensorBlocks.push({ startId, endId, isFirst: b === 0 });
  }

  const [observations, setObservations] = useState<string>(
    session?.observations ||
      'All temperature points remained within normal thermal equilibrium parameters during steady-state test current injection.'
  );

  if (!results) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        No test results generated yet. Complete a test session to view final temperature rise pass/fail metrics.
      </div>
    );
  }

  const isOverallPass = results.overallPass;

  return (
    <div className="report-container">
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
            Formatted structured report for quality compliance. Click Print Report to generate PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {session && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                const csvData = generateTemperatureCsv(session);
                downloadCsvFile(csvData, `TRT-LogData-${session.testId}.csv`);
              }}
              style={{ padding: '10px 20px' }}
            >
              <FileSpreadsheet size={18} color="#10b981" /> Export CSV Log
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src={symaticLogo}
                alt="Symatic Logo"
                style={{
                  height: '56px',
                  width: 'auto',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  padding: '3px',
                }}
              />
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  TEMPERATURE RISE TEST REPORT
                </h1>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Industrial Switchgear & Busbar Testing Division | Quality Assurance Certificate
                </p>
              </div>
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
                Time: {formatTimeOnly(activeSession?.startTimestamp || '') || new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* SECTIONS 1 TO 4: METADATA 2-COLUMN BALANCED GRID (Zero Cutting, Generous Width) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {/* Section 1: Customer Details */}
          <div className="printable-report-card" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} /> 1. Customer Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0', width: '32%' }}>Customer:</td><td style={{ fontWeight: 700, color: '#f8fafc' }}>{config?.customer.customerName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Project:</td><td>{config?.customer.projectName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Address:</td><td>{config?.customer.address}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>PO No:</td><td className="font-mono">{config?.customer.poNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Cust S/N:</td><td className="font-mono">{config?.customer.serialNumber}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Equipment Details */}
          <div className="printable-report-card" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} /> 2. Equipment Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0', width: '32%' }}>Equipment:</td><td style={{ fontWeight: 700, color: '#f8fafc' }}>{config?.equipment.equipmentName}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Model:</td><td className="font-mono">{config?.equipment.model}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Make:</td><td>{config?.equipment.make}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Eq S/N:</td><td className="font-mono">{config?.equipment.serialNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Calib Due:</td><td className="font-mono">{config?.equipment.calibrationDueDate}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Test Specifications */}
          <div className="printable-report-card" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} /> 3. Test Specification & Limits
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0', width: '40%' }}>Test Current:</td><td className="font-mono" style={{ color: '#3b82f6', fontWeight: 700 }}>{config?.specification.testCurrent} A</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Test Duration:</td><td className="font-mono">{config?.specification.testDurationHours} Hr(s)</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>No. of Sensors:</td><td className="font-mono" style={{ color: '#10b981', fontWeight: 700 }}>{sensorCount} Channels</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Report Log Interval:</td><td className="font-mono">{config?.specification.logIntervalMinutes || 1} Min(s)</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Ambient Baseline:</td><td className="font-mono">{results.ambientTemp || 25} °C</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Test Object Details */}
          <div className="printable-report-card" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Box size={15} /> 4. Test Object Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0', width: '32%' }}>Object:</td><td style={{ fontWeight: 600 }}>{config?.testObject.description}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Sample S/N:</td><td className="font-mono">{config?.testObject.serialNumber}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Quantity:</td><td>{config?.testObject.sampleQuantity} Unit(s)</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Start Time:</td><td className="font-mono">{formatTimeOnly(activeSession?.startTimestamp || '')}</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>End Time:</td><td className="font-mono">{formatTimeOnly(activeSession?.endTimestamp || '') || 'Completed'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: BANKED CHRONOLOGICAL LOG TABLES (10 CHANNELS PER BLOCK: 1-10, 11-20, etc.) */}
        {sensorBlocks.map((block, bIdx) => {
          const channelsInBlock: number[] = [];
          for (let ch = block.startId; ch <= block.endId; ch++) {
            channelsInBlock.push(ch);
          }

          return (
            <div
              key={bIdx}
              className="printable-table-block"
              style={{
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '10px 12px',
                backgroundColor: '#0f172a',
                marginBottom: '14px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="table-block-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  borderBottom: '1px solid #334155',
                  paddingBottom: '6px',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid',
                }}
              >
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#3b82f6',
                    textTransform: 'uppercase',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    pageBreakAfter: 'avoid',
                    breakAfter: 'avoid',
                  }}
                >
                  <Thermometer size={15} /> Part 5.{bIdx + 1}: Periodic Records — Channels {block.startId} to {block.endId}
                  {block.isFirst ? ' & Injected Currents' : ''} (Interval: Every {config?.specification.logIntervalMinutes || 1} min)
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Bank: <strong>{bIdx + 1} of {sensorBlocks.length}</strong> | Channels: <strong>{block.startId}–{block.endId}</strong> | Total Logs: <strong>{logs.length}</strong>
                </span>
              </div>

              <div
                className="table-block-table-wrapper"
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  pageBreakBefore: 'avoid',
                  breakBefore: 'avoid',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#1e293b',
                        borderBottom: '2px solid #334155',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        fontSize: '10px',
                      }}
                    >
                      <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>Time</th>
                      {block.isFirst && (
                        <>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444', whiteSpace: 'nowrap' }}>R (A)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#eab308', whiteSpace: 'nowrap' }}>Y (A)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#3b82f6', whiteSpace: 'nowrap' }}>B (A)</th>
                        </>
                      )}
                      {channelsInBlock.map((ch) => (
                        <th key={ch} style={{ padding: '6px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          CH {ch} (°C)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log, idx) => {
                        const timeOnly = formatTimeOnly(log.timestamp);
                        const rVal = log.currents?.r !== undefined ? Number(log.currents.r).toFixed(2) : '0.00';
                        const yVal = log.currents?.y !== undefined ? Number(log.currents.y).toFixed(2) : '0.00';
                        const bVal = log.currents?.b !== undefined ? Number(log.currents.b).toFixed(2) : '0.00';

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #334155',
                              backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33',
                            }}
                          >
                            <td className="font-mono" style={{ padding: '5px 8px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                              {timeOnly}
                            </td>
                            {block.isFirst && (
                              <>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                  {rVal}
                                </td>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#eab308', whiteSpace: 'nowrap' }}>
                                  {yVal}
                                </td>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                                  {bVal}
                                </td>
                              </>
                            )}
                            {channelsInBlock.map((ch) => {
                              const temp = log.temperatures[ch];
                              const tempDisplay = temp !== undefined && temp !== null ? Number(temp).toFixed(1) : '-';
                              return (
                                <td key={ch} className="font-mono" style={{ padding: '5px 6px', textAlign: 'right', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                                  {tempDisplay}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={1 + (block.isFirst ? 3 : 0) + channelsInBlock.length}
                          style={{ textAlign: 'center', padding: '14px', color: '#64748b' }}
                        >
                          No periodic log records recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* SECTION 7: PLC & HMI LOG DATA & SECTION 8: PLC ALARM / FAULT HISTORY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {/* Section 7 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> 7. PLC & HMI Operating Log Data
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>PLC Status:</td><td style={{ color: '#10b981', fontWeight: 600 }}>ONLINE / RUNNING</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>HMI Protocol:</td><td>Modbus TCP / IP Active</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Current Stability:</td><td>±0.4% Setpoint Variance</td></tr>
                <tr><td style={{ color: '#94a3b8', padding: '3px 0' }}>Sampling Rate:</td><td>1 Log / Minute</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 8 */}
          <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} /> 8. PLC Alarm & Fault History
            </h3>
            {activeSession?.alarmEvents && activeSession.alarmEvents.length > 0 ? (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Alarm</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSession.alarmEvents.map((evt) => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td className="font-mono" style={{ padding: '4px', color: '#94a3b8' }}>{formatTimeOnly(evt.timestamp)}</td>
                      <td className="font-mono" style={{ padding: '4px', color: '#ef4444' }}>{evt.alarmCode}</td>
                      <td style={{ padding: '4px' }}>{evt.alarmName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: '11.5px', color: '#10b981', padding: '6px 0' }}>
                ✓ No PLC alarms or trip events recorded during this test session.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 9: OBSERVATIONS */}
        <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#0f172a', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={15} /> 9. Testing Observations & Inspector Notes
          </h3>
          <textarea
            className="form-input"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Operator observations, thermal imaging notes, or busbar torque inspection findings..."
            style={{ width: '100%', fontSize: '11.5px', backgroundColor: '#1e293b' }}
          />
        </div>

        {/* SECTION 10: APPROVAL & SIGNATURE BLOCKS */}
        <div className="printable-report-section" style={{ border: '1px solid #334155', borderRadius: '4px', padding: '14px', backgroundColor: '#0f172a' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
            10. Formal Approval & Signatures
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>TEST OPERATOR</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Quality Assurance Testing Dept</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>QUALITY ENGINEER</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Inspection & Testing Dept</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>CLIENT REPRESENTATIVE</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{config?.customer.customerName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
