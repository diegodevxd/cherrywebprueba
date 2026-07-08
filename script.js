document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Scroll-entry reveal (IntersectionObserver) ---------- */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add('in'));
    }

    /* ---------- Navbar border on scroll ---------- */
    const navbar = document.getElementById('nav');
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- Mobile menu ---------- */
    const burger = document.getElementById('burger');
    const navLinks = document.getElementById('navLinks');

    const closeMenu = () => {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
        document.body.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
    };

    burger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        burger.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', String(open));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    // Cerrar al tocar el fondo oscuro
    document.addEventListener('click', (e) => {
        if (document.body.classList.contains('menu-open') &&
            !navLinks.contains(e.target) && !burger.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    /* ---------- Image carousel ---------- */
    const carousel = document.querySelector('[data-carousel]');
    if (carousel) {
        const track = carousel.querySelector('[data-track]');
        const slides = Array.from(track.children);
        const dotsWrap = carousel.querySelector('[data-dots]');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let index = 0;
        let timer = null;

        // Build dots
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Ir a la imagen ' + (i + 1));
            dot.addEventListener('click', () => { goTo(i); restart(); });
            dotsWrap.appendChild(dot);
        });
        const dots = Array.from(dotsWrap.children);

        function goTo(i) {
            index = (i + slides.length) % slides.length;
            track.style.transform = 'translateX(' + (-index * 100) + '%)';
            dots.forEach((d, di) => d.classList.toggle('active', di === index));
        }
        const next = () => goTo(index + 1);
        const prev = () => goTo(index - 1);

        function start() {
            if (reduceMotion) return;
            timer = setInterval(next, 5000);
        }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        function restart() { stop(); start(); }

        const nextBtn = carousel.querySelector('[data-next]');
        const prevBtn = carousel.querySelector('[data-prev]');
        if (nextBtn) nextBtn.addEventListener('click', () => { next(); restart(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restart(); });

        // Pause on hover / focus
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
        carousel.addEventListener('focusin', stop);
        carousel.addEventListener('focusout', start);

        // Pause when off-screen (efficiency)
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
            }, { threshold: 0.2 }).observe(carousel);
        }

        // Touch swipe
        let startX = 0;
        track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
        track.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
            start();
        }, { passive: true });

        goTo(0);
        start();
    }

    /* ---------- Team carousel (draggable stacked cards) ---------- */
    const teamCarousel = document.querySelector('[data-team-carousel]');
    if (teamCarousel) {
        const cards = Array.from(teamCarousel.querySelectorAll('[data-team-card]'));
        const dotsWrap = teamCarousel.querySelector('[data-team-dots]');
        const total = cards.length;
        let current = 0;

        cards.forEach((card, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Ver a ' + card.querySelector('h3').textContent);
            dot.addEventListener('click', () => goTo(i));
            dotsWrap.appendChild(dot);
        });
        const dots = Array.from(dotsWrap.children);

        function layout() {
            cards.forEach((card, i) => {
                const offset = (i - current + total) % total;
                card.style.setProperty('--pos', offset);
                card.style.zIndex = total - offset;
                card.classList.toggle('is-front', offset === 0);
            });
            dots.forEach((d, i) => d.classList.toggle('active', i === current));
        }
        function goTo(i) { current = (i + total) % total; layout(); }
        function next() { goTo(current + 1); }
        function prev() { goTo(current - 1); }

        const nextBtn = teamCarousel.querySelector('[data-team-next]');
        const prevBtn = teamCarousel.querySelector('[data-team-prev]');
        if (nextBtn) nextBtn.addEventListener('click', () => next());
        if (prevBtn) prevBtn.addEventListener('click', () => prev());

        cards.forEach((card) => {
            let startX = 0;
            let dragging = false;

            card.addEventListener('pointerdown', (e) => {
                if (!card.classList.contains('is-front')) return;
                dragging = true;
                startX = e.clientX;
                card.classList.add('dragging');
                card.setPointerCapture(e.pointerId);
            });
            card.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                card.style.setProperty('--drag-x', dx + 'px');
                card.style.setProperty('--drag-rot', (dx / 20) + 'deg');
            });
            const endDrag = () => {
                if (!dragging) return;
                dragging = false;
                card.classList.remove('dragging');
                const dx = parseFloat(card.style.getPropertyValue('--drag-x')) || 0;
                card.style.removeProperty('--drag-x');
                card.style.removeProperty('--drag-rot');
                if (Math.abs(dx) > 80) (dx < 0 ? next() : prev());
            };
            card.addEventListener('pointerup', endDrag);
            card.addEventListener('pointercancel', endDrag);
        });

        layout();

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let timer = null;
        function start() { if (!reduceMotion) timer = setInterval(next, 4500); }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        teamCarousel.addEventListener('mouseenter', stop);
        teamCarousel.addEventListener('mouseleave', start);
        teamCarousel.addEventListener('pointerdown', stop);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
            }, { threshold: 0.3 }).observe(teamCarousel);
        } else {
            start();
        }
    }

    /* ---------- Accordion: keep one item open at a time ---------- */
    const items = document.querySelectorAll('.accordion details');
    items.forEach((item) => {
        item.addEventListener('toggle', () => {
            if (item.open) {
                items.forEach((other) => { if (other !== item) other.open = false; });
            }
        });
    });

});
