// Use a relative API base so the frontend works when accessed from phone or computer
const API_BASE_URL = '/api';

const authAPI = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body) {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
    },

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }
};

window.showLoginModal = function(href) {
    // Prevent multiple modals
    if (document.getElementById('loginModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginModalOverlay';
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.innerHTML = `
        <h3>Please sign in</h3>
        <p>To write a review, please sign in to your account first.</p>
        <div class="modal-actions">
            <button class="btn btn-primary" id="loginModalLogin">Log in</button>
            <button class="btn btn-secondary" id="loginModalView">View reviews</button>
            <button class="btn" id="loginModalCancel">Cancel</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
        const el = document.getElementById('loginModalOverlay');
        if (el) el.remove();
        document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (e.key === 'Escape') closeModal();
    }

    document.getElementById('loginModalCancel').addEventListener('click', closeModal);
    document.getElementById('loginModalLogin').addEventListener('click', function() {
        // Redirect to login page, include next param so user can return
        const next = href ? `?next=${encodeURIComponent(href)}` : '';
        window.location.href = '/login.html' + next;
    });
    document.getElementById('loginModalView').addEventListener('click', function() {
        // Go to the review page in read-only mode (href passed from caller)
        if (href) {
            window.location.href = href;
        } else {
            closeModal();
        }
    });

    document.addEventListener('keydown', onKey);
};