const API_BASE_URL = 'http://localhost:5000/api';

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