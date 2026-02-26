import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { DropdownModule } from 'primeng/dropdown';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { AgentService } from '../../services/agent.service';
import {
  AgentConversationDto,
  AgentMessage,
  AgentLinkDto,
} from '../../dto/agent.dto';

interface ConversationOption {
  label: string;
  value: string;
  conversation: AgentConversationDto;
}

@Component({
  selector: 'app-agent',
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
    DropdownModule,
    DividerModule,
  ],
  providers: [MessageService],
  template: `
    <div class="agent-page">
      <!-- Page Header -->
      <div class="page-header">
        <h1 class="page-title">AI Agent</h1>
        <p class="page-subtitle">Chat with the AI assistant to get help with students, classes, and more.</p>
      </div>

      <!-- Mobile: Dropdown selector -->
      <div class="mobile-selector">
        <div class="flex align-items-center gap-2 mb-3">
          <p-dropdown
            [options]="conversationOptions"
            [(ngModel)]="selectedConversationId"
            (onChange)="onConversationSelect($event)"
            placeholder="Select conversation"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
            [showClear]="false"
          >
            <ng-template pTemplate="selectedItem" let-selected>
              <span *ngIf="selected">{{ selected.label }}</span>
              <span *ngIf="!selected" class="text-400"
                >Select conversation</span
              >
            </ng-template>
          </p-dropdown>
          <p-button
            icon="pi pi-plus"
            (onClick)="createNewConversation()"
            pTooltip="New conversation"
            [rounded]="true"
          ></p-button>
        </div>
      </div>

      <div class="agent-layout">
        <!-- Desktop: Sidebar with conversations -->
        <div class="conversations-sidebar">
          <div class="sidebar-header">
            <h3 class="m-0">Conversations</h3>
            <p-button
              icon="pi pi-plus"
              (onClick)="createNewConversation()"
              pTooltip="New conversation"
              [rounded]="true"
              [text]="true"
            ></p-button>
          </div>

          <div class="conversations-list">
            <div
              *ngIf="isLoadingConversations"
              class="flex justify-content-center p-3"
            >
              <p-progressSpinner
                strokeWidth="4"
                [style]="{ width: '30px', height: '30px' }"
              ></p-progressSpinner>
            </div>

            <div
              *ngFor="let conv of conversations"
              class="conversation-item"
              [class.active]="conv.id === selectedConversationId"
              (click)="selectConversation(conv)"
            >
              <div class="conv-title">
                {{ conv.title || 'New Conversation' }}
              </div>
              <div class="conv-meta">
                <span class="conv-count"
                  >{{ conv.messageCount || 0 }} messages</span
                >
                <span class="conv-date">{{
                  conv.lastMessageAt | date : 'shortDate'
                }}</span>
              </div>
            </div>

            <div
              *ngIf="!isLoadingConversations && conversations.length === 0"
              class="empty-conversations"
            >
              <p class="text-400 text-center">No conversations yet</p>
              <p-button
                label="Start a conversation"
                icon="pi pi-plus"
                (onClick)="createNewConversation()"
                styleClass="w-full"
              ></p-button>
            </div>
          </div>
        </div>

        <!-- Chat area -->
        <div class="chat-area">
          <!-- Connection status -->
          <div class="chat-header">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-comments text-xl"></i>
              <span class="font-semibold">{{
                currentConversation?.title || 'New Conversation'
              }}</span>
            </div>
            <div class="flex align-items-center gap-2">
              <p-tag
                *ngIf="isConnected"
                value="Connected"
                severity="success"
                icon="pi pi-wifi"
                [style]="{ fontSize: '0.75rem' }"
              ></p-tag>
              <p-tag
                *ngIf="!isConnected && !isLoading"
                value="Disconnected"
                severity="danger"
                icon="pi pi-wifi"
                [style]="{ fontSize: '0.75rem' }"
              ></p-tag>
            </div>
          </div>

          <!-- Messages Area -->
          <div class="messages-container" #messagesContainer>
            <div *ngIf="isLoading" class="flex justify-content-center p-4">
              <p-progressSpinner
                strokeWidth="4"
                [style]="{ width: '50px', height: '50px' }"
              ></p-progressSpinner>
            </div>

            <div
              *ngIf="!isLoading && !selectedConversationId"
              class="empty-state"
            >
              <i class="pi pi-comments text-6xl text-300 mb-3"></i>
              <h3 class="text-600">Welcome to Agent</h3>
              <p class="text-400 mb-3">
                Start a new conversation or select an existing one.
              </p>
              <p-button
                label="New Conversation"
                icon="pi pi-plus"
                (onClick)="createNewConversation()"
              ></p-button>
            </div>

            <div
              *ngIf="
                !isLoading && selectedConversationId && messages.length === 0
              "
              class="empty-state"
            >
              <i class="pi pi-comments text-6xl text-300 mb-3"></i>
              <h3 class="text-600">Start the conversation</h3>
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
                <div
                  class="message-content"
                  [innerHTML]="formatMessage(message.content)"
                ></div>
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
                <div
                  *ngIf="message.links && message.links.length > 0"
                  class="message-links"
                >
                  <p-button
                    *ngFor="let link of message.links"
                    [label]="link.label"
                    [icon]="getLinkIcon(link.type)"
                    (onClick)="navigateToLink(link)"
                    severity="secondary"
                    [outlined]="true"
                    size="small"
                  ></p-button>
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
                <div
                  class="message-content"
                  [innerHTML]="formatMessage(streamingText)"
                ></div>
                <span *ngIf="!streamingText" class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="input-container" *ngIf="selectedConversationId">
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
              ></p-button>
            </div>
            <div class="input-hint">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>

    <p-toast></p-toast>
  `,
  styles: [
    `
      /* Uses global .page-container, .page-header, .page-title, .page-subtitle from styles.scss */
      
      .agent-page {
        height: calc(100vh - 100px);
        display: flex;
        flex-direction: column;
        padding: 1.5rem 2rem;
        background: #f8fafc;
      }

      .mobile-selector {
        display: none;
        background: white;
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin-bottom: 1rem;
      }

      .mobile-selector :deep(.p-dropdown) {
        border-color: #e2e8f0;
      }

      .mobile-selector :deep(.p-button) {
        background: #0d9488;
        border-color: #0d9488;
      }

      .agent-layout {
        display: flex;
        flex: 1;
        gap: 1.5rem;
        min-height: 0;
      }

      /* Sidebar */
      .conversations-sidebar {
        width: 280px;
        flex-shrink: 0;
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        background: #fafafa;
      }

      .sidebar-header h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
      }

      .sidebar-header :deep(.p-button) {
        color: #0d9488;
      }

      .sidebar-header :deep(.p-button:hover) {
        background: #e0f2f1;
      }

      .conversations-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem;
      }

      .conversation-item {
        padding: 0.875rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 0.375rem;
        border: 1px solid transparent;
      }

      .conversation-item:hover {
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      .conversation-item.active {
        background: #e0f2f1;
        border-color: #0d9488;
        color: #0f766e;
      }

      .conv-title {
        font-weight: 600;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.375rem;
        color: #1e293b;
      }

      .conversation-item.active .conv-title {
        color: #0f766e;
      }

      .conv-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #64748b;
      }

      .conversation-item.active .conv-meta {
        color: #0d9488;
      }

      .empty-conversations {
        padding: 1.5rem 1rem;
        text-align: center;
      }

      .empty-conversations p {
        color: #94a3b8;
        margin-bottom: 1rem;
      }

      .empty-conversations :deep(.p-button) {
        background: #0d9488;
        border-color: #0d9488;
      }

      /* Chat area */
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        background: #fafafa;
      }

      .chat-header i {
        color: #0d9488;
      }

      .chat-header span {
        color: #1e293b;
      }

      .chat-header :deep(.p-tag) {
        font-size: 0.7rem;
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
        background: #f8fafc;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        padding: 2rem;
      }

      .empty-state i {
        color: #cbd5e1;
      }

      .empty-state h3 {
        color: #475569;
        margin-bottom: 0.5rem;
      }

      .empty-state p {
        color: #94a3b8;
        margin-bottom: 1.5rem;
      }

      .empty-state :deep(.p-button) {
        background: #0d9488;
        border-color: #0d9488;
      }

      .message-wrapper {
        margin-bottom: 1.25rem;
      }

      .message {
        max-width: 75%;
        padding: 1rem 1.25rem;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .user-message {
        margin-left: auto;
        background: #0d9488;
        color: white;
        border: none;
      }

      .user-message .message-header {
        opacity: 0.9;
      }

      .user-message .message-time {
        color: rgba(255, 255, 255, 0.8);
      }

      .assistant-message {
        margin-right: auto;
        background: white;
        color: #1e293b;
        border: 1px solid #e2e8f0;
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        font-size: 0.8rem;
      }

      .message-role {
        font-weight: 600;
      }

      .message-time {
        margin-left: auto;
        font-size: 0.7rem;
        color: #94a3b8;
      }

      .message-content {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .message-content :deep(code) {
        background: #f1f5f9;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 0.85em;
      }

      .user-message .message-content :deep(code) {
        background: rgba(255, 255, 255, 0.2);
      }

      .message-content :deep(pre) {
        background: #1e293b;
        color: #e2e8f0;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        margin: 0.75rem 0;
      }

      .message-content :deep(pre code) {
        background: transparent;
        padding: 0;
      }

      .tools-used {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f5f9;
      }

      .tools-used span {
        color: #64748b;
      }

      .message-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f5f9;
      }

      .message-links :deep(.p-button) {
        font-size: 0.8rem;
        color: #0d9488;
        border-color: #0d9488;
      }

      .message-links :deep(.p-button:hover) {
        background: #e0f2f1;
      }

      .streaming {
        border: 2px dashed #0d9488;
        background: #f0fdfa;
      }

      .typing-indicator {
        display: inline-flex;
        gap: 5px;
        padding: 0.25rem 0;
      }

      .typing-indicator span {
        width: 8px;
        height: 8px;
        background: #0d9488;
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
          transform: translateY(-8px);
        }
      }

      .input-container {
        padding: 1.25rem;
        border-top: 1px solid #f1f5f9;
        background: white;
      }

      .input-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }

      .input-wrapper :deep(textarea) {
        flex: 1;
        border-radius: 10px;
        border-color: #e2e8f0;
        padding: 0.875rem 1rem;
        font-size: 0.95rem;
        resize: none;
      }

      .input-wrapper :deep(textarea:focus) {
        border-color: #0d9488;
        box-shadow: 0 0 0 1px #0d9488;
      }

      .input-wrapper :deep(.p-button) {
        background: #0d9488;
        border-color: #0d9488;
        border-radius: 10px;
        height: 44px;
        width: 44px;
      }

      .input-wrapper :deep(.p-button:hover) {
        background: #0f766e;
        border-color: #0f766e;
      }

      .input-hint {
        text-align: right;
        font-size: 0.7rem;
        color: #94a3b8;
        margin-top: 0.5rem;
      }

      /* Mobile styles */
      @media (max-width: 1024px) {
        .agent-page {
          padding: 1rem;
        }

        .conversations-sidebar {
          width: 240px;
        }
      }

      @media (max-width: 768px) {
        .agent-page {
          height: calc(100vh - 80px);
          padding: 0.75rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
        }

        .page-header .subtitle {
          font-size: 0.85rem;
        }

        .mobile-selector {
          display: block;
        }

        .conversations-sidebar {
          display: none;
        }

        .agent-layout {
          flex-direction: column;
          gap: 0;
        }

        .chat-area {
          flex: 1;
          border-radius: 12px;
        }

        .message {
          max-width: 90%;
        }

        .messages-container {
          padding: 1rem;
        }

        .input-container {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class AgentComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Conversations
  conversations: AgentConversationDto[] = [];
  conversationOptions: ConversationOption[] = [];
  isLoadingConversations = true;

  // Current conversation
  selectedConversationId: string = '';
  currentConversation: AgentConversationDto | null = null;
  messages: AgentMessage[] = [];
  userMessage: string = '';

  // State
  isLoading: boolean = false;
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
    // Load conversations
    this.loadConversations();

    // Setup WebSocket
    this.setupWebSocket();

    // Check for conversation ID in route
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.selectedConversationId = params['id'];
        this.loadConversation();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupWebSocket(): void {
    this.agentService.connectWebSocket();

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

    this.agentService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
      });

    this.agentService.chatComplete$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.conversationId === this.selectedConversationId) {
          this.messages.push({
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            toolsUsed: data.toolsUsed,
            links: data.links,
          });
          this.scrollToBottom();
          // Refresh conversations list to update message count
          this.loadConversations();
        }
      });

    this.agentService.conversationHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.conversationId === this.selectedConversationId) {
          this.messages = data.messages || [];
          this.isLoading = false;
          this.scrollToBottom();
        }
      });
  }

  private loadConversations(): void {
    this.isLoadingConversations = true;
    this.agentService.getConversations().subscribe({
      next: (result: any) => {
        // Handle both wrapped and direct formats
        const items = result.items || result;
        this.conversations = (items || [])
          .map((item: any) => ({
            ...item.item,
            id: item.id,
          }))
          .slice(0, 10); // Limit to 10

        // Build dropdown options
        this.conversationOptions = this.conversations.map((conv) => ({
          label: conv.title || 'New Conversation',
          value: conv.id!,
          conversation: conv,
        }));

        this.isLoadingConversations = false;
      },
      error: (err) => {
        console.error('Failed to load conversations:', err);
        this.isLoadingConversations = false;
      },
    });
  }

  private loadConversation(): void {
    if (!this.selectedConversationId) return;

    this.isLoading = true;
    this.currentConversation =
      this.conversations.find((c) => c.id === this.selectedConversationId) ||
      null;

    this.agentService.getConversation(this.selectedConversationId).subscribe({
      next: (conversation) => {
        this.currentConversation = conversation;

        if (conversation.messages && conversation.messages.length > 0) {
          this.messages = conversation.messages;
          this.isLoading = false;
          this.scrollToBottom();
        } else {
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
    if (this.isConnected) {
      this.agentService.getHistoryWs(this.selectedConversationId);
    } else {
      this.agentService
        .getConversationMessages(this.selectedConversationId)
        .subscribe({
          next: (messages) => {
            this.messages = messages || [];
            this.isLoading = false;
            this.scrollToBottom();
          },
          error: (err) => {
            console.error('Failed to load messages:', err);
            this.messages = [];
            this.isLoading = false;
          },
        });
    }
  }

  selectConversation(conversation: AgentConversationDto): void {
    this.selectedConversationId = conversation.id!;
    this.router.navigate(['/', 'agent', conversation.id]);
    this.loadConversation();
  }

  onConversationSelect(event: any): void {
    const conversationId = event.value;
    const conversation = this.conversations.find(
      (c) => c.id === conversationId
    );
    if (conversation) {
      this.selectConversation(conversation);
    }
  }

  createNewConversation(): void {
    this.agentService.createConversation().subscribe({
      next: (response: any) => {
        const conversation = response.conversation || response;
        const conversationId = conversation.id || conversation.conversationId;
        if (conversationId) {
          // Add to conversations list
          const newConv: AgentConversationDto = {
            id: conversationId,
            title: conversation.title || 'New Conversation',
            status: 'active',
            messages: [],
            messageCount: 0,
            createdAt: new Date(),
          };
          this.conversations.unshift(newConv);
          this.conversationOptions.unshift({
            label: newConv.title,
            value: conversationId,
            conversation: newConv,
          });

          // Select the new conversation
          this.selectedConversationId = conversationId;
          this.currentConversation = newConv;
          this.messages = [];
          this.router.navigate(['/', 'agent', conversationId]);
        }
      },
      error: (err) => {
        console.error('Failed to create conversation:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create conversation',
        });
      },
    });
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.isStreaming) return;

    const message = this.userMessage.trim();
    this.userMessage = '';

    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    this.scrollToBottom();

    this.agentService.resetStreamingText();

    if (this.isConnected) {
      this.agentService.chatWs(this.selectedConversationId, message);
    } else {
      this.isStreaming = true;
      this.agentService.chat(this.selectedConversationId, message).subscribe({
        next: (response) => {
          this.messages.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            toolsUsed: response.toolsUsed,
            links: response.links,
          });
          this.isStreaming = false;
          this.scrollToBottom();
          this.loadConversations();
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

  formatMessage(content: string): string {
    if (!content) return '';

    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return formatted;
  }

  getLinkIcon(type: string): string {
    const iconMap: Record<string, string> = {
      contact: 'pi pi-user',
      contact_dashboard: 'pi pi-chart-bar',
      event: 'pi pi-calendar',
      event_dashboard: 'pi pi-chart-line',
      event_members: 'pi pi-users',
      event_instances: 'pi pi-calendar-times',
      event_instance: 'pi pi-calendar-plus',
      event_instance_dashboard: 'pi pi-chart-line',
      event_instance_attendance: 'pi pi-check-square',
      user: 'pi pi-user',
      message: 'pi pi-envelope',
      contacts_list: 'pi pi-users',
      events_list: 'pi pi-calendar',
      users_list: 'pi pi-users',
      messages_list: 'pi pi-envelope',
    };
    return iconMap[type] || 'pi pi-link';
  }

  navigateToLink(link: AgentLinkDto): void {
    if (link.path) {
      this.router.navigateByUrl(link.path);
    }
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
