# Technology Stack

## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 22.0.0 | Server runtime |
| tsx | ^4.19.4 | TypeScript execution without build step (dev mode) |
| ESM | N/A | Module system (`"type": "module"`) |

## Languages

| Language | Config | Notes |
|----------|--------|-------|
| TypeScript | 5.8, strict mode | Primary language for all source code |
| CSS | N/A | Global stylesheet with CSS variables (no preprocessor) |
| HTML | N/A | Single index.html (Vite entry) |

## Backend

| Library | Version | Purpose |
|---------|---------|---------|
| Express | ^4.22.2 | HTTP server, static file serving, REST API |
| ws | ^8.20.1 | WebSocket server for real-time browser-agent communication |
| @agentclientprotocol/sdk | ^0.22.1 | Official ACP TypeScript SDK |
| @aws-sdk/client-bedrock | ^3.1069.0 | List foundation models and inference profiles |
| @aws-sdk/client-bedrock-runtime | ^3.1068.0 | InvokeModel for follow-up suggestions |
| @aws-sdk/client-sts | ^3.1069.0 | STS (credential chain support) |
| @aws-sdk/credential-providers | ^3.1069.0 | fromNodeProviderChain for AWS credential resolution |

## Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| React | ^19.1.0 | UI framework |
| React DOM | ^19.1.0 | DOM rendering |
| marked | 15.0.12 | Markdown to HTML rendering |
| DOMPurify | ^3.4.5 | XSS sanitization of rendered HTML |
| highlight.js | ^11.11.1 | Syntax highlighting (10 languages) |
| react-diff-viewer-continued | ^4.2.2 | Side-by-side diff display for tool calls |

## Desktop

| Library | Version | Purpose |
|---------|---------|---------|
| Electron | ^42.2.0 | Cross-platform desktop shell |
| electron-builder | ^26.0.12 | Packaging (macOS DMG/ZIP, Linux AppImage/deb, Windows NSIS) |
| electron-updater | ^6.6.2 | Auto-update support (currently disabled) |

## Build Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | ^6.3.5 | Frontend bundler with React HMR, /api proxy in dev |
| @vitejs/plugin-react | ^4.5.1 | React Fast Refresh for Vite |
| TypeScript | ^5.8.3 | Type checking (strict mode, noEmit) |
| concurrently | ^9.2.1 | Run Vite + Express in parallel during dev |

## Testing

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | ^4.1.6 | Unit test runner (globals, jsdom environment) |
| @vitest/coverage-v8 | ^4.1.6 | Coverage reporting (84% achieved) |
| @testing-library/react | ^16.3.2 | React component testing utilities |
| @testing-library/jest-dom | ^6.9.1 | Custom DOM matchers |
| jsdom | ^29.1.1 | Browser environment simulation for tests |
| @playwright/test | ^1.60.0 | E2E integration testing |

## Code Quality

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | ^10.4.0 | Linting (flat config) |
| typescript-eslint | ^8.59.4 | TypeScript ESLint integration |
| eslint-plugin-react-hooks | ^7.1.1 | React hooks rules |

## Security Mechanisms

| Mechanism | Implementation |
|-----------|----------------|
| Auth token | crypto.randomBytes(32).toString('hex') per startup |
| Network binding | 127.0.0.1 only |
| WebSocket origin | Regex validation (localhost/127.0.0.1) |
| CSP headers | script-src 'self'; style-src 'self' 'unsafe-inline' |
| XSS prevention | DOMPurify on all markdown output |
| Rate limiting | Sliding window (60s), configurable max/min |
| Electron sandbox | nodeIntegration: false, contextIsolation: true, sandbox: true |

## CI/CD

| Service | Config | Pipeline |
|---------|--------|----------|
| GitHub Actions | .github/workflows/ci.yml | lint, typecheck, coverage, build (on push/PR to main) |

## Infrastructure

- No IaC (no Terraform, CDK, CloudFormation, or SAM)
- No Dockerfile present in repo (mentioned in README only)
- No database — state in memory + 2 JSON files
- Self-hosted localhost only
- AWS Bedrock API calls for follow-up suggestions only
