/**
 * Skeleton Loader Utility
 * Displays inline skeleton placeholders instead of fullscreen spinner
 */

export function createSkeletonLoader(containerSelector, type = 'cards') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (type === 'cards') {
    container.innerHTML = `
      <div class="space-y-4">
        ${Array(3).fill(0).map((_, i) => `
          <div class="animate-pulse">
            <div class="h-40 bg-gray-200 rounded-lg mb-4"></div>
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'table') {
    container.innerHTML = `
      <div class="space-y-3">
        ${Array(5).fill(0).map((_, i) => `
          <div class="animate-pulse flex gap-4">
            <div class="flex-1 h-4 bg-gray-200 rounded"></div>
            <div class="flex-1 h-4 bg-gray-200 rounded"></div>
            <div class="flex-1 h-4 bg-gray-200 rounded"></div>
            <div class="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'list') {
    container.innerHTML = `
      <div class="space-y-2">
        ${Array(6).fill(0).map((_, i) => `
          <div class="animate-pulse h-12 bg-gray-200 rounded"></div>
        `).join('')}
      </div>
    `;
  }
}

export function removeSkeletonLoader(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (container) {
    container.innerHTML = '';
  }
}
