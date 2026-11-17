import React, { useState, useEffect } from 'react';
import {
  User,
  Sliders,
  Settings,
  Box,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  CornerDownLeft,
  WifiOff,
  RotateCcw,
  History,
} from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import { validateFormGroup } from '../../services/validation';
import type { ValidationRule, ValidationErrors } from '../../services/validation';
import type { CustomerDetails, EquipmentDetails, TestSpecification, TestObjectDetails } from '../../types/test';

export const NewTestWizard: React.FC = () => {
  const {
    wizardStep,
    setWizardStep,
    draftConfig,
    updateDraftConfig,
    setActiveTab,
    writeSetCurrentToModbus,
    writeSetTimerToModbus,
    writeTestSpecificationToModbus,
    modbusStatus,
    modbusData,
    connectModbus,
    clearDraftConfig,
    restorePreviousConfig,
    hasPreviousConfig,
  } = useTestContext();

  const [currentSyncStatus, setCurrentSyncStatus] = useState<string>('');
  const [isWritingCurrent, setIsWritingCurrent] = useState<boolean>(false);
  const [durationSyncStatus, setDurationSyncStatus] = useState<string>('');
  const [isWritingDuration, setIsWritingDuration] = useState<boolean>(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(!modbusStatus.connected);

  useEffect(() => {
    setShowDisconnectModal(!modbusStatus.connected);
  }, [modbusStatus.connected]);

  // Manual Trigger: Write testCurrent to Register 4X: 55 ONLY when user clicks Enter Arrow or presses Enter
  const handleWriteCurrent = async () => {
    const val = draftConfig.specification.testCurrent;
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      setCurrentSyncStatus('⚠️ Please enter a valid test current (> 0 A)');
      return;
    }

    setIsWritingCurrent(true);
    setCurrentSyncStatus('Writing Set Current to PLC...');
    try {
      const res = await writeSetCurrentToModbus(num);
      if (res.success) {
        setCurrentSyncStatus(`✓ Set Current updated: ${num.toFixed(1)} A`);
      } else {
        setCurrentSyncStatus('❌ Hardware offline / Write failed');
      }
    } catch {
      setCurrentSyncStatus('❌ Write error');
    } finally {
      setIsWritingCurrent(false);
    }
  };

  // Manual Trigger: Write testDurationHours (SET_TIMER) ONLY when user clicks Enter Arrow or presses Enter
  const handleWriteDuration = async () => {
    const val = draftConfig.specification.testDurationHours;
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      setDurationSyncStatus('⚠️ Please enter a valid test duration (> 0 Hours)');
      return;
    }

    setIsWritingDuration(true);
    setDurationSyncStatus('Writing Set Timer to PLC...');
    try {
      const res = await writeSetTimerToModbus(num);
      if (res.success) {
        setDurationSyncStatus(`✓ Set Timer updated: ${num} Hours`);
      } else {
        setDurationSyncStatus('❌ Hardware offline / Write failed');
      }
    } catch {
      setDurationSyncStatus('❌ Write error');
    } finally {
      setIsWritingDuration(false);
    }
  };

  const [customerErrors, setCustomerErrors] = useState<ValidationErrors<CustomerDetails>>({});
  const [equipmentErrors, setEquipmentErrors] = useState<ValidationErrors<EquipmentDetails>>({});
  const [specErrors, setSpecErrors] = useState<ValidationErrors<TestSpecification>>({});
  const [objectErrors, setObjectErrors] = useState<ValidationErrors<TestObjectDetails>>({});

  // 1. Customer Rules
  const customerRules: Record<keyof CustomerDetails, ValidationRule> = {
    customerName: { field: 'customerName', label: 'Customer Name', required: true, minLength: 2 },
    projectName: { field: 'projectName', label: 'Project Name', required: true, minLength: 2 },
    address: { field: 'address', label: 'Address', required: true },
    poNumber: { field: 'poNumber', label: 'PO Number', required: true },
    serialNumber: { field: 'serialNumber', label: 'Customer Serial No', required: true },
  };

  // 2. Equipment Rules
  const equipmentRules: Record<keyof EquipmentDetails, ValidationRule> = {
    equipmentName: { field: 'equipmentName', label: 'Equipment Name', required: true },
    model: { field: 'model', label: 'Model', required: true },
    make: { field: 'make', label: 'Make / Manufacturer', required: true },
    serialNumber: { field: 'serialNumber', label: 'Equipment Serial Number', required: true },
    calibrationDueDate: { field: 'calibrationDueDate', label: 'Calibration Due Date', required: true, isDate: true },
  };

  // 3. Specification Rules: testCurrent, testDurationHours, sensorCount, logIntervalMinutes
  const specRules: Record<keyof TestSpecification, ValidationRule> = {
    testCurrent: { field: 'testCurrent', label: 'Test Current (A)', required: true, numeric: true, positiveOnly: true },
    testDurationHours: {
      field: 'testDurationHours',
      label: 'Test Duration (Hours)',
      required: true,
      numeric: true,
      min: 1,
      max: 24,
      customValidation: (val) => {
        const num = Number(val);
        if (isNaN(num) || num < 1 || num > 24) {
          return 'Test duration must be between 1 and 24 hours.';
        }
        return null;
      },
    },
    sensorCount: {
      field: 'sensorCount',
      label: 'No. of Sensors (1 - 48)',
      required: true,
      numeric: true,
      integerOnly: true,
      min: 1,
      max: 48,
      customValidation: (val) => {
        const num = Number(val);
        if (isNaN(num) || num < 1 || num > 48 || !Number.isInteger(num)) {
          return 'No. of sensors must be an integer between 1 and 48.';
        }
        return null;
      },
    },
    logIntervalMinutes: {
      field: 'logIntervalMinutes',
      label: 'Data Logging Interval (Minutes)',
      required: true,
      numeric: true,
      min: 0.1,
      max: 1440,
      customValidation: (val) => {
        const num = Number(val);
        if (isNaN(num) || num <= 0) {
          return 'Logging interval must be greater than 0 minutes.';
        }
        return null;
      },
    },
    ratedVoltage: { field: 'ratedVoltage', label: 'Rated Voltage' },
    ratedCurrent: { field: 'ratedCurrent', label: 'Rated Current' },
    ambientTemp: { field: 'ambientTemp', label: 'Ambient Temperature' },
    limitTempRise: { field: 'limitTempRise', label: 'Limit Temp Rise' },
  };

  // 4. Test Object Rules
  const objectRules: Record<keyof TestObjectDetails, ValidationRule> = {
    description: { field: 'description', label: 'Object Description', required: true },
    serialNumber: { field: 'serialNumber', label: 'Sample Serial Number', required: true },
    sampleQuantity: { field: 'sampleQuantity', label: 'Sample Quantity', required: true, numeric: true, integerOnly: true, positiveOnly: true },
  };

  const handleNext = () => {
    if (wizardStep === 1) {
      const { isValid, errors } = validateFormGroup(draftConfig.customer, customerRules);
      setCustomerErrors(errors);
      if (!isValid) return;
    } else if (wizardStep === 2) {
      const { isValid, errors } = validateFormGroup(draftConfig.equipment, equipmentRules);
      setEquipmentErrors(errors);
      if (!isValid) return;
    } else if (wizardStep === 3) {
      const { isValid, errors } = validateFormGroup(draftConfig.specification, specRules);
      setSpecErrors(errors);
      if (!isValid) return;
    } else if (wizardStep === 4) {
      const { isValid, errors } = validateFormGroup(draftConfig.testObject, objectRules);
      setObjectErrors(errors);
      if (!isValid) return;
    }

    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1);
    } else {
      // Proceed to Preview Screen
      setActiveTab('preview');
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      {/* POPUP: MODBUS TCP NOT CONNECTED GUARD */}
      {showDisconnectModal && !modbusStatus.connected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="ind-card"
            style={{
              width: '520px',
              maxWidth: '92vw',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              color: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '50%',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  flexShrink: 0,
                }}
              >
                <WifiOff size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#b45309' }}>
                  Hardware Controller Offline
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                  The application is currently <strong>not connected</strong> to the hardware controller. A live Ethernet connection is required to transmit test parameters, pulse start coils, and read real-time RTD temperature channels.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#1e40af',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Hardware Ethernet Status:</div>
              <div>
                Target Controller: <strong>Industrial Hardware Controller</strong> (Port 502, Unit ID: 1)
              </div>
              <div style={{ marginTop: '4px' }}>
                Please connect the Ethernet cable to the controller. The application will automatically detect and establish the connection.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => connectModbus()}
                style={{
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563eb',
                  borderColor: '#1d4ed8',
                  borderRadius: '6px',
                }}
              >
                <RotateCcw size={16} /> Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title & Action Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Configure New Temperature Rise Test
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Step-by-step form digitization workflow for test certification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearDraftConfig}
            title="Clear all fields to start with a fresh blank test configuration"
            style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={14} /> Clear Form (Blank)
          </button>
          {hasPreviousConfig && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const ok = restorePreviousConfig();
                if (ok) setCurrentSyncStatus('✓ Restored previous test parameters');
              }}
              title="Populate fields with values entered from your previous test"
              style={{
                fontSize: '12px',
                padding: '7px 14px',
                borderColor: '#93c5fd',
                color: '#1d4ed8',
                backgroundColor: '#eff6ff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <History size={14} /> Restore Previous Test
            </button>
          )}
        </div>
      </div>

      {/* Stepper Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '16px 24px',
          marginBottom: '24px',
        }}
      >
        {[
          { step: 1, title: '1. Customer Details', icon: User },
          { step: 2, title: '2. Equipment Details', icon: Settings },
          { step: 3, title: '3. Test Specification', icon: Sliders },
          { step: 4, title: '4. Test Object Details', icon: Box },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = wizardStep === item.step;
          const isDone = wizardStep > item.step;

          return (
            <div
              key={item.step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: isActive ? '#2563eb' : isDone ? '#16a34a' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#2563eb' : isDone ? '#dcfce7' : '#e2e8f0',
                  color: isActive ? '#ffffff' : isDone ? '#16a34a' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
              </div>
              <span>{item.title}</span>
            </div>
          );
        })}
      </div>

      {/* Form Content Body */}
      <div
        className="ind-card"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}
      >
        {/* STEP 1: CUSTOMER DETAILS */}
        {wizardStep === 1 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#3b82f6' }}>
              Customer Details
            </h3>

            <div className="form-group">
              <label className="form-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${customerErrors.customerName ? 'invalid' : ''}`}
                value={draftConfig.customer.customerName}
                onChange={(e) => updateDraftConfig('customer', { customerName: e.target.value })}
                placeholder="e.g. Symatic Industrial Automation Ltd"
              />
              {customerErrors.customerName && (
                <div className="form-error-msg">{customerErrors.customerName}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Project Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${customerErrors.projectName ? 'invalid' : ''}`}
                value={draftConfig.customer.projectName}
                onChange={(e) => updateDraftConfig('customer', { projectName: e.target.value })}
                placeholder="e.g. Substation Transformer Feeder Panel"
              />
              {customerErrors.projectName && (
                <div className="form-error-msg">{customerErrors.projectName}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Site Address <span className="required">*</span>
              </label>
              <textarea
                rows={2}
                className={`form-input ${customerErrors.address ? 'invalid' : ''}`}
                value={draftConfig.customer.address}
                onChange={(e) => updateDraftConfig('customer', { address: e.target.value })}
                placeholder="Enter complete facility address"
              />
              {customerErrors.address && (
                <div className="form-error-msg">{customerErrors.address}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  PO Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${customerErrors.poNumber ? 'invalid' : ''}`}
                  value={draftConfig.customer.poNumber}
                  onChange={(e) => updateDraftConfig('customer', { poNumber: e.target.value })}
                  placeholder="e.g. PO-2026-8891"
                />
                {customerErrors.poNumber && (
                  <div className="form-error-msg">{customerErrors.poNumber}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Customer Serial Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${customerErrors.serialNumber ? 'invalid' : ''}`}
                  value={draftConfig.customer.serialNumber}
                  onChange={(e) => updateDraftConfig('customer', { serialNumber: e.target.value })}
                  placeholder="e.g. CUST-SN-9941"
                />
                {customerErrors.serialNumber && (
                  <div className="form-error-msg">{customerErrors.serialNumber}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EQUIPMENT DETAILS */}
        {wizardStep === 2 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#3b82f6' }}>
              Equipment Details
            </h3>

            <div className="form-group">
              <label className="form-label">
                Equipment Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                readOnly
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#0f172a', fontWeight: 700 }}
                value="Temperature Rise Tester"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Model <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${equipmentErrors.model ? 'invalid' : ''}`}
                  value={draftConfig.equipment.model}
                  onChange={(e) => updateDraftConfig('equipment', { model: e.target.value })}
                  placeholder="e.g. VCB-33-2000A"
                />
                {equipmentErrors.model && (
                  <div className="form-error-msg">{equipmentErrors.model}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Make / Manufacturer <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${equipmentErrors.make ? 'invalid' : ''}`}
                  value={draftConfig.equipment.make}
                  onChange={(e) => updateDraftConfig('equipment', { make: e.target.value })}
                  placeholder="e.g. Symatic Engineering"
                />
                {equipmentErrors.make && (
                  <div className="form-error-msg">{equipmentErrors.make}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Equipment Serial Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${equipmentErrors.serialNumber ? 'invalid' : ''}`}
                  value={draftConfig.equipment.serialNumber}
                  onChange={(e) => updateDraftConfig('equipment', { serialNumber: e.target.value })}
                  placeholder="e.g. EQ-2026-VCB-004"
                />
                {equipmentErrors.serialNumber && (
                  <div className="form-error-msg">{equipmentErrors.serialNumber}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Calibration Due Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${equipmentErrors.calibrationDueDate ? 'invalid' : ''}`}
                  value={draftConfig.equipment.calibrationDueDate}
                  onChange={(e) => updateDraftConfig('equipment', { calibrationDueDate: e.target.value })}
                />
                {equipmentErrors.calibrationDueDate && (
                  <div className="form-error-msg">{equipmentErrors.calibrationDueDate}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TEST SPECIFICATION */}
        {wizardStep === 3 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#3b82f6' }}>
              Test Specification &amp; Operating Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Rated Voltage (V)
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.ratedVoltage ? 'invalid' : ''}`}
                  value={draftConfig.specification.ratedVoltage ?? ''}
                  onChange={(e) => updateDraftConfig('specification', { ratedVoltage: e.target.value })}
                  placeholder="e.g. 415"
                />
                {specErrors.ratedVoltage && (
                  <div className="form-error-msg">{specErrors.ratedVoltage}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Rated Current (A)
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.ratedCurrent ? 'invalid' : ''}`}
                  value={draftConfig.specification.ratedCurrent ?? ''}
                  onChange={(e) => updateDraftConfig('specification', { ratedCurrent: e.target.value })}
                  placeholder="e.g. 2500"
                />
                {specErrors.ratedCurrent && (
                  <div className="form-error-msg">{specErrors.ratedCurrent}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Test Current (A) <span className="required">*</span>
                  </label>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      color: '#34d399',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '2px 7px',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    SET CURRENT [R/W]
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    type="number"
                    className={`form-input ${specErrors.testCurrent ? 'invalid' : ''}`}
                    style={{ flex: 1 }}
                    value={draftConfig.specification.testCurrent}
                    onChange={(e) => updateDraftConfig('specification', { testCurrent: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleWriteCurrent();
                      }
                    }}
                    placeholder="e.g. 2000"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleWriteCurrent}
                    disabled={isWritingCurrent}
                    title="Click or press Enter to write value to hardware"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      borderColor: '#1d4ed8',
                      cursor: isWritingCurrent ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <CornerDownLeft size={16} />
                    <span>ENTER ↵</span>
                  </button>
                </div>
                {specErrors.testCurrent && (
                  <div className="form-error-msg">{specErrors.testCurrent}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Click <strong>Enter ↵</strong> or press Enter key to write value to hardware.
                  </span>
                  {currentSyncStatus && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: currentSyncStatus.includes('✓') ? '#16a34a' : currentSyncStatus.includes('⚠️') ? '#d97706' : '#dc2626',
                        fontWeight: 700,
                      }}
                    >
                      {currentSyncStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Test Duration (Hours) <span className="required">*</span>
                  </label>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      color: '#34d399',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '2px 7px',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    SET TIMER [R/W]
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    className={`form-input ${specErrors.testDurationHours ? 'invalid' : ''}`}
                    style={{ flex: 1 }}
                    value={draftConfig.specification.testDurationHours}
                    onChange={(e) => updateDraftConfig('specification', { testDurationHours: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleWriteDuration();
                      }
                    }}
                    placeholder="e.g. 2"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleWriteDuration}
                    disabled={isWritingDuration}
                    title="Click or press Enter to write value to hardware"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      borderColor: '#1d4ed8',
                      cursor: isWritingDuration ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <CornerDownLeft size={16} />
                    <span>ENTER ↵</span>
                  </button>
                </div>
                {specErrors.testDurationHours && (
                  <div className="form-error-msg">{specErrors.testDurationHours}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Click <strong>Enter ↵</strong> or press Enter key to write value to hardware.
                  </span>
                  {durationSyncStatus && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: durationSyncStatus.includes('✓') ? '#16a34a' : durationSyncStatus.includes('⚠️') ? '#d97706' : '#dc2626',
                        fontWeight: 700,
                      }}
                    >
                      {durationSyncStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
              <div className="form-group">
                <label className="form-label">
                  No. of Sensors (1 - 48) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  className={`form-input ${specErrors.sensorCount ? 'invalid' : ''}`}
                  value={draftConfig.specification.sensorCount}
                  onChange={(e) => updateDraftConfig('specification', { sensorCount: e.target.value })}
                  placeholder="e.g. 48"
                />
                {specErrors.sensorCount && (
                  <div className="form-error-msg">{specErrors.sensorCount}</div>
                )}
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Active sensor channels. Entering 5 shows only TEMP_1..TEMP_5 on dashboard & report logs.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Data Logging Interval (Minutes) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="1"
                  className={`form-input ${specErrors.logIntervalMinutes ? 'invalid' : ''}`}
                  value={draftConfig.specification.logIntervalMinutes}
                  onChange={(e) => updateDraftConfig('specification', { logIntervalMinutes: e.target.value })}
                  placeholder="e.g. 5"
                />
                {specErrors.logIntervalMinutes && (
                  <div className="form-error-msg">{specErrors.logIntervalMinutes}</div>
                )}
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Periodic interval to record data points into database for reports (e.g. 5 mins). Realtime hardware polling runs at 500ms.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TEST OBJECT DETAILS */}
        {wizardStep === 4 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#3b82f6' }}>
              Test Object Details
            </h3>

            <div className="form-group">
              <label className="form-label">
                Description / Component Tested <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${objectErrors.description ? 'invalid' : ''}`}
                value={draftConfig.testObject.description}
                onChange={(e) => updateDraftConfig('testObject', { description: e.target.value })}
                placeholder="e.g. Copper Main Busbar Junction & Contacts Assembly"
              />
              {objectErrors.description && (
                <div className="form-error-msg">{objectErrors.description}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Sample Serial Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${objectErrors.serialNumber ? 'invalid' : ''}`}
                  value={draftConfig.testObject.serialNumber}
                  onChange={(e) => updateDraftConfig('testObject', { serialNumber: e.target.value })}
                  placeholder="e.g. TO-BUSBAR-33KV-01"
                />
                {objectErrors.serialNumber && (
                  <div className="form-error-msg">{objectErrors.serialNumber}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Sample Quantity (Positive Integer) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className={`form-input ${objectErrors.sampleQuantity ? 'invalid' : ''}`}
                  value={draftConfig.testObject.sampleQuantity}
                  onChange={(e) => updateDraftConfig('testObject', { sampleQuantity: e.target.value })}
                />
                {objectErrors.sampleQuantity && (
                  <div className="form-error-msg">{objectErrors.sampleQuantity}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {wizardStep > 1 ? (
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          <button className="btn btn-primary" onClick={handleNext}>
            {wizardStep === 4 ? 'Proceed to Preview' : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
