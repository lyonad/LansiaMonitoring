// js/monitoring.js - Monitoring functionality

// Global variables
let autoRefreshInterval = null;
let isAutoRefresh = true;
let complianceChart = null;
let trendsChart = null;
let currentAlerts = [];
let elderlyList = [];

// Initialize monitoring
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!window.auth.isAuthenticated()) {
        window.location.href = '../../login.html';
        return;
    }

    const user = window.auth.getUser();
    if (user.role !== 'admin' && user.role !== 'medical') {
        window.location.href = '../user/dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.full_name || user.username;

    // Initialize charts
    initializeCharts();

    // Load initial data
    await loadMonitoringDashboard();
    await loadElderlyList();

    // Start auto refresh
    startAutoRefresh();

    // Setup event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
        document.querySelector('.main-content').classList.toggle('sidebar-active');
    });

    // Create alert form
    document.getElementById('createAlertForm').addEventListener('submit', handleCreateAlert);

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notifications')) {
            document.getElementById('notificationDropdown').classList.remove('active');
        }
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown').classList.remove('active');
        }
    });
}

// Load monitoring dashboard data
async function loadMonitoringDashboard() {
    try {
        const response = await window.auth.apiRequest('/monitoring/dashboard');
        
        if (response.success) {
            const { alertCounts, vitalViolations, inactiveElderly, medicationStats } = response.data;
            
            // Update alert counts
            updateAlertCounts(alertCounts);
            
            // Update vital violations
            updateVitalViolations(vitalViolations);
            
            // Update inactive elderly
            updateInactiveElderly(inactiveElderly);
            
            // Update medication stats
            updateMedicationStats(medicationStats);
            
            // Load alerts
            await loadAlerts();
            
            // Load real-time data
            await loadRealTimeData();
        }
    } catch (error) {
        console.error('Error loading monitoring dashboard:', error);
        showToast('Gagal memuat data monitoring', 'error');
    }
}

// Update alert counts
function updateAlertCounts(alertCounts) {
    // Reset counts
    document.getElementById('criticalCount').textContent = '0';
    document.getElementById('highCount').textContent = '0';
    document.getElementById('mediumCount').textContent = '0';
    document.getElementById('lowCount').textContent = '0';
    
    // Update counts
    alertCounts.forEach(alert => {
        const countElement = document.getElementById(`${alert.alert_type}Count`);
        if (countElement) {
            countElement.textContent = alert.count;
        }
    });
}

// Update vital violations
function updateVitalViolations(violations) {
    const container = document.getElementById('vitalViolations');
    
    if (violations.length === 0) {
        container.innerHTML = '<p class="no-data">Tidak ada pelanggaran batas vital</p>';
        return;
    }
    
    container.innerHTML = violations.map(v => `
        <div class="violation-item ${v.status}">
            <div class="violation-header">
                <span class="elderly-name">${v.elderly_name}</span>
                <span class="violation-time">${formatTime(v.measurement_date)}</span>
            </div>
            <div class="violation-details">
                ${v.blood_pressure_sys ? `
                    <div class="vital-item ${isVitalCritical('bp_sys', v) ? 'critical' : ''}">
                        <span class="vital-label">Tekanan Darah:</span>
                        <span class="vital-value">${v.blood_pressure_sys}/${v.blood_pressure_dia} mmHg</span>
                    </div>
                ` : ''}
                ${v.heart_rate ? `
                    <div class="vital-item ${isVitalCritical('hr', v) ? 'critical' : ''}">
                        <span class="vital-label">Detak Jantung:</span>
                        <span class="vital-value">${v.heart_rate} bpm</span>
                    </div>
                ` : ''}
                ${v.oxygen_saturation ? `
                    <div class="vital-item ${v.oxygen_saturation < v.oxygen_min ? 'critical' : ''}">
                        <span class="vital-label">Saturasi Oksigen:</span>
                        <span class="vital-value">${v.oxygen_saturation}%</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Check if vital is critical
function isVitalCritical(type, vital) {
    switch(type) {
        case 'bp_sys':
            return vital.blood_pressure_sys > vital.sys_max || vital.blood_pressure_sys < vital.sys_min;
        case 'bp_dia':
            return vital.blood_pressure_dia > vital.dia_max || vital.blood_pressure_dia < vital.dia_min;
        case 'hr':
            return vital.heart_rate > vital.heart_rate_max || vital.heart_rate < vital.heart_rate_min;
        default:
            return false;
    }
}

// Update inactive elderly
function updateInactiveElderly(inactiveList) {
    const container = document.getElementById('inactiveElderly');
    
    if (inactiveList.length === 0) {
        container.innerHTML = '<p class="no-data">Semua lansia aktif dipantau</p>';
        return;
    }
    
    container.innerHTML = inactiveList.map(elderly => `
        <div class="inactive-card">
            <div class="inactive-header">
                <h4>${elderly.full_name}</h4>
                <span class="days-inactive">${elderly.days_since_last || 'Belum pernah'} hari</span>
            </div>
            <div class="inactive-info">
                <p>📱 ${elderly.phone || 'Tidak ada telepon'}</p>
                <p>📅 Terakhir: ${elderly.last_measurement ? formatDate(elderly.last_measurement) : 'Belum ada data'}</p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="contactElderly(${elderly.id})">
                Hubungi
            </button>
        </div>
    `).join('');
}

// Update medication stats
function updateMedicationStats(stats) {
    if (!stats) {
        stats = {
            compliance_rate: 0,
            taken_count: 0,
            missed_count: 0,
            postponed_count: 0
        };
    }
    
    // Update text stats
    document.getElementById('complianceRate').textContent = `${stats.compliance_rate || 0}%`;
    document.getElementById('takenCount').textContent = stats.taken_count || 0;
    document.getElementById('missedCount').textContent = stats.missed_count || 0;
    
    // Update chart
    if (complianceChart) {
        complianceChart.data.datasets[0].data = [
            stats.taken_count || 0,
            stats.missed_count || 0,
            stats.postponed_count || 0
        ];
        complianceChart.update();
    }
}

// Load alerts
async function loadAlerts() {
    try {
        const alertType = document.getElementById('alertTypeFilter').value;
        const category = document.getElementById('categoryFilter').value;
        
        const params = new URLSearchParams({
            isDismissed: 'false',
            limit: 20
        });
        
        if (alertType) params.append('alertType', alertType);
        if (category) params.append('category', category);
        
        const response = await window.auth.apiRequest(`/monitoring/alerts?${params}`);
        
        if (response.success) {
            currentAlerts = response.data.alerts;
            updateAlertsTable(currentAlerts);
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Update alerts table
function updateAlertsTable(alerts) {
    const tbody = document.getElementById('alertsTableBody');
    
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Tidak ada alert aktif</td></tr>';
        return;
    }
    
    tbody.innerHTML = alerts.map(alert => `
        <tr class="alert-row ${alert.alert_type}">
            <td>${formatDateTime(alert.created_at)}</td>
            <td>${alert.elderly_name}</td>
            <td><span class="alert-badge ${alert.alert_type}">${alert.alert_type.toUpperCase()}</span></td>
            <td>${formatCategory(alert.category)}</td>
            <td>${alert.message}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="dismissAlert(${alert.id})">
                    ✓ Dismiss
                </button>
            </td>
        </tr>
    `).join('');
}

// Load real-time data
async function loadRealTimeData() {
    try {
        const response = await window.auth.apiRequest('/monitoring/real-time');
        
        if (response.success) {
            updateLiveFeed(response.data);
        }
    } catch (error) {
        console.error('Error loading real-time data:', error);
    }
}

// Update live feed
function updateLiveFeed(data) {
    const feedContainer = document.getElementById('liveFeed');
    const allEvents = [];
    
    // Process vital signs
    data.latestVitals.forEach(vital => {
        allEvents.push({
            time: new Date(vital.measurement_date),
            type: 'vital',
            icon: '💓',
            title: `Vital Signs - ${vital.elderly_name}`,
            details: `TD: ${vital.blood_pressure_sys}/${vital.blood_pressure_dia}, HR: ${vital.heart_rate}`,
            recorder: vital.recorded_by_name
        });
    });
    
    // Process activities
    data.latestActivities.forEach(activity => {
        allEvents.push({
            time: new Date(activity.activity_date),
            type: 'activity',
            icon: getActivityIcon(activity.activity_type),
            title: `${formatActivityType(activity.activity_type)} - ${activity.elderly_name}`,
            details: `${activity.value} ${activity.unit}`,
            recorder: activity.recorded_by_name
        });
    });
    
    // Process medicine logs
    data.latestMedicineLogs.forEach(log => {
        allEvents.push({
            time: new Date(log.taken_at),
            type: 'medicine',
            icon: '💊',
            title: `Obat ${formatMedicineStatus(log.status)} - ${log.elderly_name}`,
            details: `${log.medicine_name} ${log.dosage}`,
            recorder: log.marked_by_name
        });
    });
    
    // Sort by time (newest first)
    allEvents.sort((a, b) => b.time - a.time);
    
    // Display events
    if (allEvents.length === 0) {
        feedContainer.innerHTML = '<p class="no-data">Tidak ada aktivitas terkini</p>';
        return;
    }
    
    feedContainer.innerHTML = allEvents.slice(0, 10).map(event => `
        <div class="feed-item ${event.type}">
            <div class="feed-icon">${event.icon}</div>
            <div class="feed-content">
                <div class="feed-header">
                    <span class="feed-title">${event.title}</span>
                    <span class="feed-time">${getRelativeTime(event.time)}</span>
                </div>
                <p class="feed-details">${event.details}</p>
                <p class="feed-recorder">Oleh: ${event.recorder || 'System'}</p>
            </div>
        </div>
    `).join('');
}

// Initialize charts
function initializeCharts() {
    // Compliance chart
    const complianceCtx = document.getElementById('complianceChart').getContext('2d');
    complianceChart = new Chart(complianceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Diminum', 'Terlewat', 'Ditunda'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(241, 196, 15, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Trends chart
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    trendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// Load elderly list
async function loadElderlyList() {
    try {
        const response = await window.auth.apiRequest('/users?role=elderly&limit=100');
        
        if (response.success) {
            elderlyList = response.data.users;
            
            // Populate select options
            const alertSelect = document.getElementById('alertElderly');
            const trendSelect = document.getElementById('trendElderlySelect');
            
            elderlyList.forEach(elderly => {
                const option = `<option value="${elderly.id}">${elderly.full_name}</option>`;
                alertSelect.innerHTML += option;
                trendSelect.innerHTML += option;
            });
            
            // Load initial trends
            loadVitalTrends();
        }
    } catch (error) {
        console.error('Error loading elderly list:', error);
    }
}

// Load vital trends
async function loadVitalTrends() {
    try {
        const elderlyId = document.getElementById('trendElderlySelect').value;
        const params = new URLSearchParams({ days: 7 });
        if (elderlyId) params.append('elderlyId', elderlyId);
        
        const response = await window.auth.apiRequest(`/monitoring/trends/vitals?${params}`);
        
        if (response.success) {
            updateTrendsChart(response.data);
        }
    } catch (error) {
        console.error('Error loading vital trends:', error);
    }
}

// Update trends chart
function updateTrendsChart(trendsData) {
    if (!trendsData || trendsData.length === 0) {
        trendsChart.data.labels = [];
        trendsChart.data.datasets = [];
        trendsChart.update();
        return;
    }
    
    // Get unique dates
    const allDates = new Set();
    trendsData.forEach(elderly => {
        elderly.data.forEach(d => allDates.add(d.date));
    });
    const dates = Array.from(allDates).sort();
    
    // Prepare datasets
    const datasets = [];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    
    trendsData.forEach((elderly, index) => {
        // Blood pressure systolic
        datasets.push({
            label: `${elderly.elderly_name} - Sistolik`,
            data: dates.map(date => {
                const dayData = elderly.data.find(d => d.date === date);
                return dayData ? dayData.avg_sys : null;
            }),
            borderColor: colors[index % colors.length],
            backgroundColor: 'transparent',
            tension: 0.1
        });
    });
    
    trendsChart.data.labels = dates.map(d => formatDate(d));
    trendsChart.data.datasets = datasets;
    trendsChart.update();
}

// Auto refresh functions
function startAutoRefresh() {
    if (isAutoRefresh) {
        autoRefreshInterval = setInterval(() => {
            loadRealTimeData();
            loadAlerts();
        }, 30000); // Refresh every 30 seconds
    }
}

function toggleAutoRefresh() {
    isAutoRefresh = !isAutoRefresh;
    document.getElementById('autoRefreshText').textContent = `Auto Refresh: ${isAutoRefresh ? 'ON' : 'OFF'}`;
    document.getElementById('autoRefreshIcon').classList.toggle('rotating', isAutoRefresh);
    
    if (isAutoRefresh) {
        startAutoRefresh();
    } else {
        clearInterval(autoRefreshInterval);
    }
}

// Alert functions
function filterAlerts() {
    loadAlerts();
}

async function dismissAlert(alertId) {
    if (confirm('Apakah Anda yakin ingin dismiss alert ini?')) {
        try {
            const response = await window.auth.apiRequest(`/monitoring/alerts/${alertId}/dismiss`, {
                method: 'PUT'
            });
            
            if (response.success) {
                showToast('Alert berhasil di-dismiss', 'success');
                loadMonitoringDashboard();
            }
        } catch (error) {
            console.error('Error dismissing alert:', error);
            showToast('Gagal dismiss alert', 'error');
        }
    }
}

// Create alert modal functions
function showCreateAlertModal() {
    document.getElementById('createAlertModal').style.display = 'flex';
}

function closeCreateAlertModal() {
    document.getElementById('createAlertModal').style.display = 'none';
    document.getElementById('createAlertForm').reset();
    document.getElementById('actionDescGroup').style.display = 'none';
}

function toggleActionDescription() {
    const isChecked = document.getElementById('requiresAction').checked;
    document.getElementById('actionDescGroup').style.display = isChecked ? 'block' : 'none';
}

async function handleCreateAlert(e) {
    e.preventDefault();
    
    const formData = {
        elderlyId: document.getElementById('alertElderly').value,
        alertType: document.getElementById('alertType').value,
        category: document.getElementById('alertCategory').value,
        message: document.getElementById('alertMessage').value,
        requiresAction: document.getElementById('requiresAction').checked,
        actionDescription: document.getElementById('actionDescription').value
    };
    
    try {
        const response = await window.auth.apiRequest('/monitoring/alerts', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showToast('Alert berhasil dibuat', 'success');
            closeCreateAlertModal();
            loadMonitoringDashboard();
        }
    } catch (error) {
        console.error('Error creating alert:', error);
        showToast('Gagal membuat alert', 'error');
    }
}

// Helper functions
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatCategory(category) {
    const categories = {
        'vital_signs': 'Vital Signs',
        'medication': 'Obat',
        'appointment': 'Jadwal',
        'activity': 'Aktivitas',
        'other': 'Lainnya'
    };
    return categories[category] || category;
}

function formatActivityType(type) {
    const types = {
        'steps': 'Langkah',
        'sleep': 'Tidur',
        'water': 'Minum Air',
        'exercise': 'Olahraga',
        'meal': 'Makan',
        'social': 'Sosial'
    };
    return types[type] || type;
}

function formatMedicineStatus(status) {
    const statuses = {
        'taken': 'Diminum',
        'missed': 'Terlewat',
        'postponed': 'Ditunda',
        'skipped': 'Dilewati'
    };
    return statuses[status] || status;
}

function getActivityIcon(type) {
    const icons = {
        'steps': '🚶',
        'sleep': '😴',
        'water': '💧',
        'exercise': '🏃',
        'meal': '🍽️',
        'social': '👥'
    };
    return icons[type] || '📊';
}

function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return formatDateTime(date);
}

// Toast notification
function showToast(message, type = 'info') {
    // Implementation sama dengan dashboard.js
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Notification functions
function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Contact elderly placeholder
function contactElderly(elderlyId) {
    // This would implement actual contact functionality
    showToast('Fitur kontak akan segera tersedia', 'info');
}

// Refresh vital violations
function refreshVitalViolations() {
    loadMonitoringDashboard();
    showToast('Data vital diperbarui', 'success');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});