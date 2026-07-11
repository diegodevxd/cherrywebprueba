document.addEventListener('DOMContentLoaded', () => {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Split text (animación palabra / letra) ---------- */
    if (!reduceMotion) {
        const splitInto = (el, unit) => {
            if (el.dataset.split) return;
            const text = el.textContent;
            el.textContent = '';
            let i = 0;
            const parts = unit === 'chars' ? Array.from(text) : text.split(/(\s+)/);
            parts.forEach((part) => {
                if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); return; }
                if (part === '') return;
                const span = document.createElement('span');
                span.className = unit === 'chars' ? 'c' : 'w';
                span.textContent = part;
                span.style.setProperty('--wi', i++);
                el.appendChild(span);
            });
            el.dataset.split = '1';
        };
        document.querySelectorAll('.anim-words').forEach((el) => { if (!el.querySelector('*')) splitInto(el, 'words'); });
        document.querySelectorAll('.anim-chars').forEach((el) => splitInto(el, 'chars'));
    }

    /* ---------- Scroll-entry reveal (IntersectionObserver) ---------- */
    const animated = document.querySelectorAll('.reveal, .anim-words, .anim-chars');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        animated.forEach((el) => io.observe(el));
    } else {
        animated.forEach((el) => el.classList.add('in'));
    }

    /* ---------- Tilt 3D + spotlight (dispositivos y equipo) ---------- */
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('[data-tilt]').forEach((el) => {
            const max = el.classList.contains('member') ? 7 : 9;
            let raf = null;
            const onMove = (e) => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                el.style.setProperty('--mx', (px * 100) + '%');
                el.style.setProperty('--my', (py * 100) + '%');
                if (raf) return;
                raf = requestAnimationFrame(() => {
                    const rx = (0.5 - py) * max;
                    const ry = (px - 0.5) * max;
                    el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
                    raf = null;
                });
            };
            const reset = () => { if (raf) cancelAnimationFrame(raf), raf = null; el.style.transform = ''; };
            el.addEventListener('mousemove', onMove);
            el.addEventListener('mouseleave', reset);
        });
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

    /* ---------- Image carousels (soporta varios; dots opcionales) ---------- */
    document.querySelectorAll('[data-carousel]').forEach((carousel, ci) => {
        const track = carousel.querySelector('[data-track]');
        const slides = Array.from(track.children);
        const dotsWrap = carousel.querySelector('[data-dots]');
        let index = 0;
        let timer = null;

        let dots = [];
        if (dotsWrap) {
            slides.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.setAttribute('aria-label', 'Ir a la imagen ' + (i + 1));
                dot.addEventListener('click', () => { goTo(i); restart(); });
                dotsWrap.appendChild(dot);
            });
            dots = Array.from(dotsWrap.children);
        }

        function goTo(i) {
            index = (i + slides.length) % slides.length;
            track.style.transform = 'translateX(' + (-index * 100) + '%)';
            dots.forEach((d, di) => d.classList.toggle('active', di === index));
        }
        const next = () => goTo(index + 1);
        const prev = () => goTo(index - 1);

        function start() {
            if (reduceMotion || timer) return;
            timer = setInterval(next, 5000 + ci * 800); // desfase entre carruseles
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
    });

    /* ---------- Paquetes: baraja giratoria (deck 3D) ---------- */
    const deck = document.querySelector('[data-deck]');
    if (deck) {
        const cards = Array.from(deck.querySelectorAll('.plan'));
        const n = cards.length;
        const posClasses = ['pos-front', 'pos-right', 'pos-back', 'pos-left'];
        const dotsWrap = document.querySelector('[data-deck-dots]');
        let active = Math.max(0, cards.findIndex((c) => c.classList.contains('plan-featured')));

        let dots = [];
        if (dotsWrap) {
            cards.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.setAttribute('aria-label', 'Ver paquete ' + (i + 1));
                dot.addEventListener('click', () => { active = i; layout(); });
                dotsWrap.appendChild(dot);
            });
            dots = Array.from(dotsWrap.children);
        }

        function layout() {
            cards.forEach((c, i) => {
                const rel = (i - active + n) % n;
                posClasses.forEach((pc) => c.classList.remove(pc));
                c.classList.add(posClasses[rel] || 'pos-back');
            });
            dots.forEach((d, di) => d.classList.toggle('active', di === active));
        }
        const deckNext = () => { active = (active + 1) % n; layout(); };
        const deckPrev = () => { active = (active - 1 + n) % n; layout(); };

        function setHeights() {
            cards.forEach((c) => { c.style.height = 'auto'; });
            const h = Math.max(...cards.map((c) => c.offsetHeight));
            cards.forEach((c) => { c.style.height = h + 'px'; });
            deck.style.setProperty('--deck-h', (h + 30) + 'px');
        }

        const nextBtn = document.querySelector('[data-deck-next]');
        const prevBtn = document.querySelector('[data-deck-prev]');
        if (nextBtn) nextBtn.addEventListener('click', deckNext);
        if (prevBtn) prevBtn.addEventListener('click', deckPrev);

        // Clic en una tarjeta lateral/trasera la trae al frente
        cards.forEach((c, i) => {
            c.addEventListener('click', (e) => {
                if (!c.classList.contains('pos-front')) {
                    e.preventDefault();
                    active = i;
                    layout();
                }
            });
        });

        // Swipe táctil
        let deckStartX = 0;
        deck.addEventListener('touchstart', (e) => { deckStartX = e.touches[0].clientX; }, { passive: true });
        deck.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - deckStartX;
            if (Math.abs(dx) > 45) (dx < 0 ? deckNext() : deckPrev());
        }, { passive: true });

        layout();
        setHeights();
        window.addEventListener('load', setHeights);
        let rz = null;
        window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(setHeights, 150); });
    }

    /* ---------- Carrusel de conceptos (flechas) ---------- */
    const concepts = document.querySelector('[data-concepts]');
    if (concepts) {
        const track = concepts.querySelector('[data-concepts-track]');
        const prevBtn = concepts.querySelector('[data-concepts-prev]');
        const nextBtn = concepts.querySelector('[data-concepts-next]');
        const step = () => {
            const first = track.firstElementChild;
            return first ? first.getBoundingClientRect().width + 18 : 320;
        };
        if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
        if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    }

    /* ---------- Simulador exprés ---------- */
    const sim = document.querySelector('[data-sim]');
    if (sim) {
        const segSections = sim.querySelector('[data-sim-sections]');
        const toggles = sim.querySelectorAll('[data-sim-toggle]');
        const amountEl = sim.querySelector('[data-sim-amount]');
        const pkgEl = sim.querySelector('[data-sim-pkg]');
        let sections = 4;
        const extras = { chatbot: false, tienda: false };
        const fmt = (n) => '$' + n.toLocaleString('es-MX');

        const recompute = () => {
            const base = sections === 4 ? 5000 : sections === 6 ? 8000 : 10000;
            const pkg = sections === 4 ? 'Launch Kit' : sections === 6 ? 'Next Level' : 'Rise Plus';
            let total = base;
            if (extras.chatbot && sections === 4) total += 1500; // en 6/8 ya viene incluido
            if (extras.tienda) total += 3000;
            amountEl.textContent = fmt(total);
            pkgEl.textContent = 'Paquete ' + pkg;
        };

        segSections.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
                segSections.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
                b.classList.add('active');
                sections = parseInt(b.dataset.val, 10);
                recompute();
            });
        });
        toggles.forEach((b) => {
            b.addEventListener('click', () => {
                const key = b.dataset.simToggle;
                extras[key] = !extras[key];
                b.classList.toggle('active', extras[key]);
                recompute();
            });
        });
        recompute();
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
