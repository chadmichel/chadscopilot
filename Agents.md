# 🤖 Agents.md — Agent Working Guide

Welcome, Agent! This guide explains the project structure, architectural patterns, and development workflows for "What is Done" (Chad's Copilot).

## 🚀 Quick Start
1.  **Dependencies**: `npm install`
2.  **Dev Mode**: `npm start`
    *   This runs Angular on `http://localhost:4300` and Electron in parallel.
    *   The Electron window automatically opens and connects to the Angular dev server.
3.  **Authentication**: Ensure you have the GitHub CLI installed and authenticated (`gh auth login`). The app uses your local GitHub session via the Copilot SDK.

## 🏗 Architecture
The app follows a standard Electron multi-process model:

-   **Main Process (`electron/`)**: Node.js environment. Handles:
    -   GitHub Copilot SDK integration (`copilot.service.ts`).
    -   local SQLite database management (`database.service.ts`).
    -   Native OS interactions (file picker, app menu).
    -   IPC handling (`main.ts`).
-   **Renderer Process (`src/`)**: Angular application.
    -   Uses **standalone components** (Angular 19+).
    -   Communicates with the Main process via `window.electronAPI` (exposed in `preload.cts`).
    -   Styling is done via pure CSS using theme variables defined in `src/styles.css`.

## 📁 Key Directories
-   `electron/`: Electron Main process source.
    -   `main.ts`: Entry point and IPC setup.
    -   `preload.cts`: Preload script (CommonJS for Electron compatibility).
    -   `copilot.service.ts`: Wrapper for `@github/copilot-sdk`.
    -   `database.service.ts`: Base service for persistence.
-   `src/app/`: Angular source.
    -   `chat/`: Chat interface and streaming logic.
    -   `pages/`: Main application views (Tasks, Tools, Workspaces).
    -   `services/`: Angular services that bridge to Electron IPC.
    -   `shared/`: Reusable components, pipes, and utilities.

## 🛠 Coding Standards & Patterns

### 1. IPC Communication
-   **Never** use Node.js APIs in the renderer.
-   Expose new IPC channels in `electron/preload.cts`.
-   Handle the channel in `electron/main.ts` using `ipcMain.handle`.
-   Wrap the IPC call in an Angular service (e.g., `src/app/services/workspace.service.ts`).

### 2. State Management
-   Use Angular services with `BehaviorSubject` or simple arrays/objects for state.
-   Most data is refreshed from the Electron Main process on initialization or after mutations.

### 3. Styling & Theming
-   The app supports multiple themes (Midnight, 80s Arcade, 90s Grunge).
-   Use CSS variables: `--theme-primary`, `--app-background`, `--app-surface`, `--app-text`.
-   Add new styles to `src/styles.css` if they are global, or the component's `styles` array for locals.

### 4. GitHub Integration
-   GitHub sync logic lives in `electron/main.ts` and uses `GitHubService`.
-   Tasks are synced to the local database and then loaded into the frontend.

## 🧪 Testing & Debugging
-   **DevTools**: The Electron window opens with DevTools enabled in development mode.
-   **Logs**: Check the terminal for Main process logs and the browser console for Renderer logs.

## 📝 Common Tasks for Agents
-   **Adding a Page**: Create a component in `src/app/pages/`, add the route in `src/app/app.routes.ts`, and update the sidebar in `src/app/sidebar/`.
-   **New Database Table**: Add a new service in `electron/` (extending `DatabaseService` pattern), register it in `main.ts`, and add IPC handlers.
-   **UI Refinement**: Prefer CSS transitions and glassmorphism (where appropriate) to maintain the "premium" feel.

---
*Happy coding! If you're stuck, read `README.md` for more technical details on the SDK integration.*
