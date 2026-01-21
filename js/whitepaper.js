// ============================================================================
// B0x Website Whitepaper Page Module
// ============================================================================
// This module handles all whitepaper page functionality including:
// - Scroll progress indicator
// - Fade-in animations on scroll
// - Smooth scrolling for internal links
// - Interactive hover effects
// ============================================================================

/**
 * Initialize scroll progress indicator
 * Updates a progress bar based on scroll position
 */
function initScrollProgress() {
    window.addEventListener('scroll', function () {
        const scrollProgress = document.getElementById('bxScrollProgress');
        if (!scrollProgress) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = (scrollTop / scrollHeight) * 100;
        scrollProgress.style.width = scrollPercentage + '%';
    });
}

/**
 * Initialize fade-in animations using IntersectionObserver
 * Elements with class 'bx-fade-in' will fade in when they enter viewport
 */
function initFadeInAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('bx-visible');
            }
        });
    }, observerOptions);

    // Observe all fade-in elements when DOM is ready
    const initObserver = () => {
        const fadeElements = document.querySelectorAll('.bx-fade-in');
        fadeElements.forEach(element => {
            observer.observe(element);
        });
        console.log(`Observing ${fadeElements.length} fade-in elements`);
    };

    // Initialize immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObserver);
    } else {
        initObserver();
    }
}

/**
 * Initialize smooth scrolling for internal anchor links
 * All links starting with '#' will smoothly scroll to target
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Only handle internal anchor links (starting with # and having more than just #)
            if (!href || href === '#' || !href.startsWith('#') || href.length < 2) {
                return;
            }
            e.preventDefault();
            try {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } catch (err) {
                // Invalid selector, ignore
                console.warn('Invalid anchor selector:', href);
            }
        });
    });
}

/**
 * Initialize interactive hover effects for feature cards
 * Cards with class 'bx-feature-card' will scale and move on hover
 */
function initFeatureCardHoverEffects() {
    document.querySelectorAll('.bx-feature-card').forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/**
 * Initialize all whitepaper page functionality
 * Call this function when the page loads
 */
export function initWhitepaper() {
    console.log('Initializing whitepaper page functionality...');

    initScrollProgress();
    initFadeInAnimations();
    initSmoothScrolling();
    initFeatureCardHoverEffects();

    console.log('✓ Whitepaper page initialized');
}

// Export individual functions for flexibility
export {
    initScrollProgress,
    initFadeInAnimations,
    initSmoothScrolling,
    initFeatureCardHoverEffects
};

// Default export
export default {
    initWhitepaper,
    initScrollProgress,
    initFadeInAnimations,
    initSmoothScrolling,
    initFeatureCardHoverEffects
};
