// page-loader.js - Page loader utilities
export function showPageLoader() {
    let loader = document.getElementById('pageLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'pageLoader';
        loader.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <div style="border: 4px solid #f3f4f6; border-top: 4px solid #F5A64B; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
                <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">Chargement...</p>
            </div>
        `;
        loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;';
        
        // Add animation
        if (!document.querySelector('style[data-page-loader]')) {
            const style = document.createElement('style');
            style.setAttribute('data-page-loader', 'true');
            style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

export function hidePageLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

export function togglePageLoader(show = true) {
    if (show) {
        showPageLoader();
    } else {
        hidePageLoader();
    }
}
