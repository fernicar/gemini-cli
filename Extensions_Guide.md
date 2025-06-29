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
5.  [Advanced Customization: Beyond Standard Extensions](#advanced-customization-beyond-standard-extensions)
    *   [Use Case: High-Fidelity API Request Preview for Debugging](#use-case-high-fidelity-api-request-preview-for-debugging)
    *   [The External Tool Idea (and its Limitations for This Specific Goal)](#the-external-tool-idea-and-its-limitations-for-this-specific-goal)
    *   [The Correct Approach for Deep Introspection: Modifying Core CLI Logic](#the-correct-approach-for-deep-introspection-modifying-core-cli-logic)
        *   [Hierarchy of Solutions](#hierarchy-of-solutions)
        *   [User Goal Revisited: API Call Preview](#user-goal-revisited-api-call-preview)
        *   [Conceptual Implementation within Core Logic](#conceptual-implementation-within-core-logic)
        *   [Development Steps (Guidance for a User/LLM Assistant)](#development-steps-guidance-for-a-userllm-assistant)
        *   [Conclusion on Source Code Modification](#conclusion-on-source-code-modification)
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

## Advanced Customization: Beyond Standard Extensions

This section discusses scenarios where the standard extension mechanisms (custom tools via external commands/MCP, context files) might not be sufficient to achieve a desired level of introspection or behavioral modification. It uses the example of creating a high-fidelity API request preview to illustrate when and how one might consider direct modification of the CLI's source code.

### Use Case: High-Fidelity API Request Preview for Debugging

A common desire for advanced users and developers is to inspect the exact data package—fully assembled prompt, chat history, system messages, user memory, and tool definitions—that the CLI prepares to send to the Large Language Model (LLM). This "API Call Preview" is invaluable for debugging context issues or understanding precisely what the LLM is working with, *without actually sending the request* and incurring API costs or waiting for a response.

### The External Tool Idea (and its Limitations for This Specific Goal)

One might initially envision creating a custom tool, say `/preview_llm_request`, as an external command:
*   It would take the user's intended prompt as input.
*   Its call handler script would *attempt* to reconstruct what the CLI would send to the LLM.
*   It would then print this reconstructed payload.

**Why this External Tool Approach is Flawed for High-Fidelity API Preview:**

While the external command tool mechanism is powerful for many extensions, it runs into fundamental limitations when trying to perfectly replicate the live internal state of the CLI for a debugging purpose like API call previewing:

1.  **Access to Dynamic Internal State:** The primary challenge is that an external script operates in a separate process. It cannot directly and reliably access the live, in-memory state of the main CLI application. This critical state includes:
    *   **Full Chat History:** The ongoing conversation maintained by the CLI.
    *   **Resolved Prompts & Context:** The exact system prompt and user memory as assembled by the CLI, which might involve complex loading logic and dynamic elements.
    *   **Complete Tool Registry:** The live list of all active tools, including those discovered dynamically via MCP or other commands during the session.
    *   **Session-Specific Configurations:** Any settings that might have changed during the current CLI session (e.g., a model switch due to Flash fallback).

2.  **Difficulty in Perfect Replication:** To show what the CLI *would* send, the external script would need to re-implement a significant amount of the CLI's core logic for prompt assembly, history management, and tool schema compilation. This is not only complex but also creates a fragile extension that could easily break or become inaccurate as the CLI's internal logic evolves.

3.  **Risk of Discrepancies:** Because of these challenges, an external tool can, at best, offer an *approximation* of the API request. For true debugging, this approximation might be misleading if it misses crucial pieces of context or uses a slightly different assembly logic. The preview wouldn't be a faithful representation of what the LLM *actually* sees.

4.  **Altered Workflow vs. True Interception:** The custom tool approach (e.g., user typing `/preview_llm_request "my real prompt"`) changes how the user interacts. It doesn't transparently show what *would have happened* with a normal prompt; instead, the user is explicitly invoking a separate utility.

**Conclusion on the External Tool for API Preview:**

For simple "what-if" scenarios or basic prompt templating, an external tool might offer some value. However, for the goal of obtaining a **high-fidelity, accurate preview of the exact data payload the live CLI session would send to the LLM**, the external tool approach is generally insufficient and flawed due to its isolation from the CLI's internal runtime state.

This leads to the understanding that certain advanced introspection or behavioral modification goals, like this precise API call preview, are better addressed by extending or modifying the CLI's core logic directly.

### The Correct Approach for Deep Introspection: Modifying Core CLI Logic

When the goal is to achieve high-fidelity introspection into the CLI's operations or to fundamentally alter core behaviors in ways not supported by existing configurations or standard extension mechanisms, modifying the CLI's source code becomes the most robust and accurate approach.

#### Hierarchy of Solutions

This path should generally be considered after exploring other avenues:

1.  **Leverage Existing CLI Configurations:** Always check if the desired behavior or information can be achieved through existing settings in the CLI's configuration files. The CLI is designed to be quite flexible.
2.  **Utilize Standard Extension Mechanisms:** For adding new capabilities (tools) or providing additional context, use the External Command tool system, MCP servers, or context files (`extensionContextFilePaths`, `GEMINI.md`) as described earlier in this guide. These methods are designed for extending functionality without altering core code.
3.  **Consider Source Code Modification (for Advanced Needs):** If the above methods are insufficient—as in our API Call Preview example where precise internal state is needed—then direct modification of the CLI's source code is the next level of customization.

#### User Goal Revisited: API Call Preview
To see the full, accurate API request data (prompt, history, tools, etc.) that the CLI would send to the LLM, without actually sending it, for debugging purposes.

#### Conceptual Implementation within Core Logic

The most effective way to implement this is to add a conditional check within the CLI's code, right before the point where it makes the actual call to the LLM API (e.g., the `generateContent` method).

*   **Trigger:** This feature would be triggered by a new configuration flag (e.g., `debugOptions.previewApiCall: true` and perhaps `debugOptions.previewApiCallFormat: "json" | "summary"`).
*   **Logic (Conceptual Snippet):**
    ```typescript
    // Conceptual point in the CLI's code (e.g., within GeminiClient or similar)
    async function makeApiCall(requestPayload: GenerateContentRequest) { // Assuming GenerateContentRequest type
      const debugOptions = this.config.getDebugOptions(); // Hypothetical getter for new debug options

      if (debugOptions?.isPreviewApiCallEnabled()) {
        console.log("\n--- API Call Preview ---");
        if (debugOptions.getPreviewApiCallFormat() === "json") {
          console.log(JSON.stringify(requestPayload, null, 2));
        } else {
          // Implement printSummarizedRequest(requestPayload) for a human-readable summary
          // This summary would extract key parts: system prompt, recent history, current prompt, tool names.
          console.log("Model:", requestPayload.model);
          // ... more summarized fields
        }

        // Option A: Halt execution for this turn (don't send to LLM)
        // This would typically involve returning a special response that the CLI understands as "preview only"
        return {
          previewDisplayed: true,
          candidates: [{ content: { parts: [{text: "[API Call Previewed - Not Sent]"}] } }]
        };

        // Option B: Prompt user if they want to proceed with sending (more complex for CLI flow)
        // const proceed = await this.cliEnvironment.promptUser("Send this request to the LLM? (y/N)");
        // if (!proceed) return { previewDisplayed: true, ... };
      }

      // Original logic: Send requestPayload to the LLM API
      // return await this.actualLlmApiService.generateContent(requestPayload);
    }
    ```

#### Development Steps (Guidance for a User/LLM Assistant)

If a user (with development skills) decides this feature is essential, here's a general path an LLM could guide them through:

1.  **(Optional) Provisional Local Testing with Monkeypatching (Advanced & Risky):**
    *   **Disclaimer:** This is for highly technical users for temporary, local experimentation only. It's not a robust solution, can easily break, and should not be used for shared or production-like environments.
    *   **Concept:** If the CLI is a Node.js application and the relevant API call function is accessible, one *might* temporarily override (monkeypatch) that function in their local, modified runtime environment to inject the preview logic.
    *   **Limitations:** Highly dependent on CLI's internal structure, module system, and susceptibility to such patching. It's a "quick hack" for exploration, not a proper solution.

2.  **Cloning the CLI Repository:**
    *   The standard and recommended approach for making lasting changes.
    *   Guide: `git clone <repository_url>` (The URL of the Gemini CLI project)

3.  **Identifying the Code Location for API Calls:**
    *   Guide the user to search the codebase for where `generateContent` (or the specific LLM SDK call) is made. This might be in a file like `packages/core/src/core/client.ts` (class `GeminiClient`) or within the `Turn.ts` class logic that orchestrates the call. Look for methods that prepare and send requests to the GenAI SDK.

4.  **Implementing the Feature:**
    *   Guide on adding the new configuration flags (e.g., `previewApiCallEnabled`, `previewApiCallFormat`) to `ConfigParameters` and `Config` (likely in `packages/core/src/config/config.ts`). This includes defining how these options are accessed (e.g., `this.config.getDebugPreviewApiCallEnabled()`).
    *   Show how to add the conditional logic (as per the conceptual example above) in the identified API call location.
    *   If a summarized format is desired, the `printSummarizedRequest` function would need to be implemented.

5.  **Building and Testing Locally:**
    *   Provide instructions or point to project documentation on how to build the CLI from source (e.g., `npm install && npm run build` in the root and potentially `packages/cli`).
    *   Explain how to run the locally built version to test the new feature (e.g., by linking the `packages/cli/bin/gemini.js` or using `npm link`).

6.  **Creating a Pull Request (If Contributing Back):**
    *   If the user wants to contribute this feature to the main project:
        *   Create a fork of the repository.
        *   Create a new branch for the feature (e.g., `feat/api-preview-debug`).
        *   Commit changes following project conventions (e.g., conventional commit messages: `feat(debug): add API call preview mode`).
        *   Write unit tests for the new feature and configuration.
        *   Update any relevant documentation (e.g., a new section in a `DEBUGGING.md` or user guide, and updating `AGENTS.md` if applicable).
        *   Push the branch to their fork and open a Pull Request to the main repository, clearly describing the feature, its motivation, and how it works.

#### Conclusion on Source Code Modification

Modifying the CLI's source code is the most powerful way to add features that require deep integration or access to internal state. It offers the highest fidelity for features like the API Call Preview. However, it also requires development skills (TypeScript/Node.js for this project), familiarity with the codebase, and the effort of maintaining a custom version or contributing changes upstream.

This approach represents a higher level of customization, generally pursued when existing configuration and standard extension mechanisms cannot meet specific, advanced requirements.

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
