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

-   **Layered Design:** The core logic is separated from specific UI implementations or CLI wrappers. It provides a set of services and components that can be consumed by various frontends.
-   **Service-Oriented:** Key functionalities like file discovery (`FileDiscoveryService`), git operations (`GitService`), and AI interaction (`GeminiClient`, `ContentGenerator`) are encapsulated in distinct services or classes.
-   **Event-Driven (for Telemetry):** Uses an event-based system for logging telemetry data, allowing for flexible and decoupled metric collection.
-   **Asynchronous Operations:** Leverages `async/await` for non-blocking I/O (file system, network calls) and API interactions, ensuring responsiveness.

### Core Components and Modules

-   **`config/`**:
    -   `config.ts`: Defines the main `Config` class and `ConfigParameters` interface. `Config` is the central hub for all runtime settings, including model names, API keys (via `ContentGeneratorConfig`), directory paths, tool configurations, telemetry settings, and feature flags (debug mode, approval mode, sandboxing). It initializes the `ToolRegistry` and `GeminiClient`.
    -   `models.ts`: Exports constants for default Gemini model names (e.g., `DEFAULT_GEMINI_MODEL`, `DEFAULT_GEMINI_FLASH_MODEL`).
    -   `flashFallback.test.ts`: (Test file) Demonstrates logic for handling automatic fallback to a "flash" model if the primary "pro" model is rate-limited, specifically for OAuth users. The `Config` class contains `isModelSwitchedDuringSession`, `setModel`, and `resetModelToDefault` to manage this state. The actual fallback decision is made within `retryWithBackoff` based on the `onPersistent429` callback and `authType`.
-   **`core/`**: Contains the main interaction logic with the Gemini models and tool execution orchestration.
    -   `contentGenerator.ts`: Defines the `ContentGenerator` interface (for `generateContent`, `generateContentStream`, `countTokens`, `embedContent`) and `ContentGeneratorConfig`. The `createContentGenerator` factory function instantiates the appropriate backend (either `CodeAssistServer` for OAuth or the GenAI SDK's `Models` for API keys/Vertex).
    -   `client.ts` (`GeminiClient`): A high-level client that wraps `ContentGenerator` and `GeminiChat`. It provides methods for sending messages (`sendMessageStream`, `generateJson`, `generateContent`), managing chat history (`addHistory`, `getHistory`, `resetChat`), generating embeddings (`generateEmbedding`), and attempting chat compression (`tryCompressChat`). It also handles system prompt assembly and retry logic with Flash fallback (delegating to `retryWithBackoff` and using `config.flashFallbackHandler`).
    -   `geminiChat.ts` (`GeminiChat`): Manages the conversational state, including history (`this.history`). It prepares requests for the `ContentGenerator` by combining current input with historical context and system instructions. It also processes responses, including consolidating multi-part model outputs (merging adjacent text parts, filtering "thought" parts) and handling automatic function calling history.
    -   `turn.ts` (`Turn`): Represents a single conversational turn (user input to model response, potentially including tool calls). It orchestrates the `sendMessageStream` call to `GeminiChat`, processes the stream of `ServerGeminiStreamEvent`s (content, tool calls, thoughts, errors, usage metadata), and manages `pendingToolCalls`.
    -   `coreToolScheduler.ts` (`CoreToolScheduler`): Manages the lifecycle of tool calls requested by the AI model. It validates parameters against tool schemas, handles confirmation flows (if required by the tool or `ApprovalMode`), executes tools, and collects their responses. It uses an internal queue (`this.toolCalls`) to manage tool states (Validating, Scheduled, AwaitingApproval, Executing, Success, Error, Cancelled).
    -   `nonInteractiveToolExecutor.ts`: Provides `executeToolCall` for executing a single tool call without user interaction, suitable for non-interactive CLI mode or automated scripts.
    -   `logger.ts` (`Logger`): Handles local logging of chat interactions and tool calls to a JSON file (`logs.json`) in a temporary project-specific directory (`~/.gemini/tmp/<hash>/`). Also manages chat checkpoints (`checkpoint-*.json`) for saving and resuming conversations.
    -   `prompts.ts`: `getCoreSystemPrompt` function assembles the main system prompt sent to Gemini. This prompt includes core mandates (conventions, library usage, style), primary workflows (software engineering tasks, new application development), operational guidelines (tone, security), tool usage instructions, and context-aware sections (sandbox status, Git repository presence). It can also incorporate user-defined memory from `GEMINI.md` files or custom context files.
    -   `tokenLimits.ts`: Provides `tokenLimit` function to get the context window size for different Gemini models.
    -   `modelCheck.ts`: `getEffectiveModel` function checks if the default "pro" model is rate-limited (by making a small test API call) and suggests a "flash" model fallback if necessary for OAuth users to avoid persistent 429 errors.
-   **`tools/`**: Defines and implements all built-in tools and the MCP (Model Context Protocol) tool integration.
    -   `tools.ts`: Defines the base `Tool` interface, `BaseTool` abstract class, and various supporting types like `ToolResult` (llmContent, returnDisplay), `ToolCallConfirmationDetails` (edit, exec, mcp, info types), and `ToolConfirmationOutcome`.
    -   Individual tool files (e.g., `edit.ts`, `read-file.ts`, `shell.ts`): Each implements a specific tool by extending `BaseTool`, providing a schema, validation logic (`validateToolParams`), user-facing description generation (`getDescription`), confirmation logic (`shouldConfirmExecute`), and an `execute` method.
        -   Modifiable tools (like `EditTool`, `WriteFileTool`) also implement the `ModifiableTool` interface, providing `getModifyContext` for integration with external editors.
    -   `tool-registry.ts` (`ToolRegistry`): Discovers and manages available tools. It registers built-in tools and can discover custom tools via a user-configured command (`config.getToolDiscoveryCommand()`) and parsing its JSON output (expected to be `FunctionDeclaration[]`). It also calls `discoverMcpTools` for MCP integration.
    -   `mcp-client.ts`: `discoverMcpTools` handles discovery of tools from MCP servers defined in `Config`. It uses `@modelcontextprotocol/sdk`'s `Client` to connect to servers (via stdio, SSE, or streamable HTTP transports based on `MCPServerConfig`). It lists tools, sanitizes their schemas (e.g., removing `$schema`), and registers them as `DiscoveredMCPTool` instances in the `ToolRegistry`. Manages MCP server connection statuses (`MCPServerStatus`) and overall discovery state (`MCPDiscoveryState`).
    -   `mcp-tool.ts` (`DiscoveredMCPTool`): A wrapper class for tools discovered via MCP, adapting them to the `Tool` interface. It handles calling the remote MCP tool via `mcpClient.callTool` and formatting the response. Implements `shouldConfirmExecute` for MCP tools based on server trust or allowlists.
    -   `memoryTool.ts` (`MemoryTool`): Implements the `/memory add` functionality. Its static method `performAddMemoryEntry` appends facts to a `GEMINI.md` (or custom-named context file, managed by `set/getCurrent/getAllGeminiMdFilenames`) in `~/.gemini/`.
-   **`services/`**:
    -   `fileDiscoveryService.ts` (`FileDiscoveryService`): Manages file system scanning and filtering. It loads and applies ignore patterns from `.gitignore` and `.geminiignore` files using `GitIgnoreParser`. Provides `filterFiles` and `shouldGitIgnoreFile` methods.
    -   `gitService.ts` (`GitService`): Provides Git-related functionalities for checkpointing. It initializes and uses a shadow Git repository located in `~/.gemini/history/<hash>/`. Methods include `createFileSnapshot` (commits current project state to shadow repo) and `restoreProjectFromSnapshot` (checks out a commit in shadow repo, effectively restoring project files). It verifies Git availability and sets up a local `.gitconfig` for the shadow repo to avoid using global user settings.
-   **`code_assist/`**: Implements OAuth authentication and interaction with the Google Code Assist server (backend for personal Google Account auth).
    -   `oauth2.ts`: `getOauthClient` handles the OAuth 2.0 flow for personal Google accounts. It tries to load cached credentials from `~/.gemini/oauth_creds.json`. If invalid/missing, `authWithWeb` starts a local HTTP server for the redirect URI, generates an auth URL, opens it in the browser. Upon successful callback, it exchanges the auth code for tokens using `google-auth-library`'s `OAuth2Client` and caches them. `clearCachedCredentialFile` removes the cached tokens.
    -   `server.ts` (`CodeAssistServer`): Implements the `ContentGenerator` interface for the Code Assist backend. It makes authenticated HTTP requests (using `AuthClient` from `google-auth-library`) to the Code Assist API endpoints (e.g., `streamGenerateContent`, `onboardUser`, `loadCodeAssist`, `getCodeAssistGlobalUserSetting`, `setCodeAssistGlobalUserSetting`).
    -   `converter.ts`: Contains functions (`toGenerateContentRequest`, `fromGenerateContentResponse`, etc.) to convert between the GenAI SDK's `GenerateContentParameters`/`Response` types and the Code Assist server's specific request/response formats (e.g., `CAGenerateContentRequest`, `CaGenerateContentResponse`).
    -   `setup.ts`: `setupUser` handles user onboarding for Code Assist. It calls `CodeAssistServer.loadCodeAssist` to get user tier (`GeminiUserTier`) and the assigned `cloudaicompanionProject`. If the tier requires a user-defined project and `GOOGLE_CLOUD_PROJECT` is not set, it throws `ProjectIdRequiredError`. It then calls `CodeAssistServer.onboardUser` (a long-running operation, polled until `done`).
    -   `types.ts`: Defines TypeScript interfaces for Code Assist API request/response structures (e.g., `ClientMetadata`, `LoadCodeAssistResponse`, `GeminiUserTier`, `OnboardUserRequest`).
-   **`telemetry/`**: Manages optional telemetry collection and export.
    -   `sdk.ts`: `initializeTelemetry` sets up the OpenTelemetry SDK (`@opentelemetry/sdk-node`) if telemetry is enabled in `Config`. Configures a `Resource` with service name and session ID. Sets up OTLP gRPC exporters (`OTLPTraceExporter`, `OTLPLogExporter`, `OTLPMetricExporter`) if an endpoint is provided in `Config`, otherwise uses console exporters. Initializes OpenTelemetry metrics via `initializeMetrics`. `shutdownTelemetry` gracefully shuts down the SDK and `ClearcutLogger`.
    -   `loggers.ts`: Provides functions (e.g., `logUserPrompt`, `logToolCall`, `logApiResponse`, `logApiError`, `logCliConfiguration`) to create structured log records (`LogRecord` from `@opentelemetry/api-logs`) with specific event names and attributes, then emit them using `logs.getLogger().emit()`. These functions also call corresponding `record*Metrics` functions.
    -   `metrics.ts`: Defines and records OpenTelemetry metrics (Counters and Histograms like `toolCallCounter`, `apiRequestLatencyHistogram`, `tokenUsageCounter`, `sessionCounter`, `fileOperationCounter`). `initializeMetrics` creates these metric instruments. `record*Metrics` functions add values to these instruments with appropriate attributes.
    -   `types.ts`: Defines structures for telemetry events (e.g., `StartSessionEvent`, `UserPromptEvent`, `ToolCallEvent`, `ApiResponseEvent`, `ApiErrorEvent`).
    -   `clearcut-logger/`: Contains `ClearcutLogger` for sending usage statistics to Google's Clearcut service (if `config.getUsageStatisticsEnabled()` is true). It batches events and sends them via HTTPS POST to `play.googleapis.com/log`. `EventMetadataKey` enum maps event fields to Clearcut keys.
-   **`utils/`**: Contains various utility functions.
    -   Error handling (`errors.ts`, `errorReporting.ts`).
    -   File operations (`fileUtils.ts`, `paths.ts`, `memoryDiscovery.ts`, `bfsFileSearch.ts`).
    -   String manipulation and generation (`generateContentResponseUtilities.ts`, `editCorrector.ts`).
    -   Network operations (`fetch.ts`).
    -   Git utilities (`gitUtils.ts`, `gitIgnoreParser.ts`).
    -   Other utilities like `LruCache.ts`, `retry.ts`, `schemaValidator.ts`, `session.ts`, `user_id.ts`.
    -   `nextSpeakerChecker.ts`: `checkNextSpeaker` uses an LLM call to determine if the 'user' or 'model' should speak next based on the last model response, to help manage multi-turn tool interactions.

### Data Structures

-   **`Content` (from `@google/genai`):** Represents user or model messages, composed of `Part` objects. Used throughout chat history (`GeminiChat.history`) and API interactions.
-   **`Part` (from `@google/genai`):** Represents a piece of content within a `Content` object (e.g., `text`, `functionCall`, `functionResponse`, `inlineData` for images/PDFs, `fileData`).
-   **`ToolCallRequestInfo` (defined in `core/turn.ts`):** Information about a tool call requested by the model, including `callId`, `name`, `args` (parameters), and `isClientInitiated` flag.
-   **`ToolCallResponseInfo` (defined in `core/turn.ts`):** Information about the result of a tool call, including `callId`, `responseParts` (formatted for Gemini API), `resultDisplay` (user-friendly string or `FileDiff`), and any `error`.
-   **`ToolCall` (internal to `CoreToolScheduler`):** Tracks the state of a tool call through its lifecycle (Validating, Scheduled, AwaitingApproval, Executing, Success, Error, Cancelled). Includes the `request`, `tool` instance, `response` (if completed), timing information (`startTime`, `durationMs`), and user `outcome` from confirmation.
-   **`LogEntry` (`core/logger.ts`):** Structure for local log files (`logs.json`), containing `sessionId`, `messageId`, `timestamp`, `type` (user/model/system), and `message` text.
-   **`TelemetryEvent` (and its subtypes in `telemetry/types.ts`):** Structures for telemetry data sent to Clearcut and/or OTLP, e.g., `StartSessionEvent`, `UserPromptEvent`, `ToolCallEvent` (includes function name, args, duration, success, decision, error), `ApiResponseEvent` (includes model, status, duration, token counts).
-   **`ConfigParameters` & `Config` (`config/config.ts`):** `ConfigParameters` is the input to the `Config` constructor. `Config` itself holds all resolved runtime settings, including API keys, model names, directory paths, tool configurations, telemetry preferences, and references to services like `GeminiClient` and `ToolRegistry`.
-   **`ContentGeneratorConfig` (`core/contentGenerator.ts`):** Holds backend-specific configuration like `model` name, `apiKey` (if applicable), `vertexai` flag, and `authType`.
-   **`MCPServerConfig` (`config/config.ts`):** Configuration for an MCP server, including connection details (command, URL, TCP), timeout, trust flag, and optional description.
-   **`SandboxConfig` (`config/config.ts`):** Defines sandbox `command` (docker, podman, sandbox-exec) and `image` name.
-   **`Tool` & `FunctionDeclaration` (from `@google/genai` and `tools/tools.ts`):** `FunctionDeclaration` is the schema Gemini uses for tools. `Tool` is the core package's interface, with `BaseTool` as an abstract class. `DiscoveredTool` and `DiscoveredMCPTool` are specific implementations for dynamically found tools.

### Key Algorithms and Processes

-   **Chat Interaction Loop (`GeminiClient` & `Turn`):**
    1.  `GeminiClient.sendMessageStream` is called with user input (`PartListUnion`) and an `AbortSignal`.
    2.  A new `Turn` instance is created, associated with the current `GeminiChat` session.
    3.  `Turn.run` assembles the request: `GeminiChat.getHistory(true)` (curated history) + current user input.
    4.  The request is sent to `GeminiChat.sendMessageStream`.
        -   `GeminiChat` calls `ContentGenerator.generateContentStream` (which could be `CodeAssistServer` or GenAI SDK's `Models`). This involves `retryWithBackoff`.
        -   If persistent 429 errors occur for OAuth users, `handleFlashFallback` (in `GeminiClient`, called by `retryWithBackoff`) may be invoked. If the `config.flashFallbackHandler` (set by CLI) accepts, `config.setModel` updates the model to Flash for the session.
    5.  `Turn.run` iterates over the async stream of `GenerateContentResponse` chunks from the `ContentGenerator`:
        -   `thought` parts are yielded as `GeminiEventType.Thought`.
        -   `text` parts are yielded as `GeminiEventType.Content`.
        -   `functionCall` parts are collected into `Turn.pendingToolCalls` and yielded as `GeminiEventType.ToolCallRequest`. A unique `callId` is generated if missing.
        -   `usageMetadata` is stored in `Turn.lastUsageMetadata`.
        -   If `signal.aborted`, yields `GeminiEventType.UserCancelled`.
        -   Errors are caught, reported via `reportError`, and yielded as `GeminiEventType.Error`.
    6.  After the stream, if `pendingToolCalls` exist, the calling layer (e.g., CLI's `useGeminiStream`) uses `CoreToolScheduler.schedule` to process them.
    7.  If no tool calls and stream ended normally, `checkNextSpeaker` (LLM call) might be invoked by `GeminiClient` to see if the model intends to continue, potentially leading to a recursive call to `sendMessageStream` with a "Please continue" prompt.
    8.  Finally, `GeminiChat.recordHistory` is called by `GeminiChat.sendMessageStream`'s processing loop to update the conversation history with the user input and the consolidated model output (text and/or function responses), also handling `automaticFunctionCallingHistory` from the API.
-   **Hierarchical Memory Loading (`utils/memoryDiscovery.ts` - `loadServerHierarchicalMemory`):**
    -   Determines `geminiMdFilenames` to search for (default `GEMINI.md`, can be custom via `setGeminiMdFilename`).
    -   For each filename:
        1.  **Global:** Reads from `~/.gemini/<filename>`.
        2.  **Upward Traversal:** From CWD, walks up to project root (identified by `.git` or stops at home dir), reading `<filename>` in each directory. These are added in reverse order (root/home first).
        3.  **Downward Traversal:** Performs a Breadth-First Search (BFS via `bfsFileSearch`) from CWD downwards. `bfsFileSearch` uses `fs.readdir` with `withFileTypes: true`, respects `ignoreDirs`, `maxDirs` (`MAX_DIRECTORIES_TO_SCAN_FOR_MEMORY`), and can use `FileDiscoveryService` for `.gitignore` filtering. It reads `<filename>` in found subdirectories.
    -   **Extension Context:** Reads context files specified by loaded extensions (`config.getExtensionContextFilePaths()`).
    -   All found file contents are read (via `readGeminiMdFiles`), filtered for non-null content, and concatenated with separators (`--- Context from: <path> ---`) indicating their relative paths to CWD. The final string becomes `Config.userMemory`. `Config.geminiMdFileCount` is updated.
-   **Tool Discovery (`tools/tool-registry.ts` - `ToolRegistry.discoverTools`):**
    -   Removes previously discovered tools (instances of `DiscoveredTool` or `DiscoveredMCPTool`).
    -   If `config.getToolDiscoveryCommand()` is set, executes it using Node.js `child_process.execSync`. Parses the JSON output (expected to be an array of `FunctionDeclaration` or objects containing them, e.g., `[{ "function_declarations": [...] }]`). For each valid declaration, registers a new `DiscoveredTool` instance.
    -   Calls `discoverMcpTools` (from `tools/mcp-client.ts`) with MCP server configurations from `Config`.
-   **MCP Tool Discovery (`tools/mcp-client.ts` - `discoverMcpTools`):**
    -   Iterates over MCP servers defined in `config.getMcpServers()` and potentially one from `config.getMcpServerCommand()`.
    -   For each server:
        -   Sets server status to `CONNECTING`.
        -   Creates an MCP `Client` from `@modelcontextprotocol/sdk` with appropriate transport (`StdioClientTransport`, `SSEClientTransport`, or `StreamableHTTPClientTransport`) based on `MCPServerConfig` (command, URL, httpUrl).
        -   Calls `mcpClient.connect()`. On success, updates status to `CONNECTED`. On failure, logs error and sets status to `DISCONNECTED`.
        -   Sets `mcpClient.onerror` handler to log errors and set status to `DISCONNECTED`.
        -   Calls `mcpToTool` (from `@google/genai`) to get a `CallableTool` instance.
        -   Calls `callableTool.tool()` to retrieve `FunctionDeclaration[]`.
        -   For each declaration, creates a `DiscoveredMCPTool` instance. It sanitizes schema parameters (removes `$schema`, and `default` if `anyOf` is present, recursively). Handles potential name collisions by prefixing with `serverName__` if a tool with the same name already exists in the registry. Tool names are also constrained to 63 chars.
        -   Registers the `DiscoveredMCPTool` with the `ToolRegistry`.
        -   If a server provides no tools after discovery, its connection is closed.
    -   Sets overall `mcpDiscoveryState` to `COMPLETED`.
-   **Edit Correction (`utils/editCorrector.ts`):**
    -   `ensureCorrectEdit`:
        1.  Checks cache `editCorrectionCache` (LRU, max 50) using `currentContent`, `originalParams.old_string`, `originalParams.new_string` as key.
        2.  Counts occurrences of `originalParams.old_string` in `currentContent`.
        3.  If count matches `expected_replacements` (default 1):
            -   If `originalParams.new_string` was potentially over-escaped (checked by `unescapeStringForGeminiBug(ns) !== ns`), calls `correctNewStringEscaping` (LLM call with `CORRECT_NEW_STRING_ESCAPING_SCHEMA`) to get `finalNewString`.
            -   Otherwise, `finalNewString` is `originalParams.new_string`.
        4.  If count doesn't match (or is 0 initially):
            -   Tries `unescapedOldString = unescapeStringForGeminiBug(originalParams.old_string)`. Recounts occurrences.
            -   If this count matches, `finalOldString` becomes `unescapedOldString`. If `new_string` was potentially over-escaped, calls `correctNewString` (LLM call with `NEW_STRING_CORRECTION_SCHEMA`, considering original and corrected old strings) to get `finalNewString`.
            -   If still no match (or wrong count), calls `correctOldStringMismatch` (LLM call with `OLD_STRING_CORRECTION_SCHEMA`, providing `currentContent` and `unescapedOldStringAttempt`) to get `llmCorrectedOldString`.
            -   If `llmCorrectedOldString` count matches, `finalOldString` becomes `llmCorrectedOldString`. If `new_string` was potentially over-escaped, calls `correctNewString` again.
            -   If LLM correction for `old_string` also fails to produce a match with the correct occurrence count, returns original params with 0 occurrences.
        5.  Calls `trimPairIfPossible` to trim common leading/trailing whitespace from `finalOldString` and `finalNewString` if doing so doesn't change the occurrence count of the (trimmed) `finalOldString`.
        6.  Caches and returns the result `{ params: { file_path, old_string: finalOldString, new_string: finalNewString }, occurrences }`.
    -   `ensureCorrectFileContent`: If input `content` appears over-escaped, calls `correctStringEscaping` (LLM call with `CORRECT_STRING_ESCAPING_SCHEMA`) to fix it. Uses `fileContentCorrectionCache`.
    -   All LLM correction calls use `EditModel` (`gemini-flash`) and `EditConfig` (temperature 0).
-   **Telemetry Reporting (`telemetry/`):**
    -   `initializeTelemetry` (`sdk.ts`): If enabled in `Config`, creates a `NodeSDK` instance from `@opentelemetry/sdk-node`. Configures a `Resource` with `service.name` (`gemini-cli`), `service.version` (Node.js version), and `session.id`. Sets up exporters:
        -   If OTLP endpoint (`config.getTelemetryOtlpEndpoint()`) is configured: `OTLPTraceExporter`, `OTLPLogExporter`, `OTLPMetricExporter` (all gRPC, GZIP compression).
        -   Otherwise (local target): `ConsoleSpanExporter`, `ConsoleLogRecordExporter`, `ConsoleMetricExporter`.
        -   Starts the SDK and calls `initializeMetrics`. Sets `telemetryInitialized` flag.
    -   `initializeMetrics` (`metrics.ts`): Gets a `Meter` from OpenTelemetry. Creates specific counters (`toolCallCounter`, `apiRequestCounter`, `tokenUsageCounter`, `sessionCounter`, `fileOperationCounter`) and histograms (`toolCallLatencyHistogram`, `apiRequestLatencyHistogram`) with descriptions and units. Records an initial `sessionCounter.add(1)`.
    -   `log*` functions (`loggers.ts`):
        -   `logCliConfiguration`: Emits a log record with `EVENT_CLI_CONFIG` and various config attributes.
        -   `logUserPrompt`: Emits `EVENT_USER_PROMPT` with `prompt_length` and optionally `prompt` text (if `config.getTelemetryLogPromptsEnabled()`).
        -   `logToolCall`: Emits `EVENT_TOOL_CALL` with function name, args, duration, success, decision (from `ToolConfirmationOutcome`), and error details. Calls `recordToolCallMetrics`.
        -   `logApiRequest`: Emits `EVENT_API_REQUEST` with model and optional request text.
        -   `logApiResponse`: Emits `EVENT_API_RESPONSE` with model, status code, duration, token counts, and optional response text/error. Calls `recordApiResponseMetrics` and `recordTokenUsageMetrics`.
        -   `logApiError`: Emits `EVENT_API_ERROR` with model, error details, status code, duration. Calls `recordApiErrorMetrics`.
        -   All these also call corresponding `ClearcutLogger.getInstance(config)?.log*Event(event)` methods.
    -   `ClearcutLogger` (`clearcut-logger/`):
        -   Singleton class. Enqueues events. `flushIfNeeded` (called by event logging methods) checks `flush_interval_ms` (1 min) and calls `flushToClearcut`.
        -   `flushToClearcut` sends batched events via HTTPS POST to `play.googleapis.com/log` as JSON. Decodes protobuf-like response for `nextRequestWaitMs`.
        -   Event methods (e.g., `logStartSessionEvent`) create a structured payload with `console_type`, `application`, `event_name`, `client_install_id` (from `getPersistentUserId`), and `event_metadata` (array of key-value pairs using `EventMetadataKey` enum).
-   **Authentication (`code_assist/oauth2.ts`, `code_assist/server.ts`, `core/contentGenerator.ts`):**
    -   `createContentGeneratorConfig`: Determines `AuthType` and necessary credentials (API key, Vertex project/location) based on environment variables (`GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`) and selected `authType` from config. Calls `getEffectiveModel` (from `core/modelCheck.ts`) which makes a test API call to see if the default "pro" model is rate-limited; if so, and if OAuth is used, it suggests switching to "flash".
    -   `createContentGenerator`:
        -   If `AuthType.LOGIN_WITH_GOOGLE_PERSONAL`: Calls `createCodeAssistContentGenerator`.
            -   `getOauthClient` (`oauth2.ts`): Creates `OAuth2Client` from `google-auth-library`. Tries `loadCachedCredentials` from `~/.gemini/oauth_creds.json`. If invalid/missing, calls `authWithWeb`.
            -   `authWithWeb`: Starts a local HTTP server (`http.createServer`) on an available port (`getAvailablePort` uses `net.createServer().listen(0)`). Generates auth URL with scopes (`cloud-platform`, `userinfo.email`, `userinfo.profile`) and state. Opens URL in browser using `open` package. The local server handles the `/oauth2callback` redirect, exchanges the `code` for tokens using `client.getToken()`, and calls `cacheCredentials` to save them to `~/.gemini/oauth_creds.json`.
            -   `setupUser` (`setup.ts`): Calls `CodeAssistServer.loadCodeAssist` to get user tier (`GeminiUserTier`) and the assigned `cloudaicompanionProject`. If the tier requires a user-defined project and `GOOGLE_CLOUD_PROJECT` is not set, it throws `ProjectIdRequiredError`. Then calls `CodeAssistServer.onboardUser` (a long-running operation, polled until `done`).
            -   Returns `CodeAssistServer` instance.
        -   If `AuthType.USE_GEMINI` or `AuthType.USE_VERTEX_AI`: Creates `GoogleGenAI` instance from `@google/genai` SDK (passing API key, VertexAI flag, and User-Agent header) and returns its `models` property (which conforms to `ContentGenerator`).
    -   `CodeAssistServer` (`server.ts`): Implements `ContentGenerator` by making authenticated HTTP requests (using `authClient.request()`) to `CODE_ASSIST_ENDPOINT` (`cloudcode-pa.googleapis.com`). Uses `converter.ts` (`toGenerateContentRequest`, `fromGenerateContentResponse`, etc.) to map GenAI SDK types (like `GenerateContentParameters`) to Code Assist API-specific types (like `CAGenerateContentRequest`). Handles SSE for streaming responses.

## External Dependencies

-   **`@google/genai`:** Google Generative AI SDK for Node.js, used for core AI model interactions when `AuthType.USE_GEMINI` or `AuthType.USE_VERTEX_AI` is selected. Provides types like `Content`, `Part`, `FunctionCall`, `FunctionDeclaration`, `GenerateContentResponse`.
-   **`google-auth-library`:** For OAuth 2.0 authentication flow (`code_assist/oauth2.ts`), specifically `OAuth2Client`.
-   **`gaxios`:** HTTP client used by `google-auth-library`. Custom error types like `ForbiddenError` extend `GaxiosError`.
-   **`@modelcontextprotocol/sdk`:** For MCP client implementation (`Client`) and transports (`StdioClientTransport`, `SSEClientTransport`, `StreamableHTTPClientTransport`) used in `tools/mcp-client.ts` for tool discovery.
-   **`glob`:** For file globbing patterns, used by `GlobTool` and `FileDiscoveryService` (indirectly, as `ReadManyFilesTool` uses `glob` directly now, and `bfsFileSearch` does not use `glob`).
-   **`ignore`:** For parsing `.gitignore` and `.geminiignore` files (`utils/gitIgnoreParser.ts`).
-   **`mime-types`:** For determining MIME types of files (`utils/fileUtils.ts`).
-   **`diff`:** For generating text diffs (used by `EditTool`, `WriteFileTool`).
-   **`shell-quote`:** For parsing shell commands (used by `discoverMcpTools` if `mcpServerCommand` is a string, and by `DiscoveredTool` if that logic were still active, though it seems `DiscoveredTool` now uses `spawn` directly which handles args).
-   **`simple-git`:** For Git operations related to checkpointing (`services/gitService.ts`).
-   **OpenTelemetry SDK and Exporter packages (`@opentelemetry/*`):** For telemetry collection if enabled (`telemetry/sdk.ts`). Includes `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-grpc`, etc.
-   **`html-to-text`:** For converting HTML to plain text in `WebFetchTool`.
-   **Node.js built-in modules:** `fs/promises`, `fs`, `path`, `os`, `crypto`, `child_process`, `http`, `url`, `events`, `stream`, `util`.
-   **`open` (npm package):** Used in `code_assist/oauth2.ts` to open the authentication URL in the user's browser.
<!-- TINS Specification v1.0 -->
