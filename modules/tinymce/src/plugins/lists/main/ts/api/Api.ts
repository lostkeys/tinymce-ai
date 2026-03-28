import type Editor from 'tinymce/core/api/Editor';

export interface Api {
  readonly backspaceDelete: (isForward: boolean) => void;
  readonly getVersion: () => string;
}

const version = '1.0.0';

const get = (editor: Editor): Api => ({
  backspaceDelete: (isForward: boolean) => {
    editor.execCommand('mceListBackspaceDelete', false, isForward);
  },
  getVersion: () => version
});

export {
  get
};
