import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, from, of, firstValueFrom } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BackendService } from './backend.service';
import {
  AgentConversationDto,
  AgentChatResponse,
  AgentCapabilities,
  CreateConversationResponse,
  AgentMessage,
  AgentLinkDto,
  AgentLinkType,
} from '../dto/agent.dto';
import { QueryResult } from '../components/common-dto/query.dto';
import { AuthService } from './auth.service';
import { TaskService } from './task.service';
import { BoardService } from './board.service';
import { ProjectService } from './project.service';

// LangChain & WebLLM imports
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { CreateMLCEngine, MLCEngineInterface, hasModelInCache } from "@mlc-ai/web-llm";
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from "@langchain/core/prompts";
import {
  AgentExecutor,
  createStructuredChatAgent
} from "@langchain/classic/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { AIMessage, HumanMessage, BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatResult, ChatGeneration } from "@langchain/core/outputs";

@Injectable({
  providedIn: 'root',
})
export class AgentService implements OnDestroy {
  // --- Local LLM State ---
  private modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  private model: WebLLMChatModel | null = null;
  private executor: AgentExecutor | null = null;

  private isModelDownloadingSubject = new BehaviorSubject<boolean>(false);
  private downloadProgressSubject = new BehaviorSubject<number>(0);
  private isModelLoadedSubject = new BehaviorSubject<boolean>(false);
  private isModelCachedSubject = new BehaviorSubject<boolean>(false);
  private streamingTextSubject = new BehaviorSubject<string>('');
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  private currentToolSubject = new BehaviorSubject<string | null>(null);
  private errorSubject = new Subject<string>();

  private conversationCreatedSubject = new Subject<{
    conversationId: string;
    title: string;
  }>();
  private chatCompleteSubject = new Subject<{
    conversationId: string;
    message: string;
    toolsUsed?: string[];
    links?: AgentLinkDto[];
  }>();

  // --- Public Observables ---
  isModelDownloading$ = this.isModelDownloadingSubject.asObservable();
  downloadProgress$ = this.downloadProgressSubject.asObservable();
  isModelLoaded$ = this.isModelLoadedSubject.asObservable();
  isModelCached$ = this.isModelCachedSubject.asObservable();
  streamingText$ = this.streamingTextSubject.asObservable();
  isStreaming$ = this.isStreamingSubject.asObservable();
  currentTool$ = this.currentToolSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  conversationCreated$ = this.conversationCreatedSubject.asObservable();
  chatComplete$ = this.chatCompleteSubject.asObservable();

  constructor(
    private backend: BackendService,
    private http: HttpClient,
    private authService: AuthService,
    private taskService: TaskService,
    private boardService: BoardService,
    private projectService: ProjectService,
    private ngZone: NgZone
  ) {
    this.checkModelCached();
  }

  /**
   * Check if model is already in browser cache
   */
  async checkModelCached(): Promise<boolean> {
    try {
      const cached = await hasModelInCache(this.modelId);
      this.isModelCachedSubject.next(cached);
      if (cached) {
        console.log("Model found in cache");
        return true;
      }
    } catch (e) {
      console.warn("Failed to check cache:", e);
    }
    return false;
  }

  // ============ Model Management ============

  /**
   * Initialize and load the local model
   */
  async initModel(): Promise<void> {
    if (this.isModelLoadedSubject.value || this.isModelDownloadingSubject.value) return;

    const isCached = await this.checkModelCached();
    if (!isCached) {
      this.isModelDownloadingSubject.next(true);
    }
    this.downloadProgressSubject.next(0);

    // Run AI operations outside Angular zone to avoid Zone.js interaction with WebLLM streams
    this.ngZone.runOutsideAngular(async () => {
      try {
        this.model = new WebLLMChatModel(this.modelId);

        await this.model.initialize((progress: any) => {
          try {
            this.ngZone.run(() => {
              this.downloadProgressSubject.next(Math.round(progress.progress * 100));
            });
          } catch (e) {
            // Ignore progress updates if zone is unstable
          }
        });

        const tools = this.createTools();

        const prompt = ChatPromptTemplate.fromMessages([
          ["system", `You are a task management assistant. Use your tools to help the user.
Please follow these guidelines:
- Use a JSON block for every tool action.
- Only provide ONE action per response.
- Use "Final Answer" when you are finished.
- Do not provide your own Observations.

Available tools:
{tool_names}
{tools}

Format:
Question: what the user wants
Thought: what you need to do
Action:
\`\`\`json
{{
  "action": $TOOL_NAME,
  "action_input": $INPUT_OBJECT
}}
\`\`\`

Begin!`],
          new MessagesPlaceholder("chat_history"),
          ["human", "{input}\n\n{agent_scratchpad}"],
        ]);

        const agent = await createStructuredChatAgent({
          llm: this.model,
          tools,
          prompt,
          streamRunnable: false, // CRITICAL: Disable streaming to prevent ReadableStream errors
        });

        this.executor = new AgentExecutor({
          agent,
          tools,
          returnIntermediateSteps: true,
          maxIterations: 5, // Prevent infinite loops common in 1B models
        });

        this.ngZone.run(() => {
          this.isModelLoadedSubject.next(true);
          this.isModelDownloadingSubject.next(false);
        });
      } catch (err: any) {
        console.error("Failed to load model:", err);
        this.ngZone.run(() => {
          this.errorSubject.next(`Failed to load model: ${err.message}`);
          this.isModelDownloadingSubject.next(false);
        });
      }
    });
  }

  // ============ Tool definitions ============

  private createTools() {
    return [
      // --- Tasks ---
      new DynamicStructuredTool({
        name: "get_tasks",
        description: "Get tasks for a specific board. Use 'all' for all tasks.",
        schema: z.object({
          boardId: z.string().describe("The ID of the board to get tasks for, or 'all'"),
        }),
        func: async ({ boardId }) => {
          this.currentToolSubject.next("get_tasks");
          const result = await firstValueFrom(this.taskService.getBoardTasks(boardId));
          this.currentToolSubject.next(null);
          return JSON.stringify(result?.items?.map(it => it.item) || []);
        },
      }),
      new DynamicStructuredTool({
        name: "create_task",
        description: "Create a new task.",
        schema: z.object({
          title: z.string().describe("The title of the task"),
          projectId: z.string().optional().describe("The ID of the project"),
          status: z.enum(['backlog', 'ondeck', 'inprocess', 'complete']).optional(),
        }),
        func: async (args) => {
          this.currentToolSubject.next("create_task");
          const result = await firstValueFrom(this.taskService.createTask(args));
          this.currentToolSubject.next(null);
          return JSON.stringify(result);
        },
      }),
      new DynamicStructuredTool({
        name: "update_task",
        description: "Update an existing task.",
        schema: z.object({
          id: z.string().describe("The ID of the task to update"),
          title: z.string().optional(),
          status: z.enum(['backlog', 'ondeck', 'inprocess', 'complete']).optional(),
        }),
        func: async ({ id, ...rest }) => {
          this.currentToolSubject.next("update_task");
          const result = await firstValueFrom(this.taskService.updateTask(id, rest));
          this.currentToolSubject.next(null);
          return JSON.stringify(result);
        },
      }),

      // --- Boards ---
      new DynamicStructuredTool({
        name: "get_boards",
        description: "Get list of boards.",
        schema: z.object({}),
        func: async () => {
          this.currentToolSubject.next("get_boards");
          const result = await firstValueFrom(this.boardService.getBoards({}));
          this.currentToolSubject.next(null);
          return JSON.stringify(result?.items?.map(it => it.item) || []);
        },
      }),
      new DynamicStructuredTool({
        name: "create_board",
        description: "Create a new board.",
        schema: z.object({
          name: z.string().describe("Name of the board"),
        }),
        func: async (args) => {
          this.currentToolSubject.next("create_board");
          const result = await firstValueFrom(this.boardService.createBoard(args));
          this.currentToolSubject.next(null);
          return JSON.stringify(result);
        },
      }),

      // --- Projects ---
      new DynamicStructuredTool({
        name: "get_projects",
        description: "Get list of projects.",
        schema: z.object({}),
        func: async () => {
          this.currentToolSubject.next("get_projects");
          const result = await firstValueFrom(this.projectService.getProjects({}));
          this.currentToolSubject.next(null);
          return JSON.stringify(result?.items?.map(it => it.item) || []);
        },
      }),
      new DynamicStructuredTool({
        name: "create_project",
        description: "Create a new project.",
        schema: z.object({
          name: z.string().describe("Name of the project"),
        }),
        func: async (args) => {
          this.currentToolSubject.next("create_project");
          const result = await firstValueFrom(this.projectService.createProject(args));
          this.currentToolSubject.next(null);
          return JSON.stringify(result);
        },
      }),
    ];
  }

  // ============ Chat Methods ============

  /**
   * Send a chat message (client-side inference)
   */
  async chat(conversationId: string, message: string, history: AgentMessage[] = []): Promise<void> {
    if (!this.executor) {
      this.errorSubject.next('Model not initialized');
      return;
    }

    this.isStreamingSubject.next(true);
    this.streamingTextSubject.next('');

    this.ngZone.runOutsideAngular(async () => {
      try {
        // Map history to LangChain format (Prune history to last 10 messages to save context)
        const prunedHistory = history.slice(-10);
        const chat_history: BaseMessage[] = prunedHistory.map(m => {
          const content = m.content || '';
          return m.role === 'user' ? new HumanMessage(content) : new AIMessage(content);
        });

        const result = await this.executor!.invoke({
          input: message,
          chat_history
        });

        const responseText = result['output'] as string;
        const intermediateSteps = result['intermediateSteps'] as any[];
        const toolsUsed = (intermediateSteps || []).map((step: any) => step.action.tool);
        const links = this.extractLinks(responseText);

        this.ngZone.run(() => {
          this.streamingTextSubject.next(responseText);
          this.chatCompleteSubject.next({
            conversationId,
            message: responseText,
            toolsUsed,
            links
          });
        });

      } catch (err: any) {
        console.error("Agent chat failed:", err);
        this.ngZone.run(() => {
          this.errorSubject.next(`Chat failed: ${err.message}`);
        });
      } finally {
        this.ngZone.run(() => {
          this.isStreamingSubject.next(false);
        });
      }
    });
  }

  /**
   * Simple one-off generation (not an agentic conversation)
   */
  async generateSummary(prompt: string): Promise<string> {
    if (!this.isModelLoadedSubject.value) {
      await this.initModel();
    }

    // Wait for model to load if it's currently loading
    while (!this.isModelLoadedSubject.value && this.isModelDownloadingSubject.value) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.model) {
      throw new Error('Model failed to initialize');
    }

    const response = await this.model.invoke([
      new HumanMessage(prompt)
    ]);

    let text = response.content as string;
    // Clean up if the model outputs thought/action blocks during simple generation
    if (text.includes('Final Answer":')) {
      try {
        const match = text.match(/"action_input":\s*"([^"]+)"/);
        if (match) text = match[1];
      } catch { }
    }

    return text.replace(/Thought:.*?\n/g, '').replace(/Action:.*?\n/g, '').replace(/```json[\s\S]*?```/g, '').trim();
  }

  private saveMessageToBackend(conversationId: string, content: string, role: 'user' | 'assistant') {
    // This is a simplified call to existing backend endpoints to keep history synced
    return this.backend.post(`agent/conversations/${conversationId}/messages-sync`, { content, role }).pipe(
      catchError(() => of(null)) // Ignore errors if offline/unsupported
    );
  }

  // ============ Existing REST API Methods (for history) ============

  getConversations(): Observable<QueryResult<AgentConversationDto>> {
    return this.backend.get<QueryResult<AgentConversationDto>>('agent/conversations');
  }

  getConversationMessages(conversationId: string): Observable<AgentMessage[]> {
    return this.backend.get<AgentMessage[]>(`agent/conversations/${conversationId}/messages`);
  }

  createConversation(title?: string): Observable<CreateConversationResponse> {
    return this.backend.post<CreateConversationResponse>('agent/conversations', { title });
  }

  deleteConversation(id: string): Observable<void> {
    return this.backend.delete<void>(`agent/conversations/${id}`);
  }

  private extractLinks(text: string): AgentLinkDto[] {
    const links: AgentLinkDto[] = [];
    // Basic link detection
    if (text.includes('/boards/')) {
      const match = text.match(/\/boards\/([a-zA-Z0-9-]+)/);
      if (match) links.push({ label: 'View Board', type: AgentLinkType.BOARD, path: match[0] });
    }
    if (text.includes('/projects/')) {
      const match = text.match(/\/projects\/([a-zA-Z0-9-]+)/);
      if (match) links.push({ label: 'View Project', type: AgentLinkType.PROJECT, path: match[0] });
    }
    if (text.includes('/tasks/')) {
      const match = text.match(/\/tasks\/([a-zA-Z0-9-]+)/);
      if (match) links.push({ label: 'View Task', type: AgentLinkType.TASK, path: match[0] });
    }
    return links;
  }

  getCapabilities(): Observable<AgentCapabilities> {
    // Client-side agent always has these capabilities now
    return of({
      model: this.modelId,
      provider: 'WebLLM (Local)',
      status: this.isModelLoadedSubject.value ? 'ready' : 'loading',
      tools: [
        { name: 'get_tasks', description: 'Get tasks for a board' },
        { name: 'create_task', description: 'Create a new task' },
        { name: 'update_task', description: 'Update an existing task' },
        { name: 'get_boards', description: 'Get all boards' },
        { name: 'create_board', description: 'Create a new board' },
        { name: 'get_projects', description: 'Get all projects' },
        { name: 'create_project', description: 'Create a new project' }
      ],
    });
  }

  ngOnDestroy(): void {
    if (this.model && this.model.engine) {
      this.model.engine.unload();
    }
  }
}

/**
 * Custom LangChain wrapper for WebLLM that uses non-streaming _generate.
 * This avoids ReadableStream errors that occur with streaming during tool execution.
 */
class WebLLMChatModel extends BaseChatModel {
  engine: MLCEngineInterface | null = null;

  constructor(private modelId: string) {
    super({});
  }

  override _llmType(): string {
    return "web-llm-non-streaming";
  }

  /** Required by BaseChatModel - return empty array since we don't track model-level calls */
  override get callKeys(): string[] {
    return [];
  }

  async initialize(progressCallback: any): Promise<void> {
    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: progressCallback,
    }, {
      context_window_size: 8192,
    });
  }

  /**
   * Core non-streaming implementation. This is the primary method called by AgentExecutor.
   * Using _generate instead of _call/_streamResponseChunks avoids the ReadableStream issues.
   */
  override async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    _runManager?: any
  ): Promise<ChatResult> {
    if (!this.engine) throw new Error("Engine not initialized");

    const messagesInput = messages.map((m) => {
      const type = typeof m._getType === 'function' ? m._getType() : 'user';
      let role = "user";
      if (type === "ai") role = "assistant";
      else if (type === "system") role = "system";
      return { role, content: m.content as string };
    });

    // Log messages for debugging
    messagesInput.forEach((m) => {
      console.log(m.role, m.content);
    });

    const response = await this.engine.chat.completions.create({
      stream: false,
      messages: messagesInput as any,
      temperature: 0.1,
      stop: (options as any).stop || ["Observation:", "Thought:", "Action:", "Result:", "Question:", "\n\n"],
    });

    let text = response.choices[0].message.content ?? "";
    text = this.postProcessResponse(text, messages);

    const generation: ChatGeneration = {
      text,
      message: new AIMessage({ content: text }),
    };

    return {
      generations: [generation],
      llmOutput: {},
    };
  }


  /**
   * Post-process model output to handle common issues with small models:
   * - Narrative loops
   * - System prompt leakage
   * - Malformed JSON
   * - Hallucinated observations
   */
  private postProcessResponse(text: string, messages: BaseMessage[]): string {
    // --- Narrative Loop Shield ---
    if (text.includes("1.") && text.includes("Get all tasks")) {
      text = text.split("1.")[0] + "\nAction:\n```json\n{ \"action\": \"Final Answer\", \"action_input\": \"I am ready to help with your tasks.\" }\n```";
    }

    // --- Leakage Shield ---
    if (text.includes("MUST use the JSON") || text.includes("CRITICAL INSTRUCTIONS") || text.includes("Available tools:")) {
      text = text.split("Format:")[1] || text.split("Action:")[0] || "";
      if (text.trim().length === 0) {
        text = "Thought: I am ready.\nAction:\n```json\n{ \"action\": \"Final Answer\", \"action_input\": \"How can I help you today?\" }\n```";
      }
    }

    // --- Strip hallucinated observations ---
    if (text.includes("Result:") || text.includes("Observation:")) {
      text = text.split(/Result:|Observation:/i)[0];
    }

    // Extract thought
    const thoughtMatch = text.match(/Thought:\s*([^\n]+)/i);
    let thought = thoughtMatch ? thoughtMatch[1].replace(/Thought:/g, '').trim() : "I will now summarize the findings.";

    // --- Data Summary Logic ---
    // Check if we already have retrieved data from a previous tool call
    const retrievedData = this.extractRetrievedData(messages);

    if (retrievedData) {
      // If we have data, check if the model is outputting a proper Final Answer
      const hasFinalAnswer = text.includes('"action": "Final Answer"') || text.includes('"action":"Final Answer"');

      if (!hasFinalAnswer) {
        // Model isn't giving a Final Answer despite having data - force one with the summary
        const summary = this.formatDataSummary(retrievedData);
        return `Thought: I have the data. Here is the summary.\nAction:\n\`\`\`json\n{\n  "action": "Final Answer",\n  "action_input": ${JSON.stringify(summary)}\n}\n\`\`\``;
      }
    }

    // Try to extract JSON
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
    let jsonMatch = jsonRegex.exec(text);
    let isolatedJson = jsonMatch ? jsonMatch[1] : null;

    if (!isolatedJson) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        isolatedJson = text.substring(firstBrace, lastBrace + 1);
      }
    }

    // --- Heuristic Action Recovery ---
    if (!isolatedJson) {
      const knownTools = ['get_tasks', 'create_task', 'update_task', 'get_boards', 'create_board', 'get_projects', 'create_project'];
      for (const t of knownTools) {
        if (text.toLowerCase().includes(t)) {
          thought = "I will use " + t;
          if (t === 'get_tasks') isolatedJson = `{ "action": "get_tasks", "action_input": { "boardId": "all" } }`;
          else if (t === 'get_boards') isolatedJson = `{ "action": "get_boards", "action_input": {} }`;
          else if (t === 'get_projects') isolatedJson = `{ "action": "get_projects", "action_input": {} }`;
          break;
        }
      }
    }

    // --- JSON Repair Logic ---
    if (isolatedJson) {
      let repairedJson = isolatedJson;
      try {
        repairedJson = repairedJson.replace(/action_input":\s*"all"/g, 'action_input": { "boardId": "all" }');
        const actionMatch = repairedJson.match(/"action":\s*"([^"]+)"/);
        const action = actionMatch ? actionMatch[1] : null;

        if (action) {
          text = `Thought: ${thought}\nAction:\n\`\`\`json\n${repairedJson.trim()}\n\`\`\``;
        }
      } catch (e) {
        console.error("JSON Repair failed:", e);
      }
    } else if (text.trim().length > 5 && !text.includes('"action"')) {
      // Pure narrative fallback
      text = `Thought: I have determined the answer.\nAction:\n\`\`\`json\n{\n  "action": "Final Answer",\n  "action_input": ${JSON.stringify(text.trim())}\n}\n\`\`\``;
    }

    return text;
  }

  /**
   * Extract data that was retrieved from tool calls in the message history.
   * Tool results appear in the agent_scratchpad as "Observation: [...]"
   */
  private extractRetrievedData(messages: BaseMessage[]): { tasks?: any[]; boards?: any[]; projects?: any[] } | null {
    const data: { tasks?: any[]; boards?: any[]; projects?: any[] } = {};
    let hasData = false;

    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : '';

      // Look for "Observation:" followed by JSON array
      // Split by "Observation:" and check each part
      const parts = content.split(/Observation:\s*/);

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('[')) {
          // Find the end of the JSON array by counting brackets
          let bracketCount = 0;
          let endIndex = -1;

          for (let j = 0; j < part.length; j++) {
            if (part[j] === '[') bracketCount++;
            else if (part[j] === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                endIndex = j + 1;
                break;
              }
            }
          }

          if (endIndex > 0) {
            const jsonStr = part.substring(0, endIndex);
            try {
              const parsed = JSON.parse(jsonStr);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const firstItem = parsed[0];
                if (firstItem.title && (firstItem.status || firstItem.priority)) {
                  data.tasks = parsed;
                  hasData = true;
                } else if (firstItem.name && firstItem.kind !== undefined) {
                  data.boards = parsed;
                  hasData = true;
                } else if (firstItem.name) {
                  data.projects = parsed;
                  hasData = true;
                }
              }
            } catch {
              // Not valid JSON, skip
            }
          }
        }
      }
    }

    return hasData ? data : null;
  }

  /**
   * Format retrieved data into a human-readable summary.
   */
  private formatDataSummary(data: { tasks?: any[]; boards?: any[]; projects?: any[] }): string {
    const parts: string[] = [];

    if (data.tasks && data.tasks.length > 0) {
      parts.push(`Here are your tasks (${data.tasks.length} total):`);
      data.tasks.slice(0, 10).forEach((task, i) => {
        const status = task.status || 'unknown';
        parts.push(`${i + 1}. "${task.title}" - Status: ${status}`);
      });
      if (data.tasks.length > 10) {
        parts.push(`... and ${data.tasks.length - 10} more tasks.`);
      }
    }

    if (data.boards && data.boards.length > 0) {
      parts.push(`\nHere are your boards (${data.boards.length} total):`);
      data.boards.forEach((board, i) => {
        parts.push(`${i + 1}. "${board.name}"`);
      });
    }

    if (data.projects && data.projects.length > 0) {
      parts.push(`\nHere are your projects (${data.projects.length} total):`);
      data.projects.forEach((project, i) => {
        const status = project.status || '';
        parts.push(`${i + 1}. "${project.name}"${status ? ` - ${status}` : ''}`);
      });
    }

    return parts.length > 0 ? parts.join('\n') : 'No data found.';
  }
}

