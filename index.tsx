
document.addEventListener('DOMContentLoaded', () => {
    // --- Feature Showcase Carousel ---
    // Note: Tab navigation logic removed as we moved to individual cards.
    // We keep the logic stub if we need to add interactivity to the cards later (e.g. scroll tracking).

    // --- Autoplaying Carousel Setup (Testimonials) ---
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
    
    // --- Generic Modal Handling ---
    const setupModal = (modalId: string, openBtnId: string) => {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(openBtnId);
        
        if (modal && openBtn) {
            const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close');
            const understandBtn = modal.querySelector<HTMLButtonElement>('.modal-understand-btn');

            const openModal = () => modal.classList.remove('hidden');
            const closeModal = () => modal.classList.add('hidden');

            openBtn.addEventListener('click', openModal);
            
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            if (understandBtn) understandBtn.addEventListener('click', closeModal);

            modal.addEventListener('click', (event) => {
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
    };

    // Initialize Course Modals
    setupModal('modal-viktkontroll', 'btn-viktkontroll');
    setupModal('modal-klimakteriet', 'btn-klimakteriet');

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
