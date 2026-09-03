import React from 'react';
import { TestProvider, useTestContext } from './context/TestContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { NavGuardModal } from './components/layout/NavGuardModal';

import { LiveDashboard } from './components/dashboard/LiveDashboard';
import { NewTestWizard } from './components/wizard/NewTestWizard';
import { TestPreview } from './components/wizard/TestPreview';
import { AlarmModal } from './components/alarms/AlarmModal';
import { FinalResultsView } from './components/results/FinalResultsView';
import { TestHistoryView } from './components/history/TestHistoryView';
import { AlarmCenterView } from './components/alarms/AlarmCenterView';
import { SettingsView } from './components/settings/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab } = useTestContext();

  return (
    <main style={{ flex: 1, backgroundColor: 'var(--bg-main)', overflow: 'hidden', position: 'relative' }}>
      {activeTab === 'dashboard' && <LiveDashboard />}
      {activeTab === 'new-test' && <NewTestWizard />}
      {activeTab === 'preview' && <TestPreview />}
      {activeTab === 'results' && <FinalResultsView />}
      {activeTab === 'history' && <TestHistoryView />}
      {activeTab === 'alarms' && <AlarmCenterView />}
      {activeTab === 'settings' && <SettingsView />}

      {/* Global Overlays */}
      <AlarmModal />
      <NavGuardModal />
    </main>
  );
};

export const App: React.FC = () => {
  return (
    <TestProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </TestProvider>
  );
};

export default App;
