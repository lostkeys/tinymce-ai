# TinyMCE AI Fork — Project Instructions

## What This Is

This is a fork of [TinyMCE](https://github.com/tinymce/tinymce), the open-source rich text editor. It serves as a testbed for an autonomous AI development pipeline where Claude Code reads GitHub Issue specs, implements changes, and opens PRs for human review.

## Monorepo Structure

This is a Yarn workspaces monorepo. All packages live under `modules/`:

### Core Packages
- **`modules/tinymce`** — The editor itself. Contains core, plugins, themes, and models.
  - `src/core/` — Editor core (API, DOM, events, formatting, selection, etc.)
  - `src/plugins/` — 29 self-contained plugins (lists, table, link, image, etc.)
  - `src/themes/silver/` — The default UI theme (built on Alloy)
  - `src/models/dom/` — The DOM model (content model, table operations)
- **`modules/oxide`** — The default skin (CSS/LESS)
- **`modules/oxide-icons-default`** — Default icon pack
- **`modules/oxide-components`** — UI component styles

### Internal Libraries (under `@ephox/` namespace)
- **`katamari`** — Functional programming utilities (Option, Result, Arr, Obj, Fun, Type, etc.)
- **`sugar`** — DOM manipulation library (wraps native DOM in a functional API)
- **`alloy`** — UI component framework (used by the Silver theme)
- **`bridge`** — Plugin-to-theme API bridge
- **`mcagar`** — Test helpers for TinyMCE (TinyHooks, TinyAssertions, TinySelections, etc.)
- **`agar`** — General browser test utilities
- **`phoenix`** / **`robin`** / **`polaris`** — Text processing and search
- **`boss`** / **`sand`** / **`jax`** / **`boulder`** / **`dragster`** / **`snooker`** / **`darwin`** / **`acid`** / **`porkbun`** — Various internal utilities

## Build & Dev Commands

```bash
# Install dependencies (uses Yarn 1.x classic via .yarnrc)
yarn install

# Full build (oxide, icons, TypeScript, grunt bundling)
yarn build

# Development mode with watch
yarn dev

# TypeScript compilation only
yarn tsc

# Lint all modules
yarn eslint
```

## Testing

Tests use **Bedrock**, a browser-based test runner — NOT Jest or Vitest.

```bash
# Run all tests (headless + browser)
yarn test

# Headless tests only (Chrome headless)
yarn headless-test

# Run a single test file
yarn test-one <path-to-test-file>

# Run tests for a specific module
cd modules/<module> && yarn test

# Manual test server (opens browser)
yarn browser-test-manual
```

### Test File Conventions
- Tests live in `src/test/ts/` within each module (or `src/*/test/ts/` in TinyMCE)
- Test types: `atomic/` (unit), `browser/` (browser-based), `headless/` (headless browser), `webdriver/` (Selenium)
- Test files must end with `Test.ts`
- Use `describe`/`it` from `@ephox/bedrock-client`
- Use `TinyHooks.bddSetupLight<Editor>` to bootstrap an editor in tests
- Use `TinyAssertions`, `TinySelections`, `TinyUiActions` from `@ephox/wrap-mcagar`

### Example Test
```typescript
import { describe, it } from '@ephox/bedrock-client';
import { TinyAssertions, TinyHooks, TinySelections } from '@ephox/wrap-mcagar';
import type Editor from 'tinymce/core/api/Editor';
import Plugin from 'tinymce/plugins/lists/Plugin';

describe('browser.tinymce.plugins.lists.MyFeatureTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'lists',
    base_url: '/project/tinymce/js/tinymce'
  }, [ Plugin ], true);

  it('should do the thing', () => {
    const editor = hook.editor();
    editor.setContent('<p>test</p>');
    TinyAssertions.assertContent(editor, '<p>test</p>');
  });
});
```

## Plugin Architecture

Each plugin in `modules/tinymce/src/plugins/<name>/` follows this pattern:

```
main/ts/
  Plugin.ts        — Entry point, registers with PluginManager
  Main.ts          — Re-exports Plugin
  api/
    Api.ts         — Public API returned by the plugin
    Commands.ts    — Editor commands registration
    Options.ts     — Plugin options/settings registration
  ui/
    Buttons.ts     — Toolbar button registration
    MenuItems.ts   — Menu item registration
    Dialog.ts      — Dialog UI (if applicable)
test/ts/
  browser/         — Browser-based tests
```

### Plugin Registration Pattern
```typescript
import PluginManager from 'tinymce/core/api/PluginManager';

export default (): void => {
  PluginManager.add('pluginname', (editor) => {
    Commands.register(editor);
    Buttons.register(editor);
    MenuItems.register(editor);
    return Api.get(editor);
  });
};
```

## Coding Conventions

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- Target ES2022
- Use `type` imports: `import type { Foo } from './Bar'`
- Consistent type imports enforced by ESLint (`@typescript-eslint/consistent-type-imports`)
- Max line length: 260 chars

### Style
- **Functional style** — prefer pure functions, avoid mutation where practical
- Use internal utility libraries (`@ephox/katamari` for FP, `@ephox/sugar` for DOM) instead of third-party equivalents
- No classes for data — use interfaces and factory functions
- Use `Optional` from Katamari instead of null/undefined where appropriate
- Use `Arr`, `Obj`, `Fun`, `Type`, `Str` from Katamari for collection/utility operations
- Use `Fun.constant(value)` instead of `() => value` for functions that return a static value (enforced by `@tinymce/prefer-fun` lint rule)
- Use `Fun.noop` instead of `() => {}` for empty callbacks

### Import Ordering
- Imports must be ordered: external packages (`@ephox/*`) before project-internal imports (`tinymce/*`), then third-party test libs (`chai`)
- Separate external and internal import groups with a blank line
- ESLint enforces this via `import-x/order`

### Naming
- PascalCase for types/interfaces, modules
- camelCase for functions and variables
- Test files: `<FeatureName>Test.ts`
- Test describe blocks: `'browser.tinymce.plugins.<plugin>.<TestName>'`

## Do Not Rules

These are guardrails for the AI agent:

1. **No new dependencies** without explicit approval in the issue spec
2. **No build system changes** (Grunt, Webpack/Rspack, Nx config) unless explicitly specified
3. **No core refactoring** unless the issue spec explicitly authorizes it
4. **No changes outside the specified scope** — if the spec says "modify the lists plugin", don't touch other plugins
5. **No modifying test infrastructure** (Bedrock config, test helpers) unless specifically asked
6. **No changes to CI/CD configuration** unless specifically asked
7. **Always write tests** for new functionality
8. **Never remove existing tests** unless replacing them with better coverage as specified
9. **Don't use `any` type** — find the correct type or use `unknown` with narrowing
10. **Don't introduce third-party libraries** — use the internal `@ephox/` packages

## PR Conventions

- Branch naming: `ai/<issue-number>-<short-description>`
- Commit messages: Start with the JIRA/issue reference, e.g., `#42: Add getVersion() to Lists plugin`
- PRs must pass CI (build, lint, tests) before review
- Keep PRs focused on a single issue — don't bundle unrelated changes
