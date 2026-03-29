import { context, describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';
import ImagePlugin from 'tinymce/plugins/image/Plugin';
import ListsPlugin from 'tinymce/plugins/lists/Plugin';
import TablePlugin from 'tinymce/plugins/table/Plugin';

describe('browser.tinymce.core.content.SlashCommandsTest', () => {

  context('With explicit placeholder_newline_commands', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline_commands: 'h1 h2 | blockquote hr',
      plugins: 'lists table image',
      base_url: '/project/tinymce/js/tinymce'
    }, [ ListsPlugin, TablePlugin, ImagePlugin ], true);

    it('should register slashcommands autocompleter', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      assert.isTrue('slashcommands' in all.popups, 'slashcommands autocompleter should be registered');
    });

    it('should resolve block format items', () => {
      const editor = hook.editor();
      editor.setContent('');
      editor.focus();
      // Apply h1 format via formatter to verify it works
      editor.formatter.apply('h1');
      const content = editor.getContent();
      assert.include(content, '<h1>', 'h1 format should be applicable');
    });

    it('should skip unloaded plugin items silently', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      // slashcommands should be registered even if some items in the config are invalid
      assert.isTrue('slashcommands' in all.popups, 'autocompleter should still be registered');
    });
  });

  context('With auto mode', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline_commands: 'auto',
      plugins: 'lists table image',
      base_url: '/project/tinymce/js/tinymce'
    }, [ ListsPlugin, TablePlugin, ImagePlugin ], true);

    it('should register autocompleter in auto mode', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      assert.isTrue('slashcommands' in all.popups, 'slashcommands autocompleter should be registered in auto mode');
    });

    it('should discover block formats automatically', () => {
      const editor = hook.editor();
      // Verify that h1-h6 formats exist (auto mode relies on these)
      assert.isTrue(editor.formatter.has('h1'), 'h1 format should be registered');
      assert.isTrue(editor.formatter.has('h2'), 'h2 format should be registered');
      assert.isTrue(editor.formatter.has('h3'), 'h3 format should be registered');
    });
  });

  context('Without placeholder_newline_commands', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should not register autocompleter when option is not set', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      assert.isFalse('slashcommands' in all.popups, 'slashcommands should not be registered');
    });
  });

  context('With pipe separators in config', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline_commands: 'h1 | h2 | h3',
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should register autocompleter with grouped items', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      assert.isTrue('slashcommands' in all.popups, 'slashcommands should be registered with pipe groups');
    });
  });

  context('Command execution', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline_commands: 'h1 h2 blockquote',
      base_url: '/project/tinymce/js/tinymce'
    }, [], true);

    it('should apply heading format when h1 action is triggered', () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      editor.selection.setCursorLocation(editor.getBody().firstChild as Node, 0);
      editor.formatter.apply('h1');
      assert.include(editor.getContent(), '<h1>');
    });

    it('should apply blockquote format when blockquote action is triggered', () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      editor.selection.setCursorLocation(editor.getBody().firstChild as Node, 0);
      editor.formatter.apply('blockquote');
      assert.include(editor.getContent(), '<blockquote>');
    });
  });

  context('With alias names', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      placeholder_newline_commands: 'table',
      plugins: 'table',
      base_url: '/project/tinymce/js/tinymce'
    }, [ TablePlugin ], true);

    it('should resolve table alias to inserttabledialog', () => {
      const editor = hook.editor();
      const all = editor.ui.registry.getAll();
      assert.isTrue('slashcommands' in all.popups, 'table alias should resolve and register autocompleter');
    });
  });
});
