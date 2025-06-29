# Gemini CLI Extensions Guide

This guide is intended for Large Language Models (LLMs) and developers to understand how to create "extensions" for the Gemini CLI. Since this project might be newer than your training data, this document serves as a knowledge base to help you assist users in customizing and extending the CLI's functionality.

"Extensions" in the context of this CLI primarily refer to:
1.  Adding **Custom Tools** that the LLM can use to perform actions.
2.  Providing additional **Custom Context** to the LLM to enhance its knowledge and guide its behavior.
3.  Guiding users to **Configure** the CLI in specific ways to optimize for certain tasks or workflows.

There isn't a traditional "plugin" system where you drop a package into an extensions folder for automatic loading. Instead, extensions are integrated by configuring the CLI to point to your custom scripts, context files, or MCP servers.

## Table of Contents

1.  [Understanding Extension Structure](#understanding-extension-structure)
2.  [Adding Custom Tools via Extensions](#adding-custom-tools-via-extensions)
    *   [Custom Tools via External Commands](#1-custom-tools-via-external-commands)
        *   [The Discovery Script](#a-the-discovery-script)
        *   [The Call Handler Script](#b-the-call-handler-script)
        *   [Considerations for External Command Tools](#considerations-for-external-command-tools)
    *   [Custom Tools via MCP Servers](#2-custom-tools-via-mcp-model-context-protocol-servers)
    *   [Choosing Between External Commands and MCP](#choosing-between-external-commands-and-mcp)
    *   [Understanding Stateful vs. Stateless Tools](#understanding-stateful-vs-stateless-tools)
3.  [Providing Additional Context to the LLM via Extensions](#providing-additional-context-to-the-llm-via-extensions)
    *   [Hierarchical Context Files](#1-hierarchical-context-files)
    *   [Explicit Context File Paths (`extensionContextFilePaths`)](#2-explicit-context-file-paths-extensioncontextfilepaths)
    *   [How Context is Combined and Used](#how-context-is-combined-and-used)
    *   [Best Practices for Writing Context Files](#best-practices-for-writing-context-files)
4.  [Other Potential Extension Capabilities (Primarily via Configuration)](#other-potential-extension-capabilities-primarily-via-configuration)
    *   [Customizing Core Tool Behavior](#1-customizing-core-tool-behavior)
    *   [Defining Sandboxing Behavior](#2-defining-sandboxing-behavior-for-shell-tools-sandbox)
    *   [Influencing Model Selection](#3-influencing-model-selection-and-behavior)
    *   [Modifying User Interaction](#4-modifying-user-interaction-and-approval-flows-approvalmode)
    *   [Specialized Logging and Debugging](#5-specialized-logging-and-debugging-debugmode-telemetry-settings)
    *   [Checkpointing Strategy](#6-checkpointing-strategy-checkpointing)
    *   [Guiding File Discovery for Context](#7-guiding-file-discovery-for-context-filefiltering)
5.  [Advanced Extension Example: Intercepting API Calls for Debugging](#advanced-extension-example-intercepting-api-calls-for-debugging)
6.  [Brainstorming New Extensions: List of Possible Capabilities](#brainstorming-new-extensions-list-of-possible-capabilities)
    *   [I. Adding Custom Tools & Actions](#i-adding-custom-tools--actions)
    *   [II. Enhancing LLM Knowledge & Behavior](#ii-enhancing-llm-knowledge--behavior)
    *   [III. Customizing CLI Operations (via Configuration Guidance)](#iii-customizing-cli-operations-via-configuration-guidance)

## Understanding Extension Structure

As there's no auto-discovery for a single "extension package," an "extension" should be thought of as a **conceptual collection of files and configurations**. The extension author would typically organize these components, and the user would integrate them by modifying their CLI/core configuration.

A conceptual "Extension" bundle could include:

1.  **Tool Implementations (if providing custom tools):**
    *   **Discovery Script/Executable:** A script that outputs JSON `FunctionDeclaration`s to `stdout`.
        *   *Example Location:* `my-extension/discover_tools.sh`
    *   **Call Handler Script/Executable:** A script that executes a tool's logic, taking parameters via `stdin` and returning results via `stdout`.
        *   *Example Location:* `my-extension/handle_tool_call.py`
    *   *(Alternatively, for MCP):* An implementation of an MCP server.

2.  **Context Files (if providing custom context):**
    *   Text files (e.g., Markdown, plain text) containing information to be injected into the LLM's prompt.
        *   *Example Location:* `my-extension/context/my_api_docs.md`, `my-extension/data/style_guide.txt`

3.  **Configuration Snippet / Instructions:**
    *   Clear instructions for the user on how to update their CLI configuration to integrate the extension. This involves setting relevant keys like:
        *   `toolDiscoveryCommand`
        *   `toolCallCommand`
        *   `mcpServers`
        *   `extensionContextFilePaths`
        *   Potentially `contextFileName`

**Key Point:** There is **no central manifest file** (like an `extension.json`) that the CLI reads to automatically load an extension. Integration is a manual configuration step performed by the user, guided by the extension's documentation.

## Adding Custom Tools via Extensions

You can extend the CLI's capabilities by adding custom tools. These tools can perform any action you can script or program. The CLI supports two primary methods for integrating custom tools:

1.  **Via External Commands:** You provide scripts/executables that the CLI calls to discover your tools and then to execute them.
2.  **Via Model Context Protocol (MCP) Servers:** You run an MCP server that hosts your tools, and the CLI connects to it as a client.

### 1. Custom Tools via External Commands

This method involves creating two main components:

*   A **Discovery Script**: This script tells the CLI about the tools you offer, including their names, descriptions, and expected parameters.
*   A **Call Handler Script**: This script is responsible for actually running the tool's logic when the LLM decides to use it.

**A. The Discovery Script**

*   **Purpose:** To output a JSON array of `FunctionDeclaration` objects to `stdout`. Each `FunctionDeclaration` defines a tool.
*   **Configuration:** The path to this script is set in the CLI's configuration using the `toolDiscoveryCommand` key.
    *   Example: `"toolDiscoveryCommand": "/path/to/your/extension/discover_tools.sh"`
    *   Example: `"toolDiscoveryCommand": "python /path/to/your/extension/discover_tools.py"`
*   **`FunctionDeclaration` Structure (JSON):**
    ```json
    [
      {
        "name": "your_tool_name_1",
        "description": "A clear description of what your_tool_name_1 does and when to use it. Explain parameters clearly.",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "param1": {
              "type": "STRING",
              "description": "Description of param1."
            },
            "param2": {
              "type": "INTEGER",
              "description": "Description of param2. Include units or constraints if applicable."
            },
            "required_param": {
              "type": "BOOLEAN",
              "description": "Description of a required parameter."
            }
          },
          "required": ["required_param"]
        }
      },
      {
        "name": "your_tool_name_2",
        "description": "Description for another tool.",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "data_input": {
              "type": "STRING",
              "description": "The input data to process."
            }
          },
          "required": ["data_input"]
        }
      }
    ]
    ```
    *   **`name`**: The unique identifier for your tool. Use snake\_case.
    *   **`description`**: Crucial for the LLM. It must clearly explain what the tool does, what each parameter is for, and any important context or constraints. The more detailed and well-written this is, the better the LLM can use your tool.
    *   **`parameters`**: An object following the JSON Schema specification.
        *   `type: "OBJECT"` is standard for the top-level.
        *   `properties`: An object where each key is a parameter name.
            *   `type`: JSON Schema type (e.g., "STRING", "INTEGER", "BOOLEAN", "NUMBER", "ARRAY", "OBJECT").
            *   `description`: Essential for the LLM to understand what to pass for this parameter.
        *   `required`: An array of strings listing the names of parameters that are mandatory.

*   **Example Discovery Script (`discover_tools.sh`):**
    ```bash
    #!/bin/bash
    echo '[
      {
        "name": "file_hash",
        "description": "Calculates the SHA256 hash of a specified file. Useful for verifying file integrity.",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "file_path": {
              "type": "STRING",
              "description": "The relative or absolute path to the file."
            }
          },
          "required": ["file_path"]
        }
      }
    ]'
    ```

**B. The Call Handler Script**

*   **Purpose:** To execute the logic of a specific tool when the LLM invokes it.
*   **Configuration:** The command to run this script is set in the CLI's configuration using the `toolCallCommand` key. The CLI will append the `tool_name` as an argument to this command.
    *   Example: `"toolCallCommand": "/path/to/your/extension/handle_tool_call.sh"`
    *   When `file_hash` is called, the CLI effectively runs: `/path/to/your/extension/handle_tool_call.sh file_hash`
*   **Input:** The script receives the tool's parameters as a JSON string on `stdin`.
*   **Output:**
    *   **Success:** The script should print its result to `stdout`. This can be a simple string or a JSON string if the tool returns complex data. This output will be sent back to the LLM.
    *   **Failure:** If the tool encounters an error, it should ideally print a descriptive error message to `stderr` and exit with a non-zero status code. The CLI's `DiscoveredTool` wrapper will capture `stdout`, `stderr`, exit code, and any signals, and format this information for the LLM to understand the failure.
*   **Example Call Handler Script (`handle_tool_call.sh`):**
    ```bash
    #!/bin/bash
    TOOL_NAME="$1" # The first argument is the tool name
    # Read parameters from stdin
    PARAMETERS=$(cat)

    if [[ "$TOOL_NAME" == "file_hash" ]]; then
      FILE_PATH=$(echo "$PARAMETERS" | jq -r '.file_path') # Requires jq to parse JSON

      if [[ -f "$FILE_PATH" ]]; then
        sha256sum "$FILE_PATH" | awk '{ print $1 }' # Output only the hash
      else
        echo "Error: File not found at $FILE_PATH" >&2
        exit 1
      fi
    else
      echo "Error: Unknown tool '$TOOL_NAME'" >&2
      exit 1
    fi
    ```
    *Note: This example uses `jq` for JSON parsing. Your script can use any method suitable for its language (e.g., Python's `json` module).*

**Considerations for External Command Tools:**

*   **Environment:** The scripts run in the environment of the CLI process. Ensure any dependencies (`jq`, interpreters like Python/Node.js, etc.) are available in the `PATH` or use absolute paths to them.
*   **Permissions:** Scripts must be executable (`chmod +x`).
*   **Error Handling:** Robust error handling and clear messages on `stderr` are vital for debugging and for the LLM to understand failures.
*   **Security:** Be cautious if your tools execute arbitrary commands or modify the file system, especially based on LLM-generated parameters. Consider sandboxing or strict input validation. The CLI's built-in `ShellTool` already has sandboxing capabilities that custom tools would need to replicate if similar safety is desired.
*   **State:** These tools are generally expected to be stateless, but they can read/write files if designed to do so. (See more on [Understanding Stateful vs. Stateless Tools](#understanding-stateful-vs-stateless-tools)).

### 2. Custom Tools via MCP (Model Context Protocol) Servers

This method is suitable if you have tools hosted as part of a separate service that implements the Model Context Protocol.

*   **Mechanism:**
    1.  You run an MCP server that exposes one or more tools.
    2.  You configure the CLI to connect to this server.
*   **Configuration:**
    *   **`mcpServers`**: An object in the CLI configuration where each key is a server name and the value is an `MCPServerConfig` object.
        ```json
        "mcpServers": {
          "my_mcp_service": {
            "command": "/path/to/start/mcp_server_binary", // If started via a command
            "args": ["--port", "8080"],
            // OR "url": "http://localhost:8080/mcp-sse-endpoint" for SSE
            // OR "httpUrl": "http://localhost:8080/mcp-stream-http-endpoint" for streamable HTTP
            // OR "tcp": "localhost:8080" for direct TCP
            "timeout": 5000, // Optional connection timeout
            "trust": false // Set to true if the server is fully trusted
          }
        }
        ```
    *   **`mcpServerCommand`**: Alternatively, a single command that starts an MCP server.
*   **Discovery & Execution:** The CLI's `ToolRegistry` (via `discoverMcpTools`) will connect to the configured MCP server(s), retrieve the `FunctionDeclaration`s for the tools they offer, and register them. When an MCP tool is called, the CLI forwards the request to the MCP server, which executes the tool and returns the result.
*   **Implementation Details:** Implementing an MCP server is beyond the scope of this guide but involves using or creating libraries that adhere to the Model Context Protocol specification. You would typically use the `@modelcontextprotocol/sdk` or a similar SDK in your chosen language.

### Choosing Between External Commands and MCP

When deciding how to implement your custom tool, consider the following:

*   **External Commands:**
    *   **Pros:**
        *   Simpler to set up for local scripts or integrating existing command-line utilities.
        *   Good for tools tightly coupled with the local file system or environment.
        *   No need to run or maintain a separate persistent server process.
        *   Direct execution can be faster for simple tasks (no network overhead to an MCP server).
    *   **Cons:**
        *   Less suitable for tools that need to maintain complex state across many users or invocations (unless they manage their own persistent storage like files or a local database).
        *   Discovery (`toolDiscoveryCommand`) and execution (`toolCallCommand`) rely on the user's environment having the necessary interpreters (e.g., Python, Node.js, bash) and dependencies correctly configured.
        *   Sharing tools across a team might involve distributing scripts and ensuring consistent environments.

*   **MCP Servers:**
    *   **Pros:**
        *   Better for tools that are part of a larger, more complex service or require significant computational resources that can be centralized.
        *   Allows tools to be hosted remotely and accessed by multiple clients or users consistently.
        *   Enforces a standard protocol for tool interaction, potentially making tools more interoperable.
        *   Can maintain complex state or leverage resources (databases, caches) available on the server side.
        *   Abstracts the execution environment from the client CLI.
    *   **Cons:**
        *   More complex to set up and maintain (requires running a persistent server application).
        *   Introduces network latency for tool calls.
        *   Can be overkill for simple, local-only tools.

**Rule of Thumb: When is MCP Overkill? API Call Efficiency Matters.**

While MCP offers a robust way to serve tools, it's not always the most efficient or necessary solution, especially when considering the effort of implementation and potential operational costs (like API calls made by the MCP server itself).

*   **Consider MCP Overkill If:**
    *   **Simple, Local Tasks:** The tool performs a straightforward task that can be easily achieved with a local script (e.g., reading a specific local config file, a simple text transformation, running a single local command).
    *   **Infrequent Use / Project-Specific:** The tool is only relevant to a single user or a specific local project and doesn't need to be shared widely as a persistent service.
    *   **One-Off Operations:** The primary use case involves a single execution or very infrequent use where the overhead of setting up and maintaining an MCP server isn't justified.
    *   **No Shared State/Resources Needed:** The tool doesn't need to maintain state across different users/clients or access server-side resources that a local script couldn't.

*   **Prioritize API Call Efficiency (Especially if your MCP server calls other LLMs/APIs):**
    *   The core principle is to be mindful of resource consumption. If your MCP tool, in turn, makes calls to other paid APIs (like another LLM for a sub-task), each invocation of your MCP tool from the Gemini CLI could trigger those downstream costs.
    *   **Scenario to Avoid:** Imagine an MCP tool that, for every call, makes multiple LLM API calls to achieve its result. If this tool is used frequently for tasks that could have been batched or handled by a more intelligent local script with fewer (or no) external API calls, it becomes inefficient and costly.
    *   **Strive for Efficiency:**
        *   **Local Scripts for Batchable Work:** If a task involves processing multiple items or steps that can be defined upfront, a local script (External Command tool) that does all the work in one go and then returns a single consolidated result is often far more efficient than an MCP tool called iteratively for each small step.
        *   **Intelligent MCP Tools:** If an MCP tool *must* call other APIs, design it to be as efficient as possible. Can it batch requests? Can it cache results? Can it do some processing locally before deciding if an API call is truly necessary?
    *   **The Test of Time:** A poorly designed or unnecessarily complex MCP implementation that is inefficient (e.g., high latency, high cost per call due to downstream APIs, difficult to maintain) is likely to be abandoned or "forgotten." The initial effort to build it will be wasted if it's not designed with practicality and efficiency in mind for its intended use case.

**Recommendation:**

Start with the simplest approach that meets the immediate need.
*   For most local file operations, text processing, or wrapping existing CLI utilities, **External Command tools** are often sufficient, efficient, and easier to manage.
*   Consider **MCP Servers** when you need to provide tools as a shared, persistent service, when tools require significant server-side resources/state, or when you're building a standardized tool ecosystem for a team or organization. Always weigh the added complexity and potential operational overhead against the benefits.

### Understanding Stateful vs. Stateless Tools

When designing or using tools, it's important to understand whether they are *stateless* or *stateful*, as this impacts how they behave and how you should reason about their effects.

*   **Stateless Tools:**
    *   These tools operate solely based on the input parameters they receive for a given call.
    *   They do not remember any information from previous calls.
    *   Given the same input parameters and the same external environment (e.g., file content they read), they will always produce the same output.
    *   They generally do not have side effects that change the system's state (e.g., they don't write files or modify persistent settings).
    *   **Examples of built-in tools that are primarily stateless:**
        *   `list_directory (LSTool)`: Reads directory contents.
        *   `read_file (ReadFileTool)`: Reads file content. (Note: Has a minor side effect of recording telemetry metrics).
        *   `search_file_content (GrepTool)`: Searches file contents.
        *   `glob (GlobTool)`: Finds files matching patterns.
        *   `read_many_files (ReadManyFilesTool)`: Reads multiple files. (Note: Records telemetry metrics).
        *   `google_web_search (WebSearchTool)`: Queries an external search engine; the tool itself doesn't store search history locally.
        *   `web_fetch (WebFetchTool)`: Fetches web content; while it might interact with an LLM in its fallback, the tool itself doesn't store fetched data persistently.

*   **Stateful Tools:**
    *   These tools can remember information from previous calls or can change the state of the system in a way that affects future operations (by themselves or other tools).
    *   Their behavior might depend on past interactions or existing configurations they modify.
    *   They often have side effects, such as creating or modifying files, changing settings, or interacting with external services that maintain state.
    *   **Examples of built-in tools that are stateful or modify external state:**
        *   **`replace (EditTool)`**: Directly modifies file content on the filesystem. Each execution changes the file's state. It also maintains an internal (session-based) cache for edit corrections.
        *   **`write_file (WriteFileTool)`**: Creates or overwrites files, directly changing filesystem state. It also records telemetry metrics.
        *   **`run_shell_command (ShellTool)`**: Executes arbitrary shell commands. These can modify files, environment variables (for the subprocess), start persistent background processes, or interact with any external stateful service. It also maintains a session-based whitelist of approved commands and creates temporary files for process group info.
        *   **`save_memory (MemoryTool)`**: Explicitly designed to be stateful. It appends information to a persistent memory file (e.g., `~/.gemini/GEMINI.md`), altering the LLM's long-term context for future sessions.

**Considerations for Custom Tools:**

When you create custom tools (either via External Commands or MCP Servers), you decide their statefulness:

*   **Designing Stateless Custom Tools:**
    *   Your tool's script or MCP endpoint receives a request, processes it based *only* on the current input and readily available external information (like reading a file *as it is now*), and returns a result.
    *   It does not write to persistent storage in a way that influences its *own* future calls.
    *   This is often simpler to reason about and test.

*   **Designing Stateful Custom Tools:**
    *   Your tool might:
        *   Write to files that it or other tools will read later (e.g., a tool that manages a to-do list in a local file).
        *   Store data in a database.
        *   Maintain a configuration file that it modifies and reads.
        *   Interact with an external API that remembers session information.
    *   Stateful tools are more powerful for certain tasks but require careful design to manage state correctly and avoid unintended consequences.
    *   Clearly document the stateful nature of your custom tool in its description so the LLM (and users) understand its behavior and potential side effects. For example, if a tool `append_to_log` adds a line to `my_app.log`, its description should state this.

**LLM Awareness:**

The LLM should be aware of the stateful nature of certain tools.
*   For tools like `EditTool` or `WriteFileTool`, the LLM should understand that successive calls can build upon each other (e.g., writing a file, then editing it).
*   For `MemoryTool`, the LLM should understand it's making a persistent change.
*   When using `ShellTool`, the LLM should be guided to be cautious if commands could have lasting side effects, especially if the goal is a read-only operation.

Understanding this distinction helps in predicting tool behavior, debugging issues, and designing more effective interactions with the CLI and its extensions.

## Providing Additional Context to the LLM via Extensions

Beyond adding custom tools, extensions can significantly enhance the LLM's performance and knowledge by providing additional, relevant textual context. This context is loaded into the LLM's prompt before your query, effectively giving it domain-specific information, project details, or any other guiding text.

There are two main ways an "extension" (or your project setup) can provide this context:

1.  **Hierarchical Context Files (e.g., `GEMINI.md`):** The CLI automatically searches for conventionally named files in your project directory and its parent directories.
2.  **Explicit Context File Paths (`extensionContextFilePaths`):** You can directly specify a list of context files in the CLI's configuration. This is the most direct way for an extension to ensure its context is loaded.

### 1. Hierarchical Context Files

*   **Mechanism:** The CLI searches for specific files (by default, `GEMINI.md`) in a hierarchical manner:
    *   **Global:** Looks in a user-specific global directory (e.g., `~/.gemini/GEMINI.md`).
    *   **Upward Traversal:** From the Current Working Directory (CWD), it walks up to the project root (if a `.git` directory is found) or the user's home directory, looking for the context file in each directory.
    *   **Downward Traversal:** It performs a search downwards from the CWD into subdirectories (respecting `.gitignore` and `.geminiignore`, and with limits on scan depth/count).
*   **File Naming:**
    *   The default filename is `GEMINI.md`.
    *   This can be changed using the `contextFileName` setting in the CLI configuration. It can be a single string or an array of strings if you want to search for multiple conventional filenames.
        *   Example: `"contextFileName": "PROJECT_CONTEXT.md"`
        *   Example: `"contextFileName": ["API_GUIDE.txt", "STYLE_GUIDE.md"]`
*   **Content:** These files should contain plain text or Markdown. The content from all found files is concatenated (with markers indicating the source file path) and prepended to the main prompt.
*   **Use Case for Extensions:** If your extension is designed to work with projects that follow a certain convention (e.g., always having a `PROJECT_SPECIFIC_CONFIG.md`), you could instruct users to set `contextFileName` accordingly. However, for more guaranteed inclusion, explicit paths are better.

### 2. Explicit Context File Paths (`extensionContextFilePaths`)

*   **Mechanism:** This is the most robust way for an extension to provide context. The CLI configuration includes a key `extensionContextFilePaths`, which accepts an array of strings. Each string should be an absolute or relative path (resolved from CWD) to a context file.
*   **Configuration Example:**
    ```json
    {
      // ... other configurations ...
      "extensionContextFilePaths": [
        "/path/to/your/extension/data/knowledge_base.md",
        "docs/project_architecture_overview.txt", // Relative to CWD
        "/another/extension/api_conventions.md"
      ]
      // ... other configurations ...
    }
    ```
*   **Discovery:** The paths provided in `extensionContextFilePaths` are read directly by `loadServerHierarchicalMemory` and their content is added to the overall user memory.
*   **Content:** Like hierarchical files, these should be plain text or Markdown.
*   **Use Case for Extensions:**
    *   An extension can bundle several `.md` or `.txt` files containing specific instructions, data, API descriptions, style guides, or any information relevant to its functionality.
    *   When a user "installs" or "configures" the extension, they would add the paths to these bundled files to their CLI's `extensionContextFilePaths` setting.

### How Context is Combined and Used

1.  Content from all discovered hierarchical files and all explicitly provided `extensionContextFilePaths` is read.
2.  Each piece of content is wrapped with a header indicating its source path (e.g., `--- Context from: path/to/file.md ---`).
3.  All these context blocks are concatenated together.
4.  This combined block of text becomes the `userMemory` that is passed to the LLM as part of its system prompt or initial context.

### Best Practices for Writing Context Files

*   **Clarity and Conciseness:** LLMs have context window limits. Provide information that is directly relevant and clearly written.
*   **Structure:** Use Markdown for headings, lists, and code blocks to improve readability for both humans and potentially for the LLM's parsing.
*   **Actionable Information:** Focus on context that helps the LLM perform tasks, understand constraints, or use tools correctly.
    *   Examples: "When asked to write a database migration, always use the `sequential_id` format for primary keys." or "The project `foo-service` uses Python 3.9 and Flask."
*   **Tool-Related Context:** If your extension provides custom tools, its context files can include detailed usage examples, best practices, or troubleshooting tips for those tools, supplementing the tool descriptions themselves.
*   **Avoid Redundancy:** If information is already well-defined in a tool's description, you might not need to repeat it extensively in a general context file, unless you want to provide broader examples or strategic guidance.

By leveraging `extensionContextFilePaths`, an extension can ensure that the LLM is primed with the necessary knowledge to interact effectively with the extension's features or the user's project in a specific way.

## Other Potential Extension Capabilities (Primarily via Configuration)

While custom tools and custom context are the primary ways to extend the CLI's functionality, "extensions" can also guide users to configure various aspects of the CLI and its core engine to achieve specialized behaviors. These are typically not direct code plugins but rather leveraging existing configuration points.

### 1. Customizing Core Tool Behavior
*   **Selective Tool Usage (`coreTools`, `excludeTools`):**
    *   An extension could define a specific workflow that only requires a subset of the built-in tools. It can instruct the user to configure `coreTools` to list only the necessary tools or `excludeTools` to remove ones that might conflict or be irrelevant to the extension's domain.
    *   **Configuration:**
        ```json
        "coreTools": ["read_file", "write_file", "my_custom_tool"],
        "excludeTools": ["shell", "grep"]
        ```
    *   **Impact:** Tailors the LLM's available actions to a specific task, potentially improving focus and reducing errors.

### 2. Defining Sandboxing Behavior for Shell Tools (`sandbox`)
*   If an extension relies heavily on the `shell` tool (or custom tools that execute shell commands) and requires a specific sandboxing environment (or lack thereof, with caution):
    *   **Configuration:**
        ```json
        "sandbox": {
          "command": "docker", // or "podman", "sandbox-exec"
          "image": "my_custom_sandboxing_image:latest"
        }
        ```
    *   **Impact:** Ensures that shell commands execute in a controlled environment defined by the extension's requirements. This is an advanced setting.

### 3. Influencing Model Selection and Behavior
*   **Default Model (`model`):** An extension might perform better with a specific LLM (e.g., one with a larger context window or specialized training, if such options become available and configurable).
    *   **Configuration:** `"model": "specific-model-name"`
    *   **Impact:** Optimizes the LLM for the types of tasks the extension is designed for.
*   **Embedding Model (`embeddingModel`):** If an extension's workflow involves semantic search or tasks that rely on embeddings, it could recommend a specific embedding model.
    *   **Configuration:** `"embeddingModel": "specific-embedding-model-name"`

### 4. Modifying User Interaction and Approval Flows (`approvalMode`)
*   For extensions that automate complex but well-understood tasks, they might guide the user to adjust the `approvalMode`.
    *   **Configuration:**
        *   `"approvalMode": "autoEdit"` (auto-approve file edits)
        *   `"approvalMode": "yolo"` (auto-approve most actions - use with extreme caution)
    *   **Impact:** Streamlines workflows for trusted extensions, but significantly increases risk if misused. This should be recommended very carefully.

### 5. Specialized Logging and Debugging (`debugMode`, Telemetry Settings)
*   If an extension is complex, it might instruct users to enable `debugMode` for more verbose logging during development or troubleshooting of the extension itself.
    *   **Configuration:** `"debugMode": true`
*   Advanced extensions interacting with telemetry might guide users on `telemetry` settings if they integrate with a compatible backend (highly specific and advanced).

### 6. Checkpointing Strategy (`checkpointing`)
*   Extensions that perform many file operations might advise enabling `checkpointing` so users can easily revert changes.
    *   **Configuration:** `"checkpointing": true`

### 7. Guiding File Discovery for Context (`fileFiltering`)
*   If an extension's context files rely on specific file discovery behaviors (e.g., needing to search deep within `node_modules` which might normally be ignored, or needing to *not* respect `.gitignore` for some reason):
    *   **Configuration:**
        ```json
        "fileFiltering": {
          "respectGitIgnore": false,
          "enableRecursiveFileSearch": true // Or false if only top-level context is desired
        }
        ```
    *   **Impact:** Ensures the CLI's context gathering aligns with the extension's assumptions about where to find relevant information.

**Important Considerations for These "Capabilities":**
*   **Indirect Extension:** These are not direct code injections by the extension itself. Instead, the "extension" provides a set of tools/context *and* a recommended configuration profile to make optimal use of them.
*   **User Responsibility:** The user is ultimately responsible for applying these configurations. The extension's documentation should clearly explain the implications of each recommended setting.
*   **No Automatic Configuration:** The CLI does not have a mechanism for an "extension package" to automatically apply these settings.

By thinking about these configuration points, an LLM designing an extension can provide a more holistic solution that not only adds tools and knowledge but also guides the user in setting up the CLI environment for optimal interaction with the extension.

## Advanced Extension Example: Intercepting API Calls for Debugging

One powerful use case for extensions is to create tools that help debug or understand the CLI's interactions with the Large Language Model (LLM). Imagine a scenario where a user wants to see the exact, fully assembled prompt, including all context and tool definitions, that is about to be sent to the LLM, *without actually sending it* and incurring API costs or waiting for a response. This can be invaluable for debugging why an LLM might be behaving unexpectedly or for learning how context is being constructed.

This example outlines how such an "API Call Preview" extension could be built.

**Goal of the Extension:**

*   To provide a way for the user to type a prompt as they normally would.
*   Instead of the CLI immediately sending this to the LLM, the extension intercepts this.
*   The extension then displays the complete data package (prompt, history, tool schemas, etc.) that *would have been* sent to the LLM.
*   This allows the user to inspect the context, verify tool definitions, and understand exactly what the LLM would receive.

**Components of the Extension:**

1.  **Custom Tool: `preview_llm_request`**
    *   **Discovery Script:** The extension's `discover_tools.sh` (or equivalent) would define this tool.
        ```json
        // In discover_tools.sh output
        [
          {
            "name": "preview_llm_request",
            "description": "Captures your input and displays the full request data (prompt, history, tools) that would be sent to the LLM, without actually making the API call. Use this to debug context or understand the API request structure.",
            "parameters": {
              "type": "OBJECT",
              "properties": {
                "user_prompt": {
                  "type": "STRING",
                  "description": "The prompt or question you would normally ask the LLM."
                }
              },
              "required": ["user_prompt"]
            }
          }
        ]
        ```
    *   **Call Handler Script (`handle_tool_call.sh preview_llm_request`):** This is the core of the extension. It would need to:
        *   Receive the `user_prompt` from its `stdin`.
        *   **Access Core CLI Configuration and State (Conceptual):** This is the trickiest part and highlights where such an extension pushes the boundaries of simple external scripts. The script would ideally need access to:
            *   The current chat history.
            *   The fully resolved system prompt.
            *   The list of all `FunctionDeclaration`s for all currently active tools (built-in and custom).
            *   The current `Config` object to understand settings like `model`, `userMemory`, etc.
        *   **Simulate Request Assembly:** The script would then try to replicate the logic that `GeminiClient` or `GeminiChat` uses to assemble the final request payload for the `generateContent` API call. This involves:
            *   Formatting chat history.
            *   Combining system prompt, user memory (from context files), and the current `user_prompt`.
            *   Compiling the list of tool schemas.
        *   **Output:** Instead of sending this payload to an LLM, the script would pretty-print the assembled JSON (or a summary of it) to `stdout`.

2.  **Context File (Optional but Recommended):**
    *   The extension could include a `preview_extension_guide.md` file.
    *   This file would be added to `extensionContextFilePaths` in the user's CLI configuration.
    *   **Content:** "When you want to debug the LLM request, use the `preview_llm_request` tool. Provide your intended prompt to its `user_prompt` parameter. This will show you the data before it goes to the API."

**How the User Would Interact:**

1.  **Configuration:**
    *   User configures `toolDiscoveryCommand` and `toolCallCommand` to point to the extension's scripts.
    *   User adds `my-preview-extension/preview_extension_guide.md` to `extensionContextFilePaths`.

2.  **Usage:**
    Instead of directly prompting the LLM like:
    `$ gemini-cli "Why is the sky blue?"`

    The user would invoke the custom tool:
    `$ gemini-cli "/preview_llm_request user_prompt='Why is the sky blue?'"`

    Or, if the CLI supports interactive tool calls:
    `/preview_llm_request`
    Then, when prompted for `user_prompt`: `Why is the sky blue?`

3.  **Output:**
    The CLI would output something like:
    ```
    API Request Preview:
    --------------------
    Model: gemini-pro
    System Prompt: "You are a helpful assistant..."
    User Memory (from GEMINI.md, etc.): "Context from file1..."
    Chat History: [
      {"role": "user", "parts": [{"text": "Hello"}]},
      {"role": "model", "parts": [{"text": "Hi there!"}]}
    ]
    Current User Prompt: "Why is the sky blue?"
    Tools Available: [
      {"name": "read_file", "description": "..."},
      {"name": "replace", "description": "..."}
      // ... all other tools
    ]
    --------------------
    (Note: This is a simplified representation. The actual output might be a more detailed JSON.)
    ```

**Challenges and Considerations:**

*   **Accessing Internal State:** The main challenge for an *external script* is getting access to the CLI's internal state (chat history, resolved prompts, tool registry from `GeminiClient` or `Config`).
    *   **Simplification:** A simpler version might only show the user's input and what it *thinks* the static parts of the prompt would be, without full history or dynamically loaded tools.
    *   **Advanced (Hypothetical):** A more deeply integrated extension system (beyond current capabilities) might provide specific APIs for extensions to query this internal state safely.
    *   **Workaround:** The `handle_tool_call.sh` script *could* try to re-initialize parts of the `Config` and `ToolRegistry` itself by reading the same configuration files the main CLI uses. This is complex and prone to discrepancies if the CLI's internal logic changes. It might also need to manage its own temporary chat history file if it wants to simulate multi-turn conversations for the preview.

*   **Maintaining Fidelity:** Accurately replicating the exact request assembly logic of the core CLI can be difficult and brittle.

**Why This Example is Instructive:**

*   It shows how a custom tool can fundamentally alter the user's interaction flow for a specific purpose (debugging).
*   It highlights the desire for introspection into the CLI's operations.
*   It demonstrates a complex requirement that pushes the limits of a purely external command-based extension system, hinting at where more direct integration points or APIs for extensions could be beneficial in the future for such advanced scenarios.
*   Even a simplified version that, for instance, just shows the `user_prompt` combined with `userMemory` (loaded by the script itself by mimicking `loadServerHierarchicalMemory`) and the list of tools from its own discovery could be useful.

This "API Call Preview" extension, even with potential simplifications, serves as a powerful example of how users might want to extend the CLI for deeper understanding and control over LLM interactions.

## Brainstorming New Extensions: List of Possible Capabilities

This section provides a list of capabilities you can implement or influence when designing an extension for this CLI. Use this as a starting point for brainstorming.

### I. Adding Custom Tools & Actions:

*   **1. Execute Local Scripts/Binaries:**
    *   Create tools that run shell scripts, Python scripts, Node.js scripts, or compiled binaries.
    *   *How:* External Command Tools (`toolDiscoveryCommand`, `toolCallCommand`).
    *   *Examples:*
        *   A tool to lint files using a project-specific linter.
        *   A tool to run a test suite for a specific module.
        *   A tool to compile a piece of code.
        *   A tool to interact with a local database via a script.

*   **2. Integrate with External APIs/Services:**
    *   Create tools that make HTTP requests to external services or APIs.
    *   *How:* External Command Tools (e.g., using `curl` in a script, or a Python script with `requests`) or MCP Server.
    *   *Examples:*
        *   A tool to fetch issue details from a bug tracker.
        *   A tool to post updates to a project management system.
        *   A tool to query a specialized search engine or knowledge base.
        *   A tool to trigger a CI/CD pipeline.

*   **3. Interact with Version Control Systems (Beyond Basic Git):**
    *   Create tools for advanced Git operations or interactions with other VCS.
    *   *How:* External Command Tools (scripts that execute `git` commands or other VCS CLIs).
    *   *Examples:*
        *   A tool to create a feature branch with a specific naming convention.
        *   A tool to cherry-pick a commit based on an issue ID.
        *   A tool to query commit history for specific patterns.

*   **4. Provide Complex Data Analysis or Transformation:**
    *   Develop tools that perform sophisticated data processing.
    *   *How:* External Command Tools (calling scripts in Python with Pandas/NumPy, R, etc.) or MCP Server.
    *   *Examples:*
        *   A tool to analyze a CSV file and generate summary statistics.
        *   A tool to transform JSON data from one schema to another.
        *   A tool to generate a graph/plot from input data (outputting image path or data).

*   **5. Interface with Proprietary or Local Systems:**
    *   Create tools to interact with systems not exposed via standard APIs.
    *   *How:* External Command Tools, MCP Server.
    *   *Examples:*
        *   A tool to query an old internal inventory system.
        *   A tool to control a piece of lab equipment via a local script.

*   **6. Host Tools as a Service (MCP):**
    *   Expose tools over a network using the Model Context Protocol.
    *   *How:* Implement an MCP Server.
    *   *Examples:*
        *   A centralized company-wide service providing a suite of internal development tools.
        *   A specialized computation service that multiple users/LLMs can access.

### II. Enhancing LLM Knowledge & Behavior:

*   **7. Inject Domain-Specific Knowledge:**
    *   Provide the LLM with text-based information about a specific domain, project, or technology.
    *   *How:* Context Files (`extensionContextFilePaths`, Hierarchical Context Files).
    *   *Examples:*
        *   API documentation for a proprietary library.
        *   Style guides for writing code or documentation.
        *   Troubleshooting guides for common project issues.
        *   Glossaries of terms specific to a field.

*   **8. Define Project-Specific Conventions:**
    *   Inform the LLM about coding standards, file naming conventions, commit message formats, etc.
    *   *How:* Context Files.
    *   *Examples:*
        *   "All Python code must be Black formatted."
        *   "New React components should be placed in `src/components/<Feature>/`."
        *   "Commit messages must follow the Conventional Commits specification."

*   **9. Provide "How-To" Guides for Complex Tasks:**
    *   Give the LLM step-by-step instructions or best practices for multi-step operations.
    *   *How:* Context Files.
    *   *Examples:*
        *   A guide on how to release a new version of a specific software.
        *   Instructions for setting up a local development environment for a project.
        *   Best practices for debugging a particular type of error.

*   **10. Steer LLM Tone and Style:**
    *   Guide the LLM on the desired tone, formality, or style for its responses or generated content.
    *   *How:* Context Files.
    *   *Examples:*
        *   "Respond in a formal and professional tone."
        *   "When generating documentation, use active voice and simple language."

### III. Customizing CLI Operations (via Configuration Guidance):**

*   **11. Tailor Available Tools for Specific Workflows:**
    *   Guide users to enable/disable built-in or other custom tools to create a focused toolset.
    *   *How:* Recommend `coreTools` or `excludeTools` configurations.
    *   *Example:* An extension for "documentation writing" might recommend excluding code execution tools.

*   **12. Define Secure Execution Environments for Shell Commands:**
    *   Specify a particular Docker image or sandboxing mechanism for tools that use the shell.
    *   *How:* Recommend `sandbox` configurations.
    *   *Example:* An extension dealing with untrusted code might enforce a strict Docker sandbox.

*   **13. Optimize LLM Choice for Extension Tasks:**
    *   Suggest specific LLM models that work best with the extension's tools or context.
    *   *How:* Recommend `model` or `embeddingModel` configurations.

*   **14. Streamline Repetitive Actions:**
    *   For trusted, well-defined automated tasks, guide users on appropriate `approvalMode` settings (with clear warnings).
    *   *How:* Recommend `approvalMode` configurations.

*   **15. Control Context Discovery:**
    *   Ensure the right context files are found by guiding `fileFiltering` or `contextFileName` settings.
    *   *How:* Recommend `fileFiltering` or `contextFileName` configurations.

This list is not exhaustive but should provide a strong foundation for thinking about what kind of value an extension can bring to users of this CLI. The key is to combine custom tool logic, rich contextual information, and smart configuration advice.
