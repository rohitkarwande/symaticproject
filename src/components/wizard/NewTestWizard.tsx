import React, { useState } from 'react';
import {
  User,
  Sliders,
  Settings,
  Box,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
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
    writeTestSpecificationToModbus,
  } = useTestContext();

  // Real-time Auto-Sync test specification parameters to ModSim32 (Address 201+)
  useEffect(() => {
    const v = Number(draftConfig.specification.ratedVoltage);
    const r = Number(draftConfig.specification.ratedCurrent);
    const t = Number(draftConfig.specification.testCurrent);

    if (isNaN(v) || isNaN(r) || isNaN(t) || v <= 0) return;

    const timer = setTimeout(() => {
      writeTestSpecificationToModbus(
        { ratedVoltage: v, ratedCurrent: r, testCurrent: t },
        201,
        'float',
        false
      );
    }, 200);

    return () => clearTimeout(timer);
  }, [
    draftConfig.specification.ratedVoltage,
    draftConfig.specification.ratedCurrent,
    draftConfig.specification.testCurrent,
  ]);

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

  // 3. Specification Rules (Crucial Duration 1-24 validation)
  const specRules: Record<keyof TestSpecification, ValidationRule> = {
    ratedVoltage: { field: 'ratedVoltage', label: 'Rated Voltage (V)', required: true, numeric: true, positiveOnly: true },
    ratedCurrent: { field: 'ratedCurrent', label: 'Rated Current (A)', required: true, numeric: true, positiveOnly: true },
    testCurrent: { field: 'testCurrent', label: 'Test Current (A)', required: true, numeric: true, positiveOnly: true },
    ambientTemp: { field: 'ambientTemp', label: 'Ambient Temperature (°C)', required: true, numeric: true, min: 0, max: 60 },
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
    limitTempRise: { field: 'limitTempRise', label: 'Acceptance Limit Temp Rise (°C)', required: true, numeric: true, min: 10, max: 150 },
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
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
          Configure New Temperature Rise Test
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Step-by-step form digitization workflow for Symatic Engineering test certification.
        </p>
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
                color: isActive ? '#3b82f6' : isDone ? '#10b981' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#2563eb' : isDone ? '#064e3b' : '#334155',
                  color: isActive ? '#ffffff' : isDone ? '#10b981' : '#94a3b8',
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
                className={`form-input ${equipmentErrors.equipmentName ? 'invalid' : ''}`}
                value={draftConfig.equipment.equipmentName}
                onChange={(e) => updateDraftConfig('equipment', { equipmentName: e.target.value })}
                placeholder="e.g. 33kV Vacuum Circuit Breaker Panel"
              />
              {equipmentErrors.equipmentName && (
                <div className="form-error-msg">{equipmentErrors.equipmentName}</div>
              )}
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
              Test Specification & Operating Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Rated Voltage (V) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.ratedVoltage ? 'invalid' : ''}`}
                  value={draftConfig.specification.ratedVoltage}
                  onChange={(e) => updateDraftConfig('specification', { ratedVoltage: e.target.value })}
                />
                {specErrors.ratedVoltage && (
                  <div className="form-error-msg">{specErrors.ratedVoltage}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Rated Current (A) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.ratedCurrent ? 'invalid' : ''}`}
                  value={draftConfig.specification.ratedCurrent}
                  onChange={(e) => updateDraftConfig('specification', { ratedCurrent: e.target.value })}
                />
                {specErrors.ratedCurrent && (
                  <div className="form-error-msg">{specErrors.ratedCurrent}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Test Current (A) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.testCurrent ? 'invalid' : ''}`}
                  value={draftConfig.specification.testCurrent}
                  onChange={(e) => updateDraftConfig('specification', { testCurrent: e.target.value })}
                />
                {specErrors.testCurrent && (
                  <div className="form-error-msg">{specErrors.testCurrent}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Ambient Temperature (°C) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  className={`form-input ${specErrors.ambientTemp ? 'invalid' : ''}`}
                  value={draftConfig.specification.ambientTemp}
                  onChange={(e) => updateDraftConfig('specification', { ambientTemp: e.target.value })}
                />
                {specErrors.ambientTemp && (
                  <div className="form-error-msg">{specErrors.ambientTemp}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Test Duration (Hours: 1 - 24) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  className={`form-input ${specErrors.testDurationHours ? 'invalid' : ''}`}
                  value={draftConfig.specification.testDurationHours}
                  onChange={(e) => updateDraftConfig('specification', { testDurationHours: e.target.value })}
                />
                {specErrors.testDurationHours && (
                  <div className="form-error-msg">{specErrors.testDurationHours}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Acceptance Limit Rise (°C) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${specErrors.limitTempRise ? 'invalid' : ''}`}
                  value={draftConfig.specification.limitTempRise}
                  onChange={(e) => updateDraftConfig('specification', { limitTempRise: e.target.value })}
                />
                {specErrors.limitTempRise && (
                  <div className="form-error-msg">{specErrors.limitTempRise}</div>
                )}
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
