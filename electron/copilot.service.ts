import { CopilotClient } from '@github/copilot-sdk';
import type { SessionConfig } from '@github/copilot-sdk';

export interface MessageCallbacks {
  onDelta: (delta: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface SessionEntry {
  session: any;
  callbacks: MessageCallbacks | null;
}

/**
 * Build provider config from environment variables.
 *
 * Supported env vars:
 *   COPILOT_PROVIDER       - "openai" | "anthropic" | "azure"  (default: "openai")
 *   COPILOT_API_KEY        - API key for the provider
 *   COPILOT_BASE_URL       - API base URL (default depends on provider)
 *   COPILOT_MODEL          - Model to use (default: "gpt-4.1")
 */
function buildSessionConfig(workingDirectory?: string): SessionConfig {
  const apiKey = process.env['COPILOT_API_KEY'];
  const model = process.env['COPILOT_MODEL'] || 'gpt-4.1';

  const config: SessionConfig = {
    model,
    streaming: true,
  };

  if (workingDirectory) {
    config.workingDirectory = workingDirectory;
  }

  if (apiKey) {
    const providerType =
      (process.env['COPILOT_PROVIDER'] as 'openai' | 'anthropic' | 'azure') ||
      'openai';

    const defaultBaseUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com',
      azure: '', // must be provided via env var
    };

    const baseUrl =
      process.env['COPILOT_BASE_URL'] || defaultBaseUrls[providerType] || '';

    config.provider = {
      type: providerType,
      baseUrl,
      apiKey,
    };

    console.log(
      `Using BYOK provider: ${providerType}, model: ${model}${workingDirectory ? `, workingDirectory: ${workingDirectory}` : ''}`
    );
  } else {
    console.log(
      `No COPILOT_API_KEY set — using GitHub Copilot auth, model: ${model}`
    );
  }

  return config;
}

export class CopilotService {
  private client: CopilotClient | null = null;
  private sessions: Map<string, SessionEntry> = new Map();

  async initialize(): Promise<void> {
    this.client = new CopilotClient();
  }

  private async getOrCreateSession(workspaceId: string, folderPath?: string): Promise<SessionEntry> {
    const existing = this.sessions.get(workspaceId);
    if (existing) return existing;

    if (!this.client) {
      throw new Error('CopilotClient not initialized');
    }

    const workingDirectory = folderPath || undefined;
    const session = await this.client.createSession(buildSessionConfig(workingDirectory));

    const entry: SessionEntry = { session, callbacks: null };

    session.on((event: any) => {
      if (!entry.callbacks) return;
      if (event.type === 'assistant.message_delta') {
        entry.callbacks.onDelta(event.data.deltaContent);
      }
    });

    this.sessions.set(workspaceId, entry);
    return entry;
  }

  async sendMessage(
    workspaceId: string,
    message: string,
    folderPath: string | undefined,
    callbacks: MessageCallbacks
  ): Promise<void> {
    let entry: SessionEntry;
    try {
      entry = await this.getOrCreateSession(workspaceId, folderPath);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      callbacks.onError(errorMessage);
      return;
    }

    entry.callbacks = callbacks;

    try {
      await entry.session.sendAndWait({ prompt: message });
      callbacks.onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      callbacks.onError(errorMessage);
    } finally {
      entry.callbacks = null;
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
      this.sessions.clear();
    }
  }
}
