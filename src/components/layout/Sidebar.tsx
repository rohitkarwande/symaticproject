import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  History,
  AlertTriangle,
  Settings,
  Activity,
  FileCheck,
} from 'lucide-react';
import { useTestContext } from '../../context/TestContext';
import type { ActiveTab } from '../../context/TestContext';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-test', label: 'New Test', icon: FilePlus },
  { id: 'history', label: 'Test History', icon: History },
  { id: 'alarms', label: 'Alarms Log', icon: AlertTriangle },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activeTab, navigateWithGuard, isTestActive, lastResults, modbusStatus } = useTestContext();

  return (
    <aside
      style={{
        width: '220px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #bfdbfe',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 0',
        boxShadow: '1px 0 6px rgba(37, 99, 235, 0.04)',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => navigateWithGuard(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                color: isActive ? '#ffffff' : '#334155',
                fontWeight: isActive ? 700 : 600,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} color={isActive ? '#ffffff' : '#2563eb'} />
              {item.label}
            </button>
          );
        })}

        {/* Dynamic Final Results Nav item when available */}
        {lastResults && (
          <button
            onClick={() => navigateWithGuard('results')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid #86efac',
              backgroundColor: activeTab === 'results' ? '#2563eb' : '#ecfdf5',
              color: activeTab === 'results' ? '#ffffff' : '#15803d',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '12px',
            }}
          >
            <FileCheck size={18} color={activeTab === 'results' ? '#ffffff' : '#16a34a'} />
            Latest Results
          </button>
        )}
      </nav>

      {/* Footer Status Panel & Powered By */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '8px' }}>
        {/* HMI Status Card (Moved Above) */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '12px 14px',
            fontSize: '12px',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700 }}>
            <Activity size={15} color={modbusStatus.connected ? '#16a34a' : '#dc2626'} />
            {modbusStatus.connected ? 'HMI Online' : 'HMI Offline'}
          </div>
          <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', margin: 0 }}>
            {modbusStatus.connected
              ? `Modbus TCP: ${modbusStatus.ip}`
              : 'Modbus TCP Disconnected'}
          </p>
        </div>

        {/* Powered by Ajit Electronics (Below HMI Card) */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '8px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#64748b',
              fontWeight: 600,
              display: 'block',
            }}
          >
            Powered by
          </span>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: '#1e40af',
              letterSpacing: '0.4px',
              marginTop: '1px',
            }}
          >
            Ajit Electronics
          </div>
        </div>
      </div>
    </aside>
  );
};
