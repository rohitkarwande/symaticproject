import type { IDatabaseProvider } from './IDatabaseProvider';
import { ElectronDatabaseProvider } from './ElectronDatabaseProvider';
import { WebDatabaseProvider } from './WebDatabaseProvider';

class DatabaseServiceFactory {
  private activeProvider: IDatabaseProvider;

  constructor() {
    if (typeof window !== 'undefined' && window.electronAPI?.db) {
      console.log('[DatabaseService] Connected to Electron SQLite IPC provider.');
      this.activeProvider = new ElectronDatabaseProvider();
    } else {
      console.log('[DatabaseService] Connected to Web LocalStorage fallback provider.');
      this.activeProvider = new WebDatabaseProvider();
    }
  }

  public getProvider(): IDatabaseProvider {
    return this.activeProvider;
  }
}

export const dbServiceSingleton = new DatabaseServiceFactory();
export const getDatabaseProvider = () => dbServiceSingleton.getProvider();
