# Code Examples for Gemini CLI Extensions Guide

This directory contains code examples and diffs that accompany the "Advanced Customization: Beyond Standard Extensions" section of the main `Extensions_Guide.md` document. These files illustrate how a developer might implement an "API Call Preview" feature by directly modifying their local clone of the `gemini-cli` source code.

**IMPORTANT NOTES:**

*   **Target Audience:** These examples are for developers comfortable with TypeScript, Node.js, and potentially the `gemini-cli` codebase structure.
*   **Direct Source Modification:** Unlike standard extensions, these examples involve direct changes to the `gemini-cli` core files. This should be done with caution in a local clone.
*   **Adaptation Required:** While these examples target specific files and structures based on an analysis of the `gemini-cli` (Apache-2.0 licensed) source, you may need to adapt paths or specific code details if the CLI's internal structure has evolved.
*   **Build Process:** After applying `phase_2` modifications, you will need to rebuild the `gemini-cli` project from source for the changes to take effect. Refer to the `gemini-cli`'s own contribution or development guides for build instructions (typically involving `npm install` and `npm run build` or similar).

## File Phasing and Usage

The filenames are prefixed to indicate the conceptual phase of development they represent. Here's how to understand and use them:

### 📄 `phase_0_monkeypatch_api_preview.ts`

*   **Purpose:** Demonstrates the *concept* of monkeypatching the `GeminiClient`'s methods for temporary, local debugging of API calls. This is an advanced technique.
*   **How to (Conceptually) Use/Test:**
    1.  **Build `gemini-cli`:** Ensure you have a local clone of `gemini-cli` and have built it (e.g., `npm run build` in the root). The script targets compiled JavaScript files.
    2.  **Adjust Path:** Open this `.ts` file and modify the `GEMINI_CLI_BUILD_PATH` constant at the top to point to the **root directory of your `gemini-cli` clone**.
    3.  **Install `ts-node`:** If you don't have it, install globally: `npm install -g ts-node`.
    4.  **Run:** Execute from your terminal: `ts-node /path/to/this/file/phase_0_monkeypatch_api_preview.ts`.
    5.  **Observe:** The script will attempt to patch methods and then run a small conceptual test by instantiating a `GeminiClient` (with a mocked config) and calling the patched methods. Check the console output for `[LLM_GUIDE_LOG]` messages indicating success or failure of the patch and the previewed data.
*   **Note:** Successful execution heavily depends on the accuracy of the assumed build paths and internal module structure of `gemini-cli`. This is more for understanding the technique than a guaranteed working script without adaptation.

### 📄 `phase_1_api_preview.test.ts`

*   **Purpose:** Provides illustrative Test-Driven Development (TDD) style tests for the "API Call Preview" feature. These define the expected behavior.
*   **How to (Conceptually) Use/Test:**
    1.  **Clone `gemini-cli`:** If you haven't already, get a local copy of the `gemini-cli` source code.
    2.  **Place the Test File:** Copy this file into the `gemini-cli`'s testing structure, likely alongside other client tests. A good location might be `packages/core/src/core/client.api_preview.test.ts`.
    3.  **Adapt Imports/Mocks:**
        *   Adjust the import paths at the top of the file to correctly point to `Config`, `GeminiClient`, `Turn`, `ContentGenerator`, etc., from within the `gemini-cli` source.
        *   The mocking strategy for `ContentGenerator` and `GeminiChat` (within `initializeTestClient`) may need to be adapted to align with how testing and mocking are typically done in the `gemini-cli` project (e.g., using Jest's manual mocks or specific test utilities if available).
    4.  **Run Tests:** Execute the `gemini-cli`'s test runner (e.g., `npm test -- -t "API Call Preview Feature"` or a similar command, depending on the project's test script and framework).
    5.  **Observe:** Initially, the tests within the "When API Preview is ENABLED" block should **fail** because the feature isn't implemented yet. These failing tests confirm the requirements. After applying `phase_2` changes, these tests should pass.

### 📄 `phase_2_config_additions.diff`

*   **Purpose:** A diff file showing the precise changes needed in the `Config` class (assumed to be `packages/core/src/config/config.ts`) to support the new debug options for API preview.
*   **How to Apply & Test:**
    1.  **Navigate to `gemini-cli` Root:** `cd /path/to/your/cloned/gemini-cli`.
    2.  **Apply the Diff:** Use `git apply /path/to/this/file/phase_2_config_additions.diff`.
        *   Ensure the target file path in the diff header (`a/packages/core/src/config/config.ts`) matches the actual file path in your clone. If not, you might need to adjust the diff file or apply it manually.
    3.  **Review Changes:** Check `packages/core/src/config/config.ts` to see the applied modifications.
    4.  **Rebuild:** Rebuild the relevant package or the entire project (e.g., `npm run build` in `packages/core` or project root).
    5.  **Testing:** The `phase_1` tests related to config changes should now reflect the new capabilities (though full tests will pass after client modifications). You can also manually instantiate `Config` in a test script and check if the new getter methods for debug options work as expected.

### 📄 `phase_2_client_modifications.diff`

*   **Purpose:** A diff file showing the precise changes needed in the `GeminiClient` class (assumed to be `packages/core/src/core/client.ts`) to implement the API preview logic.
*   **How to Apply & Test:**
    1.  **Apply Config Changes First:** Ensure `phase_2_config_additions.diff` has been successfully applied and the project rebuilt if necessary.
    2.  **Navigate to `gemini-cli` Root:** `cd /path/to/your/cloned/gemini-cli`.
    3.  **Apply the Diff:** Use `git apply /path/to/this/file/phase_2_client_modifications.diff`.
        *   Verify/adjust the target file path in the diff header (`a/packages/core/src/core/client.ts`) if needed.
    4.  **Review Changes:** Check `packages/core/src/core/client.ts` for the applied modifications (the new helper methods and changes to `sendMessageStream`, `generateJson`, `generateContent`).
    5.  **Rebuild:** Rebuild the relevant package or the entire project.
    6.  **Run `phase_1` Tests:** All tests in `phase_1_api_preview.test.ts` should now pass.
    7.  **Manual Test:** Run your locally built `gemini-cli` with the new debug options enabled in its configuration (e.g., by modifying a local settings file or passing CLI args if you also implemented that). For example:
        ```bash
        # (Assuming you've configured the CLI to enable preview via a settings file)
        # OR, if you added command-line flags for this (not shown in these examples):
        # ./packages/cli/bin/gemini.js --debug-preview-api-call --debug-preview-format=json "Your prompt here"

        # Example: just run the CLI and expect it to pick up config from a file
        ./packages/cli/bin/gemini.js "My test prompt for API preview"
        ```
        You should see the API preview output in the console instead of an actual LLM response.

By following these steps, a developer can integrate and test the "API Call Preview" feature within their local `gemini-cli` environment. Remember that direct source code modifications are powerful but require careful handling and understanding of the codebase.
