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

## Terminology

- **Integrator** — The developer implementing TinyMCE into their application. This is TinyMCE's end user — the person writing `tinymce.init({...})` and configuring options. Issue specs and docs often reference what the "integrator" can configure.

## Browser Verification (Required Before PR)

Before opening a PR, always verify the implementation in an actual browser using the dev server:

1. **Build first:** `yarn dev` (runs oxide, tsc, and grunt — required before the dev server works)
2. **Start dev server:** `yarn tinymce-dev` (serves at http://localhost:3000)
3. **Update or create a demo page** for the plugin/feature at `modules/tinymce/src/plugins/<plugin>/demo/` or `modules/tinymce/src/themes/silver/demo/`
   - `demo/ts/demo/Demo.ts` — TinyMCE init config with the relevant options
   - `demo/html/demo.html` — HTML page with test content
4. **Navigate to the demo:** `http://localhost:3000/src/plugins/<plugin>/demo/html/demo.html`
5. **Verify visually** that the feature works as expected
6. **Check the browser console** for errors
7. **Use the API via console** to confirm counts/values match expectations

When using Claude Preview, use `preview_eval` to call `tinymce.activeEditor` APIs and verify behavior programmatically.

**Tell the stakeholder** which demo file they can edit to manually test different configurations (e.g., "You can change the options in `modules/tinymce/src/plugins/wordcount/demo/ts/demo/Demo.ts` and reload the page to test different configurations").

## Testing Limitations — What the Agent Cannot Verify

Claude Preview can verify rendering, click behavior, and API return values, but **cannot test keyboard navigation** through Alloy's event system. `dispatchEvent` in the browser does not trigger Alloy's simulated event handlers, so keyboard flows (Arrow keys, Enter, Escape through menus) are a blind spot.

**Before opening a PR, include a "Manual Testing Required" section** that tells the stakeholder exactly what to test that couldn't be verified programmatically:

```
## Manual Testing Required
- [ ] Down arrow from input navigates into dropdown menu
- [ ] Enter on highlighted menu item applies the font size
- [ ] Escape closes dropdown and returns focus to input
- [ ] Hover over menu items shows blue highlight
```

This prevents the PM from discovering keyboard/mouse interaction bugs that the agent should have flagged as untested.

## Self-Review (Required Before PR)

Before opening a PR, run a self-review of the full diff (`git diff main`). Check for:

- **Code style**: mutable `let` variables where `Optional` chaining would work, redundant guards, unused imports/variables
- **Hardcoded values**: colors, sizes, or strings that should come from theme variables or constants
- **Anti-patterns for this codebase**: injected `<style>` tags (use Oxide LESS), `setTimeout` for timing issues (use event-based solutions), `any` types
- **Dead code**: cells/state that is set but never read, functions defined but never called
- **Test coverage gaps**: is there a test for typing a custom value? For the empty state? For interaction between this feature and other toolbar items?

Document findings in a `## Self-Review` section on the PR. Fix all issues before requesting human review — the PM's time should be spent on UX and product decisions, not code quality catches.

## Framework vs Workaround Decision Guide

When a feature requires behavior not directly supported by an internal library (Alloy, Katamari, Sugar), follow this decision process:

1. **Check if the same pattern exists elsewhere in the codebase.** If another feature uses the same workaround (e.g., the autocompleter uses `InlineView` with `fakeFocus`), the workaround is an established pattern — use it.

2. **If no precedent exists, investigate the framework internals** before deciding. Read the relevant source code and document what you find. This takes time but prevents uninformed decisions.

3. **Prefer workarounds when:**
   - The framework component's core behavior conflicts with the requirement (e.g., `AlloyDropdown` is fundamentally click-to-toggle, but you need focus-to-open)
   - The workaround matches an existing pattern in the codebase
   - The scope of framework changes would affect other consumers of that component

4. **Prefer framework changes when:**
   - The issue spec explicitly authorizes it
   - The workaround would require hacks that break skin/theme compatibility (hardcoded colors, injected styles)
   - Multiple features would benefit from the new capability

5. **Always document the decision** on the PR — what was investigated, why the chosen approach was selected, and what the alternative would look like. This saves future developers from re-investigating.

## Documentation Updates (Required in PRs)

When a PR adds or changes user-facing options or APIs, include a **Proposed Documentation** section in the PR description. The agent cannot modify the docs site directly, so instead:

1. **Identify which docs page** would need updating — reference the URL from https://www.tiny.cloud/docs/tinymce/latest/
2. **Write proposed additions** in the tone and style of the existing docs (declarative, technically precise, with code examples)
3. **Include the section in the PR body** under a `## Proposed Documentation` heading with:
   - The target page URL
   - The proposed new/updated content (options with Type/Default/Description/Example, API methods with signatures and descriptions)
   - Any new example code blocks matching the docs style

## Edge Case Investigation (Required Before PR)

After implementation and happy-path tests, deliberately try to break the feature:

- Weird inputs (empty strings, huge content, nested elements, malformed HTML)
- Boundary conditions (config values that match everything, match nothing, match the editor root)
- Interaction with other plugins
- Rapid state changes

For each issue found, classify and document in the PR description:

```
## Edge Cases Investigated
- [ ] Empty content → ✅ returns expected default
- [ ] Config matches no elements → ✅ behaves as if unconfigured
- [ ] Extreme config value → ⚠️ edge case, documented (unlikely scenario)
```

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
- **Always branch from a clean `main`** — stash or commit local changes before creating a new branch to avoid leaking unrelated changes into the PR
- **Edge Cases Investigated checkboxes must be ticked** — if you investigated an edge case, mark it `[x]` not `[ ]`. Unticked checkboxes show up as non-actioned tasks in GitHub's issue/PR tracking
