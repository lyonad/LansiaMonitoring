// js/dashboard.js - Dashboard functionality

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get user data
        const user = window.auth.getUser();
        
        // Load different data based on user role
        switch(user.role) {
            case 'elderly':
                await loadElderlyDashboard();
                break;
            case 'family':
                await loadFamilyDashboard();
                break;
            case 'medical':
                await loadMedicalDashboard();
                break;
            case 'admin':
                // Redirect to admin dashboard
                window.location.href = '../admin/dashboard.html';
                break;
        }
        
        // Load notifications
        await loadNotifications();
        
        // Load emergency contacts
        await loadEmergencyContacts();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Gagal memuat dashboard', 'error');
    }
}

// Load elderly dashboard
async function loadElderlyDashboard() {
    try {
        const user = window.auth.getUser();
        
        // Get latest health data
        const healthData = await window.auth.apiRequest(`/health/latest/${user.id}`);
        updateHealthStats(healthData.data);
        
        // Get today's medicine schedule
        const medicineData = await window.auth.apiRequest(`/medicines/user/${user.id}`);
        updateMedicineStats(medicineData.data);
        
        // Get upcoming appointments
        const appointmentData = await window.auth.apiRequest(`/appointments/upcoming/${user.id}`);
        updateAppointmentStats(appointmentData.data);
        
        // Get today's schedule
        const scheduleData = await getTodaySchedule(user.id);
        updateScheduleList(scheduleData);
        
    } catch (error) {
        console.error('Error loading elderly dashboard:', error);
    }
}

// Load family dashboard
async function loadFamilyDashboard() {
    try {
        // Get linked elderly
        const elderlyData = await window.auth.apiRequest('/users/my-elderly');
        
        if (elderlyData.data && elderlyData.data.length > 0) {
            // Load data for first elderly (can add selector for multiple)
            const elderlyId = elderlyData.data[0].id;
            
            // Similar to elderly dashboard but with elderlyId
            const healthData = await window.auth.apiRequest(`/health/latest/${elderlyId}`);
            updateHealthStats(healthData.data);
            
            const medicineData = await window.auth.apiRequest(`/medicines/user/${elderlyId}`);
            updateMedicineStats(medicineData.data);
            
            const appointmentData = await window.auth.apiRequest(`/appointments/upcoming/${elderlyId}`);
            updateAppointmentStats(appointmentData.data);
            
            const scheduleData = await getTodaySchedule(elderlyId);
            updateScheduleList(scheduleData);
        } else {
            // Show message to link elderly
            showNoElderlyMessage();
        }
    } catch (error) {
        console.error('Error loading family dashboard:', error);
    }
}

// Load medical dashboard
async function loadMedicalDashboard() {
    // Medical staff sees multiple patients
    // Implementation depends on requirements
    console.log('Loading medical dashboard...');
}

// Update health statistics display
function updateHealthStats(data) {
    if (!data) return;
    
    // Update blood pressure
    if (data.blood_pressure_systolic && data.blood_pressure_diastolic) {
        const bpValue = `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}`;
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = bpValue;
        
        // Determine status
        let status = 'Normal';
        if (data.blood_pressure_systolic > 140 || data.blood_pressure_diastolic > 90) {
            status = 'Tinggi';
        } else if (data.blood_pressure_systolic < 90 || data.blood_pressure_diastolic < 60) {
            status = 'Rendah';
        }
        document.querySelector('.stat-card:nth-child(1) .stat-label').textContent = `mmHg - ${status}`;
    }
    
    // Update blood sugar
    if (data.blood_sugar_level) {
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = data.blood_sugar_level;
        
        // Determine status
        let status = 'Normal';
        if (data.blood_sugar_level > 125) {
            status = 'Tinggi';
        } else if (data.blood_sugar_level < 70) {
            status = 'Rendah';
        }
        document.querySelector('.stat-card:nth-child(2) .stat-label').textContent = `mg/dL - ${status}`;
    }
}

// Update medicine statistics
function updateMedicineStats(medicines) {
    if (!medicines || medicines.length === 0) return;
    
    // Count today's medicines
    const today = new Date().toISOString().split('T')[0];
    const todayMedicines = medicines.filter(med => med.is_active);
    
    // This would need to check logs for taken medicines
    const taken = 3; // Placeholder
    const total = todayMedicines.length || 5; // Placeholder
    
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = `${taken}/${total}`;
}

// Update appointment statistics
function updateAppointmentStats(appointments) {
    if (!appointments || appointments.length === 0) {
        document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = 'Tidak ada';
        document.querySelector('.stat-card:nth-child(4) .stat-label').textContent = 'Jadwal kosong';
        return;
    }
    
    const nextAppointment = appointments[0];
    const appointmentDate = new Date(nextAppointment.appointment_date);
    const today = new Date();
    
    let dateText = '';
    if (appointmentDate.toDateString() === today.toDateString()) {
        dateText = 'Hari ini';
    } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (appointmentDate.toDateString() === tomorrow.toDateString()) {
            dateText = 'Besok';
        } else {
            dateText = appointmentDate.toLocaleDateString('id-ID', { weekday: 'long' });
        }
    }
    
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = dateText;
    document.querySelector('.stat-card:nth-child(4) .stat-label').textContent = 
        `${nextAppointment.appointment_time} - ${nextAppointment.doctor_name || nextAppointment.title}`;
}

// Get today's schedule
async function getTodaySchedule(userId) {
    // Combine medicines and appointments for today
    const schedule = [];
    
    try {
        // Get medicines
        const medicineData = await window.auth.apiRequest(`/medicines/user/${userId}`);
        if (medicineData.data) {
            medicineData.data.forEach(med => {
                if (med.is_active && med.time_schedule) {
                    schedule.push({
                        time: med.time_schedule,
                        type: 'medicine',
                        title: `Minum Obat - ${med.medicine_name}`,
                        status: 'pending' // Would check logs
                    });
                }
            });
        }
        
        // Get today's appointments
        const today = new Date().toISOString().split('T')[0];
        const appointmentData = await window.auth.apiRequest(`/appointments/user/${userId}`);
        if (appointmentData.data) {
            appointmentData.data
                .filter(apt => apt.appointment_date === today)
                .forEach(apt => {
                    schedule.push({
                        time: apt.appointment_time,
                        type: 'appointment',
                        title: apt.title,
                        status: apt.status
                    });
                });
        }
    } catch (error) {
        console.error('Error getting schedule:', error);
    }
    
    // Sort by time
    return schedule.sort((a, b) => a.time.localeCompare(b.time));
}

// Update schedule list display
function updateScheduleList(schedule) {
    const scheduleList = document.querySelector('.schedule-list');
    scheduleList.innerHTML = '';
    
    if (schedule.length === 0) {
        scheduleList.innerHTML = '<p class="no-schedule">Tidak ada jadwal hari ini</p>';
        return;
    }
    
    schedule.forEach(item => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = `schedule-item ${item.status === 'completed' ? 'completed' : ''}`;
        
        scheduleItem.innerHTML = `
            <div class="schedule-time">${item.time.substring(0, 5)}</div>
            <div class="schedule-content">
                <h4>${item.title}</h4>
                <p>${getStatusText(item.status)}</p>
            </div>
        `;
        
        scheduleList.appendChild(scheduleItem);
    });
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'completed': 'Sudah selesai ✓',
        'taken': 'Sudah diminum ✓',
        'pending': 'Belum dilakukan',
        'scheduled': 'Terjadwal',
        'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
}

// Load notifications
async function loadNotifications() {
    try {
        const notifData = await window.auth.apiRequest('/notifications');
        const unreadCount = await window.auth.apiRequest('/notifications/unread-count');
        
        // Update badge
        const badge = document.getElementById('notificationBadge');
        if (unreadCount.data.unreadCount > 0) {
            badge.textContent = unreadCount.data.unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
        
        // Update notification list
        const notifList = document.querySelector('.notification-list');
        notifList.innerHTML = '';
        
        if (notifData.data.notifications.length === 0) {
            notifList.innerHTML = '<p class="no-notifications">Tidak ada notifikasi</p>';
            return;
        }
        
        notifData.data.notifications.slice(0, 5).forEach(notif => {
            const notifItem = document.createElement('div');
            notifItem.className = `notification-item ${!notif.is_read ? 'unread' : ''}`;
            notifItem.innerHTML = `
                <span class="notification-time">${getRelativeTime(notif.created_at)}</span>
                <p>${notif.message}</p>
            `;
            notifItem.onclick = () => markNotificationAsRead(notif.id);
            notifList.appendChild(notifItem);
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await window.auth.apiRequest(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        await loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Get relative time
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
        return `${minutes} menit lalu`;
    } else if (hours < 24) {
        return `${hours} jam lalu`;
    } else if (days < 7) {
        return `${days} hari lalu`;
    } else {
        return date.toLocaleDateString('id-ID');
    }
}

// Load emergency contacts
async function loadEmergencyContacts() {
    try {
        const user = window.auth.getUser();
        const userId = user.role === 'family' ? 
            (await window.auth.apiRequest('/users/my-elderly')).data[0]?.id : 
            user.id;
            
        if (!userId) return;
        
        const contacts = await window.auth.apiRequest(`/users/${userId}/emergency-contacts`);
        
        const contactsContainer = document.querySelector('.emergency-contacts');
        const existingContacts = contactsContainer.querySelectorAll('.contact-item');
        existingContacts.forEach(contact => contact.remove());
        
        if (contacts.data && contacts.data.length > 0) {
            contacts.data.slice(0, 2).forEach(contact => {
                const contactItem = document.createElement('div');
                contactItem.className = 'contact-item';
                contactItem.innerHTML = `
                    <span class="contact-icon">📞</span>
                    <div class="contact-info">
                        <p class="contact-name">${contact.relationship} - ${contact.contact_name}</p>
                        <p class="contact-phone">${contact.contact_phone}</p>
                    </div>
                `;
                contactsContainer.appendChild(contactItem);
            });
        }
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

// Show no elderly message for family users
function showNoElderlyMessage() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h2>Selamat Datang!</h2>
            <p>Anda belum terhubung dengan akun lansia.</p>
        </div>
        <div class="no-elderly-message">
            <div class="message-card">
                <h3>Hubungkan dengan Lansia</h3>
                <p>Untuk memulai monitoring kesehatan, Anda perlu menghubungkan akun Anda dengan akun lansia yang ingin Anda pantau.</p>
                <button class="btn btn-primary" onclick="location.href='link-elderly.html'">
                    Hubungkan Sekarang
                </button>
            </div>
        </div>
    `;
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Note: Accessibility functions have been moved to accessibility.js

// Export functions for use in HTML
window.dashboard = {
    loadDashboardData,
    showToast
};