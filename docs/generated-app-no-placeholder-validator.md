# Generated App No-Placeholder Validator

`validateGeneratedAppNoPlaceholders(rootOrAppPath, options)` scans generated app output for placeholder, fake, stub, and demo markers that should not ship in production paths.

## What it scans

Production-relevant files under the given root:

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`
- `*.vue`, `*.svelte`
- `*.html`, `*.css`, `*.scss`
- `*.json`
- config files that affect runtime/deploy behavior (for example `.env.example`, `next.config.mjs`, `vercel.json`)
- markdown only when `includeMarkdown: true` and the path looks launch/readme/customer-facing.

## What it skips by default

- `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `snapshots`
- lockfiles
- image/binary assets
- test/fixture/mocks directories unless `scanTests: true`
- unsupported extensions
- files above `maxFileSizeBytes`.

## API

```ts
validateGeneratedAppNoPlaceholders(
  rootOrAppPath: string,
  options?: {
    scanTests?: boolean;
    includeMarkdown?: boolean;
    allowlistPaths?: string[];
    allowlistPatterns?: string[];
    maxFileSizeBytes?: number;
    rootLabel?: string;
  }
)
```

Result includes:

- `status: "passed" | "failed"`
- `scannedFiles`
- `skippedFiles`
- `findings`
- `summary`.

## Caveat

Passing this validator is necessary for generated-output hygiene, but not sufficient for launch readiness on its own.
