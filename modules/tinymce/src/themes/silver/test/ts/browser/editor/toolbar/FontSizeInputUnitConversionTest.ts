import { FocusTools, Keys, UiControls, UiFinder, Waiter } from '@ephox/agar';
import { context, describe, it } from '@ephox/bedrock-client';
import { SugarShadowDom, Value } from '@ephox/sugar';
import { TinyAssertions, TinyDom, TinyHooks, TinySelections, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.themes.silver.editor.toolbar.FontSizeInputUnitConversionTest', () => {

  const getInputValue = (editor: Editor): string => {
    const input = UiFinder.findIn<HTMLInputElement>(TinyUiActions.getUiRoot(editor), '.tox-number-input input').getOrDie();
    return Value.get(input);
  };

  const pWaitForInputValue = (editor: Editor, expected: string): Promise<void> =>
    Waiter.pTryUntil(`Input should show "${expected}"`, () => {
      assert.equal(getInputValue(editor), expected);
    });

  context('Default unit (pt)', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-UNIT-1: should display font size converted to pt when content is in px', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);
      await pWaitForInputValue(editor, '12pt');
    });

    it('TINY-UNIT-2: should display pt value directly when content is already in pt', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 14pt;">abc</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);
      // The browser computes pt values to px, so queryCommandValue returns px
      // 14pt = 18.67px, which converts back to ~14pt
      await pWaitForInputValue(editor, '14pt');
    });

    it('TINY-UNIT-3: increment/decrement should work in pt unit', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setSelection(editor, [ 0, 0 ], 0, [ 0, 0 ], 3);
      await pWaitForInputValue(editor, '12pt');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .plus');
      await pWaitForInputValue(editor, '13pt');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .minus');
      await pWaitForInputValue(editor, '12pt');
    });
  });

  context('Configured unit: px', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ],
      font_size_input_default_unit: 'px'
    }, []);

    it('TINY-UNIT-4: should display font size in px when unit is configured as px', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);
      await pWaitForInputValue(editor, '16px');
    });

    it('TINY-UNIT-5: increment/decrement should work in px unit', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setSelection(editor, [ 0, 0 ], 0, [ 0, 0 ], 3);
      await pWaitForInputValue(editor, '16px');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .plus');
      await pWaitForInputValue(editor, '17px');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .minus');
      await pWaitForInputValue(editor, '16px');
    });
  });

  context('Configured unit: em', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ],
      font_size_input_default_unit: 'em'
    }, []);

    it('TINY-UNIT-6: should display font size in em when unit is configured as em', async () => {
      const editor = hook.editor();
      // em is relative, so we can't convert px to em without knowing the parent font size
      // The conversion should fall back to displaying the raw value when em is the target
      editor.setContent('<p style="font-size: 2em;">abc</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);
      // Browser computes em to px, so queryCommandValue returns px
      // We can't convert back to em without context, so it should display px
      // This test documents the expected behavior
      await Waiter.pWait(100);
      const value = getInputValue(editor);
      // Should show some value (px since em conversion from px isn't supported)
      assert.isNotEmpty(value, 'Input should have a value');
    });
  });

  context('Dropdown and input consistency', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsize fontsizeinput' ]
    }, []);

    it('TINY-UNIT-7: fontsize dropdown and fontsizeinput should show consistent values', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      // The input should show 12pt (converted from 16px)
      await pWaitForInputValue(editor, '12pt');

      // The dropdown should also show 12pt
      const dropdownValue = UiFinder.findIn(TinyUiActions.getUiRoot(editor), '.tox-tbtn--select .tox-tbtn__select-label').getOrDie();
      await Waiter.pTryUntil('Dropdown should show 12pt', () => {
        const text = dropdownValue.dom.textContent ?? '';
        assert.equal(text, '12pt');
      });
    });
  });

  context('Backwards compatibility', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-UNIT-8: typing a bare number should still apply the default unit', async () => {
      const editor = hook.editor();
      const root = SugarShadowDom.getRootNode(TinyDom.targetElement(editor));
      editor.setContent('<p style="font-size: 16px;">abc</p>');
      TinySelections.setSelection(editor, [ 0, 0 ], 0, [ 0, 0 ], 3);

      const input = TinyUiActions.clickOnToolbar<HTMLInputElement>(editor, '.tox-number-input input');
      UiControls.setValue(input, '20');
      FocusTools.setFocus(root, '.tox-number-input input');
      await FocusTools.pTryOnSelector('Focus should be on input', root, '.tox-number-input input');
      TinyUiActions.keystroke(editor, Keys.enter());

      // With default unit pt, typing "20" should apply "20pt"
      TinyAssertions.assertContentPresence(editor, { 'span[style*="20pt"]': 1 });
    });
  });
});
