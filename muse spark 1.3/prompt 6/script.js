/* MAISON NOIR — interactions (vanilla JS, file:// safe) */
(function () {
  'use strict';

  /* ---------- Preloader ---------- */
  window.addEventListener('load', function () {
    setTimeout(function () {
      document.getElementById('preloader').classList.add('done');
    }, 900);
  });
  // Fallback if load already fired / images slow
  setTimeout(function () {
    document.getElementById('preloader').classList.add('done');
  }, 3500);

  /* ---------- Navbar ---------- */
  var navbar = document.getElementById('navbar');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    navbar.classList.toggle('scrolled', y > 40);
    toTop.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', function () {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  // Active link highlighting
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = navLinks.querySelectorAll('a[href^="#"]');
  function highlight() {
    var pos = window.scrollY + 140;
    var current = 'home';
    sections.forEach(function (s) {
      if (s.offsetTop <= pos) current = s.id;
    });
    navAnchors.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', highlight, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObs.observe(el);
  });

  /* ---------- Animated counters ---------- */
  var counted = false;
  var counterObs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !counted) {
      counted = true;
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
        var start = null, dur = 1600;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
      counterObs.disconnect();
    }
  }, { threshold: 0.4 });
  var heroMeta = document.querySelector('.hero-meta');
  if (heroMeta) counterObs.observe(heroMeta);

  /* ---------- MENU DATA + TABS ---------- */
  var MENU = {
    starters: [
      { name: 'Burrata di Puglia', desc: 'Creamy burrata, heirloom tomato, basil oil, aged balsamic, grilled sourdough.', price: 24, img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=700&auto=format&fit=crop', tag: 'Vegetarian', veg: true, stars: '★★★★★' },
      { name: 'Seared Hokkaido Scallops', desc: 'Cauliflower velouté, caviar, brown butter, micro herbs, lemon pearls.', price: 32, img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=700&auto=format&fit=crop', tag: "Chef's Signature", stars: '★★★★★' },
      { name: 'Tuna Tartare Noir', desc: 'Yellowfin tuna, avocado mousse, sesame tuile, ponzu, charcoal salt.', price: 28, img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=700&auto=format&fit=crop', tag: 'Popular', stars: '★★★★☆' },
      { name: 'Wild Mushroom Velouté', desc: 'Porcini & chanterelle cream, truffle oil, chive crème, toasted hazelnut.', price: 19, img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=700&auto=format&fit=crop', tag: 'Vegetarian', veg: true, stars: '★★★★☆' },
      { name: 'Foie Gras Torchon', desc: 'Sauternes gelée, brioche, fig compote, smoked sea salt, micro greens.', price: 34, img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=700&auto=format&fit=crop', tag: 'Luxury', stars: '★★★★★' },
      { name: 'Crispy Calamari Noir', desc: 'Squid-ink tempura, saffron aioli, charred lemon, parsley dust.', price: 22, img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=700&auto=format&fit=crop', tag: 'Popular', stars: '★★★★☆' }
    ],
    mains: [
      { name: 'Dry-Aged Ribeye', desc: '45-day aged, bone-marrow jus, pommes purée, charcoal onions, watercress.', price: 68, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=700&auto=format&fit=crop', tag: "Chef's Signature", stars: '★★★★★' },
      { name: 'Faroe Salmon', desc: 'Miso-glazed salmon, beurre blanc, baby leeks, trout roe, dill oil.', price: 42, img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=700&auto=format&fit=crop', tag: 'Popular', stars: '★★★★★' },
      { name: 'Truffle Tagliolini', desc: 'Hand-cut pasta, Périgord black truffle, aged parmesan, golden yolk.', price: 38, img: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=700&auto=format&fit=crop', tag: 'Vegetarian', veg: true, stars: '★★★★★' },
      { name: 'Herb-Crusted Lamb', desc: 'Rack of lamb, pistachio crust, smoked aubergine, pomegranate jus.', price: 54, img: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=700&auto=format&fit=crop', tag: "Chef's Signature", stars: '★★★★★' },
      { name: 'Duck à l’Orange', desc: 'Dry-aged duck breast, charred endive, orange gastrique, duck-fat carrot.', price: 46, img: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?q=80&w=700&auto=format&fit=crop', tag: 'Classic', stars: '★★★★☆' },
      { name: 'Garden Risotto', desc: 'Carnaroli rice, wild mushrooms, aged Comté, thyme, white truffle shavings.', price: 32, img: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=700&auto=format&fit=crop', tag: 'Vegetarian', veg: true, stars: '★★★★☆' }
    ],
    desserts: [
      { name: 'Valrhona Noir Sphere', desc: 'Dark chocolate sphere, salted caramel, gold leaf, tableside pour.', price: 18, img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=700&auto=format&fit=crop', tag: "Chef's Signature", stars: '★★★★★' },
      { name: 'Crème Brûlée Vanille', desc: 'Tahitian vanilla bean custard, torched sugar, almond tuile.', price: 14, img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=700&auto=format&fit=crop', tag: 'Classic', stars: '★★★★★' },
      { name: 'Pistachio Opera', desc: 'Pistachio sponge, raspberry ganache, mascarpone cloud, rose dust.', price: 16, img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=700&auto=format&fit=crop', tag: 'Popular', stars: '★★★★☆' },
      { name: 'Lemon Olive Tart', desc: 'Meyer lemon curd, olive-oil crust, torched meringue, basil sugar.', price: 15, img: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?q=80&w=700&auto=format&fit=crop', tag: 'Seasonal', stars: '★★★★☆' }
    ],
    drinks: [
      { name: 'Smoked Old Fashioned', desc: 'Oak-smoked bourbon, demerara, black walnut bitters, orange oils.', price: 21, img: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=700&auto=format&fit=crop', tag: 'House Icon', stars: '★★★★★' },
      { name: 'Noir Martini', desc: 'Butter-washed gin, dry vermouth, charcoal olive, lemon mist.', price: 19, img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=700&auto=format&fit=crop', tag: 'Popular', stars: '★★★★☆' },
      { name: 'Barolo Riserva 2016', desc: 'Prestigious cellar pour — cherry, rose, tar. Glass / bottle available.', price: 34, img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=700&auto=format&fit=crop', tag: 'Cellar Pick', stars: '★★★★★' },
      { name: 'Champagne Delamotte', desc: 'Blanc de Blancs NV — citrus, brioche, chalk. The celebration pour.', price: 28, img: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?q=80&w=700&auto=format&fit=crop', tag: 'Sparkling', stars: '★★★★★' }
    ]
  };

  var menuGrid = document.getElementById('menuGrid');
  function dishCard(d) {
    return (
      '<article class="dish">' +
        '<div class="dish-img"><img loading="lazy" src="' + d.img + '" alt="' + d.name + '" />' +
        (d.tag ? '<span class="dish-tag' + (d.veg ? ' veg' : '') + '">' + d.tag + '</span>' : '') +
        '<span class="dish-price">$' + d.price + '</span></div>' +
        '<div class="dish-body"><h3>' + d.name + '</h3><p>' + d.desc + '</p>' +
        '<div class="dish-foot"><span class="stars">' + d.stars + '</span>' +
        '<button class="add-btn" data-dish="' + d.name + '">Add +</button></div></div>' +
      '</article>'
    );
  }
  function renderMenu(cat) {
    menuGrid.innerHTML = MENU[cat].map(dishCard).join('');
    var cards = menuGrid.querySelectorAll('.dish');
    cards.forEach(function (c, i) {
      setTimeout(function () { c.classList.add('show'); }, 60 * i);
    });
    menuGrid.querySelectorAll('.add-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-dish');
        b.textContent = 'Added ✓';
        b.style.background = '#c9a35c';
        b.style.color = '#141310';
        setTimeout(function () { b.textContent = 'Add +'; b.style.background = ''; b.style.color = ''; }, 1400);
        toast('“' + name + '” noted — mention it when reserving!');
      });
    });
  }
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      renderMenu(t.getAttribute('data-cat'));
    });
  });
  renderMenu('starters');

  /* ---------- Toast ---------- */
  function toast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#141419;border:1px solid #c9a35c;color:#e8c987;padding:13px 26px;border-radius:999px;z-index:1800;font-size:.9rem;opacity:0;transition:.4s;box-shadow:0 20px 50px rgba(0,0,0,.5);max-width:90vw;text-align:center';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  /* ---------- Reviews slider ---------- */
  var slides = document.getElementById('slides');
  var cards = slides.querySelectorAll('.review-card');
  var dotsWrap = document.getElementById('dots');
  var idx = 0, perView = 3, autoTimer = null;

  function calcPerView() {
    perView = window.innerWidth <= 640 ? 1 : window.innerWidth <= 1024 ? 2 : 3;
  }
  function maxIdx() { return Math.max(0, cards.length - perView); }
  function buildDots() {
    dotsWrap.innerHTML = '';
    for (var i = 0; i <= maxIdx(); i++) {
      (function (n) {
        var d = document.createElement('span');
        if (n === idx) d.classList.add('active');
        d.addEventListener('click', function () { idx = n; update(); restartAuto(); });
        dotsWrap.appendChild(d);
      })(i);
    }
  }
  function update() {
    calcPerView();
    if (idx > maxIdx()) idx = maxIdx();
    var gap = 24;
    var w = cards[0].offsetWidth + gap;
    slides.style.transform = 'translateX(' + (-idx * w) + 'px)';
    buildDots();
  }
  document.getElementById('nextBtn').addEventListener('click', function () {
    idx = idx >= maxIdx() ? 0 : idx + 1; update(); restartAuto();
  });
  document.getElementById('prevBtn').addEventListener('click', function () {
    idx = idx <= 0 ? maxIdx() : idx - 1; update(); restartAuto();
  });
  function restartAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function () {
      idx = idx >= maxIdx() ? 0 : idx + 1; update();
    }, 5000);
  }
  window.addEventListener('resize', update);
  update();
  restartAuto();
  // touch swipe
  var startX = 0;
  slides.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  slides.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) idx = idx >= maxIdx() ? 0 : idx + 1;
      else idx = idx <= 0 ? maxIdx() : idx - 1;
      update(); restartAuto();
    }
  }, { passive: true });

  /* ---------- Gallery lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  document.querySelectorAll('.g-item').forEach(function (f) {
    f.addEventListener('click', function () {
      var img = f.querySelector('img');
      lbImg.src = img.src.replace('w=700', 'w=1400');
      lbImg.alt = img.alt;
      lbCap.textContent = f.querySelector('figcaption').textContent;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });
  function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; }
  document.getElementById('lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeLb(); closeModal(); } });

  /* ---------- Reservation ---------- */
  var resForm = document.getElementById('resForm');
  var formError = document.getElementById('formError');
  var resModal = document.getElementById('resModal');
  var modalText = document.getElementById('modalText');
  var rDate = document.getElementById('rDate');
  // min = today, max = +60 days
  var today = new Date();
  function iso(d) { return d.toISOString().split('T')[0]; }
  rDate.min = iso(today);
  var maxD = new Date(); maxD.setDate(maxD.getDate() + 60);
  rDate.max = iso(maxD);

  resForm.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.textContent = '';
    var name = document.getElementById('rName').value.trim();
    var phone = document.getElementById('rPhone').value.trim();
    var email = document.getElementById('rEmail').value.trim();
    var time = document.getElementById('rTime').value;
    var guests = document.getElementById('rGuests').value;
    if (name.length < 2) return (formError.textContent = 'Please enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return (formError.textContent = 'Please enter a valid email address.');
    if (phone.replace(/\D/g, '').length < 7) return (formError.textContent = 'Please enter a valid phone number.');
    if (!rDate.value) return (formError.textContent = 'Please choose a date.');
    if (!time) return (formError.textContent = 'Please choose a time.');
    if (!guests) return (formError.textContent = 'Please select party size.');
    var niceDate = new Date(rDate.value + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    modalText.innerHTML = '<strong style="color:#e8c987">' + escapeHtml(name) + '</strong>, your table for <strong style="color:#e8c987">' + escapeHtml(guests) + '</strong> is held for <strong style="color:#e8c987">' + niceDate + ' at ' + escapeHtml(time) + '</strong>.';
    resModal.classList.add('open');
    try {
      var bookings = JSON.parse(localStorage.getItem('mn_bookings') || '[]');
      bookings.push({ name: name, email: email, date: rDate.value, time: time, guests: guests, at: Date.now() });
      localStorage.setItem('mn_bookings', JSON.stringify(bookings));
    } catch (err) { /* private mode — ignore */ }
    resForm.reset();
  });
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function closeModal() { resModal.classList.remove('open'); }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  resModal.addEventListener('click', function (e) { if (e.target === resModal) closeModal(); });

  /* ---------- Contact ---------- */
  document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('contactError');
    var ok = document.getElementById('contactSuccess');
    err.textContent = ''; ok.textContent = '';
    var n = document.getElementById('cName').value.trim();
    var em = document.getElementById('cEmail').value.trim();
    var m = document.getElementById('cMsg').value.trim();
    if (n.length < 2) return (err.textContent = 'Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return (err.textContent = 'Please enter a valid email.');
    if (m.length < 10) return (err.textContent = 'Tell us a little more (min. 10 characters).');
    ok.textContent = 'Thank you, ' + n.split(' ')[0] + ' — your message is on its way. We reply within 24h.';
    this.reset();
  });

  /* ---------- Newsletter ---------- */
  document.getElementById('nlBtn').addEventListener('click', function () {
    var input = document.getElementById('nlEmail');
    var msg = document.getElementById('nlMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())) {
      msg.style.color = '#ff9c9c'; msg.textContent = 'Please enter a valid email.';
      return;
    }
    msg.style.color = '#9fe8b8'; msg.textContent = 'Welcome to the table — see you in your inbox.';
    input.value = '';
  });

  /* ---------- Open-now badge ---------- */
  (function openNow() {
    var el = document.getElementById('openText');
    var badge = document.getElementById('openBadge');
    if (!el) return;
    var now = new Date(), d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    // Sun=0 ... Sat=6 ; hours in minutes
    var open, close;
    if (d >= 1 && d <= 4) { open = 17 * 60 + 30; close = 22 * 60 + 30; }
    else if (d === 5) { open = 17 * 60 + 30; close = 23 * 60 + 30; }
    else if (d === 6) { open = 12 * 60; close = 23 * 60 + 30; }
    else { open = 12 * 60; close = 21 * 60 + 30; }
    if (mins >= open && mins < close) { el.textContent = 'Open now · until ' + fmt(close); }
    else {
      badge.classList.add('closed');
      el.textContent = mins < open ? 'Closed · opens ' + fmt(open) + ' today' : 'Closed · opens tomorrow';
    }
    function fmt(m) {
      var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
    }
  })();
})();
