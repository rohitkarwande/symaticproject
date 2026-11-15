import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle,
  XCircle,
  Building,
  Cpu,
  Sliders,
  Box,
  Thermometer,
  FileText,
  AlertTriangle,
  PenTool,
} from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import { generateTemperatureCsv, downloadCsvFile } from '../../services/logging/CsvExporter';
import symaticLogo from '../../assets/symatic_logo.jpg';

export const FinalResultsView: React.FC = () => {
  const { activeSession, lastResults, selectedHistoryTest, resetWizard, setActiveTab } = useTestContext();
  const [observations, setObservations] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const session = activeSession || selectedHistoryTest;
  const results = lastResults || session?.finalResults;

  if (!session || !results) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        <h3>No test results available.</h3>
        <p>Please select a completed test from History or run a live test first.</p>
        <button className="btn btn-primary" onClick={() => setActiveTab('history')}>
          Go to Test History
        </button>
      </div>
    );
  }

  const config = session.config;
  const isOverallPass = results.overallPass;
  const rawLogs = session.temperatureLogs || (session as any).logs || [];
  const sensorCount = Math.min(
    48,
    Math.max(1, Number(config?.specification.sensorCount) || results.pointResults.length || 48)
  );

  // If periodic logging hasn't committed rows yet or is empty, construct a baseline row from session data
  let logs = rawLogs;
  if (!logs || logs.length === 0) {
    const ambient = Number(config?.specification.ambientTemp) || results.ambientTemp || 25;
    const initialTemps: Record<number, number> = {};
    if (results.pointResults && results.pointResults.length > 0) {
      results.pointResults.forEach((pt) => {
        initialTemps[pt.pointId] = pt.initialTemp || ambient;
      });
    } else if (session.sensors && session.sensors.length > 0) {
      session.sensors.forEach((s) => {
        initialTemps[s.id] = s.initialTemp || ambient;
      });
    } else {
      for (let i = 1; i <= sensorCount; i++) {
        initialTemps[i] = ambient;
      }
    }

    logs = [
      {
        elapsedSeconds: 0,
        timestamp: session.startTimestamp || new Date().toLocaleTimeString(),
        temperatures: initialTemps,
        currents: {
          r: Number(config?.specification.testCurrent) || 0,
          y: Number(config?.specification.testCurrent) || 0,
          b: Number(config?.specification.testCurrent) || 0,
        },
      },
    ];
  }

  const sensorBlocks: Array<{ startId: number; endId: number; isFirst: boolean }> = [];
  for (let chStart = 1; chStart <= sensorCount; chStart += 10) {
    const chEnd = Math.min(chStart + 9, sensorCount);
    sensorBlocks.push({
      startId: chStart,
      endId: chEnd,
      isFirst: chStart === 1,
    });
  }

  const formatTimeOnly = (isoOrTime: string): string => {
    if (!isoOrTime) return '';
    try {
      if (isoOrTime.includes('T')) {
        const d = new Date(isoOrTime);
        if (!isNaN(d.getTime())) return d.toLocaleTimeString();
      }
      return isoOrTime;
    } catch {
      return isoOrTime;
    }
  };

  const handleExportPdf = async () => {
    if (!session) return;
    const filename = `TRT-Report-${session.testId}.pdf`;

    if (window.electronAPI?.exportPdf) {
      setIsExportingPdf(true);
      setExportMessage(null);
      try {
        const res = await window.electronAPI.exportPdf(filename);
        if (res.success) {
          setExportMessage(`✓ PDF Report saved to Downloads: ${res.filename || filename}`);
          setTimeout(() => setExportMessage(null), 6000);
        } else {
          console.warn('[PDF Export] Native PDF export fallback to print:', res.error);
          window.print();
        }
      } catch (err) {
        console.error('[PDF Export] Error calling exportPdf:', err);
        window.print();
      } finally {
        setIsExportingPdf(false);
      }
    } else {
      // In browser fallback
      window.print();
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      {/* Export Confirmation Banner */}
      {exportMessage && (
        <div
          className="no-print"
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '6px',
            padding: '12px 18px',
            marginBottom: '16px',
            color: '#065f46',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
          }}
        >
          <CheckCircle size={18} color="#10b981" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Top Action Bar (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: '6px',
          border: '1px solid #bfdbfe',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Official Test Certificate & Report Preview
          </h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0 0' }}>
            Formatted structured report for quality compliance. Click Print / Export PDF Report to directly save PDF.
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
              <FileSpreadsheet size={18} color="#16a34a" /> Export CSV Log
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isExportingPdf ? '#e2e8f0' : undefined,
            }}
          >
            <Printer size={18} />
            {isExportingPdf ? 'Saving PDF...' : 'Print / Export PDF Report'}
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
          backgroundColor: '#ffffff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          padding: '24px',
          color: '#0f172a',
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
                  height: '92px',
                  maxHeight: '96px',
                  width: 'auto',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  padding: '2px',
                }}
              />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  TEMPERATURE RISE TEST REPORT
                </h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Industrial Switchgear & Busbar Testing Division | Quality Assurance Certificate
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: isOverallPass ? '#16a34a' : '#dc2626',
                  textTransform: 'uppercase',
                  border: `2px solid ${isOverallPass ? '#16a34a' : '#dc2626'}`,
                  backgroundColor: isOverallPass ? '#ecfdf5' : '#fef2f2',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isOverallPass ? <CheckCircle size={16} /> : <XCircle size={16} />}
                RESULT: {isOverallPass ? 'PASS' : 'FAIL'}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                Ref: <strong style={{ color: '#0f172a' }}>{session?.testId}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                Time: {formatTimeOnly(session?.startTimestamp || '') || new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* SECTIONS 1 TO 4: METADATA 2-COLUMN BALANCED GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {/* Section 1: Customer Details */}
          <div className="printable-report-card" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} /> 1. Customer Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#475569', padding: '3px 0', width: '32%' }}>Customer:</td><td style={{ fontWeight: 700, color: '#0f172a' }}>{config?.customer.customerName}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Project:</td><td style={{ color: '#0f172a' }}>{config?.customer.projectName}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Address:</td><td style={{ color: '#0f172a' }}>{config?.customer.address}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>PO No:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.customer.poNumber}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Cust S/N:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.customer.serialNumber}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Equipment Details */}
          <div className="printable-report-card" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} /> 2. Equipment Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#475569', padding: '3px 0', width: '32%' }}>Equipment:</td><td style={{ fontWeight: 700, color: '#0f172a' }}>{config?.equipment.equipmentName}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Model:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.equipment.model}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Make:</td><td style={{ color: '#0f172a' }}>{config?.equipment.make}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Eq S/N:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.equipment.serialNumber}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Calib Due:</td><td className="font-mono" style={{ color: '#16a34a' }}>{config?.equipment.calibrationDueDate}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Test Specifications */}
          <div className="printable-report-card" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} /> 3. Test Specification & Limits
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#475569', padding: '3px 0', width: '40%' }}>Test Current:</td><td className="font-mono" style={{ color: '#2563eb', fontWeight: 700 }}>{config?.specification.testCurrent} A</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Test Duration:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.specification.testDurationHours} Hr(s)</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>No. of Sensors:</td><td className="font-mono" style={{ color: '#16a34a', fontWeight: 700 }}>{sensorCount} Channels</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Report Log Interval:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.specification.logIntervalMinutes || 1} Min(s)</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Ambient Baseline:</td><td className="font-mono" style={{ color: '#0f172a' }}>{results.ambientTemp || 25} °C</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Test Object Details */}
          <div className="printable-report-card" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Box size={15} /> 4. Test Object Details
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#475569', padding: '3px 0', width: '32%' }}>Object:</td><td style={{ fontWeight: 600, color: '#0f172a' }}>{config?.testObject.description}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Sample S/N:</td><td className="font-mono" style={{ color: '#0f172a' }}>{config?.testObject.serialNumber}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Quantity:</td><td style={{ color: '#0f172a' }}>{config?.testObject.sampleQuantity} Unit(s)</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Start Time:</td><td className="font-mono" style={{ color: '#0f172a' }}>{formatTimeOnly(session?.startTimestamp || '') || '-'}</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>End Time:</td><td className="font-mono" style={{ color: '#0f172a' }}>{formatTimeOnly(session?.endTimestamp || '') || 'Completed'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: BANKED CHRONOLOGICAL LOG TABLES */}
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
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                padding: '10px 12px',
                backgroundColor: '#ffffff',
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
                  borderBottom: '1px solid #bfdbfe',
                  paddingBottom: '6px',
                  pageBreakAfter: 'avoid',
                  breakAfter: 'avoid',
                }}
              >
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563eb',
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
                <span style={{ fontSize: '11px', color: '#475569' }}>
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
                        backgroundColor: '#eff6ff',
                        borderBottom: '2px solid #bfdbfe',
                        color: '#1e3a8a',
                        textTransform: 'uppercase',
                        fontSize: '10px',
                      }}
                    >
                      <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>Time</th>
                      {block.isFirst && (
                        <>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>R (A)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#d97706', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>Y (A)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2563eb', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>B (A)</th>
                        </>
                      )}
                      {channelsInBlock.map((ch) => (
                        <th key={ch} style={{ padding: '6px 6px', textAlign: 'right', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
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
                              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            }}
                          >
                            <td className="font-mono" style={{ padding: '5px 8px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
                              {timeOnly}
                            </td>
                            {block.isFirst && (
                              <>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#dc2626', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
                                  {rVal}
                                </td>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#d97706', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
                                  {yVal}
                                </td>
                                <td className="font-mono" style={{ padding: '5px 8px', textAlign: 'right', color: '#2563eb', whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
                                  {bVal}
                                </td>
                              </>
                            )}
                            {channelsInBlock.map((ch) => {
                              const temp = log.temperatures[ch];
                              const isFail = temp !== undefined && temp !== null && temp >= 30000;
                              const tempDisplay = isFail ? 'FAIL' : (temp !== undefined && temp !== null ? Number(temp).toFixed(1) : '-');
                              return (
                                <td
                                  key={ch}
                                  className="font-mono"
                                  style={{
                                    padding: '5px 6px',
                                    textAlign: 'right',
                                    color: isFail ? '#dc2626' : '#0f172a',
                                    fontWeight: isFail ? 800 : 500,
                                    whiteSpace: 'nowrap',
                                    border: '1px solid #bfdbfe',
                                  }}
                                >
                                  {isFail ? (
                                    <span style={{ color: '#dc2626', fontWeight: 800 }}>FAIL</span>
                                  ) : (
                                    tempDisplay
                                  )}
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
          <div className="printable-report-section" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> 7. PLC & HMI Operating Log Data
            </h3>
            <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>PLC Status:</td><td style={{ color: '#16a34a', fontWeight: 600 }}>ONLINE / RUNNING</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>HMI Protocol:</td><td style={{ color: '#0f172a' }}>Modbus TCP / IP Active</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Current Stability:</td><td style={{ color: '#0f172a' }}>±0.4% Setpoint Variance</td></tr>
                <tr><td style={{ color: '#475569', padding: '3px 0' }}>Sampling Rate:</td><td style={{ color: '#0f172a' }}>1 Log / Minute</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 8 */}
          <div className="printable-report-section" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} /> 8. PLC Alarm & Fault History
            </h3>
            {session?.alarmEvents && session.alarmEvents.length > 0 ? (
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#475569', borderBottom: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Alarm</th>
                  </tr>
                </thead>
                <tbody>
                  {session.alarmEvents.map((evt) => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td className="font-mono" style={{ padding: '4px 6px', color: '#475569' }}>{formatTimeOnly(evt.timestamp)}</td>
                      <td className="font-mono" style={{ padding: '4px 6px', color: '#dc2626', fontWeight: 700 }}>{evt.alarmCode}</td>
                      <td style={{ padding: '4px 6px', color: '#0f172a' }}>{evt.alarmName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: '11.5px', color: '#16a34a', padding: '6px 0', fontWeight: 600 }}>
                ✓ No PLC alarms or trip events recorded during this test session.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 9: OBSERVATIONS */}
        <div className="printable-report-section" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#f8fafc', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={15} /> 9. Testing Observations & Inspector Notes
          </h3>
          <textarea
            className="form-input"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Operator observations, thermal imaging notes, or busbar torque inspection findings..."
            style={{ width: '100%', fontSize: '11.5px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #bfdbfe' }}
          />
        </div>

        {/* SECTION 10: APPROVAL & SIGNATURE BLOCKS */}
        <div className="printable-report-section" style={{ border: '1px solid #bfdbfe', borderRadius: '4px', padding: '14px', backgroundColor: '#f8fafc' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
            10. Formal Approval & Signatures
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>TEST OPERATOR</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Quality Assurance Testing Dept</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>QUALITY ENGINEER</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Inspection & Testing Dept</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>

            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>CLIENT REPRESENTATIVE</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{config?.customer.customerName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Sign & Date: _________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
