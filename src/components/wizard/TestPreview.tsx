import React from 'react';
import { Play, Edit3, Shield, User, Settings, Sliders, Box, AlertCircle } from 'lucide-react';
import { useTestContext } from '../../context/TestContext';

export const TestPreview: React.FC = () => {
  const { draftConfig, setActiveTab, setWizardStep, startTestSession } = useTestContext();

  const handleEdit = () => {
    setWizardStep(1);
    setActiveTab('new-test');
  };

  const handleStart = () => {
    startTestSession();
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      {/* Top Banner */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="badge badge-normal" style={{ marginBottom: '6px' }}>
            <Shield size={14} /> READ-ONLY PREVIEW
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            Test Configuration Review
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Verify all parameters before launching live 32-point temperature monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleEdit}>
            <Edit3 size={16} /> BACK / EDIT
          </button>
          <button className="btn btn-primary" onClick={handleStart} style={{ padding: '10px 24px', fontSize: '15px' }}>
            <Play size={18} /> START TEST
          </button>
        </div>
      </div>

      {/* Grid of Read-Only Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 1. Customer Details */}
        <div className="ind-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <User size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>1. Customer Information</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8', width: '40%' }}>Customer Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.customer.customerName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Project Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.customer.projectName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Facility Address:</td>
                <td style={{ padding: '8px 0', color: '#cbd5e1' }}>{draftConfig.customer.address}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>PO Number:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.customer.poNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Customer Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.customer.serialNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Equipment Details */}
        <div className="ind-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <Settings size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>2. Equipment Specification</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8', width: '40%' }}>Equipment Name:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.equipment.equipmentName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Model:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.equipment.model}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Make / Manufacturer:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.equipment.make}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Equipment Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.equipment.serialNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Calibration Due:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#10b981' }}>{draftConfig.equipment.calibrationDueDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Test Specification */}
        <div className="ind-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <Sliders size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>3. Test Parameters</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8', width: '40%' }}>Rated Voltage:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.specification.ratedVoltage} V</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Rated Current:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.specification.ratedCurrent} A</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Test Current Setpoint:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#3b82f6' }}>{draftConfig.specification.testCurrent} A</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Ambient Temperature:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.specification.ambientTemp} °C</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Configured Duration:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: '#f59e0b' }}>
                  {draftConfig.specification.testDurationHours} Hour(s)
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Acceptance Limit Rise:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: '#f8fafc' }}>
                  ΔT ≤ {draftConfig.specification.limitTempRise} °C
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Test Object Details */}
        <div className="ind-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <Box size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>4. Test Object Sample</h3>
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8', width: '40%' }}>Component Tested:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.testObject.description}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Sample Serial No:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.testObject.serialNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Sample Quantity:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: '#f8fafc' }}>{draftConfig.testObject.sampleQuantity} Unit(s)</td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '12px',
              marginTop: '20px',
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={16} color="#3b82f6" style={{ shrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#f8fafc' }}>Automated Logging Ready:</strong> Clicking START TEST will launch the 32-sensor polling cycle and record temperature logs every 1 minute into the local SQLite store.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
