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
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 0',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
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
                borderRadius: '4px',
                border: 'none',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} color={isActive ? '#ffffff' : '#94a3b8'} />
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
              borderRadius: '4px',
              border: 'none',
              backgroundColor: activeTab === 'results' ? '#2563eb' : 'rgba(16, 185, 129, 0.1)',
              color: activeTab === 'results' ? '#ffffff' : '#10b981',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '12px',
            }}
          >
            <FileCheck size={18} />
            Latest Results
          </button>
        )}
      </nav>

      {/* Footer Status Panel */}
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontWeight: 600 }}>
            <Activity size={14} color={modbusStatus.connected ? '#10b981' : '#ef4444'} />
            {modbusStatus.connected ? 'HMI Online' : 'HMI Offline'}
          </div>
          <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', margin: 0 }}>
            {modbusStatus.connected
              ? `Modbus TCP Connected (${modbusStatus.ip})`
              : 'Modbus Ethernet Disconnected'}
          </p>
        </div>
      </div>
    </aside>
  );
};
