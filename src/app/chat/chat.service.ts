import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    electronAPI?: {
      sendMessage: (workspaceId: string, message: string, folderPath?: string) => Promise<void>;
      onMessageDelta: (callback: (workspaceId: string, delta: string) => void) => void;
      onMessageComplete: (callback: (workspaceId: string) => void) => void;
      onError: (callback: (workspaceId: string, error: string) => void) => void;
      selectDirectory: () => Promise<string | null>;
      getWorkspaces: () => Promise<any[]>;
      addWorkspace: (id: string, name: string, folderPath: string) => Promise<any>;
      removeWorkspace: (id: string) => Promise<void>;
      readFile: (filePath: string) => Promise<string | null>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      exists: (filePath: string) => Promise<boolean>;
      openMermaidBuilder: (workspaceId: string, filePath: string) => Promise<void>;
      openPlanEditor: (workspaceId: string, filePath: string) => Promise<void>;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private messagesMap = new Map<string, ChatMessage[]>();
  private messagesSubject = new BehaviorSubject<Record<string, ChatMessage[]>>({});
  messages$ = this.messagesSubject.asObservable();
  private streamingMap = new Map<string, boolean>();

  private get electron() {
    return window.electronAPI;
  }

  constructor(private ngZone: NgZone) {
    this.setupElectronListeners();
  }

  getMessages(workspaceId: string = 'global'): ChatMessage[] {
    let messages = this.messagesMap.get(workspaceId);
    if (!messages) {
      messages = [];
      this.messagesMap.set(workspaceId, messages);
      this.notifyMessagesChange();
    }
    return messages;
  }

  private notifyMessagesChange(): void {
    const record: Record<string, ChatMessage[]> = {};
    this.messagesMap.forEach((msgs, id) => {
      record[id] = [...msgs];
    });
    this.messagesSubject.next(record);
  }

  getIsStreaming(workspaceId: string = 'global'): boolean {
    return this.streamingMap.get(workspaceId) ?? false;
  }

  private setupElectronListeners(): void {
    if (!this.electron) return;

    this.electron.onMessageDelta((workspaceId: string, delta: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(workspaceId, true);
        const messages = this.getMessages(workspaceId);
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += delta;
        } else {
          messages.push({ role: 'assistant', content: delta });
        }
        this.notifyMessagesChange();
      });
    });

    this.electron.onMessageComplete((workspaceId: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(workspaceId, false);
        this.notifyMessagesChange();
      });
    });

    this.electron.onError((workspaceId: string, error: string) => {
      this.ngZone.run(() => {
        this.streamingMap.set(workspaceId, false);
        const messages = this.getMessages(workspaceId);
        messages.push({
          role: 'assistant',
          content: `Error: ${error}`,
        });
      });
    });
  }

  async sendMessage(content: string, workspaceId: string = 'global', folderPath?: string, displayContent?: string): Promise<void> {
    const messages = this.getMessages(workspaceId);
    messages.push({ role: 'user', content: displayContent || content });
    this.notifyMessagesChange();

    if (this.electron) {
      await this.electron.sendMessage(workspaceId, content, folderPath);
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
