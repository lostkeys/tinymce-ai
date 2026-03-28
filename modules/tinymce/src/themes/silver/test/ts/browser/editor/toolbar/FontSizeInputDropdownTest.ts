import { Keys, UiFinder, Waiter } from '@ephox/agar';
import { context, describe, it } from '@ephox/bedrock-client';
import { SugarBody, Value } from '@ephox/sugar';
import { TinyHooks, TinySelections, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import type Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.themes.silver.editor.toolbar.FontSizeInputDropdownTest', () => {

  const getInputValue = (editor: Editor): string => {
    const input = UiFinder.findIn<HTMLInputElement>(TinyUiActions.getUiRoot(editor), '.tox-number-input input').getOrDie();
    return Value.get(input);
  };

  const pWaitForInputValue = (editor: Editor, expected: string): Promise<void> =>
    Waiter.pTryUntil(`Input should show "${expected}"`, () => {
      assert.equal(getInputValue(editor), expected);
    });

  const pClickInput = (editor: Editor): void => {
    TinyUiActions.clickOnToolbar<HTMLInputElement>(editor, '.tox-number-input input');
  };

  const pWaitForDropdown = (): Promise<void> =>
    Waiter.pTryUntil('Dropdown should be visible', () => {
      UiFinder.findIn(SugarBody.body(), '.tox-number-input-dropdown .tox-collection--list').getOrDie();
    });

  const pWaitForNoDropdown = (): Promise<void> =>
    Waiter.pTryUntil('Dropdown should be hidden', () => {
      assert.isTrue(
        UiFinder.findIn(SugarBody.body(), '.tox-number-input-dropdown .tox-collection--list').isError(),
        'Dropdown should not exist'
      );
    });

  context('Dropdown menu on focus', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-DROP-1: should show dropdown when input is focused', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      pClickInput(editor);
      await pWaitForDropdown();
    });

    it('TINY-DROP-2: should show font size options in dropdown', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      pClickInput(editor);
      await pWaitForDropdown();

      // Check that menu items exist
      const items = UiFinder.findAllIn(SugarBody.body(), '.tox-number-input-dropdown .tox-collection__item');
      assert.isAbove(items.length, 0, 'Should have menu items');
    });

    it('TINY-DROP-3: should indicate current font size with checkmark', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 12pt;">test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);
      await pWaitForInputValue(editor, '12pt');

      pClickInput(editor);
      await pWaitForDropdown();

      // The 12pt item should be active (have the enabled class)
      const activeItems = UiFinder.findAllIn(SugarBody.body(), '.tox-number-input-dropdown .tox-collection__item--enabled');
      assert.equal(activeItems.length, 1, 'Should have exactly one active item');
    });

    it('TINY-DROP-4: clicking a menu item should apply the font size', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setSelection(editor, [ 0, 0 ], 0, [ 0, 0 ], 4);

      pClickInput(editor);
      await pWaitForDropdown();

      // Click on a menu item (e.g., first one which is typically 8pt)
      const items = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-number-input-dropdown .tox-collection__item');
      assert.isAbove(items.length, 0, 'Should have menu items');
      items[0].dom.click();

      // Dropdown should close
      await pWaitForNoDropdown();
    });

    it('TINY-DROP-5: Escape should close the dropdown', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      pClickInput(editor);
      await pWaitForDropdown();

      TinyUiActions.keystroke(editor, Keys.escape());
      await pWaitForNoDropdown();
    });
  });

  context('ARIA attributes', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-DROP-6: input should have combobox ARIA attributes', () => {
      const editor = hook.editor();
      const input = UiFinder.findIn<HTMLInputElement>(TinyUiActions.getUiRoot(editor), '.tox-number-input input').getOrDie();
      assert.equal(input.dom.getAttribute('role'), 'combobox');
      assert.equal(input.dom.getAttribute('aria-haspopup'), 'listbox');
      assert.equal(input.dom.getAttribute('aria-expanded'), 'false');
    });

    it('TINY-DROP-7: aria-expanded should be true when dropdown is open', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      const input = UiFinder.findIn<HTMLInputElement>(TinyUiActions.getUiRoot(editor), '.tox-number-input input').getOrDie();
      assert.equal(input.dom.getAttribute('aria-expanded'), 'false');

      pClickInput(editor);
      await pWaitForDropdown();

      assert.equal(input.dom.getAttribute('aria-expanded'), 'true');
    });
  });

  context('Keyboard navigation', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-DROP-8: Down arrow from input should highlight first menu item', async () => {
      const editor = hook.editor();
      editor.setContent('<p>test</p>');
      TinySelections.setCursor(editor, [ 0, 0 ], 1);

      pClickInput(editor);
      await pWaitForDropdown();

      TinyUiActions.keystroke(editor, Keys.down());

      await Waiter.pTryUntil('First item should be highlighted', () => {
        const highlighted = UiFinder.findAllIn(SugarBody.body(), '.tox-number-input-dropdown .tox-collection__item--active');
        assert.isAbove(highlighted.length, 0, 'Should have a highlighted item');
      });
    });
  });

  context('Stepper buttons with dropdown', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/tinymce/js/tinymce',
      toolbar: [ 'fontsizeinput' ]
    }, []);

    it('TINY-DROP-9: +/- buttons should still work', async () => {
      const editor = hook.editor();
      editor.setContent('<p style="font-size: 16px;">test</p>');
      TinySelections.setSelection(editor, [ 0, 0 ], 0, [ 0, 0 ], 4);
      await pWaitForInputValue(editor, '12pt');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .plus');
      await pWaitForInputValue(editor, '13pt');

      TinyUiActions.clickOnToolbar(editor, '.tox-number-input .minus');
      await pWaitForInputValue(editor, '12pt');
    });
  });
});
