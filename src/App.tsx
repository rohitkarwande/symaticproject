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
    <main className="app-main-content">
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
      <div className="app-layout-root">
        <Header />
        <div className="app-layout-body">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </TestProvider>
  );
};

export default App;
