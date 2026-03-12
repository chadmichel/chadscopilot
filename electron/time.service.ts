import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseService } from './database.service.js';
import { CalendarService } from './calendar.service.js';

const execAsync = promisify(exec);

export class TimeService {
    private intervalId: NodeJS.Timeout | null = null;
    private isTracking = false;

    constructor(
        private dbService: DatabaseService,
        private calendarService: CalendarService
    ) { }

    startTracking() {
        if (this.isTracking) return;
        this.isTracking = true;
        console.log('[TimeService] Starting background tracking (every 5 minutes)');

        // Initial check: Sync with Microsoft Graph first, then process local logs
        this.calendarService.syncAllAccounts().then(() => {
            return this.syncMeetingsToLogs().then(() => this.trackNow());
        });

        this.intervalId = setInterval(() => {
            this.calendarService.syncAllAccounts().then(() => {
                return this.syncMeetingsToLogs().then(() => this.trackNow());
            });
        }, 5 * 60 * 1000); // 5 minutes
    }

    stopTracking() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isTracking = false;
    }

    async trackNow() {
        try {
            const now = new Date();
            const roundedTime = new Date(now);
            roundedTime.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
            roundedTime.setSeconds(0);
            roundedTime.setMilliseconds(0);

            // Format for SQLite: YYYY-MM-DD HH:MM:SS
            const timestamp = roundedTime.toISOString().replace('T', ' ').split('.')[0];

            // Avoid double tracking if syncMeetingsToLogs just added this slot
            const todayStr = now.toISOString().split('T')[0];
            const logsToday = this.dbService.getTimeLogs(todayStr);
            if (logsToday.some(l => l.timestamp === timestamp)) {
                return;
            }

            let { appName, folderPath, windowTitle } = await this.getCurrentActivity();

            // Auto pull in meetings: Check if any meeting is active now
            const events = this.calendarService.getAllEvents() as any[];
            const activeMeeting = events.find(e => {
                const start = new Date(e.start);
                const end = new Date(e.end);
                return now >= start && now < end;
            });

            if (activeMeeting) {
                appName = 'Meeting';
                windowTitle = (activeMeeting.subject as string) || 'Active Meeting';
                // Location or body could go here if needed
            }

            // Attempt to find matching workspace
            const workspaces = this.dbService.getAllWorkspaces();
            let workspaceId = '';

            if (folderPath) {
                const match = workspaces.find(w =>
                    folderPath.toLowerCase().startsWith(w.folderPath.toLowerCase())
                );
                if (match) {
                    workspaceId = match.id;
                }
            }

            // Fuzzy match for VS Code (which usually has workspace name in window title)
            if (!workspaceId && windowTitle) {
                const match = workspaces.find(w =>
                    windowTitle.toLowerCase().includes(w.name.toLowerCase())
                );
                if (match) {
                    workspaceId = match.id;
                }
            }

            this.dbService.addTimeLog(appName, windowTitle, folderPath, workspaceId, timestamp);
            console.log(`[TimeService] Tracked activity at ${timestamp}: ${appName} (Workspace: ${workspaceId || 'None'})`);
        } catch (err) {
            console.error('[TimeService] Error tracking activity:', err);
        }
    }

    async syncMeetingsToLogs() {
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const events = this.calendarService.getAllEvents() as any[];
            const todayEvents = events.filter(e => {
                const startStr = (e.start as string) || '';
                return startStr.startsWith(todayStr);
            });

            const existingLogs = this.dbService.getTimeLogs(todayStr);
            const existingTimestamps = new Set(existingLogs.map(l => l.timestamp));

            for (const event of todayEvents) {
                const start = new Date(event.start);
                const end = new Date(event.end);

                // Set start to the beginning of the 5-minute block
                const tick = new Date(start);
                tick.setMinutes(Math.floor(tick.getMinutes() / 5) * 5);
                tick.setSeconds(0);
                tick.setMilliseconds(0);

                while (tick < end && tick < now) {
                    const ts = tick.toISOString().replace('T', ' ').split('.')[0];
                    if (!existingTimestamps.has(ts)) {
                        this.dbService.addTimeLog('Meeting', event.subject || 'Meeting', '', '', ts);
                        existingTimestamps.add(ts);
                        console.log(`[TimeService] Backfilled meeting slot: ${ts} - ${event.subject}`);
                    }
                    tick.setMinutes(tick.getMinutes() + 5);
                }
            }
        } catch (err) {
            console.error('[TimeService] Error syncing meetings:', err);
        }
    }

    private async getCurrentActivity(): Promise<{ appName: string, folderPath: string, windowTitle: string }> {
        const script = `
      tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appName to name of frontApp
          set windowTitle to ""
          try
              set windowTitle to name of front window of frontApp
          end try
      end tell

      set appPath to ""

      if appName is "Terminal" then
          try
              tell application "Terminal"
                  set currentTab to selected tab of front window
                  set appPath to POSIX path of (folder of currentTab as alias)
              end tell
          end try
      else if appName is "iTerm2" or appName is "iTerm" then
          try
              tell application "iTerm2"
                  tell current session of current window
                      set appPath to (get value of variable "session.path")
                  end tell
              end tell
          on error
              try
                  tell application "iTerm"
                      tell current session of current window
                          set appPath to path
                      end tell
                  end tell
              end try
          end try
      else if appName is "Finder" then
          try
              tell application "Finder"
                  set appPath to POSIX path of (target of front window as alias)
              end tell
          end try
      else if appName is "Safari" then
          try
              tell application "Safari"
                  set windowTitle to name of current tab of front window
                  set appPath to URL of current tab of front window
              end tell
          end try
      else if appName is "Google Chrome" or appName is "Brave Browser" or appName is "Microsoft Edge" then
          try
              tell application appName
                  set windowTitle to title of active tab of front window
                  set appPath to URL of active tab of front window
              end tell
          end try
      else if appName is "Code" or appName is "Visual Studio Code" then
          try
              tell application "System Events"
                  tell process appName
                      set windowTitle to name of front window
                  end tell
              end tell
          end try
      else
          -- Try generic document path
          try
              tell application appName
                  set appPath to POSIX path of (file of front document as alias)
              end tell
          on error
              -- Try just front document if file fails
              try
                  tell application appName
                      set appPath to POSIX path of (front document as alias)
                  end tell
              end try
          end try
      end if

      return appName & "|||" & appPath & "|||" & windowTitle
    `;

        try {
            const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
            const [appName, folderPath, windowTitle] = stdout.trim().split('|||');
            return {
                appName: appName || 'Unknown',
                folderPath: folderPath || '',
                windowTitle: windowTitle || ''
            };
        } catch (err) {
            return { appName: 'Unknown', folderPath: '', windowTitle: '' };
        }
    }
}
