/**
 * Loader Spinner Utilities
 * Functions to show/hide loading spinners on pages
 */

export function createLoaderSpinner() {
  const spinner = document.createElement('div');
  spinner.id = 'page-loader';
  spinner.className = 'fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50';
  spinner.innerHTML = `
    <div class="flex flex-col items-center gap-4">
      <div class="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
      <p class="text-white font-semibold">Chargement des données...</p>
    </div>
  `;
  return spinner;
}

export function showPageLoader() {
  let loader = document.getElementById('page-loader');
  if (!loader) {
    loader = createLoaderSpinner();
    document.body.appendChild(loader);
  }
  loader.classList.remove('hidden');
}

export function hidePageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('hidden');
  }
}

export function removePageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.remove();
  }
}
