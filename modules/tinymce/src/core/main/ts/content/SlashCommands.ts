import { Arr, Fun, Strings, Type } from '@ephox/katamari';

import type Editor from '../api/Editor';
import * as Options from '../api/Options';

interface SlashCommandItem {
  readonly text: string;
  readonly icon?: string;
  readonly onAction: () => void;
}

interface SlashCommandGroup {
  readonly items: SlashCommandItem[];
}

// Block formats that can be applied via formatter.apply()
const blockFormatNames: Record<string, { text: string; icon?: string }> = {
  h1: { text: 'Heading 1' },
  h2: { text: 'Heading 2' },
  h3: { text: 'Heading 3' },
  h4: { text: 'Heading 4' },
  h5: { text: 'Heading 5' },
  h6: { text: 'Heading 6' },
  p: { text: 'Paragraph', icon: 'paragraph' },
  blockquote: { text: 'Quote', icon: 'quote' },
  pre: { text: 'Code Block', icon: 'sourcecode' }
};

// Aliases for common shorthand names to their actual registry identifiers
const nameAliases: Record<string, string> = {
  table: 'inserttabledialog'
};

// Known icon mappings for items that don't declare their own icon
const knownIcons: Record<string, string> = {
  bullist: 'unordered-list',
  numlist: 'ordered-list',
  hr: 'horizontal-rule',
  table: 'table',
  inserttable: 'table',
  inserttabledialog: 'table',
  image: 'image',
  link: 'link',
  codesample: 'code-sample'
};

// Known display text for toolbar buttons that don't have a text property
const knownText: Record<string, string> = {
  bullist: 'Bullet List',
  numlist: 'Numbered List'
};

const resolveItemFromRegistry = (editor: Editor, name: string): SlashCommandItem | null => {
  const resolvedName = nameAliases[name] ?? name;

  // Try block format first
  if (blockFormatNames[resolvedName] && editor.formatter.has(resolvedName)) {
    const info = blockFormatNames[resolvedName];
    return {
      text: info.text,
      icon: info.icon,
      onAction: () => editor.formatter.apply(resolvedName)
    };
  }

  // Try menu item registry
  const allItems = editor.ui.registry.getAll();
  const menuItem = allItems.menuItems[resolvedName];
  if (menuItem && Type.isFunction((menuItem as any).onAction)) {
    return {
      text: (menuItem as any).text ?? knownText[name] ?? name,
      icon: (menuItem as any).icon ?? knownIcons[name] ?? knownIcons[resolvedName],
      onAction: () => (menuItem as any).onAction({ isEnabled: Fun.always, setEnabled: Fun.noop })
    };
  }

  // Try toolbar button registry (bullist, numlist are buttons not menu items)
  const button = allItems.buttons[resolvedName];
  if (button && Type.isFunction((button as any).onAction)) {
    return {
      text: (button as any).text ?? knownText[name] ?? name,
      icon: (button as any).icon ?? knownIcons[name] ?? knownIcons[resolvedName],
      onAction: () => (button as any).onAction({ isEnabled: Fun.always, setEnabled: Fun.noop, isActive: Fun.never, setActive: Fun.noop })
    };
  }

  // Not found — silently skip
  return null;
};

const parseCommandString = (editor: Editor, commandStr: string): SlashCommandGroup[] => {
  const segments = commandStr.split('|').map((s) => s.trim());
  const groups: SlashCommandGroup[] = [];

  for (const segment of segments) {
    if (Strings.isEmpty(segment)) {
      continue;
    }
    const names = segment.split(/\s+/).filter((n) => Strings.isNotEmpty(n));
    const items: SlashCommandItem[] = [];
    for (const name of names) {
      const item = resolveItemFromRegistry(editor, name);
      if (item) {
        items.push(item);
      }
    }
    if (items.length > 0) {
      groups.push({ items });
    }
  }

  return groups;
};

const getAutoGroups = (editor: Editor): SlashCommandGroup[] => {
  const groups: SlashCommandGroup[] = [];

  // Block formats group
  const blockFormats: SlashCommandItem[] = [];
  for (const name of [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ]) {
    const item = resolveItemFromRegistry(editor, name);
    if (item) {
      blockFormats.push(item);
    }
  }
  if (blockFormats.length > 0) {
    groups.push({ items: blockFormats });
  }

  // List items group
  const listItems: SlashCommandItem[] = [];
  for (const name of [ 'bullist', 'numlist' ]) {
    const item = resolveItemFromRegistry(editor, name);
    if (item) {
      listItems.push(item);
    }
  }
  if (listItems.length > 0) {
    groups.push({ items: listItems });
  }

  // Insert items group — scrape from registered menu items
  const insertItems: SlashCommandItem[] = [];
  for (const name of [ 'blockquote', 'pre', 'hr', 'table', 'image', 'link', 'codesample' ]) {
    const item = resolveItemFromRegistry(editor, name);
    if (item) {
      insertItems.push(item);
    }
  }
  if (insertItems.length > 0) {
    groups.push({ items: insertItems });
  }

  return groups;
};

const buildAutocompleterItems = (groups: SlashCommandGroup[], pattern: string) => {
  const results: Array<{ type: 'autocompleteitem'; value: string; text: string; icon?: string } |
    { type: 'separator' }> = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const filtered = Arr.filter(group.items, (item) =>
      Strings.isEmpty(pattern) || item.text.toLowerCase().includes(pattern.toLowerCase())
    );

    if (filtered.length > 0) {
      // Add separator between groups (not before first)
      if (results.length > 0) {
        results.push({ type: 'separator' });
      }
      for (const item of filtered) {
        results.push({
          type: 'autocompleteitem',
          value: item.text,
          text: item.text,
          icon: item.icon
        });
      }
    }
  }

  return results;
};

const setup = (editor: Editor): void => {
  const commandStr = Options.getPlaceholderNewlineCommands(editor);

  if (Strings.isEmpty(commandStr)) {
    return;
  }

  editor.on('init', () => {
    const groups = commandStr === 'auto'
      ? getAutoGroups(editor)
      : parseCommandString(editor, commandStr);

    if (groups.length === 0) {
      return;
    }

    // Build a flat lookup for onAction by text label
    const actionLookup: Record<string, () => void> = {};
    for (const group of groups) {
      for (const item of group.items) {
        actionLookup[item.text] = item.onAction;
      }
    }

    // Count total items for maxResults
    let totalItems = 0;
    for (const group of groups) {
      totalItems += group.items.length;
    }

    editor.ui.registry.addAutocompleter('slashcommands', {
      trigger: '/',
      minChars: 0,
      columns: 1,
      maxResults: totalItems + groups.length, // items + separators
      fetch: (pattern) => {
        const items = buildAutocompleterItems(groups, pattern);
        return Promise.resolve(items);
      },
      onAction: (autocompleteApi, rng, value) => {
        editor.selection.setRng(rng);
        editor.execCommand('Delete');
        autocompleteApi.hide();

        const action = actionLookup[value];
        if (action) {
          action();
        }
      }
    });
  });
};

export {
  setup
};
