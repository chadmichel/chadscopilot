---
title: "How to use GitHub Copilot SDK"
date: 2026-02-22
---

# Integrating GitHub Copilot SDK into an Electron + Angular app

This post walks through how the repository integrates the GitHub Copilot SDK in an Electron + Angular desktop app. It covers the key pieces: SDK initialization, session configuration, streaming responses, Electron main/preload IPC wiring, and renderer usage.

## Goals

- Use the official `@github/copilot-sdk` in a node/Electron process
- Support both GitHub Copilot auth (no API key) and BYOK provider keys
- Stream assistant deltas into the renderer (real-time responses)
- Keep sessions scoped to workspaces (so multiple workspaces can chat independently)

## Prerequisites

- Node / npm
- Electron (this project depends on Electron in `devDependencies`)
- If you plan to use a provider (OpenAI/Anthropic/Azure): a provider API key and optional base URL
- If you want to use GitHub Copilot auth: the Copilot CLI or normal GitHub Copilot authentication available on the machine

## Installation

Install the Copilot SDK in your project:

```bash
npm install @github/copilot-sdk
```

This project also uses a small wrapper service in the Electron main process to encapsulate the SDK usage. See `electron/copilot.service.ts` for the full implementation.

## Environment and auth options

Two common ways to authenticate the Copilot SDK are supported:

- BYOK provider: set `COPILOT_PROVIDER` (openai|anthropic|azure), `COPILOT_API_KEY`, optional `COPILOT_BASE_URL`, and `COPILOT_MODEL`.
- GitHub Copilot auth: omit `COPILOT_API_KEY` and rely on the machine's Copilot authentication (CLI or system integration).

The service builds a session config from environment variables; see the `buildSessionConfig()` helper in `electron/copilot.service.ts`.

## CopilotService (core ideas)

Key responsibilities implemented in `electron/copilot.service.ts`:

- Create and initialize a `CopilotClient`.
- Lazily create per-workspace sessions via `client.createSession(config)`.
- Route streaming deltas from the session back to callbacks supplied by the caller.
- Provide `sendMessage()` that sends a prompt and waits for completion while providing streaming deltas.
- Expose a `getAuthStatus()` helper so the renderer can display whether Copilot is authenticated.

Important excerpt (conceptual):

```ts
// create client
this.client = new CopilotClient();

// create session per workspace
const session = await this.client.createSession({ model: 'gpt-4.1', streaming: true, workingDirectory });

// subscribe to streaming events
session.on((event: any) => {
  if (event.type === 'assistant.message_delta') {
    callbacks.onDelta(event.data.deltaContent);
  }
});

// send and wait
await session.sendAndWait({ prompt: message });
callbacks.onComplete();
```

Refer to `electron/copilot.service.ts` for the exact implementation and robust error handling.

## Electron main process wiring

Initialize the service from `app.whenReady()` in the main process and register IPC handlers for renderer interaction. In this repo the main process does:

- Construct the `CopilotService` and call `await copilotService.initialize()`
- Register `ipcMain.handle('copilot:send-message', ...)` to accept messages from the renderer
- Register `ipcMain.handle('copilot:auth-status', ...)` which calls `copilotService.getAuthStatus()`

Channels used in this project (see `electron/main.ts`):

- `copilot:send-message` — send a message for a workspace
- `copilot:auth-status` — get authentication status
- `copilot:message-delta` (IPC event emitted from main to renderer) — streaming delta updates
- `copilot:message-complete` — completion event
- `copilot:error` — error events

## Preload / Renderer bridge

To securely expose IPC to the renderer, the project uses a preload script (`electron/preload.cts`) that exposes a compact API via `contextBridge.exposeInMainWorld('electronAPI', { ... })`.

The renderer calls:

- `electronAPI.sendMessage(workspaceId, message, folderPath)` — invokes `copilot:send-message`
- `electronAPI.onMessageDelta(fn)` — subscribe to streaming deltas
- `electronAPI.onMessageComplete(fn)` — subscribe to completion events
- `electronAPI.onError(fn)` — subscribe to errors

Example (renderer usage):

```ts
// send a message
window.electronAPI.sendMessage(workspaceId, 'Please summarize this code', folderPath);

// listen for streaming deltas
window.electronAPI.onMessageDelta((wsId, delta) => {
  if (wsId === workspaceId) appendDeltaToUI(delta);
});

window.electronAPI.onMessageComplete((wsId) => {
  if (wsId === workspaceId) markComplete();
});

window.electronAPI.onError((wsId, err) => {
  showError(err);
});
```

## Renderer (Angular) integration

On the Angular side, this project wires Copilot chat through IPC in UI components and services. Typical flow:

1. User types a message and clicks send.
2. Component calls `window.electronAPI.sendMessage(...)` with the workspace id and optional folder path.
3. Component subscribes to `onMessageDelta` and `onMessageComplete` to update the chat UI in real time.

Files to inspect for examples:

- Electron main wiring: `electron/main.ts`
- Preload API: `electron/preload.cts`
- Copilot service: `electron/copilot.service.ts`

## Best practices and tips

- Sessions per workspace: keep sessions keyed by a workspace id so concurrent chats don't mix.
- Streaming: deliver deltas to the renderer for a snappy UX; append them as they arrive instead of waiting for completion.
- BYOK vs GitHub Copilot auth: prefer BYOK if you need control over provider or a specific model; use GitHub Copilot auth if you want single-sign-on to GitHub-managed Copilot.
- Error handling: surface descriptive errors from the SDK to users and fall back gracefully.
- Resource cleanup: call `client.stop()` when quitting the app to clean up background resources.

## Packaging and macOS dock name

If you rely on Electron packaging (e.g., `electron-builder`) the product name and bundle identifiers should be updated for installers. For development, setting `app.name = 'What is Done'` in the main process updates the dock/menu name on macOS.

## Conclusion

This project shows a compact, production-minded integration of the GitHub Copilot SDK in an Electron environment, with an Angular renderer. The key parts are encapsulating SDK usage behind a service in the main process, streaming deltas into the renderer via IPC, and supporting both GitHub Copilot auth and provider API keys.

For more details, inspect the implementation:

- `electron/copilot.service.ts`
- `electron/main.ts`
- `electron/preload.cts`

If you'd like, I can also generate a concise example component in `src/app` that demonstrates sending messages and rendering streaming deltas.
