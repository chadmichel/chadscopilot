import { CopilotClient } from '@github/copilot-sdk';
import type { SessionConfig } from '@github/copilot-sdk';

export interface MessageCallbacks {
  onDelta: (delta: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
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
function buildSessionConfig(): SessionConfig {
  const apiKey = process.env['COPILOT_API_KEY'];
  const model = process.env['COPILOT_MODEL'] || 'gpt-4.1';

  const config: SessionConfig = {
    model,
    streaming: true,
  };

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
      `Using BYOK provider: ${providerType}, model: ${model}`
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
  private session: any = null;
  private currentCallbacks: MessageCallbacks | null = null;

  async initialize(): Promise<void> {
    this.client = new CopilotClient();
    this.session = await this.client.createSession(buildSessionConfig());

    this.session.on((event: any) => {
      if (!this.currentCallbacks) return;

      if (event.type === 'assistant.message_delta') {
        this.currentCallbacks.onDelta(event.data.deltaContent);
      }
    });
  }

  async sendMessage(
    message: string,
    callbacks: MessageCallbacks
  ): Promise<void> {
    if (!this.session) {
      callbacks.onError(
        'Copilot session not initialized. Check your API key or Copilot auth.'
      );
      return;
    }

    this.currentCallbacks = callbacks;

    try {
      await this.session.sendAndWait({ prompt: message });
      callbacks.onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      callbacks.onError(errorMessage);
    } finally {
      this.currentCallbacks = null;
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
      this.session = null;
    }
  }
}
