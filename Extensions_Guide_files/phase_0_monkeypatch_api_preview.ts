/**
 * File: Extensions_Guide_files/phase_0_monkeypatch_api_preview.ts
 *
 * Purpose:
 * Demonstrates conceptually how to monkeypatch the `GeminiClient`'s content generation
 * methods for local, temporary debugging to preview API calls. This script is intended
 * to be run using ts-node *after* the main `gemini-cli` has been built, and it targets
 * the compiled JavaScript files.
 *
 * This is for an LLM to understand the technique; a human developer would adapt this
 * for their specific local debugging setup.
 *
 * Setup (Manual Steps for a Human User to Try This):
 * 1. Ensure you have `ts-node` installed (`npm install -g ts-node`).
 * 2. Build the `gemini-cli` project (e.g., `npm run build` from the root).
 * 3. Place this file (`phase_0_monkeypatch_api_preview.ts`) in a directory *outside*
 *    the `gemini-cli` source, e.g., `/tmp/gemini_patch_test/`.
 * 4. Adjust the `GEMINI_CLI_BUILD_PATH` below to point to the *root* of your
 *    `gemini-cli` project directory (the one containing `packages/`).
 * 5. Run this script: `ts-node /tmp/gemini_patch_test/phase_0_monkeypatch_api_preview.ts`
 *
 * Disclaimer for LLM:
 * - The success of this monkeypatch depends on the stability of the internal class
 *   and method names and the module structure of the compiled `gemini-cli`.
 * - This is a temporary debugging technique, not a robust solution for a feature.
 * - Error handling is minimal for brevity.
 */

import * as path from 'node:path';

// IMPORTANT: User must adjust this path to their local gemini-cli project root.
const GEMINI_CLI_BUILD_PATH = path.resolve(process.cwd(), '../gemini-cli'); // Example: if this script is in a dir next to gemini-cli clone
// const GEMINI_CLI_BUILD_PATH = '/path/to/your/cloned/gemini-cli'; // More explicit example

const coreClientModulePath = path.join(GEMINI_CLI_BUILD_PATH, 'packages/core/build/src/core/client.js');
const coreTurnModulePath = path.join(GEMINI_CLI_BUILD_PATH, 'packages/core/build/src/core/turn.js'); // For ServerGeminiStreamEvent
const configModulePath = path.join(GEMINI_CLI_BUILD_PATH, 'packages/core/build/src/config/config.js');
const contentGeneratorModulePath = path.join(GEMINI_CLI_BUILD_PATH, 'packages/core/build/src/core/contentGenerator.js');


// --- Helper to simulate console output for the LLM ---
function llm_console_log(message: string, ...optionalParams: any[]): void {
  // In a real LLM execution, this might be a different output mechanism.
  // For this script, it's just console.log.
  console.log(`[LLM_GUIDE_LOG] ${message}`, ...optionalParams);
}

// --- The Monkeypatching Logic ---
async function applyMonkeypatch() {
  llm_console_log('Attempting to apply monkeypatch for API Call Preview...');

  try {
    llm_console_log(`Attempting to import GeminiClient from: ${coreClientModulePath}`);
    const { GeminiClient } = await import(coreClientModulePath);
    const { GeminiEventType } = await import(coreTurnModulePath); // For GeminiEventType

    if (!GeminiClient || !GeminiClient.prototype) {
      llm_console_log('Error: GeminiClient or its prototype is not available from the imported module.');
      llm_console_log('Please check the build path and that the CLI has been compiled.');
      return false;
    }

    // --- Patching generateContentStream ---
    if (GeminiClient.prototype.sendMessageStream) { // This is the method that internally calls contentGenerator
      const originalSendMessageStream = GeminiClient.prototype.sendMessageStream;
      GeminiClient.prototype.sendMessageStream = async function* (...args: any[]) {
        const requestParts = args[0]; // First argument is PartListUnion (the user's message)
        // 'this' is the instance of GeminiClient
        // @ts-ignore this is a monkeypatch
        const config = this.config;
        // @ts-ignore
        const chat = this.chat;

        llm_console_log('\n--- MONKEYPATCH PREVIEW (sendMessageStream) ---');
        llm_console_log(`Timestamp: ${new Date().toISOString()}`);

        // Attempt to reconstruct what the full request to contentGenerator might look like
        // This is a simplified reconstruction. The actual Turn.run does more.
        const history = await chat.getHistory(true); // curated history
        const systemInstruction = chat.systemInstruction; // from GeminiChat
        const tools = chat.tools; // from GeminiChat

        const reconstructedRequestPayload = {
          model: config.getModel(),
          system_instruction: systemInstruction,
          contents: [...history, { role: 'user', parts: requestParts }],
          tools: tools,
          // tool_config: chat.toolConfig, // Might also be relevant
          // generationConfig: chat.generationConfig // Might also be relevant
        };

        llm_console_log('--- Reconstructed Request Payload (Conceptual) ---');
        // In a real scenario, use config to decide format (JSON/summary)
        console.log(JSON.stringify(reconstructedRequestPayload, null, 2));
        llm_console_log('--- End of Preview ---');

        // Yield a mock response to satisfy the caller
        yield {
          type: GeminiEventType.Content, // Use an actual type from ServerGeminiStreamEvent
          value: "[API Call Previewed by Monkeypatch - Not Sent via sendMessageStream]"
        };
        // To make the Turn object available, we'd need to construct it.
        // For simplicity, we just return after yielding the preview message.
        // The original function returns an instance of Turn.
        // We can't easily construct/return that here without more complex mocking of Turn itself.
        // So, the generator will end, and the caller will get the preview text.
        return; // Block original call
      };
      llm_console_log('Successfully patched GeminiClient.sendMessageStream.');
    } else {
      llm_console_log('Warning: GeminiClient.sendMessageStream not found for patching.');
    }

    // --- Patching generateJson (Simplified) ---
    // generateJson and generateContent are less streamed and might be easier to intercept
    // if they directly call contentGenerator.generateContent
     if (GeminiClient.prototype.generateJson) {
      const originalGenerateJson = GeminiClient.prototype.generateJson;
      GeminiClient.prototype.generateJson = async function (...args: any[]) {
        const contents = args[0];
        const schema = args[1];
        // @ts-ignore
        const config = this.config;
        const model = args[3] || config.getModel(); // model can be an arg

        llm_console_log('\n--- MONKEYPATCH PREVIEW (generateJson) ---');
        const reconstructedRequestPayload = {
          model: model,
          contents: contents,
          generationConfig: args[2], // generationConfig is args[2] if model is args[3]
          responseSchema: schema,
          responseMimeType: 'application/json',
          system_instruction: (await this.getChat().getSystemInstruction()) // Needs to be async if getChat is async
        };
        console.log(JSON.stringify(reconstructedRequestPayload, null, 2));
        llm_console_log('--- End of Preview ---');
        return Promise.resolve({
          __isPreview__: true,
          message: "[API Call Previewed by Monkeypatch - Not Sent via generateJson]"
        }); // Block original
      };
      llm_console_log('Successfully patched GeminiClient.generateJson.');
    } else {
      llm_console_log('Warning: GeminiClient.generateJson not found for patching.');
    }

    // --- Patching generateContent (Simplified) ---
    if (GeminiClient.prototype.generateContent) {
      const originalGenerateContent = GeminiClient.prototype.generateContent;
      GeminiClient.prototype.generateContent = async function (...args: any[]) {
        const contents = args[0];
        // @ts-ignore
        const config = this.config;

        llm_console_log('\n--- MONKEYPATCH PREVIEW (generateContent) ---');
        const reconstructedRequestPayload = {
          model: config.getModel(),
          contents: contents,
          generationConfig: args[1],
          system_instruction: (await this.getChat().getSystemInstruction())
        };
        console.log(JSON.stringify(reconstructedRequestPayload, null, 2));
        llm_console_log('--- End of Preview ---');
        return Promise.resolve({
           __isPreview__: true,
          candidates: [{ content: {parts: [{text:"[API Call Previewed by Monkeypatch - Not Sent via generateContent]"}]}}]
        }); // Block original
      };
      llm_console_log('Successfully patched GeminiClient.generateContent.');
    } else {
      llm_console_log('Warning: GeminiClient.generateContent not found for patching.');
    }

    return true;
  } catch (e: any) {
    llm_console_log(`Error during monkeypatching: ${e.message}`);
    console.error(e); // Log full error for user debugging
    return false;
  }
}

// --- Main execution for this script ---
async function main() {
  const patched = await applyMonkeypatch();
  if (patched) {
    llm_console_log('\nMonkeypatch applied. Now, if you were to run the Gemini CLI in the *same Node.js process* where this patch was applied, calls to the patched methods would be intercepted.');
    llm_console_log('However, this script runs standalone and then exits. To test this patch effectively with the CLI:');
    llm_console_log('1. This patching logic would need to be injected into the CLI\'s startup sequence *before* GeminiClient is used.');
    llm_console_log('2. OR, you would import and run the CLI\'s main function *from within this script* after the patch is applied.');
    llm_console_log('   Example (conceptual):');
    llm_console_log('   // const { main: cliMain } = await import(path.join(GEMINI_CLI_BUILD_PATH, "packages/cli/build/src/index.js"));');
    llm_console_log('   // await cliMain(["your", "gemini-cli", "args", "--prompt", "hello world"]);');
    llm_console_log('\nThis script primarily serves to show *how* one might attempt the patch and the methods to target.');

    // Conceptual test of the patch by trying to instantiate and call a method
    // This still won't run the *actual CLI*, but tests if our patch holds on an instance.
    try {
        llm_console_log('\n--- Conceptual Test of Patched Client ---');
        const { GeminiClient } = await import(coreClientModulePath);
        const { Config } = await import(configModulePath);
        const { createContentGenerator } = await import(contentGeneratorModulePath);


        // Minimal config for client instantiation
        // @ts-ignore // Using any for simplicity of this example
        const dummyConfigInstance = new Config({
            sessionId: 'patch-test',
            model: 'gemini-pro',
            targetDir: '.',
            debugMode: false,
            // Provide other minimal required ConfigParameters
            // These would need to match the actual Config constructor
             embeddingModel: 'models/embedding-001',
             cwd: process.cwd(),
        });
        // @ts-ignore
        const cgConfig = await createContentGeneratorConfig("gemini-pro", "API_KEY_PLACEHOLDER", dummyConfigInstance);
        // @ts-ignore
        await dummyConfigInstance.refreshAuth(cgConfig.authType); // This might be needed to init client fully


        // @ts-ignore
        const client = new GeminiClient(dummyConfigInstance);
        // @ts-ignore
        await client.initialize(cgConfig); // Crucial step

        llm_console_log('Calling patched sendMessageStream...');
        // @ts-ignore
        const stream = client.sendMessageStream([{ text: 'Hello patched world' }], AbortSignal.timeout(5000));
        for await (const event of stream) {
            // @ts-ignore
            llm_console_log('Event from patched stream:', event.value || event.text || event);
        }

        llm_console_log('\nCalling patched generateJson...');
        // @ts-ignore
        const jsonRes = await client.generateJson([{role: 'user', parts:[{text:'Schema me this'}]}], {type: 'object', properties: {}}, AbortSignal.timeout(5000));
        llm_console_log('Response from patched generateJson:', jsonRes);


    } catch (testError: any) {
        llm_console_log(`Error during conceptual test of patched client: ${testError.message}`);
        console.error(testError);
    }


  } else {
    llm_console_log('Monkeypatching failed. CLI behavior will be normal.');
  }
}

main();
