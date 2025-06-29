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
    -   Configuration loading (`config/`): Handles settings, environment variables, and command-line arguments.
    -   UI components (`ui/components/`): React components for rendering different parts of the interface.
    -   UI hooks (`ui/hooks/`): Logic for managing UI state, input processing, and interactions.
    -   Command processors (`ui/hooks/atCommandProcessor.ts`, `ui/hooks/shellCommandProcessor.ts`, `ui/hooks/slashCommandProcessor.ts`): Handle specific command types.
    -   Core interaction logic (`ui/hooks/useGeminiStream.ts`): Manages the stream of communication with the Gemini API and tool execution.
    -   Utilities (`utils/`, `ui/utils/`): Helper functions for various tasks like text manipulation, file operations, version checking, etc.
-   **Rendering:** Uses Ink framework for building the terminal-based UI with React.
-   **State Management:** Primarily uses React hooks (useState, useEffect, useCallback, useMemo, useContext) for managing component and application state.
-   **Asynchronous Operations:** Extensive use of Promises and async/await for handling API calls, file operations, and command execution.

### Key Data Structures

-   **`HistoryItem`:** Represents an entry in the conversation display (user prompt, Gemini response, tool call, info message, error, etc.).
-   **`Config` (from `@google/gemini-cli-core`):** Central object holding all runtime configuration.
-   **`Settings`:** Typed interface for user and workspace settings.
-   `SlashCommand`: Defines the structure for slash commands.
-   `Suggestion`: Used for autocompletion suggestions.
-   `ConsoleMessageItem`: Represents a message in the debug console.
-   `TextBuffer` (`ui/components/shared/text-buffer.ts`): Manages the state of the multiline text input, including cursor position, undo/redo history, and visual layout.
-   `TrackedToolCall` (`ui/hooks/useReactToolScheduler.ts`): Represents the state of a tool call throughout its lifecycle (scheduled, validating, awaiting_approval, executing, success, error, cancelled).

### Core Algorithms & Processes

-   **Input Processing:**
    -   The `InputPrompt` component captures user input.
    -   `useKeypress` hook handles low-level key events.
    -   `TextBuffer` manages text editing features.
    -   Command processors determine if the input is a special command (`@`, `!`, `/`).
-   **Gemini API Interaction (`useGeminiStream`):**
    -   Initializes a chat session with `GeminiClient`.
    -   Sends user prompts (potentially modified by command processors) to the API.
    -   Processes the streaming response from Gemini, which can include:
        -   Text content (rendered as Markdown).
        -   Tool call requests.
        -   Usage metadata.
        -   Error messages.
    -   Handles tool call execution via `useReactToolScheduler`.
    -   Updates conversation history and UI state based on stream events.
-   **Tool Execution (`useReactToolScheduler`):**
    -   Manages a queue of tool calls requested by Gemini.
    -   Validates tool parameters.
    -   Handles confirmation flows for tools that require user approval (e.g., file modifications).
    -   Executes tools (either built-in or via external commands/MCP servers).
    -   Streams live output from tools if supported.
    -   Collects tool responses and sends them back to Gemini for further processing.
-   **Configuration Loading (`config/config.ts`, `config/settings.ts`, `config/extension.ts`):**
    -   Loads settings from JSON files in user's home directory and workspace `.gemini` folder.
    -   Merges settings, with workspace settings overriding user settings.
    -   Parses command-line arguments and environment variables, which can override file settings.
    -   Loads extensions from `.gemini/extensions` directories.
-   **Markdown Rendering (`ui/utils/MarkdownDisplay.tsx`, `ui/utils/CodeColorizer.tsx`):**
    -   Parses Markdown text from Gemini responses.
    -   Renders various Markdown elements (headers, lists, code blocks, inline styles).
    -   Uses `lowlight` library for syntax highlighting of code blocks.
    -   Supports theming for code blocks.
-   **Autocompletion (`ui/hooks/useCompletion.ts`):**
    -   Provides suggestions for file paths when typing `@` commands.
    -   Provides suggestions for slash commands when typing `/`.
    -   Uses `glob` for recursive file searching if enabled.
    -   Filters suggestions based on user input and respects `.gitignore` rules if configured.
-   **Sandboxing (`utils/sandbox.ts`):**
    -   Constructs and executes commands to run the CLI within a sandboxed environment (Docker, Podman, or macOS `sandbox-exec`).
    -   Manages volume mounts, environment variable propagation, and network configuration for the sandbox.
    -   Uses different profiles for macOS `sandbox-exec` (permissive, restrictive, open, closed, proxied).

### External Integrations

-   **Gemini API:** Primary integration for AI model interaction.
-   **Google Cloud (Vertex AI):** Alternative backend for Gemini models.
-   **Git:** Used for checkpointing (creating snapshots of the project) and potentially for git-aware file filtering.
-   **Shell:** For executing local commands (`!`, tool execution).
-   **External Editors:** Integrates with user's preferred editor for tasks like editing commit messages or large text inputs.
-   **NPM (`update-notifier`):** For checking for CLI updates.

## Style Guide (UI)

-   **Colors:** The CLI uses a theming system (`ui/themes/`). Colors are defined in `ColorsTheme` and accessed via the `Colors` object, which dynamically updates based on the active theme.
    -   Themes include light and dark variants (e.g., Default, Default Light, Ayu, Ayu Light, Atom One, Dracula, GitHub, GitHub Light, Google Code, Xcode, ANSI, ANSI Light).
    -   A `No Color` theme is available when `NO_COLOR` environment variable is set.
-   **Layout:**
    -   Uses Ink's `<Box>` component for layout structuring with Flexbox properties.
    -   Consistent padding and margins are used for different UI elements.
    -   Responsive elements (e.g., Header ASCII art, input prompt width) adapt to terminal size.
-   **Interactions:**
    -   Interactive elements like `RadioButtonSelect` provide clear visual feedback for selection and focus.
    -   Spinners and loading phrases indicate ongoing operations.
    -   Error messages are typically displayed in red.
    -   Informational messages use distinct colors (e.g., yellow for warnings/info).
-   **Typography:**
    -   Standard terminal fonts are used.
    -   Bold, italic, strikethrough, and underline styles are applied for emphasis and Markdown rendering.

## Performance Requirements

-   **Responsiveness:** The UI should remain responsive during user input and while Gemini is generating responses.
-   **Streaming Output:** Gemini responses should be streamed to the UI as they arrive to provide immediate feedback.
-   **Efficient History Rendering:** The `Static` component from Ink is used to optimize rendering of the conversation history, minimizing re-renders of older messages. Long messages are split into `GeminiMessageContent` components.
-   **Debounced Operations:** Autocompletion and other potentially expensive operations are debounced to avoid excessive processing.
-   **Memory Management:**
    -   The CLI can be relaunched with increased Node.js heap memory if needed (`--max-old-space-size`).
    -   The `/compress` command helps manage large conversation contexts.

## Accessibility Requirements

-   **Keyboard Navigable:** All interactive elements (input prompt, dialogs) should be navigable using the keyboard.
-   **Clear Feedback:** Visual feedback for actions, loading states, and errors.
    -   Loading phrases can be disabled via accessibility settings (`disableLoadingPhrases`).
-   **Theming:** Support for light and dark themes, as well as a no-color option, can aid users with different visual preferences or needs.
-   **Text Wrapping:** Output text wraps to fit the terminal width, ensuring readability.

## Testing Scenarios

-   **Basic Chat:** Send a prompt, receive a response.
-   **Slash Commands:** Test execution of various slash commands (e.g., `/help`, `/theme`, `/memory add`, `/stats`).
-   **@ Commands:**
    -   Reference a single file.
    -   Reference a directory (should glob contents).
    -   Reference a non-existent file (should handle error or fallback to glob).
    -   Reference a file with spaces or special characters in its name.
-   **! Shell Commands:**
    -   Execute a simple shell command (e.g., `!ls`).
    -   Execute a command that produces a lot of output.
    -   Execute a command that errors.
-   **Tool Calls:**
    -   Trigger a tool call that requires confirmation (e.g., file modification).
    -   Approve the tool call.
    -   Deny the tool call.
    -   Trigger a tool call that executes without confirmation.
    -   Trigger a tool call that results in an error.
-   **Configuration:**
    -   Change theme via `/theme` command and verify it persists.
    -   Set auth method via `/auth` command.
    -   Modify settings in `settings.json` and verify they are loaded.
-   **Sandboxing:**
    -   Run the CLI with different sandbox configurations (Docker, Podman, macOS Seatbelt) and verify basic functionality.
-   **Non-Interactive Mode:**
    -   Pipe input to the CLI and verify output.
    -   Run with a prompt via command-line argument.
-   **Error Handling:**
    -   Simulate API errors (e.g., rate limiting, invalid API key).
    -   Input invalid commands or arguments.
-   **History Management:**
    -   Navigate input history.
    -   Clear history.
    -   Save and resume chat sessions.
-   **Update Notifications:** Test if update notifications appear when a newer version is available.

## Security Considerations

-   **Sandboxing:** The sandboxing feature is crucial for mitigating risks associated with executing AI-generated code or shell commands. Different sandbox profiles offer varying levels of restriction.
-   **API Key Management:** Users are responsible for securely managing their API keys. The CLI supports loading keys from environment variables and `.env` files.
-   **Tool Execution:** Tools that modify files or execute arbitrary code (e.g., `edit_file`, `shell`) require user confirmation by default, unless YOLO mode or auto-edit mode is enabled.
-   **Input Sanitization:** While Gemini responses are generally Markdown, care should be taken if any part of the response is directly interpreted as executable code or shell commands (though this is typically handled through explicit tool calls).
-   **Data Privacy:**
    -   Privacy notices are displayed for different authentication methods.
    -   Users on free tiers are given options regarding data collection for product improvement.
    -   Sensitive information should not be included in prompts if data collection is enabled and reviewers might see it.
-   **External Editor:** Opening files in an external editor relies on the security of the chosen editor application.
-   **Dependency Management:** Regular updates and audits of third-party dependencies are necessary to mitigate vulnerabilities.
<!-- TINS Specification v1.0 -->
