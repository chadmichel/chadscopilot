import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';

const MACOS_PATHS = [
    '/Applications/Rider.app',
    '/Applications/JetBrains Rider.app',
    `${process.env['HOME']}/Applications/Rider.app`,
    `${process.env['HOME']}/Applications/JetBrains Rider.app`,
    `${process.env['HOME']}/Applications/JetBrains Toolbox/Rider.app`,
];

const CLI_NAMES = ['rider'];

export class RiderService {
    findInstallation(): { found: boolean; path: string; cli: string } {
        for (const appPath of MACOS_PATHS) {
            if (fs.existsSync(appPath)) {
                const cli = this.findCli();
                return { found: true, path: appPath, cli };
            }
        }

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
            if (process.platform === 'darwin' && (cli.endsWith('.app') || cli.includes('.app/'))) {
                spawn('open', ['-a', cli, folderPath], { detached: true, stdio: 'ignore' }).unref();
            } else {
                spawn(cli, [folderPath], { detached: true, stdio: 'ignore' }).unref();
            }
            return true;
        }

        for (const appPath of MACOS_PATHS) {
            if (fs.existsSync(appPath)) {
                spawn('open', ['-a', appPath, folderPath], { detached: true, stdio: 'ignore' }).unref();
                return true;
            }
        }

        return false;
    }
}
