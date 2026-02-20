import { Injectable, NgZone } from '@angular/core';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    electronAPI?: {
      sendMessage: (projectId: string, message: string, folderPath?: string) => Promise<void>;
      onMessageDelta: (callback: (projectId: string, delta: string) => void) => void;
      onMessageComplete: (callback: (projectId: string) => void) => void;
      onError: (callback: (projectId: string, error: string) => void) => void;
      selectDirectory: () => Promise<string | null>;
      getProjects: () => Promise<any[]>;
      addProject: (id: string, name: string, folderPath: string) => Promise<any>;
      removeProject: (id: string) => Promise<void>;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private messagesMap = new Map<string, ChatMessage[]>();
  private streamingMap = new Map<string, boolean>();

  private get electron() {
    return window.electronAPI;
  }

  constructor(private ngZone: NgZone) {
    this.setupElectronListeners();
  }

  getMessages(projectId: string = 'global'): ChatMessage[] {
    let messages = this.messagesMap.get(projectId);
    if (!messages) {
      messages = [];
      this.messagesMap.set(projectId, messages);
    }
    return messages;
  }

  getIsStreaming(projectId: string = 'global'): boolean {
    return this.streamingMap.get(projectId) ?? false;
  }

  private setupElectronListeners(): void {
    if (!this.electron) return;

    this.electron.onMessageDelta((projectId: string, delta: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(projectId, true);
        const messages = this.getMessages(projectId);
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += delta;
        } else {
          messages.push({ role: 'assistant', content: delta });
        }
      });
    });

    this.electron.onMessageComplete((projectId: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(projectId, false);
      });
    });

    this.electron.onError((projectId: string, error: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(projectId, false);
        const messages = this.getMessages(projectId);
        messages.push({
          role: 'assistant',
          content: `Error: ${error}`,
        });
      });
    });
  }

  async sendMessage(content: string, projectId: string = 'global', folderPath?: string): Promise<void> {
    const messages = this.getMessages(projectId);
    messages.push({ role: 'user', content });

    if (this.electron) {
      await this.electron.sendMessage(projectId, content, folderPath);
    } else {
      // Browser-only fallback for development without Electron
      messages.push({
        role: 'assistant',
        content:
          'Running in browser mode. The Copilot SDK requires Electron. Use `npm start` to launch with Electron.',
      });
    }
  }
}
