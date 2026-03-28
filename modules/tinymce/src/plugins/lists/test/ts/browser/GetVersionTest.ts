import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';
import type { Api } from 'tinymce/plugins/lists/api/Api';
import Plugin from 'tinymce/plugins/lists/Plugin';

describe('browser.tinymce.plugins.lists.GetVersionTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'lists',
    base_url: '/project/tinymce/js/tinymce'
  }, [ Plugin ], true);

  it('TINY-0001: getVersion should return a version string', () => {
    const editor = hook.editor();
    const api = editor.plugins.lists as unknown as Api;
    const version = api.getVersion();
    assert.isString(version);
    assert.match(version, /^\d+\.\d+\.\d+$/);
  });

  it('TINY-0001: getVersion should return 1.0.0', () => {
    const editor = hook.editor();
    const api = editor.plugins.lists as unknown as Api;
    assert.equal(api.getVersion(), '1.0.0');
  });
});
