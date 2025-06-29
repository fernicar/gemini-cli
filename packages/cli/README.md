# TINS README for Gemini CLI

## Description

This project is a command-line interface (CLI) tool for interacting with the Gemini AI models. It allows users to send prompts, manage conversation history, and utilize various AI-powered tools and commands directly from their terminal. The CLI provides a rich interactive experience with features like theming, context management from local files, and integration with external editors.

## Functionality

### Core Features

-   **Interactive Chat:** Engage in conversations with Gemini models.
-   **Command Execution:**
    -   Slash commands (e.g., `/help`, `/clear`, `/theme`, `/auth`, `/stats`, `/quit`, `/memory`, `/tools`, `/mcp`, `/about`, `/bug`, `/chat`, `/compress`, `/restore`).
    -   `@` commands for referencing and including file/directory content in prompts.
    -   `!` prefix for executing shell commands directly.
-   **Context Management:**
    -   Load context from `GEMINI.md` files (or custom-named files) in the project and user's home directory.
    -   Manage and refresh context memory.
-   **Authentication:** Supports multiple authentication methods:
    -   Login with Google (OAuth)
    -   Gemini API Key (AI Studio)
    -   Vertex AI
-   **Theming:** Customizable themes for the CLI appearance.
-   **Editor Integration:** Allows users to set a preferred external editor for certain actions.
-   **Configuration:**
    -   User-level and workspace-level settings (`settings.json`).
    -   Environment variable support for configuration.
    -   Extension support for adding custom functionality and context.
-   **Sandboxing:** Optional sandboxing for enhanced security during command execution (macOS Seatbelt, Docker, Podman).
-   **Non-Interactive Mode:** Support for running prompts and receiving output without an interactive UI (e.g., for scripting).
-   **Update Notifications:** Checks for and notifies users about available updates to the CLI.
-   **Telemetry:** Optional telemetry for usage statistics and error reporting.
-   **Privacy Control:** Provides privacy notices and options for data collection (for free-tier users).
-   **Checkpointing:** Allows saving and restoring conversation states, including tool calls and file history.

### User Interface (Interactive Mode)

-   **Layout:**
    -   Header: Displays ASCII art logo.
    -   Main Content Area: Shows conversation history, including user prompts, Gemini responses, tool calls, and informational messages.
    -   Input Prompt: Where users type their messages and commands.
    -   Footer: Displays current directory, model, sandbox status, branch name, token usage, and other status indicators.
-   **Input Handling:**
    -   Multiline input support.
    -   Input history navigation (up/down arrows).
    -   Shell command history navigation (up/down arrows in shell mode).
    -   Autocompletion for file paths (`@` commands) and slash commands.
    -   Bracketed paste support.
-   **Output Display:**
    -   Markdown rendering for Gemini responses.
    -   Syntax highlighting for code blocks.
    -   Diff rendering for file changes.
    -   Specialized display for tool calls, including status (pending, executing, success, error, confirming, cancelled).
    -   Error messages and informational messages.
-   **Dialogs:**
    -   Theme selection dialog.
    -   Authentication method selection dialog.
    -   Editor preference selection dialog.
    -   Privacy notice display.
-   **Indicators:**
    -   Loading spinner and witty phrases during Gemini responses.
    -   Auto-accept mode indicator (YOLO mode, auto-edit).
    -   Shell mode indicator.
    -   Context summary (number of `GEMINI.md` files, MCP servers).
    -   Memory usage display (optional).
    -   Console error summary.
-   **Keyboard Shortcuts:**
    -   `Enter`: Send message.
    -   `Shift+Enter`: New line in input.
    -   `Ctrl+C`: Quit application (press twice if prompted).
    -   `Ctrl+D`: Quit application if input is empty (press twice if prompted).
    -   `Ctrl+O`: Toggle display of detailed console messages.
    -   `Ctrl+T`: Toggle display of MCP tool descriptions.
    -   `Ctrl+S`: Toggle full height display for long messages.
    -   `Alt+Left/Right`: Jump through words in input.
    -   `Esc`: Cancel operation / close dialogs / disable shell mode.

## Technical Implementation

### Architecture

-   **Modular Design:** The CLI is structured into several key components:
    -   Configuration loading (`config/`): Handles settings (`settings.ts`), environment variables (`config.ts`), command-line arguments (`config.ts`), extensions (`extension.ts`), and sandbox setup (`sandboxConfig.ts`). Authentication validation logic resides in `auth.ts`.
        -   `settings.ts`: Defines `Settings` interface, `LoadedSettings` class for managing user and workspace settings, and functions to load/save settings from/to JSON files (e.g., `~/.gemini/settings.json`). Handles environment variable substitution within settings values.
        -   `config.ts`: Parses command-line arguments using `yargs`, loads environment variables using `dotenv` (from `.env` files with hierarchical lookup: project `.gemini/.env`, project `.env`, home `.gemini/.env`, home `.env`). It merges these with loaded settings and extension configurations to create the final `Config` object from `@google/gemini-cli-core`. Also responsible for loading hierarchical `GEMINI.md` context.
        -   `extension.ts`: Loads extensions from `.gemini/extensions` in user home and workspace. Each extension has a `gemini-extension.json` defining its name, version, potential MCP server configurations, and context files.
        -   `sandboxConfig.ts`: Determines the sandbox command (docker, podman, sandbox-exec) and image URI based on settings, CLI arguments, environment variables (`GEMINI_SANDBOX`, `GEMINI_SANDBOX_IMAGE`), and `package.json` config.
        -   `auth.ts`: Validates the selected authentication method against required environment variables (e.g., `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`).
    -   UI components (`ui/components/`): React components for rendering different parts of the interface. This includes dialogs (Auth, Editor, Theme), informational displays (AboutBox, Stats, Help), message rendering (UserMessage, GeminiMessage, ToolGroupMessage), and input handling (InputPrompt).
    -   UI hooks (`ui/hooks/`): Encapsulate complex UI logic, state management, and interactions. Examples include `useGeminiStream` for API communication, `useCompletion` for autocompletion, `useHistoryManager` for chat history, `useInputHistory` for command history, `useReactToolScheduler` for managing tool lifecycles, and various command processors.
    -   Command processors (`ui/hooks/atCommandProcessor.ts`, `ui/hooks/shellCommandProcessor.ts`, `ui/hooks/slashCommandProcessor.ts`): Parse and handle specific command types entered by the user.
    -   Core interaction logic (`ui/hooks/useGeminiStream.ts`): Manages the stream of communication with the Gemini API, schedules tool execution, and updates the UI based on events.
    -   Utilities (`utils/`, `ui/utils/`): Helper functions for versioning, package information, input reading, sandbox profile definitions, text manipulation, code colorization, Markdown display, and update checks.
    -   Theming (`ui/themes/`): Defines various color themes (e.g., Default, Ayu, Atom One, Dracula, GitHub, Xcode, ANSI) and a `ThemeManager` to apply them. Each theme specifies colors for UI elements and syntax highlighting.
    -   Contexts (`ui/contexts/`): React Contexts for sharing global state like `SessionContext` (for session statistics like token counts and timing), `StreamingContext` (for current API streaming state), and `OverflowContext` (for managing display of long messages).
    -   Privacy Notices (`ui/privacy/`): Components for displaying privacy notices based on the authentication method (e.g., `CloudFreePrivacyNotice`, `CloudPaidPrivacyNotice`, `GeminiPrivacyNotice`).
    -   Editor Integration (`ui/editors/`): Manages integration with external code editors.
-   **Rendering:** Uses Ink framework for building the terminal-based UI with React.
-   **State Management:** Primarily uses React hooks (useState, useEffect, useCallback, useMemo, useContext) for managing component and application state. Shared state is managed via React Contexts.
-   **Asynchronous Operations:** Extensive use of Promises and async/await for handling API calls, file operations, and command execution.

### Key Data Structures

-   **`HistoryItem` (`ui/types.ts`):** Represents an entry in the conversation display (user prompt, Gemini response, tool call, info message, error, etc.). Includes various subtypes like `HistoryItemUser`, `HistoryItemGemini`, `HistoryItemToolGroup`. These are managed by `useHistoryManager`.
-   **`Config` (from `@google/gemini-cli-core`):** Central object holding all runtime configuration, including API keys, model names, file paths, tool settings, and telemetry preferences. Initialized in `config.ts` by `loadCliConfig`.
-   **`Settings` (`config/settings.ts`):** Typed interface for user-level (in `~/.gemini/settings.json`) and workspace-level (`.gemini/settings.json`) configurations. Supports environment variable substitution (e.g., `$VAR` or `${VAR}`). Managed by `LoadedSettings` class.
-   **`Extension` (`config/extension.ts`):** Defines the structure for extensions, including their configuration (`ExtensionConfig`: name, version, MCP servers, context files) and resolved `contextFiles` paths. Loaded by `loadExtensions`.
-   **`SandboxConfig` (`config/sandboxConfig.ts`, from `@google/gemini-cli-core`):** Defines the command (docker, podman, sandbox-exec) and image for sandboxed execution. Determined by `loadSandboxConfig`.
-   **`Theme` (`ui/themes/theme.ts`):** Class representing a UI theme, including its name, type (light/dark/ansi), `highlight.js` style mappings (`CSSProperties`), and a `ColorsTheme` object for specific UI element colors. Managed by `ThemeManager`.
-   **`ColorsTheme` (`ui/themes/theme.ts`):** Interface defining the color palette for a theme (Background, Foreground, AccentBlue, AccentPurple, AccentCyan, AccentGreen, AccentYellow, AccentRed, Comment, Gray, GradientColors).
-   `SlashCommand` (`ui/hooks/slashCommandProcessor.ts`): Defines the structure for slash commands (name, altName, description, optional completion function, and action function).
-   `Suggestion` (`ui/components/SuggestionsDisplay.tsx`): Interface for autocompletion items (label, value, optional description).
-   `ConsoleMessageItem` (`ui/types.ts`): Structure for messages displayed in the debug console (type: log, warn, error, debug; content; count for consolidation).
-   `TextBuffer` (`ui/components/shared/text-buffer.ts`): Class managing the state of the multiline text input. Tracks `lines` (logical), `text` (full string), `cursor` (logical [row, col]), `preferredCol` (for vertical navigation), selection state, undo/redo stacks, clipboard, and visual layout properties (`allVisualLines`, `viewportVisualLines`, `visualCursor`, `visualScrollRow`) considering text wrapping and viewport dimensions.
-   `TrackedToolCall` (`ui/hooks/useReactToolScheduler.ts`): Extends core `ToolCall` types (Scheduled, Validating, Waiting, Executing, Completed, Cancelled) with `responseSubmittedToGemini` flag. Represents the state of a tool call throughout its UI lifecycle.
-   `CumulativeStats` (`ui/contexts/SessionContext.tsx`): Interface for tracking aggregate statistics for a session, including `turnCount`, various token counts (prompt, candidates, total, cached, tool use, thoughts), and `apiTimeMs`.

### Core Algorithms & Processes

-   **Input Processing (`InputPrompt.tsx`, `ui/hooks/useKeypress.ts`, `ui/components/shared/text-buffer.ts`):**
    -   `InputPrompt` component captures user input using the `TextBuffer`.
    -   `useKeypress` hook listens for stdin key events, normalizes them into a `Key` object (name, ctrl, meta, shift, paste, sequence), and handles bracketed paste mode by buffering paste content and emitting a single event.
    -   `TextBuffer`'s `handleInput` method processes `Key` events for multiline text editing:
        -   Navigation: left/right (char/word), up/down (visual line, respects `preferredCol`), home/end.
        -   Modification: `insert` (handles char-by-char or paste, path detection for `@`), `newline`, `backspace`, `del`, `deleteWordLeft/Right`, `killLineLeft/Right`.
        -   Undo/Redo: Manages `undoStack` and `redoStack` of `UndoHistoryEntry` (lines, cursorRow, cursorCol).
        -   External Editor: `openInExternalEditor` writes buffer to a temp file, launches editor, reads back content.
        -   Visual Layout: `calculateVisualLayout` function (internal to `text-buffer.ts`) computes visual lines based on logical lines and viewport width, handling word wrapping and mapping logical cursor positions to visual positions and vice-versa. This updates `allVisualLines`, `visualCursor`, `logicalToVisualMap`, and `visualToLogicalMap`. `visualScrollRow` is adjusted based on `visualCursor` and viewport height.
    -   After `TextBuffer` processing, `InputPrompt` checks if the input triggers a command processor (`@`, `!`, `/`).
-   **Gemini API Interaction (`useGeminiStream.ts`):**
    -   `submitQuery` is the main entry point.
    -   `prepareQueryForGemini`:
        -   Logs user prompt for telemetry.
        -   Checks for and handles slash commands via `handleSlashCommand`. If a slash command schedules a client-initiated tool (e.g., `/memory add`), it calls `scheduleToolCalls` and returns, bypassing Gemini.
        -   Checks for shell mode (`!`) and delegates to `handleShellCommand`.
        -   Checks for `@` commands and delegates to `handleAtCommand`. This may involve reading files (via `read_many_files` tool) and modifying the query to include file content.
        -   If not a special command, adds user input to history.
    -   If `shouldProceed` and `queryToSend` are valid, it initiates or continues a chat with `GeminiClient.sendMessageStream`.
    -   `processGeminiStreamEvents` iterates over the async stream:
        -   `Thought` events update the `thought` state for `LoadingIndicator`.
        -   `Content` events append text to `geminiMessageBuffer`. `handleContentEvent` splits long messages using `findLastSafeSplitPoint` (from `markdownUtilities.ts`) to optimize static rendering, updating `pendingHistoryItemRef`.
        -   `ToolCallRequest` events are collected and passed to `scheduleToolCalls`.
        -   `UserCancelled` and `Error` events update UI and log.
        -   `ChatCompressed` events add an info message.
        -   `UsageMetadata` events update session stats via `addUsage`.
    -   Manages `StreamingState` (Idle, Responding, WaitingForConfirmation) via `isResponding` state and `toolCalls` state, exposed through `StreamingContext`.
    -   Handles user cancellation (Escape key) via `AbortController`.
-   **Tool Execution (`useReactToolScheduler.ts`):**
    -   Uses `CoreToolScheduler` (from `@google/gemini-cli-core`) which manages a queue of `ToolCallRequestInfo`.
    -   `scheduleToolCalls` adds new requests to the `CoreToolScheduler`.
    -   The scheduler processes calls:
        1.  Validates parameters using `tool.validateToolParams`.
        2.  Calls `tool.shouldConfirmExecute`. If it returns `ToolCallConfirmationDetails`:
            -   Updates `TrackedToolCall` status to `awaiting_approval`.
            -   The UI (`ToolGroupMessage` -> `ToolConfirmationMessage`) displays details and awaits user action (y/n/e/a/s).
            -   `handleConfirmationResponse` (in `CoreToolScheduler`, invoked by UI) processes the `ToolConfirmationOutcome`.
                -   `ProceedAlwaysTool/Server`: Adds tool/server to an allowlist.
                -   `ModifyWithEditor`: For `ModifiableTool`s, uses `modifyWithEditor` (from `modifiable-tool.ts`) which creates temp files, opens them in the user's preferred editor (via `openDiff` from `editor.ts`), reads back changes, and creates updated tool parameters.
                -   `Cancel`: Sets status to `cancelled`.
                -   Others set status to `scheduled`.
        3.  If no confirmation needed or approved (and not YOLO), status becomes `scheduled`.
        4.  `attemptExecutionOfScheduledCalls`: If all active calls are scheduled or terminal, executes scheduled calls.
            -   Sets status to `executing`.
            -   Calls `tool.execute`, passing an `outputUpdateHandler` if `tool.canUpdateOutput` is true. This handler updates `TrackedExecutingToolCall.liveOutput` and `pendingHistoryItemRef` for streaming display.
            -   On completion, sets status to `success` or `error` with `ToolResult` (llmContent, returnDisplay).
    -   `onAllToolCallsComplete` (callback from `CoreToolScheduler`):
        -   Adds final tool states to history.
        -   Calls `handleCompletedTools` (in `useGeminiStream`):
            -   Marks client-initiated tools as submitted.
            -   If `save_memory` succeeded, calls `performMemoryRefresh`.
            -   For Gemini-initiated tools, merges `responseParts` from all successful/errored tools and calls `submitQuery` with `isContinuation: true`. Cancelled tools' responses are added to Gemini's history directly.
    -   `onToolCallsUpdate` (callback from `CoreToolScheduler`): Updates the local `toolCalls` state (array of `TrackedToolCall`), triggering UI updates.
-   **Configuration Loading (`config/config.ts`, `config/settings.ts`, `config/extension.ts`):**
    -   `loadSettings` (`settings.ts`): Reads user (`~/.gemini/settings.json`) and workspace (`.gemini/settings.json`) JSON files. Uses `strip-json-comments` to allow comments. Merges them, with workspace taking precedence. Resolves environment variables (e.g., `$VAR`, `${VAR}`) within string values. Handles legacy theme names.
    -   `loadCliConfig` (`config.ts`):
        -   Calls `loadEnvironment` to load `.env` files (project `.gemini/.env` > project `.env` > home `.gemini/.env` > home `.env`).
        -   Parses CLI arguments using `yargs`.
        -   Calls `setServerGeminiMdFilename` (from `@google/gemini-cli-core/tools/memoryTool`) based on `settings.contextFileName`.
        -   Calls `loadServerHierarchicalMemory` (from `@google/gemini-cli-core/utils/memoryDiscovery`) to get combined `GEMINI.md` content and count.
        -   Merges MCP server configurations from settings and extensions.
        -   Calls `loadSandboxConfig` to determine sandbox settings.
        -   Instantiates `Config` (from `@google/gemini-cli-core`) with all resolved parameters.
    -   `loadExtensions` (`extension.ts`): Reads `.gemini/extensions` from home and workspace. Parses `gemini-extension.json` for each, extracting `name`, `version`, `mcpServers`, and `contextFileName` (defaults to `GEMINI.md`). Filters for unique extension names (workspace overrides home).
    -   `loadSandboxConfig` (`sandboxConfig.ts`): Determines sandbox `command` (docker, podman, sandbox-exec) and `image` based on CLI args, `GEMINI_SANDBOX` env var, settings, and `package.json` (`config.sandboxImageUri`). Prioritizes env var, then CLI arg, then settings. Checks if commands exist using `command-exists`.
-   **Markdown Rendering (`ui/utils/MarkdownDisplay.tsx`, `ui/utils/CodeColorizer.tsx`):**
    -   `MarkdownDisplay` splits input text by lines and processes each:
        -   Identifies code fences (<code>```</code>), headers (`#`-`####`), unordered lists (`-*+`), ordered lists (`1.`), and horizontal rules (`---`).
        -   For code blocks, accumulates lines and passes to `RenderCodeBlock`. If `isPending` and content exceeds `availableTerminalHeight`, shows a "generating more" message.
        -   For other lines, passes to `RenderInline`.
    -   `RenderInline` uses a regex to find and render inline Markdown: `**bold**`, `*italic*` or `_italic_`, `~~strikethrough~~`, ``inline code``, `[link text](url)`, `<u>underline</u>`.
    -   `colorizeCode` uses `lowlight.highlight` (or `highlightAuto`) to get HAST. `renderHastNode` traverses the HAST, applying colors from the active theme's `_colorMap` to `<Text>` nodes. Line numbers are prepended.
    -   `MaxSizedBox` is used by `RenderCodeBlock` and `DiffRenderer` to truncate output if `availableTerminalHeight` is provided, adding an overflow indicator.
-   **Autocompletion (`ui/hooks/useCompletion.ts`):**
    -   Triggered by `@` (files) or `/` (slash commands).
    -   For `@`:
        -   Parses `partialPath` and `prefix` from the query.
        -   If `partialPath` has no slashes and recursive search is enabled, uses `glob` (from `glob` package) with `**/${prefix}*`.
        -   Otherwise, uses `fs.readdir` for the `baseDirAbsolute` (resolved from `cwd` and `baseDirRelative`).
        -   Filters results by `prefix` (case-insensitive).
        -   If `FileDiscoveryService` is available (via `config`), filters out git-ignored files.
        -   Sorts suggestions: by depth, then directories (ending with `/`), then alphabetically.
    -   For `/`: Filters `slashCommands` array based on typed prefix.
    -   Manages `suggestions` list, `activeSuggestionIndex`, `visibleStartIndex` (for scrolling long lists within `MAX_SUGGESTIONS_TO_SHOW`), and `showSuggestions` boolean.
    -   Debounces fetching suggestions to avoid excessive calls.
-   **Sandboxing (`utils/sandbox.ts`, `utils/sandbox-macos-*.sb`):**
    -   `start_sandbox` function:
        -   For `sandbox-exec` (macOS):
            -   Selects a Seatbelt profile (`.sb` file) based on `SEATBELT_PROFILE` env var (defaults to `permissive-open`). Built-in profiles include `permissive-open/closed/proxied` and `restrictive-open/closed/proxied`. Custom profiles can be placed in `.gemini/`.
            -   Spawns `sandbox-exec` with the profile and parameters (TARGET_DIR, TMP_DIR, HOME_DIR, CACHE_DIR).
            -   Optionally starts a proxy command (`GEMINI_SANDBOX_PROXY_COMMAND`) and sets proxy env vars for the sandboxed process.
        -   For Docker/Podman:
            -   Checks if image exists (`${config.command} images -q ${image}`), pulls if necessary (unless local dev image).
            -   Constructs `${config.command} run` arguments:
                -   Interactive (`-i`), TTY (`-t` if stdin is TTY), auto-remove (`--rm`), init process (`--init`).
                -   Workdir (`--workdir`), volume mounts (`-v`): CWD, user settings dir (`~/.gemini`), tmpdir, gcloud config (`~/.config/gcloud`), `GOOGLE_APPLICATION_CREDENTIALS` file, custom mounts from `SANDBOX_MOUNTS`.
                -   Ports (`--publish`): from `SANDBOX_PORTS`, debug port if `DEBUG` env var is set.
                -   Network: If proxy command is used, creates/uses `gemini-cli-sandbox` (internal) and `gemini-cli-sandbox-proxy` networks.
                -   Environment variables (`--env`): API keys, Vertex AI vars, `GEMINI_MODEL`, `TERM`, `COLORTERM`, `VIRTUAL_ENV` (if in project, remounted to `.gemini/sandbox.venv`), `SANDBOX_ENV` vars, `NODE_OPTIONS`. Sets `SANDBOX` var inside container.
                -   User: If `shouldUseCurrentUserInSandbox` (Debian/Ubuntu default or `SANDBOX_SET_UID_GID=true`), runs container as root, entrypoint script creates user with host UID/GID and switches to it using `su -p`. Otherwise, uses default container user or `--user root` for integration tests.
            -   Entrypoint (`entrypoint` function): A bash script string that sets `PATH`, `PYTHONPATH`, sources `.gemini/sandbox.bashrc`, starts `socat` port forwarders (from `SANDBOX_PORTS`), and finally executes `gemini` (or `npm run start/debug` for dev).
            -   Spawns the container.
-   **Theming (`ui/themes/theme-manager.ts`, `ui/themes/*.ts`):**
    -   `ThemeManager` holds `availableThemes` (instances of `Theme`). `activeTheme` defaults to `DefaultDark`.
    -   `Theme` class constructor takes name, type (light/dark/ansi), `highlight.js` style object, and a `ColorsTheme` object.
        -   `_buildColorMap` processes the `highlight.js` styles: for each `hljs-*` key, if `style.color` exists, `_resolveColor` is called.
        -   `_resolveColor` converts CSS color names (e.g., `darkkhaki`) to hex codes or uses Ink-supported names directly. Unresolvable colors are skipped. `defaultColor` is taken from `hljsTheme['hljs']?.color`.
    -   `Colors` object (`ui/colors.ts`) acts as a dynamic proxy to `themeManager.getActiveTheme().colors`.
    -   `NoColorTheme` uses empty strings for all colors, effectively disabling them.
-   **Session Statistics (`ui/contexts/SessionContext.tsx`):**
    -   `SessionStatsProvider` uses `useState` to hold `SessionStatsState` (sessionStartTime, cumulative, currentTurn, currentResponse stats).
    -   `startNewTurn`: Increments `cumulative.turnCount`, resets `currentTurn` and `currentResponse` token/time stats to zero.
    -   `addUsage`: Takes `GenerateContentResponseUsageMetadata` and `apiTimeMs`.
        -   Creates new copies of `cumulative` and `currentTurn` stats.
        -   Calls `addTokens` helper to sum up all token counts (candidates, thoughts, total, prompt, cached, toolUse) and `apiTimeMs` into both `newCumulative` and `newCurrentTurn`.
        -   Creates a new `newCurrentResponse` object, initializing its token/time stats to zero, then calls `addTokens` to populate it with the current API call's usage.

### External Integrations

-   **Gemini API (`@google/genai` SDK or Code Assist Server):** Primary integration for AI model interaction. Handled by `GeminiClient` in `@google/gemini-cli-core`.
-   **Google Cloud (Vertex AI):** Alternative backend for Gemini models, configured via environment variables (`GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`) if `AuthType.USE_VERTEX_AI` is selected. `GeminiClient` handles this.
-   **Git (`simple-git` and local `git` CLI):**
    -   Used for checkpointing (creating snapshots of the project via `GitService` in `@google/gemini-cli-core`).
    -   Used for git-aware file filtering (`FileDiscoveryService` in `@google/gemini-cli-core`, using `GitIgnoreParser`).
    -   `useGitBranchName` hook (`ui/hooks/useGitBranchName.ts`) uses `git rev-parse --abbrev-ref HEAD` and `git rev-parse --short HEAD` (via Node.js `child_process.exec`) to fetch the current branch name or commit hash. It also watches `.git/logs/HEAD` for changes.
-   **Shell (Node.js `child_process`):**
    -   For executing local commands (`!command` via `useShellCommandProcessor`). Spawns `bash -c` or `cmd.exe /c`.
    -   For tool execution via `ShellTool` (from `@google/gemini-cli-core`).
    -   For `ToolRegistry` discovery command if configured.
    -   For sandbox setup and execution (`utils/sandbox.ts`).
-   **External Editors (user's configured editor CLI, e.g., `code`, `vim`):**
    -   Integrates with user's preferred editor for tasks like modifying tool call parameters (e.g., diffs for `EditTool`, `WriteFileTool`).
    -   Managed by `editorSettingsManager.ts` and `useEditorSettings.ts`.
    -   `getDiffCommand` in `ui/utils/editor.ts` constructs editor-specific diff commands (e.g., `code --wait --diff`).
    -   `openDiff` in `ui/utils/editor.ts` launches the editor using `spawn` (for GUI editors) or `execSync` (for terminal editors like vim).
-   **NPM (`update-notifier` package):** For checking for CLI updates (`ui/utils/updateCheck.ts`).
-   **File System (Node.js `fs` and `fs/promises` modules):** Extensively used for:
    -   Reading/writing settings (`settings.json`), `.env` files, extension configs (`gemini-extension.json`).
    -   Loading context from `GEMINI.md` files.
    -   Reading/writing shell history (`~/.gemini/tmp/<hash>/shell_history`).
    -   Reading/writing chat checkpoints (`~/.gemini/tmp/<hash>/checkpoint-*.json`).
    -   Reading/writing sandbox profiles (`.sb` files).
    -   Creating temporary files for external editor diffs.
    -   File system operations by tools like `read_file`, `write_file`, `ls`, `glob`.
-   **Operating System (Node.js `os` module):** Used for paths (`homedir`, `tmpdir`), platform detection (`os.platform()`), and environment variables (`process.env`).
-   **Lowlight (`lowlight` and `highlight.js/lib/common`):** For syntax highlighting in code blocks within `CodeColorizer.tsx`.
-   **Ink (`ink` and related packages like `ink-spinner`, `ink-gradient`, `ink-select-input`):** Framework for building the terminal UI.
-   **Yargs (`yargs` and `yargs/helpers`):** For parsing command-line arguments in `config.ts`.
    -   **Dotenv (`dotenv`):** For loading environment variables from `.env` files in `config.ts`.
-   **Command-Exists (`command-exists`):** Used in `sandboxConfig.ts` to check if Docker/Podman/sandbox-exec commands are available.
-   **Strip-Ansi (`strip-ansi`):** Used in `TextBuffer` and `shellCommandProcessor` to remove ANSI escape codes from text that might interfere with display or processing.
-   **String-Width (`string-width`):** Used in `TextBuffer` and `MaxSizedBox` for accurate visual width calculation of strings containing multi-byte or wide characters.
-   **Shell-Quote (`shell-quote`):** Used in `sandbox.ts` to quote CLI arguments when constructing commands for the sandbox entrypoint.
-   **Update-Notifier (`update-notifier`):** Used in `ui/utils/updateCheck.ts` to check for new versions of the CLI package on NPM.
-   **Read-Package-Up (`read-package-up`):** Used in `utils/package.ts` to find and read the `package.json` of the CLI tool itself (for version info, sandbox image URI).
-   **Crypto (Node.js `crypto` module):** Used in `shellCommandProcessor` to generate temporary filenames.

## Style Guide (UI)

-   **Colors:** The CLI uses a theming system (`ui/themes/`). Colors are defined in `ColorsTheme` (`ui/themes/theme.ts`) and accessed via the `Colors` object (from `ui/colors.ts`), which dynamically proxies to the active theme from `themeManager`.
    -   Themes include light and dark variants (e.g., `DefaultDark`, `DefaultLight`, `AyuDark`, `AyuLight`, `AtomOneDark`, `Dracula`, `GitHubDark`, `GitHubLight`, `GoogleCode`, `XCode`, `ANSI`, `ANSILight`). Each theme file (e.g., `ayu.ts`) defines a `Theme` instance with `highlight.js` styles and a `ColorsTheme` palette.
    -   A `NoColorTheme` (`no-color.ts`) is available when `NO_COLOR` environment variable is set, which uses empty strings for colors, relying on terminal defaults.
-   **Layout:**
    -   Uses Ink's `<Box>` component for layout structuring with Flexbox properties (e.g., `flexDirection`, `justifyContent`, `alignItems`, `padding`, `margin`, `width`).
    -   Consistent padding and margins are used for different UI elements (see `ui/constants.ts` for some layout constants like `BOX_PADDING_X`). `UI_WIDTH` (approx. 63 chars) is used for some fixed-width elements.
    -   Responsive elements (e.g., `Header` ASCII art, `InputPrompt` width) adapt to terminal size using `useTerminalSize` hook.
    -   `MaxSizedBox` component (`ui/components/shared/MaxSizedBox.tsx`) is used to constrain the height of potentially long content (like code blocks or diffs from `DiffRenderer.tsx`). It measures its children (expected to be `<Box>` rows containing `<Text>`) and truncates them if `maxHeight` is exceeded, showing an overflow indicator. This is managed with `OverflowContext` and a "show more lines" (Ctrl+S) hint.
-   **Interactions:**
    -   Interactive elements like `RadioButtonSelect` (`ui/components/shared/RadioButtonSelect.tsx`) provide clear visual feedback for selection (using '●'/'○' indicators from `DynamicRadioIndicator`) and focus.
    -   Spinners (`ink-spinner` via `GeminiRespondingSpinner.tsx`) and loading phrases (cycled by `usePhraseCycler.ts` in `LoadingIndicator.tsx`) indicate ongoing operations.
    -   Error messages (`ErrorMessage.tsx`) are typically displayed in `Colors.AccentRed`.
    -   Informational messages (`InfoMessage.tsx`) use distinct colors (e.g., `Colors.AccentYellow` for warnings/info, `Colors.AccentPurple` for Gemini responses, `Colors.AccentGreen` for successful operations).
-   **Typography:**
    -   Standard terminal fonts are used.
    -   Bold, italic, strikethrough, and underline styles are applied for emphasis and Markdown rendering via Ink's `<Text>` component props (e.g., `<Text bold>Header</Text>`).

## Performance Requirements

-   **Responsiveness:** The UI should remain responsive during user input and while Gemini is generating responses.
    -   Input handling in `TextBuffer` (`ui/components/shared/text-buffer.ts`) is optimized for direct state manipulation and efficient visual layout calculation.
    -   Long-running operations (API calls, tool execution, file system access) are asynchronous to prevent blocking the UI thread.
-   **Streaming Output:** Gemini responses are streamed to the UI as they arrive to provide immediate feedback. The `useGeminiStream` hook processes these events, updating `pendingHistoryItemRef` frequently.
-   **Efficient History Rendering:**
    -   Ink's `<Static>` component is used in `App.tsx` to render the main conversation history (`history` array). Only items added after the initial render (i.e., those in `pendingHistoryItems` array) are dynamically rendered within the `<Static>` children function. This minimizes re-renders of older, settled messages.
    -   Long messages from Gemini are split into multiple `GeminiMessageContent` components by `handleContentEvent` (in `useGeminiStream.ts`). The split point is determined by `findLastSafeSplitPoint` (in `ui/utils/markdownUtilities.ts`) to avoid breaking Markdown structures like code blocks. This further optimizes rendering with `<Static>`.
-   **Debounced Operations:** Autocompletion logic in `useCompletion.ts` debounces file system calls (`fs.readdir`, `glob`) by 100ms to avoid excessive processing during rapid typing.
-   **Memory Management:**
    -   The CLI can be relaunched with increased Node.js heap memory if the `autoConfigureMaxOldSpaceSize` setting is true and current limits are deemed too low. `getNodeMemoryArgs` in `gemini.tsx` calculates a target based on 50% of total system memory.
    -   The `/compress` command (handled by `slashCommandProcessor.ts`, which calls `GeminiClient.tryCompressChat` from `@google/gemini-cli-core`) helps manage large conversation contexts by instructing the model to summarize the history.
    -   `ConsoleMessageItem`s are consolidated in `useConsoleMessages.ts` (if consecutive messages are identical) to prevent excessive growth of the `consoleMessages` array displayed in the debug console.
    -   `TextBuffer`'s undo/redo history has a limit (`historyLimit = 100`).
    -   `LruCache` in `@google/gemini-cli-core/utils/LruCache.ts` (used by `editCorrector.ts`) has `MAX_CACHE_SIZE = 50`.

## Accessibility Requirements

-   **Keyboard Navigable:** All interactive elements (input prompt, dialogs like `ThemeDialog`, `AuthDialog`, `EditorSettingsDialog`) are designed to be navigable using the keyboard (Enter, Shift+Enter, Up/Down, Tab, Esc). `RadioButtonSelect` uses Ink's `SelectInput` which handles arrow key navigation.
-   **Clear Feedback:** Visual feedback for actions, loading states (`LoadingIndicator.tsx`, `GeminiRespondingSpinner.tsx`), and errors (`ErrorMessage.tsx`).
    -   Loading phrases (`usePhraseCycler.ts`) can be disabled via accessibility settings (`disableLoadingPhrases` in `Settings` interface, checked in `LoadingIndicator.tsx`).
-   **Theming:** Support for light and dark themes, as well as a `NoColorTheme` (activated by `NO_COLOR` env var), can aid users with different visual preferences or needs.
-   **Text Wrapping:** Output text in messages and the input prompt wraps to fit the terminal width, ensuring readability. This is handled by Ink's `<Text wrap="wrap">` and `TextBuffer`'s visual layout calculations.
-   **Content Truncation:** `MaxSizedBox.tsx` truncates long content (e.g., code blocks, diffs) and provides a "show more lines" hint (Ctrl+S to toggle `constrainHeight` in `App.tsx`), improving usability for large outputs.

## Testing Scenarios

-   **Basic Chat:** Send a prompt, receive a text response. Send another prompt, verify history is maintained. Receive a response with Markdown (code block, list, bold/italic) and verify correct rendering.
-   **Slash Commands:**
    -   `/help`: Verify help dialog (`Help.tsx`) appears.
    -   `/theme`: Open `ThemeDialog`, select a theme, verify UI colors and syntax highlighting change. Verify theme preference is saved to `settings.json` (user or workspace scope).
    -   `/auth`: Open `AuthDialog`, select an auth method (mock the external OAuth flow or API key input). Verify selected method is saved and used for subsequent API calls.
    -   `/editor`: Open `EditorSettingsDialog`, select an editor, verify preference is saved.
    -   `/memory add "fact"`: Add a fact. Verify `GEMINI.md` (or custom context file) is created/updated with the fact under `## Gemini Added Memories`.
    -   `/memory show`: Verify current hierarchical memory content is displayed as an info message.
    -   `/memory refresh`: Modify a `GEMINI.md` file, run command, run `/memory show` to verify updated content.
    -   `/stats`: Display session statistics, verify token counts and duration are plausible.
    -   `/tools`: List available CLI tools (core tools).
    -   `/mcp`: List configured MCP servers and their tools. Test with `/mcp desc` for descriptions and `/mcp schema` for schemas. Test with no MCP servers configured. Test with MCP servers that are connecting or disconnected.
    -   `/about`: Display version, OS, sandbox, model, auth, and GCP project info from `AboutBox.tsx`.
    -   `/bug "description"`: Verify correct GitHub issue URL is generated/opened (mock `open` package). Test with custom bug command URL from settings.
    -   `/chat save mytag`: Save current chat. Verify `checkpoint-mytag.json` is created in `.gemini/tmp/<hash>/`.
    -   `/chat resume mytag`: Resume saved chat. Verify history is restored.
    -   `/chat list`: List saved chat tags.
    -   `/compress`: Trigger chat compression. Mock `GeminiClient.tryCompressChat` to return success/failure.
    -   `/restore <checkpoint>`: Save a tool call that requires confirmation (e.g., edit), cancel it, then use `/restore` with the generated checkpoint ID. Verify the tool call is re-initiated.
    -   `/quit`, `/exit`: Verify clean exit of the CLI (mock `process.exit`).
-   **@ Commands (`atCommandProcessor.ts`):**
    -   `@file.txt`: Read a single text file. Verify content is prepended to prompt.
    -   `@image.png`: Include an image. Verify `inlineData` part is sent to Gemini.
    -   `@directory/`: Read all files in a directory (glob `**/*`).
    -   `@*.ts`: Read all TypeScript files in CWD.
    -   `@nonexistent.txt`: Verify error message or glob search attempt.
    -   `@path/with\\ spaces.txt`: Verify escaped path is handled.
    -   Test with `.gitignore` and `.geminiignore` affecting results when `respectGitIgnore` is true/false.
-   **! Shell Commands (`shellCommandProcessor.ts`):**
    -   `!ls -l` (or `dir` on Windows): Execute a simple shell command. Verify output is displayed.
    -   `!echo "long output..."`: Command with significant output.
    -   `!some_error_command`: Command that exits with an error code or writes to stderr. Verify error is displayed.
    -   `!sleep 5 &`: Background command. Verify CLI doesn't hang (on non-Windows).
    -   Test directory changes within shell command (e.g., `!cd .. && ls`) and verify warning about statelessness.
-   **Tool Calls (from Gemini, via `useReactToolScheduler.ts`):**
    -   Trigger a `replace` (edit) tool call:
        -   Approve: Verify file is changed.
        -   Deny: Verify file is not changed.
        -   Modify with editor: Mock editor interaction, verify modified change is applied.
    -   Trigger a `write_file` tool call for a new file and for an existing file: approve, deny, modify.
    -   Trigger `run_shell_command`: approve (shows command), deny.
    -   Trigger a tool that produces live output (if any such core tool exists or can be mocked).
    -   Trigger multiple parallel tool calls (e.g., multiple `read_file` calls).
    -   Trigger a tool call that results in an error during its execution.
    -   Test with `ApprovalMode.YOLO` and `ApprovalMode.AUTO_EDIT` to bypass confirmations.
-   **Configuration (`config/`):**
    -   Change theme, auth, editor preferences via commands and verify `settings.json` (user and workspace) updates.
    -   Use environment variables to override settings (e.g., `GEMINI_MODEL`, `GEMINI_API_KEY`, `GEMINI_SANDBOX`).
    -   Test loading of extensions from home and workspace, including context file merging and MCP server definition.
    -   Test `.env` file loading hierarchy.
-   **Sandboxing (`utils/sandbox.ts`):**
    -   Run CLI with `GEMINI_SANDBOX=docker` (or `podman`, `sandbox-exec` on macOS).
    -   Verify basic chat works.
    -   Attempt a file read/write operation from within the sandbox.
    -   Attempt a shell command that interacts with the host system (e.g., creating a file in a non-mounted directory) to verify sandbox restrictions (requires specific sandbox profile setup for `sandbox-exec`).
-   **Non-Interactive Mode (`nonInteractiveCli.ts`):**
    -   `echo "prompt" | gemini-cli`: Pipe input, verify output.
    -   `gemini-cli -p "prompt"`: Use prompt argument, verify output.
    -   Test with a prompt that would trigger a tool call (verify it's skipped or handled according to non-interactive logic, likely by not executing modifying tools).
-   **Error Handling:**
    -   Invalid API key / auth error: Verify auth dialog appears or error is shown.
    -   Rate limiting (429 error): Verify retry logic and Flash fallback for OAuth.
    -   Input invalid commands or arguments for slash commands.
    -   File not found for `@` commands.
    -   Network errors during API calls or MCP communication.
-   **History Management (`useHistoryManager.ts`, `useInputHistory.ts`, `useShellHistory.ts`):**
    -   Navigate input history (up/down arrows).
    -   Navigate shell command history (up/down arrows in `!` mode).
    -   `/clear`: Clear screen and chat session state.
    -   `/chat save mytag` & `/chat resume mytag`: Persist and restore conversation history.
    -   Verify shell history persistence in `~/.gemini/tmp/<hash>/shell_history`.
-   **Update Notifications (`ui/utils/updateCheck.ts`):**
    -   Mock `update-notifier` to simulate an update being available. Verify `UpdateNotification.tsx` is rendered.
-   **Privacy Notices (`ui/privacy/`):**
    -   Set different auth types and verify the correct privacy notice component is shown (`CloudFreePrivacyNotice`, `CloudPaidPrivacyNotice`, `GeminiPrivacyNotice`).
    -   Test data collection opt-in/out flow for `CloudFreePrivacyNotice` (mock `usePrivacySettings` interactions).
-   **UI Responsiveness & Display:**
    -   Type rapidly in input while Gemini is streaming a long response.
    -   Handle very long streaming responses, verify message splitting and `<Static>` rendering.
    -   Resize terminal window and verify layout adjusts (header, input width, footer).
    -   Test Ctrl+O to toggle debug console.
    -   Test Ctrl+T to toggle MCP tool descriptions.
    -   Test Ctrl+S to toggle constrained height for long messages.

## Security Considerations

-   **Sandboxing (`utils/sandbox.ts`, `utils/sandbox-macos-*.sb` files):**
    -   The sandboxing feature is crucial for mitigating risks associated with executing AI-generated code or shell commands.
    -   Supports Docker, Podman, and macOS `sandbox-exec`.
    -   macOS Seatbelt profiles (e.g., `permissive-open`, `restrictive-closed`) define granular permissions for file access, network operations, and process execution. These profiles are text files using the Seatbelt policy language.
    -   Container-based sandboxes (Docker/Podman) use volume mounts (`-v`) to control file system access (e.g., mounting CWD, `~/.gemini`, `/tmp`). Network modes can restrict network access.
-   **API Key Management (`config/config.ts`, `config/settings.ts`, `config/auth.ts`):**
    -   Users are responsible for securely managing their API keys (Gemini API Key, Google API Key for Vertex).
    -   The CLI supports loading keys from environment variables (`GEMINI_API_KEY`, `GOOGLE_API_KEY`), `.env` files (loaded by `dotenv`, with hierarchical lookup), and `settings.json` (user or workspace, with environment variable substitution like `$VAR`).
    -   OAuth tokens for personal Google accounts are stored securely in `~/.gemini/oauth_creds.json` by `google-auth-library`. `clearCachedCredentialFile` can remove this.
-   **Tool Execution (`ui/hooks/useReactToolScheduler.ts`, `ui/hooks/shellCommandProcessor.ts`):**
    -   Tools that modify files (`replace`, `write_file`) or execute arbitrary code (`run_shell_command`) require user confirmation by default via a dialog showing the intended action (e.g., diff, command to be run). The `CoreToolScheduler` (from `@google/gemini-cli-core`) calls `tool.shouldConfirmExecute`.
    -   The UI (`ToolConfirmationMessage.tsx`) displays details (diffs, command to be run) and prompts for user action (Yes, No, Always (tool/server), Modify, Cancel).
    -   This confirmation can be bypassed if `ApprovalMode.YOLO` (set via `--yolo` CLI flag or settings) or `ApprovalMode.AUTO_EDIT` (toggled by Shift+Tab or set in settings) is active. `useAutoAcceptIndicator` manages this state.
    -   MCP tools also go through a confirmation step (`ToolMcpConfirmationDetails`) unless the server or specific tool is allowlisted (managed by `DiscoveredMCPTool.allowlist`) or `trust` is enabled for the server in its config.
-   **Input Sanitization/Validation:**
    -   While Gemini responses are generally Markdown, tool parameters generated by the model are validated against their JSON schema using `SchemaValidator` (in `Tool.validateToolParams`).
    -   Shell commands generated by the model for `run_shell_command` are executed via `bash -c "command"` or `cmd.exe /c "command"`. The model is instructed to provide exact commands, but complex commands with user-provided parts could still be a vector if not handled carefully by the model's generation.
    -   File paths provided to tools are validated to be within the project root directory by each tool's `validateToolParams` method (e.g., using `isWithinRoot` helper).
    -   `unescapePath` is used for `@` command paths to handle escaped spaces.
    -   `stripAnsi` is used in `TextBuffer` and `shellCommandProcessor` to remove ANSI escape codes from text that might interfere with display or processing.
    -   `stripUnsafeCharacters` in `TextBuffer` removes control characters (except line breaks) and DEL from input to prevent terminal rendering issues.
-   **Data Privacy (`ui/privacy/` components, `ui/hooks/usePrivacySettings.ts`):**
    -   `PrivacyNotice.tsx` displays the correct notice (`CloudFreePrivacyNotice`, `CloudPaidPrivacyNotice`, `GeminiPrivacyNotice`) based on `AuthType` from `config.getContentGeneratorConfig()`.
    -   For users on the free tier of Google Code Assist (personal accounts), `CloudFreePrivacyNotice` uses `usePrivacySettings` hook, which interacts with `CodeAssistServer.getCodeAssistGlobalUserSetting` and `setCodeAssistGlobalUserSetting` (from `@google/gemini-cli-core`) to manage the `freeTierDataCollectionOptin` boolean.
    -   Users are advised not to submit confidential information.
    -   Telemetry (`@google/gemini-cli-core/telemetry/`) can be disabled (`config.getTelemetryEnabled()`), and prompt logging within telemetry (`config.getTelemetryLogPromptsEnabled()`) is also configurable.
-   **External Editor (`ui/utils/editor.ts`):**
    -   Opening files or diffs in an external editor (`openDiff`) relies on the security of the user's chosen editor application (e.g., VS Code, Vim). The CLI constructs commands (e.g., `code --wait --diff`) to launch these editors.
-   **Dependency Management:** Regular updates and audits of third-party dependencies (npm packages listed in `package.json`) are necessary to mitigate vulnerabilities from external libraries.
-   **Hierarchical Memory (`config/config.ts`, `@google/gemini-cli-core/utils/memoryDiscovery.ts`):**
    -   `GEMINI.md` (or custom-named context files) are loaded from various locations (global, upward to project root, CWD, downward in subdirs, extensions). Users should be aware that broadly shared `GEMINI.md` files (e.g., in a shared home directory or project root) could inadvertently expose context if not managed carefully.
-   **Environment Variables (`config/config.ts`):**
    -   The CLI respects various environment variables for configuration (e.g., `HTTPS_PROXY`, `GEMINI_MODEL`, API keys, `GEMINI_SANDBOX`, `SEATBELT_PROFILE`, `SANDBOX_PORTS`, `SANDBOX_MOUNTS`, `SANDBOX_ENV`). Users must ensure these are set securely in their environment.
-   **`.env` File Loading (`config/config.ts`):**
    -   `.env` files are loaded by `dotenv` hierarchically (project `.gemini/.env` > project `.env` > home `.gemini/.env` > home `.env`). This provides flexibility but users should be aware of the precedence and potential for sensitive data in these files.
-   **File System Access:** Tools like `read_file`, `write_file`, `ls`, `glob`, and `edit` directly interact with the file system. Their operations are generally confined to the `targetDir` (project root) by validation logic within each tool and utility functions like `isWithinRoot`. Sandboxing further restricts this.
-   **Shell Command Execution (`ShellTool`):** The `ShellTool` executes commands with `bash -c` or `cmd.exe /c`. While user confirmation is required by default, the model's ability to construct arbitrary shell commands means that if a user approves a malicious-looking command, it will be executed. The prompt engineering aims to make the model cautious.
<!-- TINS Specification v1.0 -->
