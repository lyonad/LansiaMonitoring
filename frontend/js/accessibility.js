// Accessibility Settings Manager
class AccessibilityManager {
    constructor() {
        this.settings = {
            fontSize: parseInt(localStorage.getItem('fontSize')) || 16,
            highContrast: localStorage.getItem('highContrast') === 'true',
            dyslexiaFont: localStorage.getItem('dyslexiaFont') === 'true',
            reducedMotion: localStorage.getItem('reducedMotion') === 'true',
            screenReaderMode: false
        };
        
        this.init();
    }
    
    init() {
        // Apply saved preferences
        this.applySettings();
        
        // Listen for system preferences
        this.detectSystemPreferences();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Initialize focus management
        this.initFocusManagement();
    }
    
    applySettings() {
        // Font size
        document.documentElement.style.fontSize = this.settings.fontSize + 'px';
        
        // High contrast
        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast');
        }
        
        // Dyslexia font
        if (this.settings.dyslexiaFont) {
            document.body.classList.add('dyslexia-friendly');
        }
        
        // Reduced motion
        if (this.settings.reducedMotion) {
            document.body.classList.add('reduce-motion');
        }
    }
    
    detectSystemPreferences() {
        // Detect high contrast mode
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.enableHighContrast();
        }
        
        // Detect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.enableReducedMotion();
        }
        
        // Detect dark mode
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + A: Toggle accessibility panel
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                this.toggleAccessibilityPanel();
            }
            
            // Alt + Plus: Increase font size
            if (e.altKey && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                this.increaseFontSize();
            }
            
            // Alt + Minus: Decrease font size
            if (e.altKey && e.key === '-') {
                e.preventDefault();
                this.decreaseFontSize();
            }
            
            // Alt + C: Toggle high contrast
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                this.toggleHighContrast();
            }
        });
    }
    
    initFocusManagement() {
        // Add focus visible class for keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-nav');
        });
        
        // Skip links functionality
        const skipLinks = document.querySelectorAll('.skip-link');
        skipLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.tabIndex = -1;
                    target.focus();
                }
            });
        });
    }
    
    // Font size methods
    increaseFontSize() {
        if (this.settings.fontSize < 24) {
            this.settings.fontSize += 2;
            this.updateFontSize();
            this.announce(`Ukuran font diperbesar menjadi ${this.settings.fontSize} piksel`);
        } else {
            this.announce('Ukuran font maksimal tercapai');
        }
    }
    
    decreaseFontSize() {
        if (this.settings.fontSize > 12) {
            this.settings.fontSize -= 2;
            this.updateFontSize();
            this.announce(`Ukuran font diperkecil menjadi ${this.settings.fontSize} piksel`);
        } else {
            this.announce('Ukuran font minimal tercapai');
        }
    }
    
    resetFontSize() {
        this.settings.fontSize = 16;
        this.updateFontSize();
        this.announce('Ukuran font direset ke normal');
    }
    
    updateFontSize() {
        document.documentElement.style.fontSize = this.settings.fontSize + 'px';
        localStorage.setItem('fontSize', this.settings.fontSize);
    }
    
    // High contrast methods
    toggleHighContrast() {
        this.settings.highContrast = !this.settings.highContrast;
        document.body.classList.toggle('high-contrast');
        localStorage.setItem('highContrast', this.settings.highContrast);
        this.announce(this.settings.highContrast ? 'Mode kontras tinggi diaktifkan' : 'Mode kontras tinggi dinonaktifkan');
    }
    
    enableHighContrast() {
        if (!this.settings.highContrast) {
            this.toggleHighContrast();
        }
    }
    
    // Dyslexia font methods
    toggleDyslexiaFont() {
        this.settings.dyslexiaFont = !this.settings.dyslexiaFont;
        document.body.classList.toggle('dyslexia-friendly');
        localStorage.setItem('dyslexiaFont', this.settings.dyslexiaFont);
        this.announce(this.settings.dyslexiaFont ? 'Font dyslexia diaktifkan' : 'Font dyslexia dinonaktifkan');
    }
    
    // Reduced motion methods
    toggleReducedMotion() {
        this.settings.reducedMotion = !this.settings.reducedMotion;
        document.body.classList.toggle('reduce-motion');
        localStorage.setItem('reducedMotion', this.settings.reducedMotion);
        this.announce(this.settings.reducedMotion ? 'Animasi dikurangi' : 'Animasi normal diaktifkan');
    }
    
    enableReducedMotion() {
        if (!this.settings.reducedMotion) {
            this.toggleReducedMotion();
        }
    }
    
    // Screen reader announcements
    announce(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only aria-live-region';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    // Accessibility panel toggle
    toggleAccessibilityPanel() {
        const panel = document.querySelector('.accessibility-panel');
        const toggle = document.querySelector('.accessibility-toggle');
        
        if (panel) {
            const isOpen = panel.classList.contains('show');
            panel.classList.toggle('show');
            toggle?.setAttribute('aria-expanded', !isOpen);
            this.announce(isOpen ? 'Panel aksesibilitas ditutup' : 'Panel aksesibilitas dibuka');
        }
    }
    
    // Focus trap for modals
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
            
            if (e.key === 'Escape') {
                this.releaseFocus();
            }
        });
        
        firstFocusableElement?.focus();
    }
    
    releaseFocus() {
        // Implementation depends on specific modal/dialog
        const openModals = document.querySelectorAll('.modal.show, .dialog.open');
        openModals.forEach(modal => {
            modal.classList.remove('show', 'open');
            const trigger = document.querySelector(`[aria-controls="${modal.id}"]`);
            trigger?.focus();
        });
    }
    
    // Color adjustments for color blindness
    enableColorBlindMode(type = 'deuteranopia') {
        document.body.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
        document.body.classList.add(type);
        localStorage.setItem('colorBlindMode', type);
        this.announce(`Mode buta warna ${type} diaktifkan`);
    }
    
    disableColorBlindMode() {
        document.body.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
        localStorage.removeItem('colorBlindMode');
        this.announce('Mode buta warna dinonaktifkan');
    }
    
    // Reading assistance
    enableReadingGuide() {
        const guide = document.createElement('div');
        guide.className = 'reading-guide';
        guide.style.cssText = `
            position: fixed;
            width: 100%;
            height: 20px;
            background: rgba(255, 255, 0, 0.3);
            pointer-events: none;
            z-index: 9999;
            display: none;
        `;
        
        document.body.appendChild(guide);
        
        document.addEventListener('mousemove', (e) => {
            guide.style.display = 'block';
            guide.style.top = (e.clientY - 10) + 'px';
        });
        
        this.announce('Panduan membaca diaktifkan');
    }
    
    disableReadingGuide() {
        const guide = document.querySelector('.reading-guide');
        if (guide) {
            guide.remove();
            this.announce('Panduan membaca dinonaktifkan');
        }
    }
    
    // Text spacing adjustments
    adjustTextSpacing(level = 'normal') {
        const spacingLevels = {
            normal: { letterSpacing: 'normal', wordSpacing: 'normal', lineHeight: '1.6' },
            increased: { letterSpacing: '0.12em', wordSpacing: '0.16em', lineHeight: '2' },
            maximum: { letterSpacing: '0.2em', wordSpacing: '0.3em', lineHeight: '2.5' }
        };
        
        const spacing = spacingLevels[level];
        document.body.style.letterSpacing = spacing.letterSpacing;
        document.body.style.wordSpacing = spacing.wordSpacing;
        document.body.style.lineHeight = spacing.lineHeight;
        
        localStorage.setItem('textSpacing', level);
        this.announce(`Jarak teks disesuaikan ke ${level}`);
    }
    
    // Save all settings
    saveSettings() {
        localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
        this.announce('Pengaturan aksesibilitas disimpan');
    }
    
    // Reset all settings
    resetSettings() {
        localStorage.removeItem('fontSize');
        localStorage.removeItem('highContrast');
        localStorage.removeItem('dyslexiaFont');
        localStorage.removeItem('reducedMotion');
        localStorage.removeItem('colorBlindMode');
        localStorage.removeItem('textSpacing');
        localStorage.removeItem('accessibilitySettings');
        
        // Reset to defaults
        this.settings = {
            fontSize: 16,
            highContrast: false,
            dyslexiaFont: false,
            reducedMotion: false,
            screenReaderMode: false
        };
        
        // Remove all classes
        document.body.classList.remove('high-contrast', 'dyslexia-friendly', 'reduce-motion', 'protanopia', 'deuteranopia', 'tritanopia');
        document.documentElement.style.fontSize = '16px';
        document.body.style.letterSpacing = 'normal';
        document.body.style.wordSpacing = 'normal';
        document.body.style.lineHeight = '1.6';
        
        this.announce('Semua pengaturan aksesibilitas direset');
    }
}

// Initialize accessibility manager when DOM is ready
let accessibilityManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        accessibilityManager = new AccessibilityManager();
    });
} else {
    accessibilityManager = new AccessibilityManager();
}

// Export functions for global use
window.increaseFontSize = () => accessibilityManager?.increaseFontSize();
window.decreaseFontSize = () => accessibilityManager?.decreaseFontSize();
window.toggleHighContrast = () => accessibilityManager?.toggleHighContrast();
window.toggleDyslexiaFont = () => accessibilityManager?.toggleDyslexiaFont();
window.toggleReducedMotion = () => accessibilityManager?.toggleReducedMotion();
window.resetAccessibility = () => accessibilityManager?.resetSettings(); 