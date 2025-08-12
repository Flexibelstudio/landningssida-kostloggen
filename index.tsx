document.addEventListener('DOMContentLoaded', () => {
    // --- Main App Screenshot Carousel ---
    const mainCarousel = document.querySelector<HTMLElement>('.carousel');
    const mainPrevBtn = document.querySelector<HTMLButtonElement>('.carousel-btn.prev');
    const mainNextBtn = document.querySelector<HTMLButtonElement>('.carousel-btn.next');

    if (mainCarousel && mainPrevBtn && mainNextBtn) {
        const slides = Array.from(mainCarousel.querySelectorAll('.carousel-slide')) as HTMLElement[];
        
        const scrollStep = () => {
            if (slides.length > 0) {
                const carouselStyle = window.getComputedStyle(mainCarousel);
                const gap = parseFloat(carouselStyle.gap) || 0;
                return slides[0].offsetWidth + gap;
            }
            return 300; // Fallback
        };

        const updateButtonState = () => {
            // Use a small tolerance to account for sub-pixel rendering
            const tolerance = 10;
            const scrollLeft = mainCarousel.scrollLeft;
            const scrollWidth = mainCarousel.scrollWidth;
            const clientWidth = mainCarousel.clientWidth;

            mainPrevBtn.disabled = scrollLeft < tolerance;
            mainNextBtn.disabled = scrollWidth - scrollLeft - clientWidth < tolerance;
        };

        mainCarousel.addEventListener('scroll', updateButtonState, { passive: true });

        mainNextBtn.addEventListener('click', () => {
            mainCarousel.scrollBy({ left: scrollStep(), behavior: 'smooth' });
        });

        mainPrevBtn.addEventListener('click', () => {
            mainCarousel.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
        });

        // Set initial button states on load
        updateButtonState();
    }


    // --- Autoplaying Carousel Setup ---
    const setupAutoplayCarousel = (
        carouselSelector: string,
        prevBtnSelector: string,
        nextBtnSelector: string,
        paginationSelector: string
    ) => {
        const carousel = document.querySelector<HTMLElement>(carouselSelector);
        const prevBtn = document.querySelector<HTMLButtonElement>(prevBtnSelector);
        const nextBtn = document.querySelector<HTMLButtonElement>(nextBtnSelector);
        const paginationContainer = document.querySelector<HTMLElement>(paginationSelector);

        if (!carousel || !prevBtn || !nextBtn || !paginationContainer) {
            return;
        }

        const slides = Array.from(carousel.children) as HTMLElement[];
        if (slides.length === 0) return;

        let currentIndex = 0;
        let autoplayInterval: number | null = null;

        // Create pagination dots
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                scrollToSlide(index);
                startAutoplay(); // Reset timer on manual navigation
            });
            paginationContainer.appendChild(dot);
        });

        const dots = paginationContainer.querySelectorAll<HTMLElement>('.dot');

        const updatePagination = (index: number) => {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        };
        
        const scrollToSlide = (index: number) => {
             const scrollAmount = slides[index].offsetLeft - carousel.offsetLeft;
             carousel.scrollTo({
                 left: scrollAmount,
                 behavior: 'smooth'
             });
             currentIndex = index;
             updatePagination(currentIndex);
        };

        const nextSlide = () => {
            const newIndex = (currentIndex + 1) % slides.length;
            scrollToSlide(newIndex);
        };

        const prevSlide = () => {
            const newIndex = (currentIndex - 1 + slides.length) % slides.length;
            scrollToSlide(newIndex);
        };

        const startAutoplay = () => {
            if (autoplayInterval) clearInterval(autoplayInterval);
            autoplayInterval = window.setInterval(nextSlide, 5000);
        };

        const stopAutoplay = () => {
            if (autoplayInterval) clearInterval(autoplayInterval);
        };

        nextBtn.addEventListener('click', () => {
            nextSlide();
            startAutoplay();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            startAutoplay();
        });

        carousel.addEventListener('mouseenter', stopAutoplay);
        carousel.addEventListener('mouseleave', startAutoplay);
        
        // Also pause on button hover
        prevBtn.addEventListener('mouseenter', stopAutoplay);
        prevBtn.addEventListener('mouseleave', startAutoplay);
        nextBtn.addEventListener('mouseenter', stopAutoplay);
        nextBtn.addEventListener('mouseleave', startAutoplay);


        startAutoplay();
    };

    // Initialize App Review Carousel
    setupAutoplayCarousel(
        '.app-testimonial-carousel',
        '.app-review-btn.prev',
        '.app-review-btn.next',
        '.app-testimonial-pagination'
    );
    
    // Initialize Course Testimonial Carousel
    setupAutoplayCarousel(
        '.testimonial-carousel',
        '.course-carousel-btn.prev',
        '.course-carousel-btn.next',
        '.testimonial-pagination'
    );

    
    // --- Course Info Modal ---
    const modal = document.getElementById('course-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = modal?.querySelector<HTMLButtonElement>('.modal-close');
    const understandBtn = document.getElementById('modal-understand-btn');


    if (modal && openBtn && closeBtn) {
        const openModal = () => modal.classList.remove('hidden');
        const closeModal = () => modal.classList.add('hidden');

        openBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        
        if (understandBtn) {
            understandBtn.addEventListener('click', closeModal);
        }

        modal.addEventListener('click', (event) => {
            // Close if clicked on the backdrop (the modal itself)
            if (event.target === modal) {
                closeModal();
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    // --- Image Modal ---
    const imageModal = document.getElementById('image-modal');
    const modalImage = document.getElementById('fullscreen-image') as HTMLImageElement;
    const clickableImages = document.querySelectorAll('.app-feature-card img');
    const imageModalCloseBtn = imageModal?.querySelector('.image-modal-close');

    if (imageModal && modalImage && clickableImages.length > 0 && imageModalCloseBtn) {
        const openImageModal = (src: string, alt: string) => {
            if (modalImage) {
                modalImage.src = src;
                modalImage.alt = alt;
            }
            imageModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        };

        const closeImageModal = () => {
            imageModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        };

        clickableImages.forEach(img => {
            img.addEventListener('click', () => {
                const imageElement = img as HTMLImageElement;
                openImageModal(imageElement.src, imageElement.alt);
            });
        });

        imageModalCloseBtn.addEventListener('click', closeImageModal);

        imageModal.addEventListener('click', (event) => {
            if (event.target === imageModal) {
                closeImageModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !imageModal.classList.contains('hidden')) {
                closeImageModal();
            }
        });
    }
});