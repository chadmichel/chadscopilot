import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AgentService } from '../../services/agent.service';
import { AgentConversationDto, AgentMessage } from '../../dto/agent.dto';

@Component({
  selector: 'app-agent-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextarea,
    CardModule,
    ToastModule,
    ToolbarModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule,
  ],
  providers: [MessageService],
  template: `
    <div class="agent-chat-container">
      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <div class="p-toolbar-group-start">
          <p-button
            icon="pi pi-arrow-left"
            [text]="true"
            (onClick)="goBack()"
            pTooltip="Back to conversations"
          ></p-button>
          <span class="text-xl font-semibold ml-2">{{
            conversation?.title || 'New Conversation'
          }}</span>
        </div>
        <div class="p-toolbar-group-end">
          <p-tag
            *ngIf="isConnected"
            value="Connected"
            severity="success"
            icon="pi pi-wifi"
          ></p-tag>
          <p-tag
            *ngIf="!isConnected && !isLoading"
            value="Disconnected"
            severity="danger"
            icon="pi pi-wifi"
          ></p-tag>
          <p-button
            *ngIf="!isConnected && !isLoading"
            label="Reconnect"
            icon="pi pi-refresh"
            [text]="true"
            (onClick)="reconnect()"
            class="ml-2"
          ></p-button>
        </div>
      </p-toolbar>

      <!-- Messages Area -->
      <div class="messages-container" #messagesContainer>
        <div *ngIf="isLoading" class="flex justify-content-center p-4">
          <p-progressSpinner
            strokeWidth="4"
            [style]="{ width: '50px', height: '50px' }"
          ></p-progressSpinner>
        </div>

        <div *ngIf="!isLoading && messages.length === 0" class="empty-state">
          <i class="pi pi-comments text-6xl text-300 mb-3"></i>
          <h3 class="text-600">Start a conversation</h3>
          <p class="text-400">
            Ask me anything about your contacts, events, or messages.
          </p>
        </div>

        <div *ngFor="let message of messages" class="message-wrapper">
          <div
            class="message"
            [ngClass]="{
              'user-message': message.role === 'user',
              'assistant-message': message.role === 'assistant'
            }"
          >
            <div class="message-header">
              <i
                [class]="
                  message.role === 'user' ? 'pi pi-user' : 'pi pi-android'
                "
              ></i>
              <span class="message-role">{{
                message.role === 'user' ? 'You' : 'Agent'
              }}</span>
              <span class="message-time">{{
                message.timestamp | date : 'short'
              }}</span>
            </div>
            <div class="message-content" [innerHTML]="formatMessage(message.content)"></div>
            <div
              *ngIf="message.toolsUsed && message.toolsUsed.length > 0"
              class="tools-used"
            >
              <span class="text-xs text-500">Tools used: </span>
              <p-tag
                *ngFor="let tool of message.toolsUsed"
                [value]="tool"
                severity="info"
                class="mr-1"
                [style]="{ fontSize: '0.7rem' }"
              ></p-tag>
            </div>
          </div>
        </div>

        <!-- Streaming response -->
        <div *ngIf="isStreaming" class="message-wrapper">
          <div class="message assistant-message streaming">
            <div class="message-header">
              <i class="pi pi-android"></i>
              <span class="message-role">Agent</span>
              <p-tag
                *ngIf="currentTool"
                [value]="'Using: ' + currentTool"
                severity="warning"
                icon="pi pi-cog pi-spin"
              ></p-tag>
            </div>
            <div class="message-content" [innerHTML]="formatMessage(streamingText)"></div>
            <span *ngIf="!streamingText" class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            pInputTextarea
            [(ngModel)]="userMessage"
            placeholder="Type your message..."
            [rows]="2"
            [autoResize]="true"
            (keydown.enter)="onEnterKey($event)"
            [disabled]="isStreaming"
            class="w-full"
          ></textarea>
          <p-button
            icon="pi pi-send"
            (onClick)="sendMessage()"
            [disabled]="isStreaming || !userMessage.trim()"
            [loading]="isStreaming"
            class="send-button"
          ></p-button>
        </div>
        <div class="input-hint text-xs text-400 mt-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>

    <p-toast></p-toast>
  `,
  styles: [
    `
      .agent-chat-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 180px);
        max-height: calc(100vh - 180px);
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        background: var(--surface-ground);
        border-radius: 8px;
        margin-bottom: 1rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
      }

      .message-wrapper {
        margin-bottom: 1rem;
      }

      .message {
        max-width: 80%;
        padding: 1rem;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .user-message {
        margin-left: auto;
        background: var(--primary-color);
        color: var(--primary-color-text);
      }

      .assistant-message {
        margin-right: auto;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.85rem;
        opacity: 0.8;
      }

      .message-role {
        font-weight: 600;
      }

      .message-time {
        margin-left: auto;
        font-size: 0.75rem;
      }

      .message-content {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
      }

      .message-content :deep(code) {
        background: var(--surface-100);
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9em;
      }

      .message-content :deep(pre) {
        background: var(--surface-100);
        padding: 0.75rem;
        border-radius: 6px;
        overflow-x: auto;
      }

      .tools-used {
        margin-top: 0.75rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--surface-border);
      }

      .streaming {
        border: 1px dashed var(--primary-color);
      }

      .typing-indicator {
        display: inline-flex;
        gap: 4px;
      }

      .typing-indicator span {
        width: 8px;
        height: 8px;
        background: var(--primary-color);
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%,
        60%,
        100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-10px);
        }
      }

      .input-container {
        padding: 1rem;
        background: var(--surface-card);
        border-radius: 8px;
        border: 1px solid var(--surface-border);
      }

      .input-wrapper {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
      }

      .input-wrapper textarea {
        flex: 1;
      }

      .send-button {
        flex-shrink: 0;
      }

      .input-hint {
        text-align: right;
      }
    `,
  ],
})
export class AgentChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  conversationId: string = '';
  conversation: AgentConversationDto | null = null;
  messages: AgentMessage[] = [];
  userMessage: string = '';

  isLoading: boolean = true;
  isConnected: boolean = false;
  isStreaming: boolean = false;
  streamingText: string = '';
  currentTool: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private agentService: AgentService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.conversationId = params['id'];
      this.loadConversation();
    });

    this.setupWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupWebSocket(): void {
    // Connect to WebSocket
    this.agentService.connectWebSocket();

    // Subscribe to WebSocket events
    this.agentService.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => {
        this.isConnected = connected;
      });

    this.agentService.streamingText$
      .pipe(takeUntil(this.destroy$))
      .subscribe((text) => {
        this.streamingText = text;
        this.scrollToBottom();
      });

    this.agentService.isStreaming$
      .pipe(takeUntil(this.destroy$))
      .subscribe((streaming) => {
        this.isStreaming = streaming;
      });

    this.agentService.currentTool$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tool) => {
        this.currentTool = tool;
      });

    this.agentService.error$.pipe(takeUntil(this.destroy$)).subscribe((error) => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error,
      });
    });

    this.agentService.chatComplete$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.conversationId === this.conversationId) {
          // Add the completed message to our list
          this.messages.push({
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            toolsUsed: data.toolsUsed,
          });
          this.scrollToBottom();
        }
      });

    // Listen for conversation history from WebSocket
    this.agentService.conversationHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.conversationId === this.conversationId) {
          this.messages = data.messages || [];
          this.isLoading = false;
          this.scrollToBottom();
        }
      });
  }

  private loadConversation(): void {
    this.isLoading = true;

    // Load conversation details first
    this.agentService.getConversation(this.conversationId).subscribe({
      next: (conversation) => {
        this.conversation = conversation;
        
        // Check if messages are included in the conversation response
        if (conversation.messages && conversation.messages.length > 0) {
          this.messages = conversation.messages;
          this.isLoading = false;
          this.scrollToBottom();
        } else {
          // Load messages separately if not included
          this.loadMessages();
        }
      },
      error: (err) => {
        console.error('Failed to load conversation:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load conversation',
        });
        this.isLoading = false;
      },
    });
  }

  private loadMessages(): void {
    // Use WebSocket if connected, otherwise fall back to REST API
    if (this.isConnected) {
      // Request history via WebSocket
      this.agentService.getHistoryWs(this.conversationId);
    } else {
      // Fall back to REST API
      this.agentService.getConversationMessages(this.conversationId).subscribe({
        next: (messages) => {
          this.messages = messages || [];
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (err) => {
          console.error('Failed to load messages:', err);
          // Don't show error - conversation might be new with no messages
          this.messages = [];
          this.isLoading = false;
        },
      });
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.isStreaming) {
      return;
    }

    const message = this.userMessage.trim();
    this.userMessage = '';

    // Add user message to the list immediately
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    this.scrollToBottom();

    // Reset streaming text
    this.agentService.resetStreamingText();

    // Check if WebSocket is connected
    if (this.isConnected) {
      // Use WebSocket for streaming
      this.agentService.chatWs(this.conversationId, message);
    } else {
      // Fallback to REST API
      this.isStreaming = true;
      this.agentService.chat(this.conversationId, message).subscribe({
        next: (response) => {
          this.messages.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            toolsUsed: response.toolsUsed,
          });
          this.isStreaming = false;
          this.scrollToBottom();
        },
        error: (err) => {
          console.error('Failed to send message:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to send message',
          });
          this.isStreaming = false;
        },
      });
    }
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  goBack(): void {
    this.router.navigate(['/', 'agent']);
  }

  reconnect(): void {
    this.agentService.connectWebSocket();
  }

  formatMessage(content: string): string {
    if (!content) return '';
    
    // Simple markdown-like formatting
    let formatted = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return formatted;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}

