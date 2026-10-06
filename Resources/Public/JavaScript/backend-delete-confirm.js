/**
 * Confirmation dialog for the "Delete imagemap" forms in the backend module list
 * (kept as an external module so it works under the backend's Content-Security-Policy,
 * which blocks inline scripts/handlers).
 */
document.querySelectorAll('[data-mminteractive-delete-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!window.confirm(form.getAttribute('data-confirm'))) {
      event.preventDefault();
    }
  });
});
