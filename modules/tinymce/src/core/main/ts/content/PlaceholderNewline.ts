import { Strings } from '@ephox/katamari';

import type Editor from '../api/Editor';
import * as Options from '../api/Options';

import { isVisuallyEmpty } from './Placeholder';

const placeholderNewlineClass = 'mce-placeholder-newline';
const placeholderNewlineAttr = 'data-mce-placeholder-newline';

const clearPlaceholder = (editor: Editor): void => {
  const body = editor.getBody();
  if (body) {
    const current = body.querySelector('.' + placeholderNewlineClass);
    if (current) {
      current.classList.remove(placeholderNewlineClass);
      current.removeAttribute(placeholderNewlineAttr);
    }
  }
};

const isEmptyBlock = (editor: Editor, node: Node): boolean => {
  if (node.nodeType !== 1) {
    return false;
  }
  // Use TinyMCE's built-in isEmpty which handles bogus <br>, format carets,
  // empty formatting spans (<strong></strong>), and zero-width characters
  return editor.dom.isEmpty(node, undefined, { skipBogus: false, includeZwsp: true });
};

const isUnformattedBlock = (el: Element, forcedRootBlock: string): boolean => {
  // Must be the default block element type
  if (el.nodeName.toLowerCase() !== forcedRootBlock) {
    return false;
  }

  // No extra classes (except our own placeholder class which we'll add)
  const classList = el.classList;
  if (classList.length > 0 && !(classList.length === 1 && classList.contains(placeholderNewlineClass))) {
    return false;
  }

  // No inline styles
  if (el.getAttribute('style')) {
    return false;
  }

  return true;
};

const getCaretBlock = (editor: Editor): Element | null => {
  const body = editor.getBody();
  const forcedRootBlock = Options.getForcedRootBlock(editor);
  const selection = editor.selection;

  if (!selection) {
    return null;
  }

  const node = selection.getNode();
  if (!node) {
    return null;
  }

  // Walk up to find the direct child of body (the block-level element)
  let block: Element | null = null;
  if (node === body) {
    // Caret is directly in body — check first child
    const firstChild = body.firstElementChild;
    if (firstChild) {
      block = firstChild;
    }
  } else {
    let current: Node | null = node;
    while (current && current.parentNode !== body) {
      current = current.parentNode;
    }
    if (current && current.nodeType === 1) {
      block = current as Element;
    }
  }

  if (!block || !isEmptyBlock(editor, block) || !isUnformattedBlock(block, forcedRootBlock)) {
    return null;
  }

  return block;
};

const shouldShowPlaceholder = (editor: Editor): boolean => {
  const dom = editor.dom;
  const body = editor.getBody();
  const forcedRootBlock = Options.getForcedRootBlock(editor);
  const placeholderText = Options.getPlaceholderNewline(editor);
  const editorPlaceholder = Options.getPlaceholder(editor) ?? '';

  // No placeholder text configured
  if (Strings.isEmpty(placeholderText)) {
    return false;
  }

  // If existing editor placeholder is set and editor is visually empty,
  // defer to the editor-level placeholder
  if (Strings.isNotEmpty(editorPlaceholder) && isVisuallyEmpty(dom, body, forcedRootBlock)) {
    return false;
  }

  return getCaretBlock(editor) !== null;
};

const updatePlaceholder = (editor: Editor): void => {
  const placeholderText = Options.getPlaceholderNewline(editor);

  clearPlaceholder(editor);

  if (!shouldShowPlaceholder(editor)) {
    return;
  }

  const block = getCaretBlock(editor);
  if (block) {
    block.classList.add(placeholderNewlineClass);
    block.setAttribute(placeholderNewlineAttr, placeholderText);
  }
};

const setup = (editor: Editor): void => {
  const placeholderText = Options.getPlaceholderNewline(editor);

  if (Strings.isEmpty(placeholderText)) {
    return;
  }

  editor.on('init', () => {
    // Initial update
    updatePlaceholder(editor);

    // Track caret movement
    editor.on('NodeChange SelectionChange', () => {
      updatePlaceholder(editor);
    });

    // Clear immediately on typing
    editor.on('input', () => {
      clearPlaceholder(editor);
    });

    // Update after content changes (undo, redo, paste, etc.)
    editor.on('change SetContent ExecCommand', () => {
      updatePlaceholder(editor);
    });

    // Strip placeholder class and attribute from serialized output
    editor.serializer.addAttributeFilter('class', (nodes) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        let value = node.attr('class');
        if (value) {
          value = value.replace(/(?:^|\s)mce-placeholder-newline(?!\S)/g, '').trim();
          node.attr('class', value.length > 0 ? value : null);
        }
        node.attr(placeholderNewlineAttr, null);
      }
    });
  });
};

export {
  setup,
  clearPlaceholder,
  updatePlaceholder,
  shouldShowPlaceholder
};
