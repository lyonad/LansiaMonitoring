// js/auth.js - Authentication handling

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Get stored token
function getToken() {
    return localStorage.getItem('token');
}

// Set token
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token
function removeToken() {
    localStorage.removeItem('token');
}

// Get user data
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Set user data
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Remove user data
function removeUser() {
    localStorage.removeItem('user');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect based on user role
function redirectToDashboard(role) {
    switch(role) {
        case 'admin':
            window.location.href = 'pages/admin/dashboard.html';
            break;
        case 'family':
        case 'elderly':
        case 'medical':
            window.location.href = 'pages/user/dashboard.html';
            break;
        default:
            window.location.href = 'index.html';
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Clear previous errors
    document.getElementById('username-error').textContent = '';
    document.getElementById('password-error').textContent = '';
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').style.display = 'none';
    loginBtn.querySelector('.btn-loading').style.display = 'inline-block';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Save token and user data
            setToken(data.data.token);
            setUser(data.data.user);
            
            // Show success message
            showAlert('Login berhasil! Mengalihkan...', 'success');
            
            // Redirect after 1 second
            setTimeout(() => {
                redirectToDashboard(data.data.user.role);
            }, 1000);
        } else {
            // Show error message
            if (data.message) {
                showAlert(data.message, 'error');
            } else {
                showAlert('Login gagal. Silakan coba lagi.', 'error');
            }
            
            // Show field-specific errors if available
            if (data.errors) {
                data.errors.forEach(error => {
                    const errorElement = document.getElementById(`${error.field}-error`);
                    if (errorElement) {
                        errorElement.textContent = error.message;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtn.querySelector('.btn-text').style.display = 'inline-block';
        loginBtn.querySelector('.btn-loading').style.display = 'none';
    }
});

// Auto-fill username if remembered
window.addEventListener('DOMContentLoaded', () => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('remember').checked = true;
    }
    
    // Check if already logged in
    if (isAuthenticated()) {
        const user = getUser();
        if (user) {
            redirectToDashboard(user.role);
        }
    }
});

// Handle remember me
document.getElementById('remember').addEventListener('change', (e) => {
    const username = document.getElementById('username').value;
    if (e.target.checked && username) {
        localStorage.setItem('rememberedUsername', username);
    } else {
        localStorage.removeItem('rememberedUsername');
    }
});

// Update remembered username when typing
document.getElementById('username').addEventListener('input', (e) => {
    if (document.getElementById('remember').checked) {
        localStorage.setItem('rememberedUsername', e.target.value);
    }
});

// Logout function (to be used on other pages)
async function logout() {
    try {
        const token = getToken();
        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage
        removeToken();
        removeUser();
        // Redirect to login page with correct path
        window.location.href = window.location.origin + '/LansiaMonitoring/frontend/login.html';
    }
}

// API request helper with authentication
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
        
        // Handle unauthorized
        if (response.status === 401) {
            removeToken();
            removeUser();
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.auth = {
    getToken,
    getUser,
    isAuthenticated,
    logout,
    apiRequest,
    redirectToDashboard
};