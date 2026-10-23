# LazyDesk AI

**Less sorting. More living.** LazyDesk AI is a privacy-conscious file organization prototype that helps users review file-category suggestions before taking action.

- **Live demo:** https://lazydesk-ai-etdd2s.v2.appdeploy.ai/
- **Stack:** TypeScript, Vite, HTML, CSS
- **Local AI option:** Ollama with an open-weight model such as `qwen2.5:1.5b`

## Features

- Select files in the browser and view their names and sizes.
- Get initial category suggestions based on file extensions.
- Review and manually change categories.
- Filter the workspace by document, image, or other categories.
- Load a sample workspace without using real files.
- Optionally connect to a local Ollama server for model-powered filename categorization.

## Run locally

Requirements: Node.js (LTS recommended) and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Optional local Ollama setup

1. Install and start [Ollama](https://ollama.com/).
2. Pull the model configured in the app, for example:

   ```bash
   ollama pull qwen2.5:1.5b
   ```

3. The app checks `http://localhost:11434` from the browser. Depending on how you host the frontend, configure Ollama's allowed origins (for example, `OLLAMA_ORIGINS`) to permit that frontend origin. Avoid allowing origins you do not trust.
4. In LazyDesk AI, choose **Check Ollama**, then **Suggest organization**.

The Ollama connection is optional. If it is unavailable, the app falls back to filename-extension suggestions.

## Privacy and current limitations

- The app does not upload selected file contents to an application backend; categorization is based on filenames.
- The Ollama option sends filenames to the local Ollama service on the user's computer.
- The current prototype **does not move, rename, or modify files on disk**. Suggestions are for review only.
- The local Ollama integration should be tested on the target machine and browser before relying on it.

## Project status

This is an early prototype built for an open-source AI challenge. Contributions and issue reports are welcome.

## License

MIT. See [LICENSE](./LICENSE).
