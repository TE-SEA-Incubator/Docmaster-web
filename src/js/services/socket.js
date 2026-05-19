/**
 * Real-time Communication Service using Socket.io
 */
import { io } from 'socket.io-client';
import { getToken } from '../utils/cookie.js';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.userId = null;
    }

    /**
     * Initialize connection
     */
    init() {
        const token = getToken();
        if (!token) {
            console.log('🔌 Socket: No token found, skipping connection');
            return;
        }

        // Avoid multiple connections
        if (this.socket?.connected) return;

        console.log('🔌 Connecting to real-time server...');
        
        // Dynamic URL detection (same as api.js)
        const origin = window.location.origin;
        let socketUrl = 'http://localhost:5000';
        if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
            // Production: replace port 3003 with 5000
            socketUrl = origin.replace(':3003', ':5000');
        }
        
        this.socket = io(socketUrl, {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('✅ Real-time connection established');
        });

        this.socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
        });

        this.socket.on('NEW_NOTIFICATION', (notification) => {
            console.log('🔔 New notification received:', notification);
            this.handleNotification(notification);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });
    }

    /**
     * Handle incoming notifications
     */
    handleNotification(notification) {
        // 1. Trigger visual alert (Toast)
        this.showToast(notification);

        // 2. Update UI (Bell badge / Dot)
        this.updateBadge();

        // 3. Add to existing notification modal if possible
        if (window.addNotification) {
            window.addNotification(
                notification.title,
                notification.message,
                'À l\'instant',
                this.getIconForType(notification.type),
                false
            );
        }

        // 4. Notify other parts of the app
        const event = new CustomEvent('docmaster:new_notification', { detail: notification });
        window.dispatchEvent(event);
    }

    getIconForType(type) {
        switch (type) {
            case 'MATCH_FOUND': return 'fa-solid fa-handshake';
            case 'PAYMENT_RECEIVED': return 'fa-solid fa-money-bill-wave';
            case 'RECOVERY_SUCCESS': return 'fa-solid fa-circle-check';
            case 'DOC_ADDED': return 'fa-solid fa-file-circle-plus';
            default: return 'fa-solid fa-bell';
        }
    }

    showToast(notif) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-[9999] bg-white border-l-4 border-accent shadow-2xl rounded-lg p-4 max-w-sm transform transition-all duration-300 translate-x-full opacity-0';
        toast.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                    <i class="${this.getIconForType(notif.type)}"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800 text-sm">${notif.title}</h4>
                    <p class="text-gray-600 text-xs mt-1 line-clamp-2">${notif.message}</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Auto remove
        const removeToast = () => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        };

        const timeout = setTimeout(removeToast, 5000);

        // Close button
        toast.querySelector('button').onclick = () => {
            clearTimeout(timeout);
            removeToast();
        };

        // Click to go to notifications
        toast.onclick = (e) => {
            if (e.target.closest('button')) return;
            window.openNotifModal ? window.openNotifModal() : (window.location.href = '/notifications.html');
        };
    }

    updateBadge() {
        // Handle notification dot in dashboard
        const dot = document.getElementById('notifDot');
        if (dot) dot.style.display = 'block';

        // Handle numeric badges if they exist
        const badges = document.querySelectorAll('.notification-badge');
        badges.forEach(badge => {
            let count = parseInt(badge.textContent) || 0;
            count++;
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.remove('hidden');
            
            // Animation
            badge.classList.add('scale-125');
            setTimeout(() => badge.classList.remove('scale-125'), 200);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
