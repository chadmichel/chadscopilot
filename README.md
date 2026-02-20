# Chad's Copilot

A desktop chat application built with **Electron**, **Angular**, and the **GitHub Copilot SDK**. This app provides a native desktop experience for conversing with GitHub Copilot through a clean, modern chat interface with real-time streaming responses.

## Architecture

The application is built on three layers:

```
┌──────────────────────────────────────────────┐
│            Angular (Renderer Process)         │
│  ┌────────────────────────────────────────┐   │
│  │           Chat Component               │   │
│  │  - Message display & input             │   │
│  │  - Markdown rendering                  │   │
│  │  - Streaming response display          │   │
│  └───────────────┬────────────────────────┘   │
│                  │ IPC via contextBridge       │
├──────────────────┼───────────────────────────-┤
│            Electron Main Process              │
│  ┌───────────────┴────────────────────────┐   │
│  │          Copilot Service               │   │
│  │  - GitHub Copilot SDK client           │   │
│  │  - Session management                  │   │
│  │  - Streaming event handling            │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────-┘
```

### How It Works

1. **User sends a message** in the Angular chat interface
2. **Angular `ChatService`** forwards the message via Electron IPC (`contextBridge`)
3. **Electron main process** receives the message through `ipcMain.handle`
4. **`CopilotService`** sends the message to GitHub Copilot using the SDK's `sendAndWait` method
5. **Streaming responses** arrive as `assistant.message_delta` events from the SDK
6. **Each delta** is forwarded back to the renderer process via `ipcRenderer.send`
7. **Angular `ChatService`** receives the deltas inside `NgZone.run()` to trigger change detection, updating the UI in real-time
8. **When complete**, `sendAndWait` resolves, signaling the response is finished

### Security Model

The app follows Electron security best practices:

- **`contextIsolation: true`** — the renderer has no direct access to Node.js APIs
- **`nodeIntegration: false`** — prevents the renderer from using `require()`
- Communication happens exclusively through a typed **preload bridge** (`preload.ts`)
- Only specific IPC channels are exposed to the renderer (`copilot:send-message`, `copilot:message-delta`, `copilot:message-complete`, `copilot:error`)

## Prerequisites

- **Node.js 18** or higher
- **GitHub Copilot CLI** installed and authenticated

  ```bash
  # Install the GitHub Copilot CLI extension
  gh extension install github/gh-copilot

  # Verify installation
  copilot --version
  ```

- A valid **GitHub Copilot subscription** (Individual, Business, or Enterprise)

## Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd chadscopilot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development environment**

   ```bash
   npm start
   ```

   This command will:
   - Compile the Electron TypeScript files to `dist-electron/`
   - Start the Angular dev server on `http://localhost:4200`
   - Wait for Angular to be ready, then launch the Electron window

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the full dev environment (Angular + Electron) |
| `npm run start:angular` | Start only the Angular dev server |
| `npm run build:electron` | Compile Electron TypeScript to `dist-electron/` |
| `npm run build` | Production build of Angular + Electron |
| `npm run build:prod` | Production-optimized build |

## Project Structure

```
chadscopilot/
├── electron/                       # Electron main process (Node.js)
│   ├── main.ts                     # App entry, window creation, IPC setup
│   ├── preload.ts                  # Context bridge — exposes IPC to renderer
│   └── copilot.service.ts          # GitHub Copilot SDK wrapper
│
├── src/                            # Angular application (renderer process)
│   ├── app/
│   │   ├── app.component.*         # Root component with header
│   │   ├── app.config.ts           # Angular application config
│   │   ├── chat/
│   │   │   ├── chat.component.*    # Chat UI — messages, input, streaming
│   │   │   └── chat.service.ts     # Chat state management & IPC bridge
│   │   └── shared/
│   │       └── markdown.pipe.ts    # Markdown-to-HTML rendering pipe
│   ├── index.html                  # HTML entry point
│   ├── main.ts                     # Angular bootstrap
│   └── styles.css                  # Global styles (markdown, code blocks)
│
├── angular.json                    # Angular CLI configuration
├── tsconfig.json                   # Base TypeScript config
├── tsconfig.app.json               # Angular TypeScript config
├── tsconfig.electron.json          # Electron TypeScript config (CommonJS)
└── package.json                    # Dependencies and scripts
```

## IPC Channel Reference

| Channel | Direction | Purpose |
|---|---|---|
| `copilot:send-message` | Renderer → Main | User sends a chat message |
| `copilot:message-delta` | Main → Renderer | Streaming response chunk (partial text) |
| `copilot:message-complete` | Main → Renderer | Response finished |
| `copilot:error` | Main → Renderer | Error during processing |

## How the Copilot SDK Integration Works

The app uses the [`@github/copilot-sdk`](https://github.com/github/copilot-sdk) npm package, which connects to GitHub Copilot through your authenticated GitHub CLI session.

### Session Lifecycle

```typescript
// 1. Create a client instance
const client = new CopilotClient();

// 2. Create a streaming session with a model
const session = await client.createSession({
  model: 'gpt-4.1',
  streaming: true,
});

// 3. Subscribe to streaming events (set up once)
session.on((event) => {
  if (event.type === 'assistant.message_delta') {
    // Handle each text chunk as it arrives
    process.stdout.write(event.data.deltaContent);
  }
});

// 4. Send messages — resolves when response is complete
await session.sendAndWait({ prompt: 'Explain closures in JavaScript' });

// 5. Clean up when done
await client.stop();
```

### Changing the Model

The default model is `gpt-4.1`. To change it, edit [electron/copilot.service.ts](electron/copilot.service.ts) and modify the `model` parameter in `createSession()`.

### Key SDK Concepts

| Concept | Description |
|---|---|
| `CopilotClient` | Top-level client; manages the connection to Copilot |
| `createSession()` | Creates a conversation session with model selection and streaming config |
| `sendAndWait()` | Sends a prompt and resolves when Copilot finishes responding |
| `session.on()` | Event listener for streaming deltas and state changes |
| `assistant.message_delta` | Event fired for each chunk of streaming text |
| `session.idle` | Event fired when the response is complete |

## Build Output

Running `npm run build` produces:

| Directory | Contents |
|---|---|
| `dist/chadscopilot/browser/` | Compiled Angular application |
| `dist-electron/` | Compiled Electron main process files |

In production mode, Electron loads the Angular app from `dist/chadscopilot/browser/index.html`. In development, it connects to the Angular dev server at `http://localhost:4200`.

## Troubleshooting

### "Copilot service not initialized"

Ensure the GitHub Copilot CLI is installed and authenticated:

```bash
copilot --version
gh auth status
```

### App shows "Running in browser mode"

This message appears when accessing the Angular app directly in a browser (without Electron). The Copilot SDK requires the Electron main process for Node.js access. Use `npm start` to launch with Electron.

### Streaming not working

Verify your Copilot subscription is active and the CLI token hasn't expired:

```bash
gh auth login
```

### Angular dev server port conflict

If port 4200 is in use, the `wait-on` command will find the existing server. Stop other Angular dev servers first, or change the port in `angular.json` and `electron/main.ts`.

## License

See [LICENSE](LICENSE) for details.
