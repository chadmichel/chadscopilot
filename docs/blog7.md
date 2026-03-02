# Github Copilot 7 - UX Design Tool

Building high-quality user interfaces requires a tight feedback loop between design, code, and live preview. In our latest update to **What is Done**, we've introduced a powerful **UX Design Tool** that bridges this gap, allowing you to go from a conceptual design to a running Angular application in seconds.

## How it Works

The UX Design Tool is designed to be a specialized workspace for frontend development. Here’s a breakdown of the core workflow:

### 1. Project Scaffolding
When you create a new UX Design, the tool lets you choose a **Tech Stack** (like our optimized Angular + PrimeNG starter). It automatically:
*   Copies a full-featured skeleton project into your workspace under a new `designs/` directory.
*   Writes a `designtype.json` metadata file so the runner knows exactly how to build and execute your specific stack.
*   Runs `npm install` in the background so your environment is ready immediately.

### 2. The Integrated Runner
The heart of the experience is the **UX Design Runner**. This dedicated window provides a side-by-side view:
*   **The Agent Panel:** A resizable chat interface where you can talk to an AI agent that knows everything about your project's file structure.
*   **Live Preview:** A real-time capture of your development server. We’ve configured our starters to use **Mock Service Worker (MSW)** by default, so you can build dynamic, data-driven UIs without needing a live backend.

### 3. Native Integration
We believe AI should supplement your workflow, not lock you in. The tool now includes native integration buttons:
*   **Files:** Instantly open the project folder in Finder/Explorer to see the generated code.
*   **Terminal:** Launch a terminal window pre-navigated to your design folder for running custom scripts or deep-diving into Git.

### 4. Advanced Process Management
Building complex UIs requires stability. The UX Design Tool manages the entire lifecycle of your development server:
*   **Smart Port Management:** The tool automatically detects if your preferred port (defaulting to `7777`) is in use and cleans up zombie processes before starting.
*   **Detached Workers:** The dev server runs in a detached process group, meaning when you click **Stop**, we kill the entire process tree—no more "Port already in use" errors on restart.
*   **Smooth Layouts:** Both the code runner and the main workspace detail pages now feature **resizable panels**, giving you the flexibility to focus on the chat or the preview depending on your current task.

## Why This Matters

By combining scaffolding, live preview, and AI-driven code generation into a single, cohesive interface, we're removing the "friction of the blank page." Whether you're wireframing a new dashboard or refining a complex data grid, the UX Design Tool gives you a professional-grade environment to iterate faster than ever before.

Happy Designing!
