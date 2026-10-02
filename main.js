/* RELOCART v2 — interactions */
(() => {
  /* CONFIG — paste a JSON-POST form endpoint (e.g. Formspree) before launch.
     While empty, the form hands off to the visitor's email app and says so. */
  const FORM_ENDPOINT = '';

  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  requestAnimationFrame(() => body.classList.add('ready'));

  /* ---------- Shared scroll loop ---------- */
  const scrollSubs = new Set();
  const measureSubs = new Set();
  let queued = false;
  const run = () => { queued = false; const y = scrollY; scrollSubs.forEach(fn => fn(y)); };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  const measure = () => { measureSubs.forEach(fn => fn()); onScroll(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  window.addEventListener('load', () => {
    if (reduce || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4) });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  });

  /* ---------- In-page navigation (focus + URL) ---------- */
  const goTo = hash => {
    const el = $(hash);
    if (!el) return;
    const isTop = hash === '#main';
    if (lenis) lenis.scrollTo(isTop ? 0 : el, { offset: isTop ? 0 : -12 });
    else isTop ? scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    const target = isTop ? $('#hero-title') : el;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.pushState && history.pushState(null, '', isTop ? location.pathname : hash);
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    e.preventDefault();
    closeMenu(false);
    if (a.dataset.tier) preselect(a.dataset.tier);
    goTo(href);
  }));

  /* ---------- Menu ---------- */
  const menu = $('[data-menu]');
  const burgers = $$('[data-burger]');
  let opener = null;
  menu.inert = true;
  function setMenu(open, restore = true) {
    body.classList.toggle('menu-open', open);
    burgers.forEach(b => { b.setAttribute('aria-expanded', String(open)); });
    menu.inert = !open;
    [$('main'), $('footer'), $('[data-bar]'), $('[data-dock]'), $('.skip')].forEach(el => { if (el) el.inert = open; });
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) setTimeout(() => $('a', menu)?.focus(), 60);
    else if (restore && opener) opener.focus();
  }
  function closeMenu(restore = true) { if (body.classList.contains('menu-open')) setMenu(false, restore); }
  burgers.forEach(b => b.addEventListener('click', () => { opener = b; setMenu(true); }));
  $('[data-menu-close]').addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Compact bar + mobile dock ---------- */
  const hero = $('.hero');
  const bar = $('[data-bar]');
  const dock = $('[data-dock]');
  const contact = $('#contact');
  let heroEnd = 0, contactTop = 0, vh = innerHeight;
  const readMarks = () => { heroEnd = hero.offsetTop + hero.offsetHeight * 0.75; contactTop = contact.getBoundingClientRect().top + scrollY; vh = innerHeight; };
  readMarks(); measureSubs.add(readMarks);
  bar.inert = true;
  let barOn = null, dockOn = null;
  scrollSubs.add(y => {
    const b = y > heroEnd;
    if (b !== barOn) { bar.classList.toggle('show', b); bar.inert = !b; barOn = b; }
    const d = b && y + vh < contactTop + 160;
    if (d !== dockOn) { dock.classList.toggle('show', d); dockOn = d; }
  });
  onScroll();

  // active section in bar
  const barLinks = $$('.bar__links a');
  const secIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    barLinks.forEach(l => {
      const on = l.getAttribute('href') === '#' + en.target.id;
      l.classList.toggle('is-active', on);
      on ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current');
    });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secIO.observe(s));

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Hero glass slider (auto-advances; pauses on hover/focus) ---------- */
  const slider = $('[data-slider]');
  if (slider) {
    const slides = $$('[data-slide]', slider);
    const count = $('[data-count]', slider);
    const progress = $('[data-progress]', slider);
    let i = 0, timer = null;
    const show = n => {
      i = (n + slides.length) % slides.length;
      const w = slides[0].getBoundingClientRect().width + 9.6;
      slides.forEach(s => { s.style.transform = `translateX(${-i * w}px)`; });
      count.textContent = String(i + 1).padStart(2, '0');
      progress.style.transform = `scaleX(${(i + 1) / slides.length})`;
    };
    const play = () => { if (!reduce && !timer) timer = setInterval(() => show(i + 1), 4200); };
    const stop = () => { clearInterval(timer); timer = null; };
    slider.addEventListener('pointerenter', stop);
    slider.addEventListener('pointerleave', play);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', play);
    new IntersectionObserver(([en]) => en.isIntersecting ? play() : stop()).observe(slider);
    measureSubs.add(() => show(i));
  }

  /* ---------- Logo rail: seamless loop ---------- */
  $$('[data-marquee]').forEach(m => {
    const clone = $('ul', m).cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    $$('img', clone).forEach(img => { img.alt = ''; });
    m.appendChild(clone);
  });

  /* ---------- Image strip drifts with scroll ---------- */
  const strip = $('[data-strip]');
  const stripTrack = $('[data-strip-track]');
  if (strip && !reduce) {
    let top = 0, h = 0, overflow = 0, vh2 = innerHeight;
    const read = () => {
      const r = strip.getBoundingClientRect();
      top = r.top + scrollY; h = r.height; vh2 = innerHeight;
      overflow = Math.max(0, stripTrack.scrollWidth - strip.clientWidth + 24);
    };
    read(); measureSubs.add(read);
    scrollSubs.add(y => {
      const p = Math.min(1, Math.max(0, (y + vh2 - top) / (vh2 + h)));
      stripTrack.style.transform = `translate3d(${(-p * overflow).toFixed(1)}px, 0, 0)`;
    });
  }

  /* ---------- Quote band image parallax ---------- */
  const bandImg = $('[data-band-img]');
  if (bandImg && !reduce) {
    const card = bandImg.closest('.band__card');
    let top = 0, h = 0, vh3 = innerHeight;
    const read = () => { const r = card.getBoundingClientRect(); top = r.top + scrollY; h = r.height; vh3 = innerHeight; };
    read(); measureSubs.add(read);
    scrollSubs.add(y => {
      const p = Math.min(1, Math.max(0, (y + vh3 - top) / (vh3 + h)));
      bandImg.style.transform = `translate3d(0, ${(-p * 13).toFixed(2)}%, 0)`;
    });
  }

  /* ---------- Number count-up ---------- */
  const fmt = (n, comma) => comma ? n.toLocaleString('en-US') : String(n);
  const countIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target, to = +el.dataset.countTo, comma = el.dataset.format === 'comma';
    if (reduce) return;
    const t0 = performance.now(), dur = 1100;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(to * e), comma);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(0, comma);
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count-to]').forEach(el => countIO.observe(el));

  /* ---------- Services: accordion + crossfading image ---------- */
  const rows = $$('.svc__row');
  const viewA = $('[data-view-a]'), viewB = $('[data-view-b]');
  let front = viewA, back = viewB, current = viewA.getAttribute('src');
  const showImg = src => {
    if (!src || src === current) return;
    current = src;
    back.src = src;
    back.style.opacity = '1';
    front.style.opacity = '0';
    [front, back] = [back, front];
  };
  const setRow = (row, open) => {
    row.setAttribute('aria-expanded', String(open));
    row.parentElement.classList.toggle('open', open);
    $('.svc__body', row.parentElement).inert = !open;
  };
  rows.forEach((row, n) => {
    setRow(row, n === 0);
    row.addEventListener('click', () => {
      const open = row.getAttribute('aria-expanded') !== 'true';
      rows.forEach(r => r !== row && setRow(r, false));
      setRow(row, open);
      showImg(row.dataset.img);
    });
    if (finePointer) row.addEventListener('pointerenter', () => showImg(row.dataset.img));
    row.addEventListener('focus', () => showImg(row.dataset.img));
    const pre = new Image(); pre.src = row.dataset.img;
  });

  /* ---------- Form ---------- */
  const form = $('[data-form]');
  const status = $('[data-status]', form);
  const submit = $('[data-submit]', form);
  const label = $('[data-submit-label]', form);
  const note = status.innerHTML;

  function preselect(name) {
    const r = form.querySelector(`input[name="tier"][value="${name}"]`);
    if (!r) return;
    r.checked = true;
    status.textContent = `${name} selected. Add your details below.`;
    setTimeout(() => { if (!form.classList.contains('sent')) status.innerHTML = note; }, 5000);
  }

  const rules = {
    name: v => v.trim().length >= 2 || 'Please tell us your name.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address, for example name@domain.ch.',
  };
  const validate = input => {
    const res = rules[input.name] ? rules[input.name](input.value) : true;
    const field = input.closest('.field');
    const bad = res !== true;
    field.classList.toggle('invalid', bad);
    input.setAttribute('aria-invalid', String(bad));
    $('.field__err', field).textContent = bad ? res : '';
    return !bad;
  };
  $$('input[required]', form).forEach(i => {
    i.addEventListener('blur', () => { if (i.value) validate(i); });
    i.addEventListener('input', () => { if (i.closest('.field').classList.contains('invalid')) validate(i); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bad = $$('input[required]', form).filter(i => !validate(i));
    if (bad.length) {
      form.classList.add('failed');
      status.textContent = bad.length === 1 ? 'One field needs your attention.' : `${bad.length} fields need your attention.`;
      bad[0].focus();
      return;
    }
    form.classList.remove('failed', 'sent');
    const d = Object.fromEntries(new FormData(form));
    if (FORM_ENDPOINT) {
      submit.setAttribute('aria-busy', 'true'); submit.disabled = true; label.textContent = 'Sending…';
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...d, _subject: `Consultation request: ${d.name}` }) });
        if (!res.ok) throw new Error(String(res.status));
        form.reset(); form.classList.add('sent');
        status.textContent = `Thank you, ${d.name.trim().split(' ')[0]}. Your request has reached us, and a Lifestyle Manager will be in touch personally.`;
      } catch (err) {
        form.classList.add('failed');
        status.innerHTML = 'We couldn’t send your request just now. Please call <a href="tel:+41768197898">+41 76 819 78 98</a> or write to <a href="mailto:info@relocart.ch">info@relocart.ch</a>.';
      } finally {
        submit.removeAttribute('aria-busy'); submit.disabled = false; label.textContent = 'Send request';
      }
      return;
    }
    const text = `Name: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || '-'}\nMembership of interest: ${d.tier}\n\n${d.message || ''}`;
    location.href = `mailto:info@relocart.ch?subject=${encodeURIComponent('Consultation request: ' + d.name)}&body=${encodeURIComponent(text)}`;
    status.innerHTML = 'Your email app should now open with your request ready to send. If nothing happens, write to <a href="mailto:info@relocart.ch">info@relocart.ch</a>.';
  });

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
