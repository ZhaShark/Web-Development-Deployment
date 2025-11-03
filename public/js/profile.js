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
            this.showMessage(error.message, 'error');
        }
    },

    displayProfile(profile) {
        // View mode
        document.getElementById('viewUsername').textContent = profile.username;
        document.getElementById('viewEmail').textContent = profile.email;
        document.getElementById('viewName').textContent = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Not set';
        document.getElementById('viewPhone').textContent = profile.phone || 'Not set';
        document.getElementById('viewAddress').textContent = profile.address || 'Not set';
        document.getElementById('viewCreatedAt').textContent = new Date(profile.created_at).toLocaleDateString();

        // Edit mode
        document.getElementById('editEmail').value = profile.email;
        document.getElementById('editFirstName').value = profile.first_name || '';
        document.getElementById('editLastName').value = profile.last_name || '';
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
            
            const formData = {
                email: document.getElementById('editEmail').value,
                firstName: document.getElementById('editFirstName').value,
                lastName: document.getElementById('editLastName').value,
                phone: document.getElementById('editPhone').value,
                address: document.getElementById('editAddress').value
            };
            
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