import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';

const MACOS_PATHS = [
  '/Applications/Visual Studio Code.app',
  '/Applications/Visual Studio Code - Insiders.app',
  `${process.env['HOME']}/Applications/Visual Studio Code.app`,
];

const CLI_NAMES = ['code', 'code-insiders'];

export class VsCodeService {
  findInstallation(): { found: boolean; path: string; cli: string } {
    // Check macOS .app bundles
    for (const appPath of MACOS_PATHS) {
      if (fs.existsSync(appPath)) {
        const cli = this.findCli();
        return { found: true, path: appPath, cli };
      }
    }

    // Check CLI in PATH
    const cli = this.findCli();
    if (cli) {
      return { found: true, path: '', cli };
    }

    return { found: false, path: '', cli: '' };
  }

  private findCli(): string {
    for (const name of CLI_NAMES) {
      try {
        const result = execSync(`which ${name}`, { encoding: 'utf8' }).trim();
        if (result) return result;
      } catch { /* not found */ }
    }
    return '';
  }

  open(folderPath: string, cliPath?: string): boolean {
    const cli = cliPath || this.findCli();

    if (cli) {
      if (process.platform === 'darwin' && cli.endsWith('.app')) {
        spawn('open', ['-a', cli, folderPath], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn(cli, [folderPath], { detached: true, stdio: 'ignore' }).unref();
      }
      return true;
    }

    // Fallback: use macOS open command
    for (const appPath of MACOS_PATHS) {
      if (fs.existsSync(appPath)) {
        spawn('open', ['-a', appPath, folderPath], { detached: true, stdio: 'ignore' }).unref();
        return true;
      }
    }

    return false;
  }
}
