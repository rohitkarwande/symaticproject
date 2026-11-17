import React, { useState } from 'react';
import { Search, Eye, FileText, FileSpreadsheet } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import { generateTemperatureCsv, downloadCsvFile } from '../../services/logging/CsvExporter';
import type { TestSession } from '../../types/test';

export const TestHistoryView: React.FC = () => {
  const { testHistory, setSelectedHistoryTest, setLastResults, setActiveTab } = useTestContext();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail'>('all');
  const [inspectModalTest, setInspectModalTest] = useState<TestSession | null>(null);

  const filteredTests = testHistory.filter((test) => {
    const custName = test.config.customer.customerName.toLowerCase();
    const testId = test.testId.toLowerCase();
    const eqName = test.config.equipment.equipmentName.toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = custName.includes(query) || testId.includes(query) || eqName.includes(query);
    if (!matchesSearch) return false;

    if (filterStatus === 'pass') return test.finalResults?.overallPass === true;
    if (filterStatus === 'fail') return test.finalResults?.overallPass === false;
    return true;
  });

  const handleInspect = (test: TestSession) => {
    setInspectModalTest(test);
  };

  const handleOpenResults = (test: TestSession) => {
    if (test.finalResults) {
      setLastResults(test.finalResults);
      setSelectedHistoryTest(test);
      setActiveTab('results');
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Historical Test Records Archive
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Search, inspect, and open past Temperature Rise Test reports and 48-point datasets.
          </p>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }}
              placeholder="Search Customer, Test ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            {(['all', 'pass', 'fail'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: filterStatus === st ? '#2563eb' : 'transparent',
                  color: filterStatus === st ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#eff6ff', borderBottom: '2px solid #bfdbfe', color: '#1e3a8a', textTransform: 'uppercase', fontSize: '11px' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Test ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Customer Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Equipment</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Start Timestamp</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Max Temp</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Max Rise (ΔT)</th>

              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.map((test, idx) => {
              const res = test.finalResults;
              const isPass = res?.overallPass;

              return (
                <tr
                  key={test.testId}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <td className="font-mono" style={{ padding: '12px', fontWeight: 700, color: '#2563eb' }}>
                    {test.testId}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {test.config.customer.customerName}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>
                    {test.config.equipment.equipmentName}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>
                    {test.startTimestamp}
                  </td>
                  <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {res ? `${res.maxObservedTemp.toFixed(1)}°C` : 'N/A'}
                  </td>
                  <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: isPass ? '#16a34a' : '#dc2626' }}>
                    {res ? `+${res.maxObservedRise.toFixed(1)}°C` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span className={`badge ${isPass ? 'badge-normal' : 'badge-alarm'}`} style={{ fontSize: '11px' }}>
                      {isPass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          const csvData = generateTemperatureCsv(test);
                          downloadCsvFile(csvData, `TRT-LogData-${test.testId}.csv`);
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Export Raw CSV Log"
                      >
                        <FileSpreadsheet size={14} color="#16a34a" /> CSV
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleInspect(test)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        <Eye size={14} /> Quick View
                      </button>
                      <button className="btn btn-primary" onClick={() => handleOpenResults(test)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        <FileText size={14} /> Open Report
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Inspection Drawer / Modal */}
      {inspectModalTest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
            <div className="modal-header" style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <div className="modal-title" style={{ color: '#1e3a8a' }}>
                <FileText size={20} color="#2563eb" />
                Historical Test Summary — {inspectModalTest.testId}
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>CUSTOMER</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {inspectModalTest.config.customer.customerName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Project: {inspectModalTest.config.customer.projectName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>SPECIFICATION</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Current: {inspectModalTest.config.specification.testCurrent}A | Duration: {inspectModalTest.config.specification.testDurationHours}h | Sensors: {inspectModalTest.config.specification.sensorCount || 48}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>
                    Report Log Interval: {inspectModalTest.config.specification.logIntervalMinutes || 1} min
                  </div>
                </div>
              </div>

              {inspectModalTest.finalResults && (
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe',
                    fontSize: '13px',
                    color: '#1e3a8a',
                  }}
                >
                  <strong style={{ color: '#2563eb' }}>Key Results Summary:</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span>Ambient Temp: <strong style={{ color: '#0f172a' }}>{inspectModalTest.finalResults.ambientTemp}°C</strong></span>
                    <span>Max Recorded Temp: <strong style={{ color: '#0f172a' }}>{inspectModalTest.finalResults.maxObservedTemp}°C</strong></span>
                    <span>Max Rise: <strong style={{ color: inspectModalTest.finalResults.overallPass ? '#16a34a' : '#dc2626' }}>+{inspectModalTest.finalResults.maxObservedRise}°C</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #bfdbfe' }}>
              <button className="btn btn-secondary" onClick={() => setInspectModalTest(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleOpenResults(inspectModalTest);
                  setInspectModalTest(null);
                }}
              >
                Open Full Results Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
