// js/profile.js - Profile page functionality

// Global variables
let currentUser = null;
let activityPage = 1;
const activityLimit = 20;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!window.auth.isAuthenticated()) {
        window.location.href = '../../login.html';
        return;
    }

    // Get current user
    currentUser = window.auth.getUser();
    
    // Setup UI based on role
    setupUIForRole();
    
    // Load initial data
    await loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load preferences
    loadPreferences();
});

// Setup UI elements based on user role
function setupUIForRole() {
    const role = currentUser.role;
    
    // Show/hide role-specific elements
    if (role === 'elderly') {
        document.getElementById('emergencyTab').style.display = 'block';
        document.getElementById('medicalInfoSection').style.display = 'block';
        document.getElementById('allergiesSection').style.display = 'block';
    }
    
    if (role === 'family') {
        document.getElementById('elderlyCountCard').style.display = 'block';
    }
    
    if (role === 'admin') {
        document.getElementById('navUsers').style.display = 'block';
    }
    
    // Update role badge styling
    const roleElement = document.getElementById('profileRole');
    roleElement.className = `profile-role badge badge-${role}`;
}

// Load profile data
async function loadProfileData() {
    try {
        // Get detailed user profile
        const response = await window.auth.apiRequest(`/users/${currentUser.id}`);
        
        if (response.success) {
            const userData = response.data;
            
            // Update header
            updateProfileHeader(userData);
            
            // Update form fields
            updateProfileForm(userData);
            
            // Load additional data based on role
            if (userData.role === 'elderly') {
                loadEmergencyContacts();
            }
            
            if (userData.role === 'family' && userData.familyRelations) {
                updateElderlyCount(userData.familyRelations.length);
            }
            
            // Load stats
            loadUserStatistics();
            
            // Load activity
            loadActivityTimeline();
            
            // Load sessions
            loadActiveSessions();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Gagal memuat data profil', 'error');
    }
}

// Update profile header
function updateProfileHeader(userData) {
    document.getElementById('profileName').textContent = userData.full_name || userData.username;
    document.getElementById('profileRole').textContent = getRoleName(userData.role);
    document.getElementById('profileEmail').textContent = userData.email;
    document.getElementById('profilePhone').textContent = userData.phone || '-';
    document.getElementById('profileJoined').textContent = formatDate(userData.created_at);
    
    // Update avatars
    if (userData.profile_image) {
        document.getElementById('profileAvatar').src = `/uploads/${userData.profile_image}`;
        document.getElementById('headerAvatar').src = `/uploads/${userData.profile_image}`;
    }
    
    // Update header username
    document.getElementById('userName').textContent = userData.full_name || userData.username;
}

// Update profile form
function updateProfileForm(userData) {
    document.getElementById('username').value = userData.username;
    document.getElementById('email').value = userData.email;
    document.getElementById('fullName').value = userData.full_name || '';
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('address').value = userData.address || '';
    document.getElementById('dateOfBirth').value = userData.date_of_birth ? userData.date_of_birth.split('T')[0] : '';
    document.getElementById('bloodType').value = userData.blood_type || '';
    
    if (userData.role === 'elderly') {
        document.getElementById('medicalConditions').value = userData.medical_conditions || '';
        document.getElementById('allergies').value = userData.allergies || '';
    }
}

// Load user statistics
async function loadUserStatistics() {
    try {
        const response = await window.auth.apiRequest(`/users/${currentUser.id}/statistics`);
        
        if (response.success) {
            const stats = response.data;
            document.getElementById('statLoginCount').textContent = stats.loginCount || 0;
            document.getElementById('statLastLogin').textContent = stats.lastLogin ? formatRelativeTime(stats.lastLogin) : '-';
            document.getElementById('statActiveDays').textContent = stats.activeDays || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load activity timeline
async function loadActivityTimeline() {
    try {
        const response = await window.auth.apiRequest(
            `/users/${currentUser.id}/activities?page=${activityPage}&limit=${activityLimit}`
        );
        
        if (response.success) {
            const activities = response.data.activities;
            const timeline = document.getElementById('activityTimeline');
            
            if (activityPage === 1) {
                timeline.innerHTML = '';
            }
            
            if (activities.length === 0 && activityPage === 1) {
                timeline.innerHTML = '<p>Belum ada aktivitas</p>';
                return;
            }
            
            activities.forEach(activity => {
                const activityItem = createActivityItem(activity);
                timeline.appendChild(activityItem);
            });
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// Create activity item element
function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const time = document.createElement('div');
    time.className = 'activity-time';
    time.textContent = formatDateTime(activity.created_at);
    
    const content = document.createElement('div');
    content.className = 'activity-content';
    content.innerHTML = `
        <strong>${getActivityIcon(activity.action)} ${getActivityTitle(activity.action)}</strong>
        <p>${activity.description || ''}</p>
    `;
    
    item.appendChild(time);
    item.appendChild(content);
    
    return item;
}

// Load active sessions
async function loadActiveSessions() {
    try {
        const response = await window.auth.apiRequest('/auth/sessions');
        
        if (response.success) {
            const sessions = response.data;
            const sessionList = document.getElementById('sessionList');
            
            sessionList.innerHTML = '';
            
            if (sessions.length === 0) {
                sessionList.innerHTML = '<p>Tidak ada sesi aktif</p>';
                return;
            }
            
            sessions.forEach((session, index) => {
                const sessionItem = createSessionItem(session, index === 0);
                sessionList.appendChild(sessionItem);
            });
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        document.getElementById('sessionList').innerHTML = '<p>Gagal memuat sesi</p>';
    }
}

// Create session item element
function createSessionItem(session, isCurrent) {
    const item = document.createElement('div');
    item.className = `session-item ${isCurrent ? 'session-current' : ''}`;
    
    item.innerHTML = `
        <div>
            <strong>${session.user_agent || 'Unknown Device'}</strong>
            <p>${session.ip || 'Unknown IP'} • ${formatDateTime(session.created_at)}</p>
            ${isCurrent ? '<span class="badge badge-info">Sesi Saat Ini</span>' : ''}
        </div>
        ${!isCurrent ? `<button class="btn btn-small btn-delete" onclick="revokeSession('${session.id}')">Hapus</button>` : ''}
    `;
    
    return item;
}

// Load emergency contacts
async function loadEmergencyContacts() {
    try {
        const response = await window.auth.apiRequest(`/users/${currentUser.id}/emergency-contacts`);
        
        if (response.success) {
            const contacts = response.data;
            const contactsList = document.getElementById('emergencyContactsList');
            
            contactsList.innerHTML = '';
            
            if (contacts.length === 0) {
                contactsList.innerHTML = '<p>Belum ada kontak darurat</p>';
                return;
            }
            
            contacts.forEach(contact => {
                const contactItem = createEmergencyContactItem(contact);
                contactsList.appendChild(contactItem);
            });
        }
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

// Create emergency contact item
function createEmergencyContactItem(contact) {
    const item = document.createElement('div');
    item.className = 'emergency-contact-item';
    
    item.innerHTML = `
        <div>
            <strong>${contact.contact_name}</strong>
            <p>📱 ${contact.contact_phone} • ${contact.relationship || 'Kontak'}</p>
            <span class="badge">Prioritas ${contact.priority}</span>
        </div>
        <div class="action-buttons">
            <button class="btn btn-small btn-edit" onclick="editEmergencyContact(${contact.id})">✏️</button>
            <button class="btn btn-small btn-delete" onclick="deleteEmergencyContact(${contact.id})">🗑️</button>
        </div>
    `;
    
    return item;
}

// Setup event listeners
function setupEventListeners() {
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
        document.querySelector('.main-content').classList.toggle('sidebar-active');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notifications')) {
            document.getElementById('notificationDropdown').classList.remove('active');
        }
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown').classList.remove('active');
        }
    });
    
    // Profile form submission
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Password form submission
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    
    // Preferences form submission
    document.getElementById('preferencesForm').addEventListener('submit', handlePreferencesUpdate);
    
    // Avatar upload
    document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);
    
    // Password strength checker
    document.getElementById('newPassword').addEventListener('input', checkPasswordStrength);
    
    // Emergency contact form
    if (document.getElementById('emergencyContactForm')) {
        document.getElementById('emergencyContactForm').addEventListener('submit', handleEmergencyContactSubmit);
    }
    
    // 2FA toggle
    document.getElementById('toggle2FA').addEventListener('click', toggle2FA);
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('email').value,
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        bloodType: document.getElementById('bloodType').value
    };
    
    // Add medical info for elderly
    if (currentUser.role === 'elderly') {
        formData.medicalConditions = document.getElementById('medicalConditions').value;
        formData.allergies = document.getElementById('allergies').value;
    }
    
    try {
        const response = await window.auth.apiRequest(`/users/${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showToast('Profil berhasil diperbarui');
            // Reload profile data
            await loadProfileData();
            // Update stored user data
            const updatedUser = { ...currentUser, ...formData };
            window.auth.setUser(updatedUser);
        } else {
            showToast(response.message || 'Gagal memperbarui profil', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Gagal memperbarui profil', 'error');
    }
}

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Clear errors
    clearPasswordErrors();
    
    // Validate
    if (newPassword !== confirmPassword) {
        document.getElementById('confirmPassword-error').textContent = 'Password tidak cocok';
        return;
    }
    
    if (!validatePassword(newPassword)) {
        document.getElementById('newPassword-error').textContent = 'Password tidak memenuhi persyaratan';
        return;
    }
    
    try {
        const response = await window.auth.apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                oldPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        if (response.success) {
            showToast('Password berhasil diubah');
            document.getElementById('passwordForm').reset();
            clearPasswordErrors();
        } else {
            if (response.message.includes('lama')) {
                document.getElementById('currentPassword-error').textContent = response.message;
            } else {
                showToast(response.message || 'Gagal mengubah password', 'error');
            }
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Gagal mengubah password', 'error');
    }
}

// Handle avatar upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast('Ukuran file maksimal 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.auth.getToken()}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Foto profil berhasil diperbarui');
            // Update avatars
            const avatarUrl = `/uploads/${data.data.filename}`;
            document.getElementById('profileAvatar').src = avatarUrl;
            document.getElementById('headerAvatar').src = avatarUrl;
            
            // Update stored user data
            currentUser.profile_image = data.data.filename;
            window.auth.setUser(currentUser);
        } else {
            showToast(data.message || 'Gagal mengupload foto', 'error');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast('Gagal mengupload foto', 'error');
    }
}

// Handle preferences update
async function handlePreferencesUpdate(e) {
    e.preventDefault();
    
    const preferences = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        pushNotifications: document.getElementById('pushNotifications').checked,
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value
    };
    
    try {
        const response = await window.auth.apiRequest('/users/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
        
        if (response.success) {
            showToast('Preferensi berhasil disimpan');
            // Apply theme immediately
            applyTheme(preferences.theme);
        } else {
            showToast('Gagal menyimpan preferensi', 'error');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Gagal menyimpan preferensi', 'error');
    }
}

// Load user preferences
async function loadPreferences() {
    try {
        const response = await window.auth.apiRequest('/users/preferences');
        
        if (response.success && response.data) {
            const prefs = response.data;
            document.getElementById('emailNotifications').checked = prefs.email_notifications || false;
            document.getElementById('smsNotifications').checked = prefs.sms_notifications || false;
            document.getElementById('pushNotifications').checked = prefs.push_notifications || false;
            document.getElementById('theme').value = prefs.theme || 'light';
            document.getElementById('language').value = prefs.language || 'id';
            
            // Apply theme
            applyTheme(prefs.theme || 'light');
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Password validation
function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };
    
    return Object.values(requirements).every(req => req === true);
}

// Check password strength
function checkPasswordStrength(e) {
    const password = e.target.value;
    
    const requirements = {
        'length-req': password.length >= 8,
        'uppercase-req': /[A-Z]/.test(password),
        'lowercase-req': /[a-z]/.test(password),
        'number-req': /[0-9]/.test(password),
        'special-req': /[!@#$%^&*]/.test(password)
    };
    
    Object.entries(requirements).forEach(([id, met]) => {
        const element = document.getElementById(id);
        if (met) {
            element.style.color = 'var(--success-color)';
            element.innerHTML = '✓ ' + element.textContent.replace('✓ ', '');
        } else {
            element.style.color = 'var(--danger-color)';
            element.innerHTML = element.textContent.replace('✓ ', '');
        }
    });
}

// Emergency contact functions
async function addEmergencyContact() {
    document.getElementById('emergencyContactModal').style.display = 'flex';
    document.getElementById('emergencyContactForm').reset();
}

async function handleEmergencyContactSubmit(e) {
    e.preventDefault();
    
    const formData = {
        contactName: document.getElementById('contactName').value,
        contactPhone: document.getElementById('contactPhone').value,
        relationship: document.getElementById('contactRelationship').value,
        priority: document.getElementById('contactPriority').value
    };
    
    try {
        const response = await window.auth.apiRequest(`/users/${currentUser.id}/emergency-contacts`, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showToast('Kontak darurat berhasil ditambahkan');
            closeModal('emergencyContactModal');
            loadEmergencyContacts();
        } else {
            showToast(response.message || 'Gagal menambahkan kontak', 'error');
        }
    } catch (error) {
        console.error('Error adding emergency contact:', error);
        showToast('Gagal menambahkan kontak', 'error');
    }
}

async function deleteEmergencyContact(id) {
    if (!confirm('Yakin ingin menghapus kontak darurat ini?')) return;
    
    try {
        const response = await window.auth.apiRequest(`/users/emergency-contacts/${id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast('Kontak darurat berhasil dihapus');
            loadEmergencyContacts();
        } else {
            showToast('Gagal menghapus kontak', 'error');
        }
    } catch (error) {
        console.error('Error deleting emergency contact:', error);
        showToast('Gagal menghapus kontak', 'error');
    }
}

// Session management
async function refreshSessions() {
    await loadActiveSessions();
    showToast('Sesi berhasil dimuat ulang');
}

async function revokeSession(sessionId) {
    if (!confirm('Yakin ingin menghapus sesi ini?')) return;
    
    try {
        const response = await window.auth.apiRequest(`/auth/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast('Sesi berhasil dihapus');
            loadActiveSessions();
        } else {
            showToast('Gagal menghapus sesi', 'error');
        }
    } catch (error) {
        console.error('Error revoking session:', error);
        showToast('Gagal menghapus sesi', 'error');
    }
}

// 2FA functions
async function toggle2FA() {
    const button = document.getElementById('toggle2FA');
    const isEnabled = button.textContent === 'Nonaktifkan';
    
    if (isEnabled) {
        // Disable 2FA
        if (!confirm('Yakin ingin menonaktifkan 2FA? Ini akan mengurangi keamanan akun Anda.')) return;
        
        try {
            const response = await window.auth.apiRequest('/auth/2fa/disable', {
                method: 'POST'
            });
            
            if (response.success) {
                showToast('2FA berhasil dinonaktifkan');
                button.textContent = 'Aktifkan';
            }
        } catch (error) {
            showToast('Gagal menonaktifkan 2FA', 'error');
        }
    } else {
        // Enable 2FA - show setup modal
        try {
            const response = await window.auth.apiRequest('/auth/2fa/setup', {
                method: 'POST'
            });
            
            if (response.success) {
                // Show QR code
                document.getElementById('qrCode').innerHTML = `<img src="${response.data.qrCode}" alt="2FA QR Code">`;
                document.getElementById('manualCode').value = response.data.secret;
                document.getElementById('twoFAModal').style.display = 'flex';
            }
        } catch (error) {
            showToast('Gagal memulai setup 2FA', 'error');
        }
    }
}

async function verify2FA() {
    const code = document.getElementById('verificationCode').value;
    
    if (!code || code.length !== 6) {
        showToast('Masukkan kode 6 digit', 'error');
        return;
    }
    
    try {
        const response = await window.auth.apiRequest('/auth/2fa/verify', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
        
        if (response.success) {
            showToast('2FA berhasil diaktifkan');
            closeModal('twoFAModal');
            document.getElementById('toggle2FA').textContent = 'Nonaktifkan';
        } else {
            showToast('Kode verifikasi salah', 'error');
        }
    } catch (error) {
        showToast('Gagal verifikasi 2FA', 'error');
    }
}

// Helper functions
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function cancelEdit() {
    if (confirm('Batal mengubah profil?')) {
        loadProfileData();
    }
}

function loadMoreActivity() {
    activityPage++;
    loadActivityTimeline();
}

function clearPasswordErrors() {
    document.getElementById('currentPassword-error').textContent = '';
    document.getElementById('newPassword-error').textContent = '';
    document.getElementById('confirmPassword-error').textContent = '';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toastMessage.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    
    return formatDate(dateString);
}

function getRoleName(role) {
    const roles = {
        admin: 'Administrator',
        family: 'Keluarga',
        elderly: 'Lansia',
        medical: 'Tenaga Medis'
    };
    return roles[role] || role;
}

function getActivityIcon(action) {
    const icons = {
        LOGIN: '🔑',
        LOGOUT: '🚪',
        UPDATE_PROFILE: '👤',
        UPDATE_PASSWORD: '🔐',
        CREATE_USER: '➕',
        UPDATE_USER: '✏️',
        DELETE_USER: '🗑️',
        default: '📋'
    };
    return icons[action] || icons.default;
}

function getActivityTitle(action) {
    const titles = {
        LOGIN: 'Login',
        LOGOUT: 'Logout',
        UPDATE_PROFILE: 'Update Profil',
        UPDATE_PASSWORD: 'Ganti Password',
        CREATE_USER: 'Membuat User',
        UPDATE_USER: 'Update User',
        DELETE_USER: 'Hapus User',
        default: 'Aktivitas'
    };
    return titles[action] || titles.default;
}

function updateElderlyCount(count) {
    document.getElementById('statElderlyCount').textContent = count;
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
}

function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

function logout() {
    if (window.auth && window.auth.logout) {
        window.auth.logout();
    }
}

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';