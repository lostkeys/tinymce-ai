import { UiFinder, Waiter } from '@ephox/agar';
import { after, before, describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { Insert, Remove, SugarBody, SugarElement } from '@ephox/sugar';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.themes.silver.editor.SilverFixedToolbarContainerIframeTest', () => {
  let toolbar: SugarElement<HTMLDivElement>;

  before(() => {
    toolbar = SugarElement.fromHtml('<div id="fixed-toolbar-test" style="margin: 50px 0;"></div>');
    Insert.append(SugarBody.body(), toolbar);
  });

  after(() => {
    Remove.remove(toolbar);
  });

  const hook = TinyHooks.bddSetup<Editor>({
    inline: false,
    fixed_toolbar_container: '#fixed-toolbar-test',
    menubar: 'file',
    toolbar: 'undo bold',
    base_url: '/project/tinymce/js/tinymce'
  }, []);

  it('Toolbar is rendered in the fixed container', async () => {
    const editor = hook.editor();
    editor.setContent('<p>test content</p>');
    editor.focus();

    await Waiter.pTryUntil('Wait for toolbar header', () =>
      UiFinder.findIn(toolbar, '.tox-editor-header').getOrDie()
    );
  });

  it('Editor socket (iframe) is rendered in main editor container, not the fixed container', async () => {
    const editor = hook.editor();
    editor.setContent('<p>test content</p>');
    editor.focus();

    await Waiter.pTryUntil('Wait for edit area', () =>
      UiFinder.findIn(SugarElement.fromDom(editor.editorContainer), '.tox-edit-area').getOrDie()
    );

    // The iframe should NOT be in the fixed container
    assert.equal(UiFinder.findAllIn(toolbar, '.tox-edit-area').length, 0,
      'Fixed container should not contain .tox-edit-area');
  });

  it('Toolbar contains the configured toolbar buttons', async () => {
    const editor = hook.editor();
    editor.setContent('<p>test content</p>');
    editor.focus();

    await Waiter.pTryUntil('Wait for Undo button in fixed container', () =>
      UiFinder.findIn(toolbar, '[aria-label="Undo"]').getOrDie()
    );

    UiFinder.findIn(toolbar, '[aria-label="Bold"]').getOrDie();
  });

  it('Menu bar is rendered in the fixed container', async () => {
    const editor = hook.editor();
    editor.setContent('<p>test content</p>');
    editor.focus();

    await Waiter.pTryUntil('Wait for menubar in fixed container', () =>
      UiFinder.findIn(toolbar, '.tox-menubar').getOrDie()
    );

    // The menubar should NOT be in the main editor container
    const editorContainer = SugarElement.fromDom(editor.editorContainer);
    assert.equal(
      Arr.filter(UiFinder.findAllIn(editorContainer, '.tox-menubar'), (el) => !toolbar.dom.contains(el.dom)).length,
      0,
      'Main editor container should not contain its own .tox-menubar'
    );
  });

  it('Status bar remains in the main editor container', async () => {
    const editor = hook.editor();
    editor.setContent('<p>test content</p>');
    editor.focus();

    await Waiter.pTryUntil('Wait for statusbar', () =>
      UiFinder.findIn(SugarElement.fromDom(editor.editorContainer), '.tox-statusbar').getOrDie()
    );

    assert.equal(UiFinder.findAllIn(toolbar, '.tox-statusbar').length, 0,
      'Fixed container should not contain .tox-statusbar');
  });
});
