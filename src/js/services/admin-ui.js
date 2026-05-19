/**
 * Common Admin UI Logic
 * Handles Sidebar active states, Logout, and Notifications
 */
import { logout } from './auth.js';
import { getToken } from '../utils/cookie.js';

export function initAdminUI() {
    // 1. Handle Active Sidebar Link
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2. Handle Logout
    const logoutBtn = document.getElementById('adminLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                logout();
            }
        });
    }

    // 3. Setup Notification Bell listener
    const bellBtn = document.querySelector('.fa-bell')?.parentElement;
    const badge = document.querySelector('.fa-bell + span');
    
    if (bellBtn) {
        // Fetch real notifications count
        fetchNotificationsCount(badge);
        
        bellBtn.addEventListener('click', () => {
            window.location.href = 'settings.html#notifications'; // Or similar
            // alert('Système de notifications admin.');
        });
    }
}

async function fetchNotificationsCount(badgeEl) {
    if (!badgeEl) return;
    try {
        const token = getToken();
        if (!token) return;

        // Use centralized backend URL from environment configuration
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const apiUrl = `${API_BASE_URL}/notifications`;

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
            const unread = result.data.filter(n => !n.is_read).length;
            if (unread > 0) {
                badgeEl.textContent = unread > 9 ? '9+' : unread;
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Error fetching notifications:", e);
    }
}

// Auto-init if possible or export
document.addEventListener('DOMContentLoaded', initAdminUI);
