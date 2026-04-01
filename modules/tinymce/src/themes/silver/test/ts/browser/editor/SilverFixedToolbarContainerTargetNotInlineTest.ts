import { UiFinder, Waiter } from '@ephox/agar';
import { after, before, describe, it } from '@ephox/bedrock-client';
import { Insert, Remove, SugarBody, SugarElement } from '@ephox/sugar';
import { TinyHooks } from '@ephox/wrap-mcagar';

import type Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.themes.silver.editor.SilverFixedToolbarContainerTargetNotInlineTest', () => {
  const toolbar: SugarElement<HTMLDivElement> = SugarElement.fromHtml('<div style="margin: 50px 0;"></div>');
  before(() => {
    Insert.append(SugarBody.body(), toolbar);
  });

  after(() => {
    Remove.remove(toolbar);
  });

  const hook = TinyHooks.bddSetup<Editor>({
    inline: false,
    fixed_toolbar_container_target: toolbar.dom,
    menubar: 'file',
    toolbar: 'undo bold',
    base_url: '/project/tinymce/js/tinymce'
  }, []);

  it('Check fixed_toolbar_container_target renders toolbar in the target container in iframe mode', async () => {
    const editor = hook.editor();
    editor.setContent('fixed_toolbar_container_target test');
    editor.focus();

    await Waiter.pTryUntil('Wait for toolbar header in target container', () =>
      UiFinder.findIn(toolbar, '.tox-editor-header').getOrDie()
    );
  });
});
