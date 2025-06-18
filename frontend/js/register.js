// js/register.js - Registration functionality

// Current step tracking
let currentStep = 1;
const totalSteps = 4;

// Form data storage
let formData = {
    role: '',
    fullName: '',
    dateOfBirth: '',
    phone: '',
    bloodType: '',
    address: '',
    medicalConditions: '',
    allergies: '',
    preferredHospital: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    licenseNumber: '',
    specialization: '',
    workplace: '',
    username: '',
    email: '',
    password: ''
};

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize password strength checker
    initPasswordStrength();
    
    // Show first step
    showStep(1);
});

// Setup event listeners
function setupEventListeners() {
    // Role selection change
    const roleInputs = document.querySelectorAll('input[name="role"]');
    roleInputs.forEach(input => {
        input.addEventListener('change', handleRoleChange);
    });
    
    // Form submission
    const form = document.getElementById('registerForm');
    form.addEventListener('submit', handleSubmit);
    
    // Real-time validation
    setupRealtimeValidation();
}

// Handle role change
function handleRoleChange(e) {
    const selectedRole = e.target.value;
    formData.role = selectedRole;
    
    // Show/hide role-specific fields
    const elderlyFields = document.querySelector('.elderly-fields');
    const medicalFields = document.querySelector('.medical-fields');
    
    if (elderlyFields) {
        elderlyFields.style.display = selectedRole === 'elderly' ? 'block' : 'none';
    }
    
    if (medicalFields) {
        medicalFields.style.display = selectedRole === 'medical' ? 'block' : 'none';
    }
}

// Navigation functions
function nextStep() {
    if (validateCurrentStep()) {
        saveStepData();
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
            
            // Update summary on last step
            if (currentStep === totalSteps) {
                updateSummary();
            }
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(stepNumber) {
    // Update progress indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Show current step content
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const currentStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        
        // Focus first input in new step
        const firstInput = currentStepElement.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
    
    // Announce step change for screen readers
    announceStepChange(stepNumber);
}

// Validation functions
function validateCurrentStep() {
    let isValid = true;
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    
    switch (currentStep) {
        case 1:
            // Validate role selection
            const selectedRole = document.querySelector('input[name="role"]:checked');
            if (!selectedRole) {
                showAlert('Silakan pilih peran Anda', 'error');
                isValid = false;
            }
            break;
            
        case 2:
            // Validate personal data
            isValid = validatePersonalData(currentStepElement);
            break;
            
        case 3:
            // Validate account setup
            isValid = validateAccountSetup(currentStepElement);
            break;
    }
    
    return isValid;
}

function validatePersonalData(stepElement) {
    let isValid = true;
    
    // Required fields
    const requiredFields = [
        { id: 'fullName', message: 'Nama lengkap harus diisi' },
        { id: 'dateOfBirth', message: 'Tanggal lahir harus diisi' },
        { id: 'phone', message: 'Nomor HP harus diisi' }
    ];
    
    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input.value.trim()) {
            showFieldError(input, field.message);
            isValid = false;
        } else {
            clearFieldError(input);
        }
    });
    
    // Validate phone number format
    const phoneInput = document.getElementById('phone');
    const phonePattern = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    if (phoneInput.value && !phonePattern.test(phoneInput.value)) {
        showFieldError(phoneInput, 'Format nomor HP tidak valid');
        isValid = false;
    }
    
    // Validate age for elderly role
    if (formData.role === 'elderly') {
        const dob = new Date(document.getElementById('dateOfBirth').value);
        const age = calculateAge(dob);
        if (age < 60) {
            showFieldError(document.getElementById('dateOfBirth'), 'Untuk peran lansia, usia minimal adalah 60 tahun');
            isValid = false;
        }
    }
    
    return isValid;
}

function validateAccountSetup(stepElement) {
    let isValid = true;
    
    // Username validation
    const usernameInput = document.getElementById('username');
    const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;
    if (!usernamePattern.test(usernameInput.value)) {
        showFieldError(usernameInput, 'Username tidak valid');
        isValid = false;
    } else {
        clearFieldError(usernameInput);
    }
    
    // Email validation
    const emailInput = document.getElementById('email');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailInput.value)) {
        showFieldError(emailInput, 'Email tidak valid');
        isValid = false;
    } else {
        clearFieldError(emailInput);
    }
    
    // Password validation
    const passwordInput = document.getElementById('password');
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(passwordInput.value)) {
        showFieldError(passwordInput, 'Password tidak memenuhi syarat');
        isValid = false;
    } else {
        clearFieldError(passwordInput);
    }
    
    // Confirm password
    const confirmInput = document.getElementById('confirmPassword');
    if (passwordInput.value !== confirmInput.value) {
        showFieldError(confirmInput, 'Password tidak cocok');
        isValid = false;
    } else {
        clearFieldError(confirmInput);
    }
    
    // Terms agreement
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        showAlert('Anda harus menyetujui syarat & ketentuan', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Save current step data
function saveStepData() {
    const inputs = document.querySelectorAll(`.form-step[data-step="${currentStep}"] input, .form-step[data-step="${currentStep}"] select, .form-step[data-step="${currentStep}"] textarea`);
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else {
            formData[input.name] = input.value;
        }
    });
}

// Update summary
function updateSummary() {
    // Role
    const roleMap = {
        'elderly': 'Lansia',
        'family': 'Keluarga',
        'medical': 'Tenaga Medis'
    };
    document.getElementById('summary-role').textContent = roleMap[formData.role] || '-';
    
    // Account info
    document.getElementById('summary-username').textContent = formData.username || '-';
    document.getElementById('summary-email').textContent = formData.email || '-';
    
    // Personal info
    document.getElementById('summary-name').textContent = formData.fullName || '-';
    document.getElementById('summary-dob').textContent = formatDate(formData.dateOfBirth) || '-';
    document.getElementById('summary-phone').textContent = formData.phone || '-';
    document.getElementById('summary-address').textContent = formData.address || '-';
}

// Form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Save final step data
    saveStepData();
    
    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline-block';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.username,
                password: formData.password,
                email: formData.email,
                fullName: formData.fullName,
                role: formData.role,
                phone: formData.phone,
                address: formData.address,
                dateOfBirth: formData.dateOfBirth,
                bloodType: formData.bloodType,
                medicalConditions: formData.medicalConditions,
                allergies: formData.allergies,
                preferredHospital: formData.preferredHospital,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
                emergencyContactRelationship: formData.emergencyContactRelationship
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Show success modal
            showSuccessModal();
        } else {
            // Show error
            showAlert(data.message || 'Registrasi gagal. Silakan coba lagi.', 'error');
            
            // Show field-specific errors if available
            if (data.errors) {
                handleServerErrors(data.errors);
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline-block';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
}

// Password strength checker
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };
    
    // Update UI
    Object.keys(requirements).forEach(req => {
        const element = document.querySelector(`[data-requirement="${req}"]`);
        if (element) {
            if (requirements[req]) {
                element.classList.add('met');
            } else {
                element.classList.remove('met');
            }
        }
    });
    
    // Calculate strength
    const strength = Object.values(requirements).filter(Boolean).length;
    updatePasswordStrengthIndicator(strength);
}

function updatePasswordStrengthIndicator(strength) {
    const strengthText = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
    const strengthColors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60'];
    
    // You can add a visual strength indicator here if needed
}

// Real-time validation setup
function setupRealtimeValidation() {
    // Username availability check
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        let usernameTimeout;
        usernameInput.addEventListener('input', () => {
            clearTimeout(usernameTimeout);
            usernameTimeout = setTimeout(() => {
                checkUsernameAvailability(usernameInput.value);
            }, 500);
        });
    }
    
    // Email format validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailInput.value && !emailPattern.test(emailInput.value)) {
                showFieldError(emailInput, 'Format email tidak valid');
            } else {
                clearFieldError(emailInput);
            }
        });
    }
    
    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.startsWith('62')) {
                value = '+' + value;
            } else if (value.startsWith('0')) {
                // Keep as is
            } else if (value.startsWith('8')) {
                value = '0' + value;
            }
            e.target.value = value;
        });
    }
}

// Check username availability (mock implementation)
async function checkUsernameAvailability(username) {
    if (username.length < 3) return;
    
    // In real implementation, this would check with the server
    // For now, just show as available
    const usernameInput = document.getElementById('username');
    const errorElement = document.getElementById('username-error');
    
    // Simulate API call
    setTimeout(() => {
        if (username === 'admin' || username === 'test') {
            showFieldError(usernameInput, 'Username sudah digunakan');
        } else {
            clearFieldError(usernameInput);
            errorElement.textContent = 'Username tersedia';
            errorElement.style.color = 'var(--success-color)';
        }
    }, 300);
}

// Utility functions
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        button.setAttribute('aria-label', 'Sembunyikan password');
    } else {
        input.type = 'password';
        button.setAttribute('aria-label', 'Tampilkan password');
    }
}

// Error handling
function showFieldError(input, message) {
    input.classList.add('error');
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearFieldError(input) {
    input.classList.remove('error');
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.color = ''; // Reset color
    }
}

function handleServerErrors(errors) {
    errors.forEach(error => {
        const input = document.querySelector(`[name="${error.field}"]`);
        if (input) {
            showFieldError(input, error.message);
        }
    });
}

// Notifications
function showAlert(message, type = 'error') {
    const alert = document.getElementById('alert');
    const alertMessage = alert.querySelector('.alert-message');
    
    alert.className = `alert alert-${type}`;
    alertMessage.textContent = message;
    alert.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        closeAlert();
    }, 5000);
}

function closeAlert() {
    const alert = document.getElementById('alert');
    alert.style.display = 'none';
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    
    // Auto redirect after 3 seconds
    setTimeout(() => {
        redirectToLogin();
    }, 3000);
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// Accessibility
function announceStepChange(stepNumber) {
    const stepLabel = document.querySelector(`.step[data-step="${stepNumber}"] .step-label`).textContent;
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Langkah ${stepNumber} dari ${totalSteps}: ${stepLabel}`;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

