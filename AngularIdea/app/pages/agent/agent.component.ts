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
import { Textarea } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AgentService } from '../../services/agent.service';
import {
  AgentConversationDto,
  AgentMessage,
  AgentLinkDto,
} from '../../dto/agent.dto';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

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
    Textarea,
    CardModule,
    ToastModule,
    ToolbarModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule,
    SelectModule,
    DividerModule,
    ProgressBarModule,
    DialogModule,
    PageToolbarComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="agent-page">
      <pb-page-toolbar header="AI Agent"></pb-page-toolbar>
      <p class="page-subtitle mb-4">Chat with the AI assistant to navigate and manage your work locally.</p>

      <!-- Model Load Prompt / Status -->
      <div *ngIf="!isModelLoaded && !isModelDownloading" class="model-banner p-3 mb-3 border-round shadow-1 flex align-items-center justify-content-between">
        <div class="flex align-items-center gap-3">
          <i class="pi pi-info-circle text-2xl text-primary"></i>
          <div>
            <div class="font-bold text-primary">{{ isModelCached ? 'Model Ready to Start' : 'Model Download Required' }}</div>
            <div class="text-xs text-500">
              {{ isModelCached ? 'The model is already in your browser cache. Click Start to initialize the local engine.' : 'To run the agent locally, we need to download the Llama-3.2 model (~0.8GB). Your data stays on your device.' }}
            </div>
          </div>
        </div>
        <p-button [label]="isModelCached ? 'Start Local AI' : 'Download & Start'" [icon]="isModelCached ? 'pi pi-play' : 'pi pi-download'" (onClick)="startModelDownload()" size="small"></p-button>
      </div>

      <!-- Mobile: Dropdown selector -->
      <div class="mobile-selector">
        <div class="flex align-items-center gap-2 mb-3">
          <p-select
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
          </p-select>
          <p-button
            icon="pi pi-plus"
            (onClick)="createNewConversation()"
            pTooltip="New conversation"
            [rounded]="true"
          ></p-button>
        </div>
      </div>

      <div class="agent-layout" [class.disabled-layout]="!isModelLoaded">
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
                *ngIf="isModelLoaded"
                value="Local AI Ready"
                severity="success"
                icon="pi pi-bolt"
                [style]="{ fontSize: '0.75rem' }"
              ></p-tag>
              <p-tag
                *ngIf="!isModelLoaded && !isLoading"
                value="Model Offline"
                severity="warn"
                icon="pi pi-stop-circle"
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
                Try: “show me my open tasks”, “create a project called…”, or “what boards do I have?”.
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
                    severity="warn"
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
                pTextarea
                [(ngModel)]="userMessage"
                placeholder="Type your message..."
                [rows]="2"
                [autoResize]="true"
                (keydown.enter)="onEnterKey($event)"
                [disabled]="isStreaming || !isModelLoaded"
                class="w-full"
              ></textarea>
              <p-button
                icon="pi pi-send"
                (onClick)="sendMessage()"
                [disabled]="isStreaming || !userMessage.trim() || !isModelLoaded"
                [loading]="isStreaming"
              ></p-button>
            </div>
            <div class="input-hint" *ngIf="isModelLoaded">
              Press Enter to send, Shift+Enter for new line
            </div>
            <div class="input-hint" *ngIf="!isModelLoaded">
              Download the model above to start chatting
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Dialog -->
    <p-dialog 
      header="Downloading AI Model" 
      [(visible)]="isModelDownloading" 
      [modal]="true" 
      [closable]="false"
      [style]="{ width: '400px' }"
    >
      <div class="p-4">
        <p class="mb-3 text-700">Downloading Llama-3.2-1B to your browser cache...</p>
        <p-progressBar [value]="downloadProgress"></p-progressBar>
        <div class="text-right mt-2 text-xs text-500">{{ downloadProgress }}% complete</div>
        <p class="text-xs text-400 mt-3">This usually takes 1-2 minutes depending on your connection. Subsequent starts will be nearly instant.</p>
      </div>
    </p-dialog>

    <p-toast></p-toast>
  `,
  styles: [
    `
      /* Uses global .page-container, .page-header, .page-title, .page-subtitle from styles.scss */
      
      .agent-page {
        height: calc(100vh - 100px);
        display: flex;
        flex-direction: column;
        /* Use the shared app shell (.page-content) padding */
        padding: 0;
        /* Let the theme wallpaper show through on the agent page */
        background: transparent;
      }

      .mobile-selector {
        display: none;
        background: var(--surface-glass);
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid var(--app-border);
        margin-bottom: 1rem;
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .mobile-selector :deep(.p-select) {
        border-color: var(--app-border);
      }

      .mobile-selector :deep(.p-button) {
        background: var(--theme-primary);
        border-color: var(--theme-primary);
      }

      .agent-layout {
        display: flex;
        flex: 1;
        gap: 1.5rem;
        min-height: 0;
        transition: all 0.3s ease;
      }

      .agent-layout.disabled-layout {
        opacity: 0.5;
        filter: grayscale(1);
        pointer-events: none;
        user-select: none;
      }

      /* Sidebar */
      .conversations-sidebar {
        width: 280px;
        flex-shrink: 0;
        background: var(--surface-glass);
        border-radius: 12px;
        border: 1px solid var(--app-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1rem;
        border-bottom: 1px solid var(--app-border);
        background: var(--surface-muted-glass);
      }

      .sidebar-header h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--app-text);
      }

      .sidebar-header :deep(.p-button) {
        color: var(--theme-primary);
      }

      .sidebar-header :deep(.p-button:hover) {
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
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
        background: var(--app-surface-muted);
        border-color: var(--app-border);
      }

      .conversation-item.active {
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
        border-color: color-mix(in srgb, var(--theme-primary), transparent 35%);
        color: var(--app-text);
      }

      .conv-title {
        font-weight: 600;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.375rem;
        color: var(--app-text);
      }

      .conversation-item.active .conv-title {
        color: var(--app-text);
      }

      .conv-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--app-text-muted);
      }

      .conversation-item.active .conv-meta {
        color: var(--app-text-muted);
      }

      .empty-conversations {
        padding: 1.5rem 1rem;
        text-align: center;
      }

      .empty-conversations p {
        color: var(--app-text-muted);
        margin-bottom: 1rem;
      }

      .empty-conversations :deep(.p-button) {
        background: var(--theme-primary);
        border-color: var(--theme-primary);
      }

      /* Chat area */
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--surface-glass);
        border-radius: 12px;
        border: 1px solid var(--app-border);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--app-border);
        background: var(--surface-muted-glass);
      }

      .chat-header i {
        color: var(--theme-primary);
      }

      .chat-header span {
        color: var(--app-text);
      }

      .chat-header :deep(.p-tag) {
        font-size: 0.7rem;
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
        background: transparent;
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
        color: color-mix(in srgb, var(--app-text-muted), transparent 35%);
      }

      .empty-state h3 {
        color: var(--app-text);
        margin-bottom: 0.5rem;
      }

      .empty-state p {
        color: var(--app-text-muted);
        margin-bottom: 1.5rem;
      }

      .empty-state :deep(.p-button) {
        background: var(--theme-primary);
        border-color: var(--theme-primary);
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
        background: var(--theme-primary);
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
        background: var(--surface-glass);
        color: var(--app-text);
        border: 1px solid var(--app-border);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
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
        color: var(--app-text-muted);
      }

      .message-content {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .message-content :deep(code) {
        background: var(--surface-muted-glass);
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
        border-top: 1px solid var(--app-border);
      }

      .tools-used span {
        color: var(--app-text-muted);
      }

      .message-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--app-border);
      }

      .message-links :deep(.p-button) {
        font-size: 0.8rem;
        color: var(--theme-primary);
        border-color: var(--theme-primary);
      }

      .message-links :deep(.p-button:hover) {
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
      }

      .streaming {
        border: 2px dashed color-mix(in srgb, var(--theme-primary), transparent 15%);
        background: color-mix(in srgb, var(--theme-primary), transparent 92%);
      }

      .typing-indicator {
        display: inline-flex;
        gap: 5px;
        padding: 0.25rem 0;
      }

      .typing-indicator span {
        width: 8px;
        height: 8px;
        background: var(--theme-primary);
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
        border-top: 1px solid var(--app-border);
        background: var(--surface-glass);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .input-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }

      .input-wrapper :deep(textarea) {
        flex: 1;
        border-radius: 10px;
        border-color: var(--app-border);
        padding: 0.875rem 1rem;
        font-size: 0.95rem;
        resize: none;
      }

      .input-wrapper :deep(textarea:focus) {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 1px var(--theme-primary);
      }

      .input-wrapper :deep(.p-button) {
        background: var(--theme-primary);
        border-color: var(--theme-primary);
        border-radius: 10px;
        height: 44px;
        width: 44px;
      }

      .input-wrapper :deep(.p-button:hover) {
        background: var(--theme-primary-hover);
        border-color: var(--theme-primary-hover);
      }

      .input-hint {
        text-align: right;
        font-size: 0.7rem;
        color: var(--app-text-muted);
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
  isModelLoaded = false;
  isModelCached = false;
  isModelDownloading = false;
  downloadProgress: number = 0;
  isStreaming: boolean = false;
  streamingText: string = '';
  currentTool: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private agentService: AgentService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // Load conversations
    this.loadConversations();

    // Setup Subscriptions
    this.setupSubscriptions();

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

  private setupSubscriptions(): void {
    this.agentService.isModelLoaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loaded) => {
        this.isModelLoaded = loaded;
      });

    this.agentService.isModelCached$
      .pipe(takeUntil(this.destroy$))
      .subscribe((cached) => {
        this.isModelCached = cached;
      });

    this.agentService.isModelDownloading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((downloading) => {
        this.isModelDownloading = downloading;
      });

    this.agentService.downloadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress) => {
        this.downloadProgress = progress;
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
          this.loadConversations();
        }
      });
  }

  startModelDownload(): void {
    this.agentService.initModel().catch(() => { });
  }

  private loadConversations(): void {
    this.isLoadingConversations = true;
    this.agentService.getConversations().subscribe({
      next: (result: any) => {
        const items = result?.items || (Array.isArray(result) ? result : []);
        this.conversations = items
          .map((item: any) => ({
            ...(item.item || item),
            id: item.id || item.item?.id || item.id,
          }))
          .slice(0, 10);

        this.conversationOptions = this.conversations.map((conv) => ({
          label: conv.title || 'New Conversation',
          value: conv.id!,
          conversation: conv,
        }));

        this.isLoadingConversations = false;
      },
      error: () => {
        this.isLoadingConversations = false;
      },
    });
  }

  private loadConversation(): void {
    if (!this.selectedConversationId) return;

    this.isLoading = true;
    this.agentService.getConversationMessages(this.selectedConversationId).subscribe({
      next: (result: any) => {
        const messages = result?.items || (Array.isArray(result) ? result : []);
        this.messages = messages || [];
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  selectConversation(conversation: AgentConversationDto): void {
    this.selectedConversationId = conversation.id!;
    this.router.navigate(['/', 'agent', conversation.id]);
    this.loadConversation();
  }

  onConversationSelect(event: any): void {
    const conversationId = event.value;
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      this.selectConversation(conversation);
    }
  }

  createNewConversation(): void {
    this.agentService.createConversation().subscribe({
      next: (response: any) => {
        const conversation = response.conversation || response;
        const conversationId = conversation.id;
        if (conversationId) {
          const newConv: AgentConversationDto = {
            id: conversationId,
            title: conversation.title || 'New Conversation',
            status: 'active',
            messages: [],
            messageCount: 0,
            createdAt: new Date(),
          };
          this.conversations.unshift(newConv);
          this.selectedConversationId = conversationId;
          this.messages = [];
          this.router.navigate(['/', 'agent', conversationId]);
        }
      },
    });
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.isStreaming || !this.isModelLoaded) return;

    const message = this.userMessage.trim();
    this.userMessage = '';

    const userMsg: AgentMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.scrollToBottom();

    // history (excluding current user message)
    const history = this.messages.slice(0, -1);

    this.agentService.chat(this.selectedConversationId, message, history);
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
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  getLinkIcon(type: string): string {
    const iconMap: Record<string, string> = {
      board: 'pi pi-th-large',
      project: 'pi pi-briefcase',
      task: 'pi pi-check-square',
    };
    return iconMap[type] || 'pi pi-link';
  }

  navigateToLink(link: AgentLinkDto): void {
    if (link.path) this.router.navigateByUrl(link.path);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
