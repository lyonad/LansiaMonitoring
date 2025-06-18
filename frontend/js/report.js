// js/report.js - Report functionality

// Global variables
let currentReport = null;
let savedReports = [];

// Initialize report page
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!window.auth.isAuthenticated()) {
        window.location.href = '../../login.html';
        return;
    }

    const user = window.auth.getUser();
    if (user.role !== 'admin') {
        window.location.href = '../user/dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.full_name || user.username;

    // Set default dates
    setDefaultDates();

    // Load initial data
    await loadReportStatistics();
    await loadSavedReports();

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

    // Generate report form
    document.getElementById('generateReportForm').addEventListener('submit', handleGenerateReport);

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

// Set default dates (last 7 days)
function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

// Load report statistics
async function loadReportStatistics() {
    try {
        const response = await window.auth.apiRequest('/reports/statistics');
        
        if (response.success) {
            // Update stats from the report
            updateStatistics(response.data);
        }
        
        // Also load overall stats
        await loadOverallStats();
    } catch (error) {
        console.error('Error loading report statistics:', error);
    }
}

// Load overall statistics
async function loadOverallStats() {
    try {
        // Get total elderly
        const elderlyResponse = await window.auth.apiRequest('/users?role=elderly&limit=1');
        if (elderlyResponse.success) {
            document.getElementById('totalElderly').textContent = elderlyResponse.data.pagination.total;
        }
        
        // Generate a quick report for current week stats
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const statsResponse = await window.auth.apiRequest(`/reports/generate/overall?startDate=${startDate}&endDate=${endDate}`, {
            method: 'POST'
        });
        
        if (statsResponse.success) {
            const stats = statsResponse.data.report.summary;
            
            // Update vital signs count
            document.getElementById('totalVitals').textContent = stats.vitals.total_measurements || '0';
            
            // Update medicine compliance
            const compliance = stats.medication.compliance_rate || 0;
            document.getElementById('medicineCompliance').textContent = `${compliance}%`;
        }
    } catch (error) {
        console.error('Error loading overall stats:', error);
    }
}

// Update statistics display
function updateStatistics(data) {
    // Update total reports
    const totalReports = data.statistics.reduce((sum, stat) => sum + stat.count, 0);
    document.getElementById('totalReports').textContent = totalReports;
}

// Load saved reports
async function loadSavedReports() {
    try {
        const reportType = document.getElementById('reportTypeFilter').value;
        const params = new URLSearchParams({ limit: 10 });
        if (reportType) params.append('reportType', reportType);
        
        const response = await window.auth.apiRequest(`/reports?${params}`);
        
        if (response.success) {
            savedReports = response.data.reports;
            updateReportsTable(savedReports);
        }
    } catch (error) {
        console.error('Error loading saved reports:', error);
        showToast('Gagal memuat laporan tersimpan', 'error');
    }
}

// Update reports table
function updateReportsTable(reports) {
    const tbody = document.getElementById('reportsTableBody');
    
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Tidak ada laporan tersimpan</td></tr>';
        return;
    }
    
    tbody.innerHTML = reports.map(report => {
        // Check if report has valid data
        const hasValidData = report.report_data && 
                           Object.keys(report.report_data).length > 0 && 
                           report.report_data.metadata;
        
        return `
            <tr>
                <td>#${report.id}</td>
                <td><span class="report-type-badge">${formatReportType(report.report_type)}</span></td>
                <td>${formatDateRange(report.start_date, report.end_date)}</td>
                <td>${report.created_by_name || 'Unknown'}</td>
                <td>${formatDateTime(report.created_at)}</td>
                <td>
                    ${hasValidData ? 
                        `<button class="btn btn-sm btn-primary" onclick="viewReport(${report.id})">
                            👁️ Lihat
                        </button>` :
                        `<button class="btn btn-sm btn-secondary" disabled title="Data tidak valid">
                            ❌ Invalid
                        </button>`
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteReport(${report.id})">
                        🗑️ Hapus
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Generate report modal
function showGenerateReportModal() {
    document.getElementById('generateReportModal').style.display = 'flex';
}

function closeGenerateReportModal() {
    document.getElementById('generateReportModal').style.display = 'none';
}

// Handle generate report
async function handleGenerateReport(e) {
    e.preventDefault();
    
    const formData = {
        reportType: document.getElementById('reportType').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };
    
    try {
        showToast('Generating laporan...', 'info');
        
        const response = await window.auth.apiRequest(`/reports/generate/overall?${new URLSearchParams(formData)}`, {
            method: 'POST'
        });
        
        if (response.success) {
            currentReport = response.data.report;
            displayReport(currentReport);
            closeGenerateReportModal();
            showToast('Laporan berhasil dibuat', 'success');
            
            // Show current report section
            document.getElementById('currentReportSection').style.display = 'block';
            
            // Scroll to report
            document.getElementById('currentReportSection').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Gagal membuat laporan', 'error');
    }
}

// Display report
function displayReport(report) {
    const content = document.getElementById('reportContent');
    
    // Validate report structure
    if (!report || !report.metadata) {
        content.innerHTML = '<p class="error">Data laporan tidak valid</p>';
        return;
    }
    
    const { metadata, summary, activities = [], elderlyDetails = [] } = report;
    
    // Safely get period dates
    const startDate = metadata.period?.start || metadata.start_date || 'N/A';
    const endDate = metadata.period?.end || metadata.end_date || 'N/A';
    
    content.innerHTML = `
        <div class="report-container">
            <!-- Report Header -->
            <div class="report-header-info">
                <h1>Laporan Kesehatan Keseluruhan Lansia</h1>
                <div class="report-meta">
                    <p>Periode: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
                    <p>Dibuat: ${formatDateTime(metadata.generatedAt || new Date())}</p>
                    <p>Oleh: ${metadata.generatedBy || 'Admin'}</p>
                </div>
            </div>

            <!-- Executive Summary -->
            <div class="report-summary">
                <h2>Ringkasan Eksekutif</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Total Lansia</span>
                        <span class="summary-value">${summary?.overall?.total_elderly || 0}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Rata-rata Usia</span>
                        <span class="summary-value">${Math.round(summary?.overall?.average_age || 0)} tahun</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Keluarga</span>
                        <span class="summary-value">${summary?.overall?.total_family || 0}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Tenaga Medis</span>
                        <span class="summary-value">${summary?.overall?.total_medical_staff || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Vital Signs Summary -->
            <div class="report-vitals">
                <h2>Ringkasan Tanda Vital</h2>
                <div class="vitals-stats">
                    <div class="stat-group">
                        <h3>Pemeriksaan</h3>
                        <p>Total: ${summary?.vitals?.total_measurements || 0} pemeriksaan</p>
                        <p>Lansia diperiksa: ${summary?.vitals?.elderly_with_vitals || 0} orang</p>
                    </div>
                    <div class="stat-group">
                        <h3>Rata-rata Nilai</h3>
                        <p>Tekanan Darah: ${Math.round(summary?.vitals?.avg_sys || 0)}/${Math.round(summary?.vitals?.avg_dia || 0)} mmHg</p>
                        <p>Detak Jantung: ${Math.round(summary?.vitals?.avg_heart_rate || 0)} bpm</p>
                        <p>Gula Darah: ${Math.round(summary?.vitals?.avg_blood_sugar || 0)} mg/dL</p>
                        <p>Saturasi O2: ${Math.round(summary?.vitals?.avg_oxygen || 0)}%</p>
                    </div>
                    <div class="stat-group critical">
                        <h3>Kondisi Kritis</h3>
                        <p>Tekanan Darah: ${summary?.vitals?.critical?.critical_bp || 0} kasus</p>
                        <p>Detak Jantung: ${summary?.vitals?.critical?.critical_hr || 0} kasus</p>
                        <p>Saturasi O2: ${summary?.vitals?.critical?.critical_oxygen || 0} kasus</p>
                    </div>
                </div>
            </div>

            <!-- Medication Compliance -->
            <div class="report-medication">
                <h2>Kepatuhan Pengobatan</h2>
                <div class="medication-stats">
                    <div class="compliance-chart-container">
                        <canvas id="complianceReportChart"></canvas>
                    </div>
                    <div class="compliance-details">
                        <p>Lansia dengan obat: ${summary?.medication?.elderly_with_medication || 0} orang</p>
                        <p>Total obat aktif: ${summary?.medication?.total_medicines || 0}</p>
                        <p>Tingkat kepatuhan: <strong>${summary?.medication?.compliance_rate || 0}%</strong></p>
                        <p>Diminum: ${summary?.medication?.taken_count || 0}</p>
                        <p>Terlewat: ${summary?.medication?.missed_count || 0}</p>
                    </div>
                </div>
            </div>

            <!-- Appointments Summary -->
            <div class="report-appointments">
                <h2>Jadwal Pemeriksaan</h2>
                <div class="appointment-stats">
                    <p>Total: ${summary?.appointments?.total_appointments || 0} jadwal</p>
                    <p>Terjadwal: ${summary?.appointments?.scheduled || 0}</p>
                    <p>Selesai: ${summary?.appointments?.completed || 0}</p>
                    <p>Dibatalkan: ${summary?.appointments?.cancelled || 0}</p>
                    <p>Terlewat: ${summary?.appointments?.missed || 0}</p>
                </div>
            </div>

            <!-- Activity Summary -->
            <div class="report-activities">
                <h2>Ringkasan Aktivitas</h2>
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>Jenis Aktivitas</th>
                            <th>Jumlah</th>
                            <th>Rata-rata</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.length > 0 ? activities.map(activity => `
                            <tr>
                                <td>${formatActivityType(activity.activity_type)}</td>
                                <td>${activity.count}</td>
                                <td>${Math.round(activity.avg_value || 0)} ${getActivityUnit(activity.activity_type)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3">Tidak ada data aktivitas</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- Elderly Details -->
            <div class="report-elderly-details">
                <h2>Detail Lansia</h2>
                <div class="elderly-table-container">
                    <table class="elderly-details-table">
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Usia</th>
                                <th>Kondisi Medis</th>
                                <th>Obat Aktif</th>
                                <th>Keluarga</th>
                                <th>Vital Terakhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${elderlyDetails.length > 0 ? elderlyDetails.map(elderly => `
                                <tr>
                                    <td>${elderly.full_name}</td>
                                    <td>${elderly.age || '-'} tahun</td>
                                    <td>${elderly.medical_conditions || 'Tidak ada'}</td>
                                    <td>${elderly.activeMedicines || 0}</td>
                                    <td>${elderly.familyMembers?.length || 0}</td>
                                    <td>${elderly.latestVital ? formatDate(elderly.latestVital.measurement_date) : 'Belum ada'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6">Tidak ada data lansia</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Draw compliance chart
    setTimeout(() => {
        if (summary?.medication) {
            drawComplianceChart(summary.medication);
        }
    }, 100);
}

// Draw compliance chart
function drawComplianceChart(medicationData) {
    const ctx = document.getElementById('complianceReportChart');
    if (!ctx || !medicationData) return;
    
    // Destroy existing chart if any
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Diminum', 'Terlewat'],
            datasets: [{
                data: [
                    medicationData.taken_count || 0,
                    medicationData.missed_count || 0
                ],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(231, 76, 60, 0.8)'
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
}

// View saved report
async function viewReport(reportId) {
    try {
        console.log('Viewing report ID:', reportId);
        const response = await window.auth.apiRequest(`/reports/${reportId}`);
        
        if (response.success) {
            // Get report data from response
            currentReport = response.data.report_data;
            
            // Check if report_data exists and has content
            if (!currentReport || Object.keys(currentReport).length === 0) {
                showToast('Laporan tidak memiliki data atau format lama', 'error');
                console.error('Empty or invalid report data for ID:', reportId);
                return;
            }
            
            // Validate report data structure
            if (!currentReport.metadata) {
                // Try to create metadata from report info if missing
                currentReport.metadata = {
                    reportType: response.data.report_type || 'overall',
                    period: {
                        start: response.data.start_date,
                        end: response.data.end_date
                    },
                    generatedAt: response.data.created_at,
                    generatedBy: response.data.created_by_name || 'Admin'
                };
            }
            
            // Ensure all required sections exist
            currentReport.summary = currentReport.summary || {};
            currentReport.activities = currentReport.activities || [];
            currentReport.elderlyDetails = currentReport.elderlyDetails || [];
            
            displayReport(currentReport);
            
            // Show current report section
            document.getElementById('currentReportSection').style.display = 'block';
            
            // Scroll to report
            document.getElementById('currentReportSection').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error viewing report:', error);
        showToast('Gagal memuat laporan. Cek console untuk detail.', 'error');
    }
}

// Delete report
async function deleteReport(reportId) {
    if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
        return;
    }
    
    try {
        console.log('Deleting report ID:', reportId);
        const response = await window.auth.apiRequest(`/reports/${reportId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast('Laporan berhasil dihapus', 'success');
            await loadSavedReports();
        } else {
            showToast(response.message || 'Gagal menghapus laporan', 'error');
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        showToast('Gagal menghapus laporan. Cek console untuk detail.', 'error');
    }
}

// Print report
function printReport() {
    if (!currentReport) return;
    
    window.print();
}

// Export report (placeholder)
function exportReport(format) {
    showToast(`Export ${format.toUpperCase()} akan segera tersedia`, 'info');
}

// Save report (already saved when generated)
function saveReport() {
    showToast('Laporan sudah tersimpan otomatis', 'success');
    loadSavedReports();
}

// Filter reports
function filterReports() {
    loadSavedReports();
}

// Helper functions
function formatReportType(type) {
    const types = {
        'overall': 'Keseluruhan',
        'daily': 'Harian',
        'weekly': 'Mingguan',
        'monthly': 'Bulanan',
        'custom': 'Custom'
    };
    return types[type.toLowerCase()] || type;
}

function formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        
        return date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    } catch (error) {
        return 'N/A';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        
        return date.toLocaleString('id-ID', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'N/A';
    }
}

function formatDateRange(start, end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatActivityType(type) {
    const types = {
        'steps': 'Langkah',
        'sleep': 'Tidur',
        'water': 'Minum Air',
        'exercise': 'Olahraga',
        'meal': 'Makan',
        'medication': 'Obat',
        'social': 'Aktivitas Sosial'
    };
    return types[type] || type;
}

function getActivityUnit(type) {
    const units = {
        'steps': 'langkah',
        'sleep': 'jam',
        'water': 'gelas',
        'exercise': 'menit',
        'meal': 'kali',
        'medication': 'kali',
        'social': 'jam'
    };
    return units[type] || '';
}

// Toast notification
function showToast(message, type = 'info') {
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

// Logout function
async function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        await window.auth.logout();
    }
}