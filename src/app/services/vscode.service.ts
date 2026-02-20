import { Injectable } from '@angular/core';

export interface EditorInstallation {
  found: boolean;
  path: string;
  cli: string;
}

@Injectable({
  providedIn: 'root',
})
export class VsCodeService {
  private get electron() {
    return (window as any).electronAPI;
  }

  async findInstallation(): Promise<EditorInstallation> {
    if (this.electron?.vscodeFindInstallation) {
      return await this.electron.vscodeFindInstallation();
    }
    return { found: false, path: '', cli: '' };
  }

  async open(folderPath: string, cliPath?: string): Promise<boolean> {
    if (this.electron?.vscodeOpen) {
      return await this.electron.vscodeOpen(folderPath, cliPath);
    }
    return false;
  }
}
