# ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension

[![Build Status](https://img.shields.io/github/actions/workflow/status/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension/ci.yml?style=flat-square)](https://github.com/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension/actions/workflows/ci.yml)
[![Code Coverage](https://img.shields.io/codecov/c/github/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension?style=flat-square)](https://codecov.io/gh/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension)
[![Tech Stack](https://img.shields.io/badge/tech-JavaScript-informational?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Linter](https://img.shields.io/badge/linted_with-Biome-informational?style=flat-square)](https://biomejs.dev/)
[![License](https://img.shields.io/badge/license-CC_BY--NC_4.0-lightgrey?style=flat-square)](https://creativecommons.org/licenses/by-nc/4.0/)
[![GitHub Stars](https://img.shields.io/github/stars/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension?style=flat-square)](https://github.com/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension/stargazers)

**ComicNarrate** is a sophisticated Chrome extension that leverages Cerebras AI (OCR) to translate visual web comic panels into spoken word via advanced Text-to-Speech (TTS). This creates a seamless, accessible, and hands-free digital reading experience.

## Features

-   **Visual-to-Audio Conversion:** Real-time OCR powered by Cerebras AI to accurately capture speech bubbles and narration boxes.
-   **Customizable TTS Profiles:** Fine-grained control over voice selection, pitch modulation, and playback speed.
-   **Accessibility Focused:** Provides a critical reading aid for visually impaired users or those engaging in multitasking.
-   **Multi-Panel Sequencing:** Intelligent ordering of extracted text to maintain narrative coherence.
-   **Manifest V3 Compliance:** Built on modern, secure browser extension standards.

## Tech Stack

| Component      | Technology       |
| -------------- | ---------------- |
| Language       | JavaScript (ES6+) |
| AI Engine      | Cerebras AI      |
| State Mgmt     | Browser Storage  |
| Linting        | Biome            |
| Testing        | Jest & Supertest |

## Architecture

```
.
├── backend
│   ├── index.js
│   ├── ocr.js
│   └── package.json
└── extension
    ├── background.js
    ├── content.js
    ├── icons
    │   ├── icon128.png
    │   ├── icon16.png
    │   └── icon48.png
    ├── manifest.json
    ├── popup.html
    └── popup.js
```

## Table of Contents

- [ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension](#comicnarrate-ai-web-comic-dubber-browser-extension)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
  - [Table of Contents](#table-of-contents)
  - [AI Agent Directives](#ai-agent-directives)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)

## AI Agent Directives

<details>
<summary>Tech Stack & Architectural Patterns</summary>

- **Tech Stack:** JavaScript (ES6+), Node.js, Express.js, Cerebras API
- **Architectural Patterns:** SOLID, DRY, KISS
- **Verification Commands:** `npm test`
- **API Usage Guidelines:** All AI-related API calls should be made through the backend service to protect API keys.

</details>

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/chirag127/ComicNarrate-AI-Web-Comic-Dubber-Browser-Extension.git
   ```
2. Install NPM packages for the backend
   ```sh
   cd backend
   npm install
   ```
3. Create a `.env` file in the `backend` directory and add your `CEREBRAS_API_KEY`.
   ```
   CEREBRAS_API_KEY=your_api_key
   ```

## Usage

1. Start the backend server
   ```sh
   cd backend
   npm start
   ```
2. Load the extension in your browser:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` directory

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Distributed under the CC BY-NC 4.0 License. See `LICENSE` for more information.
