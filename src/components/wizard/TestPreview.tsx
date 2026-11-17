import React from 'react';
import { Play, Edit3, Shield, User, Settings, Sliders, Box, AlertCircle } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const TestPreview: React.FC = () => {
  const { draftConfig, setActiveTab, setWizardStep, startTestSession } = useTestContext();
  const [starting, setStarting] = React.useState(false);

  const handleEdit = () => {
    setWizardStep(1);
    setActiveTab('new-test');
  };

  const handleStart = () => {
    setStarting(true);
    try {
      // Navigate to live dashboard and activate test session (No register address configured here)
      startTestSession();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('[TestPreview] Error starting test session:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      {/* Top Banner */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="badge badge-normal" style={{ marginBottom: '6px' }}>
            <Shield size={14} /> READ-ONLY PREVIEW
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Test Configuration Review
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Verify all parameters before launching live 48-point temperature monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleEdit} disabled={starting}>
            <Edit3 size={16} /> BACK / EDIT
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={starting}
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 700,
              backgroundColor: '#16a34a',
              borderColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Play size={18} /> {starting ? 'Proceeding to Dashboard...' : 'START TEST'}
          </button>
        </div>
      </div>

      {/* Grid of Read-Only Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 1. Customer Details */}
        <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '14px', borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>
            <User size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>1. Customer Information</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569', width: '40%' }}>Customer Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.customer.customerName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Project Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.customer.projectName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Facility Address:</td>
                <td style={{ padding: '8px 0', color: '#0f172a' }}>{draftConfig.customer.address}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>PO Number:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.customer.poNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#475569' }}>Customer Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.customer.serialNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Equipment Details */}
        <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '14px', borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>
            <Settings size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>2. Equipment Specification</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569', width: '40%' }}>Equipment Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.equipment.equipmentName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Model:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.equipment.model}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Make / Manufacturer:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.equipment.make}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Equipment Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.equipment.serialNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#475569' }}>Calibration Due:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#16a34a' }}>{draftConfig.equipment.calibrationDueDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Test Specification */}
        <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '14px', borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>
            <Sliders size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>3. Test Parameters</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569', width: '45%' }}>Test Current Setpoint:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#2563eb' }}>{draftConfig.specification.testCurrent} A</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Configured Duration:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: '#d97706' }}>
                  {draftConfig.specification.testDurationHours} Hour(s)
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Active Sensors:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#16a34a' }}>
                  {draftConfig.specification.sensorCount || 48} Channel(s) (TEMP_1 .. TEMP_{draftConfig.specification.sensorCount || 48})
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#475569' }}>Report Logging Interval:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>
                  Every {draftConfig.specification.logIntervalMinutes || 1} Minute(s)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Test Object Details */}
        <div className="ind-card" style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '14px', borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>
            <Box size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>4. Test Object Sample</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569', width: '40%' }}>Component Tested:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.testObject.description}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', color: '#475569' }}>Sample Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.testObject.serialNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#475569' }}>Sample Quantity:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{draftConfig.testObject.sampleQuantity} Unit(s)</td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              padding: '12px',
              marginTop: '20px',
              fontSize: '12px',
              color: '#1e3a8a',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#1e40af' }}>Automated Logging Ready:</strong> Clicking START TEST will launch live sensor monitoring (polling hardware every 500ms) and record temperature logs for report every {draftConfig.specification.logIntervalMinutes || 1} minute(s) into the local SQLite store.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
