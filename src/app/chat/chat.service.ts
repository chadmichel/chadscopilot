import { Injectable, NgZone } from '@angular/core';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    electronAPI?: {
      sendMessage: (message: string) => Promise<void>;
      onMessageDelta: (callback: (delta: string) => void) => void;
      onMessageComplete: (callback: () => void) => void;
      onError: (callback: (error: string) => void) => void;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  messages: ChatMessage[] = [];
  isStreaming = false;

  private get electron() {
    return window.electronAPI;
  }

  constructor(private ngZone: NgZone) {
    this.setupElectronListeners();
  }

  private setupElectronListeners(): void {
    if (!this.electron) return;

    this.electron.onMessageDelta((delta: string) => {
      this.ngZone.run(() => {
        this.isStreaming = true;
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += delta;
        } else {
          this.messages.push({ role: 'assistant', content: delta });
        }
      });
    });

    this.electron.onMessageComplete(() => {
      this.ngZone.run(() => {
        this.isStreaming = false;
      });
    });

    this.electron.onError((error: string) => {
      this.ngZone.run(() => {
        this.isStreaming = false;
        this.messages.push({
          role: 'assistant',
          content: `Error: ${error}`,
        });
      });
    });
  }

  async sendMessage(content: string): Promise<void> {
    this.messages.push({ role: 'user', content });

    if (this.electron) {
      await this.electron.sendMessage(content);
    } else {
      // Browser-only fallback for development without Electron
      this.messages.push({
        role: 'assistant',
        content:
          'Running in browser mode. The Copilot SDK requires Electron. Use `npm start` to launch with Electron.',
      });
    }
  }
}
