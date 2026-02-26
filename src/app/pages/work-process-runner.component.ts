import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-work-process-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  template: `
    <div class="runner-container">
      <div class="runner-header">
        <div class="title-area">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <h1>Work Process Runner: {{ workspace?.name }}</h1>
        </div>
        <div class="status-badge" [class.active]="isRunning">
          {{ isRunning ? 'Process Running' : 'Idle' }}
        </div>
        @if (isRunning) {
          <div class="header-actions">
            <button class="stop-btn" (click)="stopProcess()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              Stop Process
            </button>
          </div>
        }
      </div>

      @if (isRejectionPending) {
        <div class="rejection-banner">
          <div class="rejection-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="rejection-text">
              <strong>Work Rejected:</strong> Stage {{ currentAgentIndex + 1 }} ({{ workspace?.workProcess?.agents?.[currentAgentIndex]?.type }}) has flagged issues with the previous stage.
              <p class="reason">"{{ rejectionReason }}"</p>
            </div>
          </div>
          <div class="rejection-actions">
            <button class="redo-btn" (click)="confirmRedo()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Send Back to Redo
            </button>
            <button class="continue-btn" (click)="ignoreRejection()">
              Continue Anyway
            </button>
          </div>
        </div>
      }

      <div class="runner-content">
        <div class="left-panel">
          <app-chat 
            [workspaceId]="runnerSessionId" 
            [folderPath]="workspace?.folderPath || ''"
            [contextProvider]="contextProvider"
          ></app-chat>
        </div>

        <div class="right-panel">
          <div class="process-flow">
            <h3>Execution Flow</h3>
            <div class="flow-steps">
              @for (agent of workspace?.workProcess?.agents; track agent.id; let i = $index) {
                <div class="step-card" [class.active]="currentAgentIndex === i" [class.completed]="currentAgentIndex > i">
                  <div class="step-number">{{ i + 1 }}</div>
                  <div class="step-info">
                    <div class="step-type">{{ agent.type }}</div>
                    <div class="step-prompt-preview">{{ agent.prompt }}</div>
                  </div>
                  @if (currentAgentIndex === i && isRunning) {
                    <div class="step-loading">
                      <div class="spinner"></div>
                    </div>
                  }
                  @if (currentAgentIndex > i) {
                    <div class="step-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  }
                </div>
                @if (i < (workspace?.workProcess?.agents?.length || 0) - 1) {
                  <div class="step-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .runner-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--app-background);
      color: var(--app-text);
    }
    .runner-header {
      height: 56px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
    }
    .title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-area h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 20px;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      color: var(--app-text-muted);
    }
    .status-badge.active {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }
    .stop-btn {
      margin-left: 12px;
      padding: 6px 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
      -webkit-app-region: no-drag;
    }
    .stop-btn:hover {
      background: #dc2626;
      transform: translateY(-1px);
    }
    .runner-content {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .left-panel {
      flex: 1;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
    }
    .right-panel {
      width: 350px;
      padding: 24px;
      background: var(--app-surface);
      overflow-y: auto;
    }
    .process-flow h3 {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
      color: var(--app-text-muted);
    }
    .flow-steps {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .step-card {
      width: 100%;
      padding: 16px;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s;
      position: relative;
    }
    .step-card.active {
      border-color: var(--theme-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      transform: scale(1.02);
    }
    .step-card.completed {
      opacity: 0.6;
    }
    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-card.active .step-number {
      background: var(--theme-primary);
      color: white;
      border-color: var(--theme-primary);
    }
    .step-info {
      flex: 1;
      min-width: 0;
    }
    .step-type {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--app-text-muted);
      margin-bottom: 2px;
    }
    .step-prompt-preview {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .step-check {
      color: #10b981;
    }
    .step-arrow {
      color: var(--app-border);
    }
    .step-loading .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--app-border);
      border-top-color: var(--theme-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .rejection-banner {
      background: #fef2f2;
      border-bottom: 1px solid #fee2e2;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .rejection-info {
      display: flex;
      gap: 12px;
      flex: 1;
    }
    .rejection-text {
      font-size: 13px;
      color: #991b1b;
    }
    .rejection-text .reason {
      margin: 4px 0 0 0;
      font-style: italic;
      color: #b91c1c;
      opacity: 0.8;
    }
    .rejection-actions {
      display: flex;
      gap: 8px;
    }
    .redo-btn {
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .continue-btn {
      padding: 8px 16px;
      background: white;
      border: 1px solid #fee2e2;
      color: #991b1b;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .header-actions {
      display: flex;
      align-items: center;
    }
  `]
})
export class WorkProcessRunnerComponent implements OnInit, OnDestroy {
  workspace: Workspace | undefined;
  runnerSessionId = 'runner-' + Math.random().toString(36).substring(2, 9);
  currentAgentIndex = 0;
  isRunning = false;

  private messageSubscription: Subscription | undefined;
  private isWaitingForAssistant = false;
  private lastHandoffInfo = '';
  private handoffTimeout: any;

  isRejectionPending = false;
  rejectionReason = '';
  private handoffContent = '';
  private lastRejectionFeedback = '';

  constructor(
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService,
    private chatService: ChatService
  ) { }

  async ngOnInit() {
    const workspaceId = this.route.snapshot.queryParamMap.get('workspaceId');
    if (workspaceId) {
      if (this.workspaceService.workspaces.length === 0) {
        await this.workspaceService.loadWorkspaces();
      }
      this.workspace = this.workspaceService.getWorkspace(workspaceId);
    }

    this.setupHandoffListener();
  }

  ngOnDestroy() {
    this.messageSubscription?.unsubscribe();
    if (this.handoffTimeout) {
      clearTimeout(this.handoffTimeout);
    }
  }

  stopProcess() {
    this.isRunning = false;
    if (this.handoffTimeout) {
      clearTimeout(this.handoffTimeout);
      this.handoffTimeout = null;
    }
    this.chatService.sendMessage("Process stopped by user.", this.runnerSessionId, this.workspace?.folderPath, "System: Process Stopped.");
  }

  setupHandoffListener() {
    this.messageSubscription = this.chatService.messages$.subscribe(messagesMap => {
      const messages = messagesMap[this.runnerSessionId];
      if (!messages || messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      const isStreaming = this.chatService.getIsStreaming(this.runnerSessionId);

      // Mark as waiting when user sends a message
      if (lastMessage.role === 'user') {
        const isSystemMessage = lastMessage.content.startsWith("System:");

        // Only wait for assistant if it's a "real" user message or a transition message
        if (!isSystemMessage ||
          lastMessage.content.includes("Transitioning to Stage") ||
          lastMessage.content.includes("Proceeding to") ||
          lastMessage.content.includes("Sent back to")) {
          this.isWaitingForAssistant = true;
        } else {
          this.isWaitingForAssistant = false;
        }

        // Only auto-start if it's not a system notification
        if (!this.isRunning && !isSystemMessage) {
          this.isRunning = true;
        }
      }

      // If we are running and the assistant just finished a message we were waiting for
      if (this.isRunning &&
        this.isWaitingForAssistant &&
        lastMessage.role === 'assistant' &&
        !isStreaming) {

        this.isWaitingForAssistant = false;
        this.processHandoff(lastMessage.content);
      }
    });
  }

  contextProvider = () => {
    if (!this.workspace || !this.workspace.workProcess) return '';
    const agents = this.workspace.workProcess.agents;
    const currentAgent = agents[this.currentAgentIndex];

    if (!currentAgent) return '';

    let context = `SYSTEM INSTRUCTIONS: You are participating in a multi-step work process. 
You are currently stage ${this.currentAgentIndex + 1} of ${agents.length}.
Your role for this stage is: ${currentAgent.type}
Your instructions:
${currentAgent.prompt}`;

    if (currentAgent.exitCriteria) {
      context += `\n\nEXIT CRITERIA:
Your work for this step is complete when: ${currentAgent.exitCriteria}`;
    }

    if (this.currentAgentIndex < agents.length - 1) {
      const nextAgent = agents[this.currentAgentIndex + 1];
      context += `\n\nHANDOFF INSTRUCTIONS:
Upon finishing your work, you MUST provide data for the next stage (${nextAgent.type}).
The next agent expects: ${currentAgent.promptNotes || 'relevant context from your analysis'}.
End your response with "HANDOFF DATA:" followed by the information you wish to pass on.`;
    }

    if (this.currentAgentIndex > 0) {
      context += `\n\nREJECTION OPTION:
If the input provided from the previous stage is insufficient, incorrect, or doesn't meet the goals of the project, you should REJECT it.
To reject, end your response with "REJECT PREVIOUS STAGE:" followed by a clear explanation of what is wrong and what needs to be fixed. 
If you reject, do NOT include HANDOFF DATA.`;
    }

    if (this.lastHandoffInfo) {
      context += `\n\nINPUT FROM PREVIOUS STAGE:
${this.lastHandoffInfo}`;
    }

    if (this.lastRejectionFeedback) {
      context += `\n\nRE-SUBMISSION FEEDBACK:
Your previous work for this stage was rejected by the next agent.
REASON FOR REJECTION: ${this.lastRejectionFeedback}
Please address this feedback in your updated output.`;
    }

    return context;
  }

  async processHandoff(content: string) {
    if (!this.workspace?.workProcess) return;
    const agents = this.workspace.workProcess.agents;

    const rejectionMarker = "REJECT PREVIOUS STAGE:";
    const rejectionIndex = content.lastIndexOf(rejectionMarker);

    if (rejectionIndex !== -1 && this.currentAgentIndex > 0) {
      this.isRejectionPending = true;
      this.rejectionReason = content.substring(rejectionIndex + rejectionMarker.length).trim();
      this.handoffContent = content; // Save for if they continue anyway
      return;
    }

    this.lastRejectionFeedback = ''; // Clear feedback once work is accepted/proceeded
    if (this.currentAgentIndex < agents.length - 1) {
      const handoffMarker = "HANDOFF DATA:";
      const markerIndex = content.lastIndexOf(handoffMarker);
      if (markerIndex !== -1) {
        this.lastHandoffInfo = content.substring(markerIndex + handoffMarker.length).trim();
      } else {
        this.lastHandoffInfo = content;
      }

      this.currentAgentIndex++;

      const nextAgent = agents[this.currentAgentIndex];
      const autoMessage = `System: Transitioning to Stage ${this.currentAgentIndex + 1}: ${nextAgent.type}. 
Handoff data from previous stage has been injected into your context. 
Please proceed with the next phase of the process.`;

      if (this.handoffTimeout) {
        clearTimeout(this.handoffTimeout);
      }

      this.handoffTimeout = setTimeout(() => {
        this.handoffTimeout = null;
        if (this.isRunning) {
          this.chatService.sendMessage(autoMessage, this.runnerSessionId, this.workspace?.folderPath, `System: Moved to ${nextAgent.type}`);
        }
      }, 1500);

    } else {
      this.isRunning = false;
      this.chatService.sendMessage("The work process is now complete. All stages have been executed.", this.runnerSessionId, this.workspace?.folderPath, "System: Process Complete.");
    }
  }

  confirmRedo() {
    if (!this.workspace?.workProcess) return;
    const agents = this.workspace.workProcess.agents;
    const previousAgent = agents[this.currentAgentIndex - 1];

    const feedbackMessage = `System: The next agent (${agents[this.currentAgentIndex].type}) has REJECTED your work with the following feedback:
"${this.rejectionReason}"

Please redo your work for this stage addressing these concerns. When finished, provide the updated HANDOFF DATA.`;

    this.isRejectionPending = false;
    this.lastRejectionFeedback = this.rejectionReason;
    this.currentAgentIndex--;
    this.chatService.sendMessage(feedbackMessage, this.runnerSessionId, this.workspace?.folderPath, `System: Sent back to ${previousAgent.type} for revision.`);
  }

  ignoreRejection() {
    this.isRejectionPending = false;
    // Continue with handoff as if it was a normal completion
    // We use the content that contained the rejection as the handoff info
    this.lastHandoffInfo = this.handoffContent;
    this.currentAgentIndex++;

    if (this.workspace?.workProcess) {
      const nextAgent = this.workspace.workProcess.agents[this.currentAgentIndex];
      if (nextAgent) {
        const autoMessage = `System: The user has chosen to ignore the rejection and proceed to Stage ${this.currentAgentIndex + 1}: ${nextAgent.type}. 
Handoff data (which includes the previous rejection notes) has been injected into your context. 
Please proceed.`;
        this.chatService.sendMessage(autoMessage, this.runnerSessionId, this.workspace?.folderPath, `System: Proceeding to ${nextAgent.type} despite rejection.`);
      } else {
        this.isRunning = false;
        this.chatService.sendMessage("The work process is now complete.", this.runnerSessionId, this.workspace?.folderPath, "System: Process Complete.");
      }
    }
  }
}
