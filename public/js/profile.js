const profileManager = {
    async requestWithAuth(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login first');
        }

        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
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

    async loadProfile() {
        try {
            const profile = await this.requestWithAuth('/users/profile');
            this.displayProfile(profile);
        } catch (error) {
            console.error('Profile load failed:', error);
            this.showMessage(error.message, 'error');
            // Fallback: try to populate from localStorage.user if available
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const userObj = JSON.parse(stored);
                    // normalize field names if necessary
                    const fallback = {
                        username: userObj.username || userObj.userName || '',
                        email: userObj.email || '',
                        firstName: userObj.firstName || userObj.first_name || '',
                        lastName: userObj.lastName || userObj.last_name || '',
                        phone: userObj.phone || '',
                        address: userObj.address || '',
                        createdAt: userObj.createdAt || userObj.created_at || new Date().toISOString()
                    };
                    this.displayProfile(fallback);
                    this.showMessage('Showing cached profile data (offline)', 'error');
                } catch (e) {
                    console.error('Failed to parse localStorage.user', e);
                }
            }
        }
    },

    displayProfile(profile) {
        // View mode
        document.getElementById('viewUsername').textContent = profile.username;
        document.getElementById('viewEmail').textContent = profile.email;
        document.getElementById('viewName').textContent = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Not set';
        document.getElementById('viewPhone').textContent = profile.phone || 'Not set';
        document.getElementById('viewAddress').textContent = profile.address || 'Not set';
        document.getElementById('viewCreatedAt').textContent = new Date(profile.createdAt).toLocaleDateString();

        // Edit mode
        // Edit mode
        document.getElementById('editUsername').value = profile.username || '';
        document.getElementById('editEmail').value = profile.email;
        document.getElementById('editFirstName').value = profile.firstName || '';
        document.getElementById('editLastName').value = profile.lastName || '';
        document.getElementById('editPhone').value = profile.phone || '';
        document.getElementById('editAddress').value = profile.address || '';
    },

    async updateProfile(profileData) {
        try {
            const updatedProfile = await this.requestWithAuth('/users/profile', {
                method: 'PUT',
                body: profileData
            });
            this.showMessage('Profile updated successfully!', 'success');
            this.displayProfile(updatedProfile);

            // Update localStorage user so nav shows updated name
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const userObj = JSON.parse(stored);
                    const merged = { ...userObj, ...updatedProfile };
                    localStorage.setItem('user', JSON.stringify(merged));
                    // update nav welcome if present
                    const welcome = document.getElementById('userWelcome');
                    if (welcome) welcome.textContent = 'Welcome, ' + merged.username;
                } catch (e) {
                    // ignore parse errors
                }
            }
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    },

    async deleteProfile() {
        try {
            await this.requestWithAuth('/users/profile', {
                method: 'DELETE'
            });
            this.showMessage('Account deleted successfully', 'success');
            
            // Clear local storage and redirect to home
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    },

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
};

// Edit form submission
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    profileManager.showMessage('New password and confirmation do not match', 'error');
                    return;
                }
            }

            const formData = {
                username: document.getElementById('editUsername').value,
                email: document.getElementById('editEmail').value,
                firstName: document.getElementById('editFirstName').value,
                lastName: document.getElementById('editLastName').value,
                phone: document.getElementById('editPhone').value,
                address: document.getElementById('editAddress').value
            };

            if (oldPassword && newPassword) {
                formData.oldPassword = oldPassword;
                formData.newPassword = newPassword;
            }

            profileManager.updateProfile(formData);
        });
    }
});

// Confirm deletion function
function confirmDelete() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone!')) {
        profileManager.deleteProfile();
    }
}