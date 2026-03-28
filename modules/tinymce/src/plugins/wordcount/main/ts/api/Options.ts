import type Editor from 'tinymce/core/api/Editor';

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  registerOption('wordcount_exclude_selector', {
    processor: 'string',
    default: ''
  });
};

const getExcludeSelector = (editor: Editor): string =>
  editor.options.get('wordcount_exclude_selector');

export {
  register,
  getExcludeSelector
};
