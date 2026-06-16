# Dependencies

## Production Dependencies

| Package | Version | Purpose | Risk Notes |
|---------|---------|---------|------------|
| @agentclientprotocol/sdk | ^0.22.1 | ACP protocol SDK | Core dependency; pre-1.0 (breaking changes possible) |
| @aws-sdk/client-bedrock | ^3.1069.0 | Bedrock model listing | Well-maintained (AWS) |
| @aws-sdk/client-bedrock-runtime | ^3.1068.0 | Bedrock model invocation | Well-maintained (AWS) |
| @aws-sdk/client-sts | ^3.1069.0 | STS credential support | Well-maintained (AWS) |
| @aws-sdk/credential-providers | ^3.1069.0 | AWS credential chain | Well-maintained (AWS) |
| dompurify | ^3.4.5 | XSS sanitization | Security-critical; actively maintained |
| electron-updater | ^6.6.2 | Desktop auto-updates | Currently disabled in code |
| express | ^4.22.2 | HTTP server | Mature, widely used |
| highlight.js | ^11.11.1 | Syntax highlighting | Stable, well-maintained |
| marked | 15.0.12 | Markdown rendering | Pinned minor (no caret); mature |
| react | ^19.1.0 | UI framework | Latest major; stable |
| react-dom | ^19.1.0 | DOM rendering | Paired with React |
| react-diff-viewer-continued | ^4.2.2 | Diff display | Community fork; smaller maintainer base |
| ws | ^8.20.1 | WebSocket server | Mature, widely used |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @eslint/js | ^10.0.1 | ESLint base rules |
| @playwright/test | ^1.60.0 | E2E testing |
| @testing-library/jest-dom | ^6.9.1 | DOM test matchers |
| @testing-library/react | ^16.3.2 | React test utilities |
| @types/dompurify | ^3.0.5 | Type definitions |
| @types/express | ^5.0.2 | Type definitions |
| @types/react | ^19.1.4 | Type definitions |
| @types/react-dom | ^19.1.5 | Type definitions |
| @types/ws | ^8.18.1 | Type definitions |
| @vitejs/plugin-react | ^4.5.1 | Vite React plugin |
| @vitest/coverage-v8 | ^4.1.6 | Coverage reporting |
| concurrently | ^9.2.1 | Parallel script runner |
| electron | ^42.2.0 | Desktop shell (dev) |
| electron-builder | ^26.0.12 | Desktop packaging |
| eslint | ^10.4.0 | Linting |
| eslint-plugin-react-hooks | ^7.1.1 | React hooks linting |
| jsdom | ^29.1.1 | Test DOM environment |
| tsx | ^4.19.4 | TypeScript execution |
| typescript | ^5.8.3 | Type checking |
| typescript-eslint | ^8.59.4 | TS ESLint integration |
| vite | ^6.3.5 | Frontend bundler |
| vitest | ^4.1.6 | Unit test runner |

## External Runtime Dependencies

| Dependency | Type | Required | Purpose |
|------------|------|----------|---------|
| kiro-cli | CLI binary | Yes | Agent backend (must be in PATH and authenticated) |
| AWS credentials | Config | Optional | Required only for follow-up suggestions feature |
| Node.js 22+ | Runtime | Yes | Server execution |

## Dependency Health Assessment

### High Confidence
- **express, ws, react, typescript, vite, vitest** — mature, large community, active maintenance
- **@aws-sdk/* packages** — maintained by AWS, stable API
- **highlight.js, dompurify, marked** — well-established, security-aware maintenance

### Watch Items
- **@agentclientprotocol/sdk (^0.22.1)** — pre-1.0, API may change; core protocol dependency
- **react-diff-viewer-continued (^4.2.2)** — community fork of unmaintained original; smaller bus factor
- **electron-updater (^6.6.2)** — included but auto-update currently disabled

### Version Strategy
- All deps use caret ranges (^) except `marked` which is pinned to 15.0.12
- Lock file present (package-lock.json)
- No Dependabot/Renovate configuration observed

## Dependency Graph (Simplified)

```
kiro-ui
├── Runtime
│   ├── express (HTTP) ─── ws (WebSocket)
│   ├── @agentclientprotocol/sdk (ACP bridge)
│   └── @aws-sdk/* (Bedrock suggestions)
├── Frontend (bundled by Vite)
│   ├── react + react-dom
│   ├── marked + dompurify (rendering)
│   ├── highlight.js (code blocks)
│   └── react-diff-viewer-continued (diffs)
├── Desktop
│   ├── electron
│   └── electron-updater
└── External
    ├── kiro-cli acp (child process / TCP)
    └── Amazon Bedrock API (optional)
```

## License Summary

| Package | License |
|---------|---------|
| Project itself | Apache-2.0 |
| express | MIT |
| ws | MIT |
| react / react-dom | MIT |
| marked | MIT |
| dompurify | Apache-2.0 / MPL-2.0 |
| highlight.js | BSD-3-Clause |
| @aws-sdk/* | Apache-2.0 |
| @agentclientprotocol/sdk | Apache-2.0 |
| electron | MIT |

No GPL or restrictive copyleft licenses detected in direct dependencies.
