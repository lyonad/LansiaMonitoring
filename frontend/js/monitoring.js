// js/monitoring.js - Monitoring page functionality

// Global variables
let currentElderlyId = null;
let vitalSignsChart = null;
let activityChart = null;
let currentMonitoringData = null;

// Initialize monitoring page
function initMonitoring() {
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
    
    // Load elderly list
    loadElderlyList();
    
    // Setup event listeners
    setupEventListeners();
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

    // Search elderly
    document.getElementById('elderlySearch').addEventListener('input', function(e) {
        const search = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.elderly-item');
        
        items.forEach(item => {
            const name = item.querySelector('.elderly-name').textContent.toLowerCase();
            if (name.includes(search)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Form submissions
    setupFormHandlers();
}

// Setup form handlers
function setupFormHandlers() {
    // Add alert form
    document.getElementById('addAlertForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddAlert();
    });

    // Add vitals form
    document.getElementById('addVitalsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddVitals();
    });

    // Add activity form
    document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddActivity();
    });
}

// Load elderly list
async function loadElderlyList() {
    try {
        const response = await window.auth.apiRequest('/monitoring/elderly-list');
        
        if (response.success) {
            displayElderlyList(response.data);
        }
    } catch (error) {
        console.error('Error loading elderly list:', error);
        displayElderlyList([]);
    }
}

// Display elderly list
function displayElderlyList(elderlyList) {
    const container = document.getElementById('elderlyListContainer');
    container.innerHTML = '';

    if (elderlyList.length === 0) {
        container.innerHTML = '<p class="text-center">Tidak ada data lansia</p>';
        return;
    }

    elderlyList.forEach(elderly => {
        const item = document.createElement('div');
        item.className = 'elderly-item';
        item.onclick = () => selectElderly(elderly.id);
        item.innerHTML = `
            <div class="elderly-name">${elderly.full_name}</div>
            <div class="elderly-info">
                <div>📱 ${elderly.phone || 'Tidak ada'}</div>
                <div>👨‍👩‍👧 ${elderly.family_count || 0} Keluarga</div>
                <div>🕒 Update: ${elderly.last_vitals || 'Belum ada'}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Select elderly
async function selectElderly(elderlyId) {
    currentElderlyId = elderlyId;
    
    // Update active state
    document.querySelectorAll('.elderly-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Load monitoring data
    await loadMonitoringData(elderlyId);
}

// Load monitoring data
async function loadMonitoringData(elderlyId) {
    try {
        const response = await window.auth.apiRequest(`/monitoring/elderly/${elderlyId}`);
        
        if (response.success) {
            currentMonitoringData = response.data;
            displayMonitoringData(response.data);
        }
    } catch (error) {
        console.error('Error loading monitoring data:', error);
        document.getElementById('monitoringContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Error Loading Data</h3>
                <p>Gagal memuat data monitoring. Silakan coba lagi.</p>
            </div>
        `;
    }
}

// Display monitoring data
function displayMonitoringData(data) {
    const content = document.getElementById('monitoringContent');
    
    // Store current data for charts
    window.currentMonitoringData = data;
    
    // Generate HTML content
    const hasVitals = data.vitals && (data.vitals.blood_pressure_sys || data.vitals.heart_rate);
    
    let html = generateMonitoringHTML(data, hasVitals);
    content.innerHTML = html;

    // Initialize charts after content is loaded
    setTimeout(() => {
        if (data.health_history && data.health_history.length > 0) {
            initializeVitalSignsChart();
        }
        initializeActivityChart();
    }, 100);
}

// Generate monitoring HTML
function generateMonitoringHTML(data, hasVitals) {
    return `
        <div class="monitoring-header">
            <h3>${data.elderly.full_name}</h3>
            <div class="monitoring-meta">
                <span>🎂 ${data.elderly.age ? data.elderly.age + ' tahun' : 'Usia tidak diketahui'}</span>
                <span>📱 ${data.elderly.phone}</span>
                <span>📍 ${data.elderly.address}</span>
            </div>
        </div>

        <div class="monitoring-tabs">
            <button class="tab-button active" onclick="switchTab('vitals')">Vital Signs</button>
            <button class="tab-button" onclick="switchTab('medications')">Obat-obatan</button>
            <button class="tab-button" onclick="switchTab('activities')">Aktivitas</button>
            <button class="tab-button" onclick="switchTab('alerts')">Alerts</button>
            <button class="tab-button" onclick="switchTab('contacts')">Kontak</button>
        </div>

        ${generateVitalsTab(data, hasVitals)}
        ${generateMedicationsTab(data)}
        ${generateActivitiesTab(data)}
        ${generateAlertsTab(data)}
        ${generateContactsTab(data)}
    `;
}

// Tab generators
function generateVitalsTab(data, hasVitals) {
    return `
        <div id="vitalsTab" class="tab-content active">
            ${hasVitals ? generateVitalsContent(data.vitals) : generateEmptyVitals()}
            ${data.health_history && data.health_history.length > 0 ? generateVitalsChart() : ''}
        </div>
    `;
}

function generateMedicationsTab(data) {
    return `
        <div id="medicationsTab" class="tab-content">
            <h4>Jadwal Obat Hari Ini</h4>
            ${data.medications && data.medications.length > 0 ? 
                generateMedicationsList(data.medications) : 
                generateEmptyMedications()}
        </div>
    `;
}

function generateActivitiesTab(data) {
    return `
        <div id="activitiesTab" class="tab-content">
            <h4>Aktivitas Hari Ini</h4>
            ${data.activities && data.activities.length > 0 ? 
                generateActivitiesList(data.activities) : 
                generateEmptyActivities()}
            <div style="margin-top: var(--spacing-large);">
                <button class="btn btn-primary" onclick="showAddActivityModal(${data.elderly.id})">+ Tambah Aktivitas</button>
            </div>
            <div class="chart-section">
                <h4>Aktivitas Mingguan</h4>
                <div class="chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

function generateAlertsTab(data) {
    return `
        <div id="alertsTab" class="tab-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-medium);">
                <h4>Alerts & Notifikasi</h4>
                <button class="btn btn-primary btn-small" onclick="showAddAlert()">+ Tambah Alert</button>
            </div>
            ${data.alerts && data.alerts.length > 0 ? 
                generateAlertsList(data.alerts) : 
                generateEmptyAlerts()}
        </div>
    `;
}

function generateContactsTab(data) {
    return `
        <div id="contactsTab" class="tab-content">
            <h4>Kontak Keluarga</h4>
            <div class="family-contacts">
                ${data.family_contacts.map(contact => generateContactCard(contact, 'family')).join('')}
            </div>
            
            ${data.emergency_contacts && data.emergency_contacts.length > 0 ? `
                <h4 style="margin-top: var(--spacing-large);">Kontak Darurat</h4>
                <div class="family-contacts">
                    ${data.emergency_contacts.map(contact => generateContactCard(contact, 'emergency')).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Component generators
function generateVitalsContent(vitals) {
    return `
        <h4>Vital Signs Terakhir ${vitals.recorded_at ? `(${new Date(vitals.recorded_at).toLocaleString('id-ID')})` : ''}</h4>
        <div class="vital-signs-grid">
            ${generateVitalCard('Tekanan Darah', `${vitals.blood_pressure_sys}/${vitals.blood_pressure_dia}`, 'bp', vitals.blood_pressure_sys, vitals.blood_pressure_dia)}
            ${vitals.heart_rate ? generateVitalCard('Detak Jantung', `${vitals.heart_rate} bpm`, 'hr', vitals.heart_rate) : ''}
            ${vitals.blood_sugar ? generateVitalCard('Gula Darah', `${vitals.blood_sugar} mg/dL`, 'bs', vitals.blood_sugar) : ''}
            ${vitals.temperature ? generateVitalCard('Suhu Tubuh', `${vitals.temperature}°C`, 'temp', vitals.temperature) : ''}
        </div>
        <div style="margin-top: var(--spacing-large);">
            <button class="btn btn-primary" onclick="showAddVitalsModal(${currentElderlyId})">+ Tambah Data Vital Signs</button>
        </div>
    `;
}

function generateVitalCard(label, value, type, val1, val2) {
    const status = getVitalStatus(type, val1, val2);
    const statusText = getVitalStatusText(type, val1, val2);
    
    return `
        <div class="vital-card">
            <div class="vital-label">${label}</div>
            <div class="vital-value">${value}</div>
            <div class="vital-status status-${status}">${statusText}</div>
        </div>
    `;
}

// Handle form submissions
async function handleAddAlert() {
    const alertData = {
        elderly_id: document.getElementById('alertElderlyId').value,
        alert_type: document.getElementById('alertType').value,
        message: document.getElementById('alertMessage').value
    };

    try {
        const response = await window.auth.apiRequest('/monitoring/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });

        if (response.success) {
            closeModal('addAlertModal');
            showToast('Alert berhasil ditambahkan');
            await loadMonitoringData(currentElderlyId);
        }
    } catch (error) {
        console.error('Error adding alert:', error);
        showToast('Gagal menambahkan alert', 'error');
    }
}

async function handleAddVitals() {
    const vitalsData = {
        blood_pressure_sys: parseInt(document.getElementById('bloodPressureSys').value),
        blood_pressure_dia: parseInt(document.getElementById('bloodPressureDia').value),
        heart_rate: parseInt(document.getElementById('heartRate').value),
        blood_sugar: document.getElementById('bloodSugar').value ? parseFloat(document.getElementById('bloodSugar').value) : null,
        temperature: document.getElementById('temperature').value ? parseFloat(document.getElementById('temperature').value) : null,
        weight: document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : null,
        notes: document.getElementById('vitalsNotes').value
    };

    const elderlyId = document.getElementById('vitalsElderlyId').value;

    try {
        const response = await window.auth.apiRequest(`/monitoring/elderly/${elderlyId}/vitals`, {
            method: 'POST',
            body: JSON.stringify(vitalsData)
        });

        if (response.success) {
            closeModal('addVitalsModal');
            showToast('Data vital signs berhasil ditambahkan');
            await loadMonitoringData(elderlyId);
        }
    } catch (error) {
        console.error('Error adding vital signs:', error);
        showToast('Gagal menambahkan vital signs', 'error');
    }
}

async function handleAddActivity() {
    const activityData = {
        activity_type: document.getElementById('activityType').value,
        value: parseFloat(document.getElementById('activityValue').value),
        unit: document.getElementById('activityUnit').value,
        description: document.getElementById('activityDescription').value
    };

    const elderlyId = document.getElementById('activityElderlyId').value;

    try {
        const response = await window.auth.apiRequest(`/monitoring/elderly/${elderlyId}/activity`, {
            method: 'POST',
            body: JSON.stringify(activityData)
        });

        if (response.success) {
            closeModal('addActivityModal');
            showToast('Aktivitas berhasil ditambahkan');
            await loadMonitoringData(elderlyId);
        }
    } catch (error) {
        console.error('Error adding activity:', error);
        showToast('Gagal menambahkan aktivitas', 'error');
    }
}

// Export functions for global access
window.monitoringFunctions = {
    initMonitoring,
    switchTab,
    showAddAlert,
    showAddVitalsModal,
    showAddActivityModal,
    markMedicineTaken,
    dismissAlert,
    closeModal,
    toggleNotifications,
    toggleUserMenu,
    logout
};