import { context, describe, it } from '@ephox/bedrock-client';
import { TinyHooks, TinySelections } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';
import type { WordCountApi } from 'tinymce/plugins/wordcount/api/Api';
import Plugin from 'tinymce/plugins/wordcount/Plugin';

describe('browser.tinymce.plugins.wordcount.ExcludeSelectorTest', () => {
  context('Single class selector', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      plugins: 'wordcount',
      wordcount_exclude_selector: '.ignore',
      base_url: '/project/tinymce/js/tinymce'
    }, [ Plugin ]);

    it('TINY-0003: Excludes words inside element matching selector', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">hidden world</span> there</p>');
      assert.equal(api.body.getWordCount(), 2);
    });

    it('TINY-0003: Excludes characters inside element matching selector', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">hidden world</span> there</p>');
      // "Hello" (5) + " " (1) + " " (1) + "there" (5) = 12
      assert.equal(api.body.getCharacterCount(), 12);
    });

    it('TINY-0003: Excludes characters without spaces inside element matching selector', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">hidden world</span> there</p>');
      assert.equal(api.body.getCharacterCountWithoutSpaces(), 10);
    });

    it('TINY-0003: Does not affect counting when no elements match selector', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello world there</p>');
      assert.equal(api.body.getWordCount(), 3);
    });

    it('TINY-0003: Handles nested excluded elements', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <div class="ignore"><span>deeply nested words</span></div> there</p>');
      assert.equal(api.body.getWordCount(), 2);
    });

    it('TINY-0003: Excludes from selection count when selection spans excluded elements', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">hidden</span> there</p>');
      TinySelections.setSelection(editor, [ 0 ], 0, [ 0 ], 3);
      assert.equal(api.selection.getWordCount(), 2);
    });
  });

  context('Multiple selectors', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      plugins: 'wordcount',
      wordcount_exclude_selector: '.ignore, .metadata',
      base_url: '/project/tinymce/js/tinymce'
    }, [ Plugin ]);

    it('TINY-0003: Excludes elements matching any of the selectors', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">ignored</span> and <span class="metadata">meta</span> world</p>');
      assert.equal(api.body.getWordCount(), 3);
    });
  });

  context('No selector configured', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      plugins: 'wordcount',
      base_url: '/project/tinymce/js/tinymce'
    }, [ Plugin ]);

    it('TINY-0003: Counts all words when no exclude selector is set', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span class="ignore">hidden world</span> there</p>');
      assert.equal(api.body.getWordCount(), 4);
    });
  });

  context('ID selector', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      plugins: 'wordcount',
      wordcount_exclude_selector: '#exclude-me',
      base_url: '/project/tinymce/js/tinymce'
    }, [ Plugin ]);

    it('TINY-0003: Excludes element matching ID selector', () => {
      const editor = hook.editor();
      const api = editor.plugins.wordcount as WordCountApi;
      editor.setContent('<p>Hello <span id="exclude-me">hidden</span> world</p>');
      assert.equal(api.body.getWordCount(), 2);
    });
  });
});
