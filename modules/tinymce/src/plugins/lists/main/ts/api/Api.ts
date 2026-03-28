import { Fun } from '@ephox/katamari';

import type Editor from 'tinymce/core/api/Editor';

export interface Api {
  readonly backspaceDelete: (isForward: boolean) => void;
  readonly getVersion: () => string;
}

const get = (editor: Editor): Api => ({
  backspaceDelete: (isForward: boolean) => {
    editor.execCommand('mceListBackspaceDelete', false, isForward);
  },
  getVersion: Fun.constant('1.0.0')
});

export {
  get
};
