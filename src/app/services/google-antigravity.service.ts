import { Injectable } from '@angular/core';

export interface EditorInstallation {
  found: boolean;
  path: string;
  cli: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAntigravityService {
  private get electron() {
    return (window as any).electronAPI;
  }

  async findInstallation(): Promise<EditorInstallation> {
    if (this.electron?.antigravityFindInstallation) {
      return await this.electron.antigravityFindInstallation();
    }
    return { found: false, path: '', cli: '' };
  }

  async open(folderPath: string, cliPath?: string): Promise<boolean> {
    if (this.electron?.antigravityOpen) {
      return await this.electron.antigravityOpen(folderPath, cliPath);
    }
    return false;
  }
}
