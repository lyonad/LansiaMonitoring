// js/landing.js - Landing Page Functionality

// Mobile Navigation Toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
    
    // Animate hamburger menu
    const bars = navToggle.querySelectorAll('.nav-toggle-bar');
    if (navMenu.classList.contains('active')) {
        bars[0].style.transform = 'rotate(45deg) translateY(8px)';
        bars[1].style.opacity = '0';
        bars[2].style.transform = 'rotate(-45deg) translateY(-8px)';
    } else {
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        
        const bars = navToggle.querySelectorAll('.nav-toggle-bar');
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
    });
});

// Header scroll effect
const header = document.querySelector('.header');
const heroSection = document.querySelector('.hero-fullscreen');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Menghapus efek parallax yang menyebabkan background bergerak
    // if (heroSection) {
    //     heroSection.style.backgroundPositionY = `${currentScroll * 0.5}px`;
    // }
    
    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Hide/show header on scroll
    if (currentScroll > lastScroll && currentScroll > 300) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Hero section animation on load
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-title');
    const heroDesc = document.querySelector('.hero-description');
    const heroActions = document.querySelector('.hero-actions');
    const heroStats = document.querySelector('.hero-stats');
    
    setTimeout(() => {
        if (heroTitle) heroTitle.style.opacity = '1';
        if (heroTitle) heroTitle.style.transform = 'translateY(0)';
    }, 300);
    
    setTimeout(() => {
        if (heroDesc) heroDesc.style.opacity = '1';
        if (heroDesc) heroDesc.style.transform = 'translateY(0)';
    }, 500);
    
    setTimeout(() => {
        if (heroActions) heroActions.style.opacity = '1';
        if (heroActions) heroActions.style.transform = 'translateY(0)';
    }, 700);
    
    setTimeout(() => {
        if (heroStats) heroStats.style.opacity = '1';
        if (heroStats) heroStats.style.transform = 'translateY(0)';
    }, 900);
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            
            // Stagger animations for grid items
            if (entry.target.closest('.features-grid, .testimonials-grid, .pricing-grid')) {
                const items = entry.target.parentElement.children;
                Array.from(items).forEach((item, index) => {
                    item.style.animationDelay = `${index * 0.1}s`;
                });
            }
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card, .step-card').forEach(el => {
    observer.observe(el);
});



// Form validation for demo request
const demoForm = document.getElementById('demo-form');
if (demoForm) {
    demoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(demoForm);
        const submitBtn = demoForm.querySelector('button[type="submit"]');
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Show success message
            showNotification('Terima kasih! Kami akan menghubungi Anda segera.', 'success');
            demoForm.reset();
        } catch (error) {
            showNotification('Terjadi kesalahan. Silakan coba lagi.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Minta Demo';
        }
    });
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast toast-${type} show`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Counter animation for stats
const animateCounter = (element, target, duration = 2000) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current).toLocaleString('id-ID');
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString('id-ID');
        }
    };
    
    updateCounter();
};

// Animate stats when in view
const statNumbers = document.querySelectorAll('.stat-number');
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.animated) {
            const text = entry.target.textContent;
            const number = parseInt(text.replace(/[^0-9]/g, ''));
            
            if (!isNaN(number)) {
                animateCounter(entry.target, number);
                entry.target.animated = true;
            }
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(stat => {
    statsObserver.observe(stat);
});

// Lazy loading for images
const images = document.querySelectorAll('img[loading="lazy"]');
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
        }
    });
});

images.forEach(img => imageObserver.observe(img));

// Keyboard navigation improvements
document.addEventListener('keydown', (e) => {
    // Close mobile menu with Escape
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
    }
    

});

// Add loading screen
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hide');
        }, 500);
    }
});

// Performance monitoring
if ('PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.log(`${entry.name}: ${entry.duration}ms`);
        }
    });
    
    perfObserver.observe({ entryTypes: ['measure'] });
}

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration))
            .catch(err => console.log('SW registration failed:', err));
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Handle header scrolling effect
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Handle mobile navigation
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.2
    };
    
    // Feature items animation observer
    const featureItems = document.querySelectorAll('.feature-item');
    const featureObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                featureObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    featureItems.forEach(item => {
        featureObserver.observe(item);
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            }
        });
    });
});