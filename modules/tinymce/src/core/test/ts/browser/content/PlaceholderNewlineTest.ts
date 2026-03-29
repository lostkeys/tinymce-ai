import { context, describe, it } from '@ephox/bedrock-client';
import { TinyHooks, TinySelections } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.core.content.PlaceholderNewlineTest', () => {
  const placeholderClass = 'mce-placeholder-newline';
  const placeholderAttr = 'data-mce-placeholder-newline';
  const defaultText = 'Type \'/\' for commands';

  const getPlaceholderEl = (editor: Editor): Element | null =>
    editor.getBody().querySelector('.' + placeholderClass);

  const assertPlaceholderShown = (editor: Editor, expectedText?: string) => {
    const el = getPlaceholderEl(editor);
    assert.isNotNull(el, 'Placeholder element should exist');
    if (el) {
      assert.equal(el.getAttribute(placeholderAttr), expectedText ?? defaultText, 'Placeholder text should match');
    }
  };

  const assertPlaceholderHidden = (editor: Editor) => {
    const el = getPlaceholderEl(editor);
    assert.isNull(el, 'Placeholder element should not exist');
  };

  context('With placeholder_newline configured', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline: defaultText,
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should show placeholder on empty editor', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });

    it('should show placeholder on empty line where caret is', () => {
      const editor = hook.editor();
      editor.setContent('<p>Some text</p><p><br data-mce-bogus="1"></p>', { format: 'raw' });
      // Move caret to the empty second paragraph
      TinySelections.setCursor(editor, [ 1 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });

    it('should not show placeholder on non-empty line', () => {
      const editor = hook.editor();
      editor.setContent('<p>Some text</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });

    it('should show placeholder on empty line with carried-forward formatting', () => {
      const editor = hook.editor();
      // Simulates pressing Enter after bold text — TinyMCE wraps the bogus br in <strong>
      editor.setContent('<p><strong>bold text</strong></p><p><strong><br data-mce-bogus="1"></strong></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 1, 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });

    it('should show placeholder on empty line with format caret span', () => {
      const editor = hook.editor();
      // Format caret pattern used by TinyMCE when carrying formatting
      editor.setContent('<p>text</p><p><span data-mce-bogus="1" data-mce-type="format-caret"><strong></strong></span><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 1 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });

    it('should not show placeholder on formatted elements like headings', () => {
      const editor = hook.editor();
      editor.setContent('<h1><br data-mce-bogus="1"></h1>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });

    it('should not show placeholder on elements with classes', () => {
      const editor = hook.editor();
      editor.setContent('<p class="custom"><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });

    it('should not show placeholder on elements with inline styles', () => {
      const editor = hook.editor();
      editor.setContent('<p style="color: red;"><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });

    it('should move placeholder when caret moves between empty lines', () => {
      const editor = hook.editor();
      editor.setContent('<p><br data-mce-bogus="1"></p><p>Text</p><p><br data-mce-bogus="1"></p>', { format: 'raw' });

      // Caret on first empty line
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
      const firstEl = getPlaceholderEl(editor);
      assert.equal(firstEl, editor.getBody().children[0], 'Placeholder should be on first paragraph');

      // Move caret to third empty line
      TinySelections.setCursor(editor, [ 2 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
      const thirdEl = getPlaceholderEl(editor);
      assert.equal(thirdEl, editor.getBody().children[2], 'Placeholder should be on third paragraph');

      // Ensure only one placeholder exists
      const allPlaceholders = editor.getBody().querySelectorAll('.' + placeholderClass);
      assert.equal(allPlaceholders.length, 1, 'Only one placeholder should exist');
    });

    it('should not include placeholder in getContent()', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderShown(editor);

      const content = editor.getContent();
      assert.notInclude(content, placeholderClass, 'Class should not be in getContent()');
      assert.notInclude(content, placeholderAttr, 'Attribute should not be in getContent()');
    });
  });

  context('With both placeholder and placeholder_newline configured', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder: 'Start typing...',
      placeholder_newline: defaultText,
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should not show newline placeholder when editor is empty and editor placeholder is set', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });

    it('should show newline placeholder on new empty line when editor has content', () => {
      const editor = hook.editor();
      editor.setContent('<p>Some text</p><p><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 1 ], 0);
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });
  });

  context('Without placeholder_newline configured', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should not show placeholder when option is not set', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });
  });

  context('With forced_root_block set to div', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline: defaultText,
      forced_root_block: 'div',
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should show placeholder on empty div when forced_root_block is div', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderShown(editor);
    });

    it('should not show placeholder on a p element when forced_root_block is div', () => {
      const editor = hook.editor();
      editor.setContent('<p><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      assertPlaceholderHidden(editor);
    });
  });

  context('With editable_root: false (non-editable root)', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline: defaultText,
      editable_root: false,
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should show placeholder inside editable region', () => {
      const editor = hook.editor();
      editor.setContent('<h1>Title</h1><div class="mceEditable"><p><br data-mce-bogus="1"></p></div>', { format: 'raw' });
      const editableDiv = editor.getBody().querySelector('.mceEditable');
      const emptyP = editableDiv?.querySelector('p');
      if (emptyP) {
        TinySelections.setCursor(editor, [ 1, 0 ], 0);
        editor.nodeChanged();
        assertPlaceholderShown(editor);
      }
    });

    it('should not show placeholder on non-editable content', () => {
      const editor = hook.editor();
      editor.setContent('<p><br data-mce-bogus="1"></p>', { format: 'raw' });
      TinySelections.setCursor(editor, [ 0 ], 0);
      editor.nodeChanged();
      // The p is in the non-editable root, so no placeholder
      assertPlaceholderHidden(editor);
    });
  });

  context('With custom placeholder text', () => {
    const customText = 'Press / to insert a block';
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline: customText,
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should show custom placeholder text', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      editor.nodeChanged();
      assertPlaceholderShown(editor, customText);
    });
  });
});
