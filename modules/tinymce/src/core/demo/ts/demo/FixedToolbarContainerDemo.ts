import type { TinyMCE } from 'tinymce/core/api/PublicApi';

declare let tinymce: TinyMCE;

export default (): void => {
  // Existing: inline mode with fixed_toolbar_container
  tinymce.init({
    selector: '#editor-inline',
    license_key: 'gpl',
    inline: true,
    fixed_toolbar_container: '#toolbar-inline',
  });

  // New: iframe mode with fixed_toolbar_container
  // The toolbar renders in #toolbar-iframe while the editor iframe stays at #editor-iframe.
  // This demonstrates layout freedom — other content can live between the toolbar and editor.
  tinymce.init({
    selector: '#editor-iframe',
    license_key: 'gpl',
    plugins: 'lists link image table wordcount',
    toolbar: 'bold italic underline | bullist numlist | link image table',
    fixed_toolbar_container: '#toolbar-iframe',
  });
};
