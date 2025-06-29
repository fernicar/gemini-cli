# TINS README for Gemini Core

## Description

This project provides the core functionalities for interacting with Google's Gemini AI models. It is designed to be used by other packages, such as a CLI or a web application, to enable features like sending prompts, managing chat history, executing tools, handling authentication, and collecting telemetry.

## Functionality

### Core Features

-   **AI Model Interaction:**
    -   `GeminiClient`: Manages communication with the Gemini API (both standard and Code Assist server for OAuth).
    -   `GeminiChat`: Handles chat sessions, including maintaining conversation history and sending messages.
    -   Supports streaming responses for real-time output.
    -   Handles different authentication types (API Key, Vertex AI, OAuth for personal accounts).
    -   Supports Flash model fallback for OAuth users experiencing rate limits.
-   **Tool Management and Execution:**
    -   `ToolRegistry`: Manages a collection of available tools (both built-in and discovered).
    -   `CoreToolScheduler`: Orchestrates the lifecycle of tool calls requested by the AI model, including validation, confirmation (if needed), execution, and response handling.
    -   Supports client-initiated tool calls.
    -   Mechanism for tools to provide live output updates during execution.
-   **Built-in Tools:**
    -   File system operations: `list_directory` (ls), `read_file`, `read_many_files`, `write_file`, `replace` (edit).
    -   Code searching: `search_file_content` (grep), `glob`.
    -   Shell command execution: `run_shell_command`.
    -   Web interaction: `web_fetch`, `google_web_search`.
    -   Memory management: `save_memory`.
-   **Configuration Management:**
    -   `Config`: Central class holding all runtime configurations (API keys, model names, directories, feature flags, etc.).
    -   Loads and merges settings from user and workspace files.
    -   Handles environment variables for configuration overrides.
-   **Context Management:**
    -   Loads hierarchical context from `GEMINI.md` (or custom-named) files from the user's home directory, project root, and subdirectories.
    -   Supports context from extensions.
    -   `MemoryTool` for explicitly saving user-specific facts.
-   **Authentication:**
    -   `AuthType` enum for different authentication methods.
    -   `createContentGeneratorConfig` and `createContentGenerator` for setting up the appropriate API client based on auth type.
    -   OAuth 2.0 flow for personal Google accounts (`code_assist/oauth2.ts`), including local server for redirect handling and token caching.
    -   Code Assist server interaction for enterprise users (`code_assist/server.ts`).
-   **Telemetry and Logging:**
    -   `Logger`: Logs chat interactions and tool calls to a local file for history and debugging.
    -   Supports OpenTelemetry for structured logging and metrics if enabled.
    -   `ClearcutLogger` for sending usage statistics to Google (opt-in).
    -   Provides events for various actions (session start/end, user prompt, API requests/responses/errors, tool calls).
-   **Error Handling:**
    -   Custom error classes (e.g., `ForbiddenError`, `UnauthorizedError`).
    -   `reportError` utility for generating detailed error reports.
    -   `parseAndFormatApiError` for user-friendly display of API errors.
    -   Retry mechanism with exponential backoff for API calls (`retryWithBackoff`).
-   **File and Path Utilities:**
    -   `FileDiscoveryService`: Handles git-aware file filtering (.gitignore, .geminiignore).
    -   `GitService`: Provides git operations like creating snapshots and getting current commit hash for checkpointing.
    -   Utilities for path manipulation (tildeify, shorten, makeRelative, escape/unescape).
    -   File type detection (text, image, pdf, binary).
    -   Content processing for different file types (e.g., base64 encoding for images/PDFs).
-   **MCP (Model Context Protocol) Integration:**
    -   `discoverMcpTools`: Connects to and discovers tools from MCP servers.
    -   `DiscoveredMCPTool`: Represents a tool discovered via MCP.
    -   Handles different MCP transport types (stdio, SSE, streamable HTTP).
    -   Manages MCP server status and discovery state.

### Key Abstractions

-   **`ContentGenerator`:** Interface for models that can generate content (implemented by `CodeAssistServer` and GenAI SDK's `Models`).
-   **`Tool` / `BaseTool`:** Defines the interface and base implementation for all tools, including schema, validation, and execution logic.
-   **`ModifiableTool`:** Interface for tools that support interactive modification of their proposed actions (e.g., `EditTool`, `WriteFileTool`).
-   **`Turn`:** Represents a single turn in the conversation, managing the flow of messages and tool calls.

## Technical Implementation

### Architecture

-   **Layered Design:** The core logic is separated from specific UI implementations or CLI wrappers.
-   **Service-Oriented:** Key functionalities like file discovery, git operations, and telemetry are encapsulated in services/modules.
-   **Event-Driven (for Telemetry):** Uses an event-based system for logging telemetry data.
-   **Asynchronous Operations:** Leverages async/await for non-blocking I/O and API calls.

### Core Components and Modules

-   **`config/`**: Handles configuration loading, model definitions, and Flash fallback logic.
-   **`core/`**: Contains the main interaction logic:
    -   `client.ts` (GeminiClient): High-level client for interacting with Gemini.
    -   `contentGenerator.ts`: Abstraction for different AI backends.
    -   `geminiChat.ts`: Manages chat history and session state.
    -   `coreToolScheduler.ts`: Manages the lifecycle of tool calls.
    -   `turn.ts`: Represents a single conversational turn.
    -   `logger.ts`: Handles local logging of interactions.
    -   `prompts.ts`: Defines system prompts.
-   **`tools/`**: Defines and implements all built-in tools and the MCP tool integration.
    -   `tool-registry.ts`: Discovers and manages available tools.
    -   `mcp-client.ts`: Handles communication with MCP servers.
-   **`services/`**:
    -   `fileDiscoveryService.ts`: Manages file system scanning and filtering.
    -   `gitService.ts`: Provides Git-related functionalities.
-   **`code_assist/`**: Implements OAuth authentication and interaction with the Code Assist server.
-   **`telemetry/`**: Manages telemetry collection and export (OpenTelemetry, Clearcut).
-   **`utils/`**: Contains various utility functions for error handling, file operations, string manipulation, path management, retry logic, etc.

### Data Structures

-   **`Content` (from `@google/genai`):** Represents user or model messages, composed of `Part` objects.
-   **`Part` (from `@google/genai`):** Represents a piece of content (text, function call, function response, inline data).
-   **`ToolCallRequestInfo`:** Information about a tool call requested by the model.
-   **`ToolCallResponseInfo`:** Information about the result of a tool call.
-   **`ToolCall` (internal to `CoreToolScheduler`):** Tracks the state of a tool call through its lifecycle.
-   **`LogEntry`:** Structure for local log files.
-   **`TelemetryEvent` (and its subtypes):** Structures for telemetry data.

### Key Algorithms and Processes

-   **Chat Interaction Loop (simplified):**
    1.  User provides input.
    2.  `GeminiClient` sends input (plus history and system prompt) to `ContentGenerator`.
    3.  `ContentGenerator` streams back responses.
    4.  If response includes tool call requests:
        -   `CoreToolScheduler` validates parameters.
        -   Prompts user for confirmation if needed (based on tool config and approval mode).
        -   Executes the tool (built-in or MCP).
        -   Sends tool response back to `ContentGenerator`.
        -   Continues processing stream from `ContentGenerator`.
    5.  If response is text, it's yielded to the caller.
    6.  History is updated.
-   **Hierarchical Memory Loading (`utils/memoryDiscovery.ts`):**
    -   Scans upwards from CWD to project root (if in git repo) or home directory.
    -   Scans downwards from CWD (respecting ignores and limits).
    -   Loads global `GEMINI.md` from user's home `.gemini` directory.
    -   Loads context files specified by extensions.
    -   Concatenates content in a specific order of precedence (global, upward, CWD, downward, extensions).
-   **Tool Discovery (`tools/tool-registry.ts`):**
    -   Registers built-in tools.
    -   Executes a user-configured discovery command (if any) to find custom tools.
    -   Connects to configured MCP servers to list and register their tools.
-   **Edit Correction (`utils/editCorrector.ts`):**
    -   `ensureCorrectEdit`: If an `EditTool`'s `old_string` doesn't match, attempts to unescape it. If still no match, uses an LLM call to find the most likely intended match in the file content. Also uses an LLM call to correct potential over-escaping in the `new_string`.
    -   `ensureCorrectFileContent`: For `WriteFileTool`, uses an LLM to correct potential over-escaping in the proposed file content.
-   **Telemetry Reporting:**
    -   `initializeTelemetry` sets up OpenTelemetry SDK with appropriate exporters (Console or OTLP gRPC).
    -   Various `log*` functions in `telemetry/loggers.ts` emit events and metrics.
    -   `ClearcutLogger` batches and sends usage statistics to Google.

## External Dependencies

-   **`@google/genai`:** Google Generative AI SDK for Node.js, used for core AI model interactions (when not using Code Assist server).
-   **`google-auth-library`:** For OAuth 2.0 authentication.
-   **`gaxios`:** HTTP client used by `google-auth-library`.
-   **`@modelcontextprotocol/sdk`:** For MCP client implementation and tool discovery.
-   **`glob`:** For file globbing patterns.
-   **`ignore`:** For parsing `.gitignore` and `.geminiignore` files.
-   **`mime-types`:** For determining MIME types of files.
-   **`diff`:** For generating text diffs.
-   **`shell-quote`:** For parsing shell commands.
-   **`simple-git`:** For Git operations related to checkpointing.
-   **OpenTelemetry SDK and Exporter packages:** For telemetry collection.
-   **`html-to-text`:** For converting HTML to plain text in `web_fetch` tool.
<!-- TINS Specification v1.0 -->
