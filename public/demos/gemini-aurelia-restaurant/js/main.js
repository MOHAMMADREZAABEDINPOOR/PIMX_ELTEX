/**
 * AURELIA HAUTE CUISINE & WINE ATELIER
 * Production-Ready Vanilla JavaScript Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHeroParticles();
  initMenuSystem();
  initReservationSystem();
  initGallerySystem();
  initReviewsSystem();
  initConciergeChat();
  initAmbientAudio();
});

/* ==========================================================================
   1. NAVIGATION & SCROLL SYSTEM
   ========================================================================== */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  const drawerOverlay = document.querySelector('.drawer-overlay');
  const drawerCloseBtn = document.querySelector('.drawer-close-btn');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-links a');

  // Sticky header with glass blur
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    updateActiveNavLink();
  });

  // Mobile drawer controls
  function openMobileNav() {
    mobileDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.openMobileNav = openMobileNav;
  window.closeMobileNav = closeMobileNav;

  if (mobileBtn) mobileBtn.addEventListener('click', openMobileNav);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeMobileNav);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeMobileNav);

  // Smooth scroll & close drawer on click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          closeMobileNav();
          const headerHeight = header.offsetHeight;
          const targetPos = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight + 10;
          window.scrollTo({
            top: targetPos,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Scrollspy active state
  function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.scrollY + 120;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop;
      const sectionId = current.getAttribute('id');
      const matchingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        if (matchingLink) {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          matchingLink.classList.add('active');
        }
      }
    });
  }
}

/* ==========================================================================
   2. HERO GOLD EMBER / PARTICLE CANVAS
   ========================================================================== */
function initHeroParticles() {
  const canvas = document.getElementById('hero-particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(window.innerWidth < 768 ? 25 : 60, 70);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.5 - 0.2,
      opacity: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.3 ? '#d4af37' : '#f7e7a9'
    });
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity += Math.sin(Date.now() * 0.002) * 0.003;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0.1, Math.min(0.8, p.opacity));
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#d4af37';
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(renderParticles);
  }

  renderParticles();
}

/* ==========================================================================
   3. MENU SYSTEM & DISH MODAL
   ========================================================================== */
const MENU_ITEMS = [
  // Hors d'Œuvres & Starters
  {
    id: 1,
    name: "Oscietra Caviar & Smoked Brioche",
    frenchSubtitle: "Caviar Royal d'Oscietre & Brioche Dorée",
    category: "starters",
    price: "$95",
    tags: ["Signature", "Seafood"],
    dietary: ["seafood"],
    image: "assets/e06269260c8ad73f.webp",
    description: "Imperial Caspian Oscietra caviar delicately presented on warm artisanal brioche with cultured Normandy creme fraiche, chive oil emulsion, and 24k gold leaf.",
    winePairing: "Dom Pérignon Vintage 2013 Brut",
    allergens: "Gluten, Dairy, Fish",
    chefNote: "Served at a calibrated 4°C with hand-carved mother-of-pearl spoons to preserve pure maritime sweetness."
  },
  {
    id: 2,
    name: "Black Périgord Truffle Tartlet",
    frenchSubtitle: "Tartelette aux Truffes Noires & Morilles",
    category: "starters",
    price: "$68",
    tags: ["Signature", "Vegetarian"],
    dietary: ["vegetarian"],
    image: "assets/beacef2296765693.webp",
    description: "Caramelized shallot sablé tart filled with wild morel fricassee, aged Comte froth, and generous ribbons of freshly planed Périgord black truffle.",
    winePairing: "Meursault Premier Cru Domaine Roulot 2020",
    allergens: "Gluten, Dairy",
    chefNote: "The truffles are flown weekly from Sarlat, France, during peak winter harvest."
  },
  {
    id: 3,
    name: "Hokkaido Scallop Carpaccio",
    frenchSubtitle: "Carpaccio de Saint-Jacques & Yuzu Perlé",
    category: "starters",
    price: "$58",
    tags: ["Seafood", "Gluten-Free"],
    dietary: ["seafood", "gluten-free"],
    image: "assets/a4cbdec3f04a102e.webp",
    description: "Thinly shaved wild Hokkaido diver scallops, white truffle vinaigrette, finger lime caviar pearls, shiso leaves, and crushed pink peppercorn sea salt.",
    winePairing: "Chablis Grand Cru Les Clos 2019",
    allergens: "Molluscs",
    chefNote: "Caught sustainably off the icy shores of northern Japan, plated within 36 hours."
  },

  // Prime Mains
  {
    id: 4,
    name: "A5 Miyazaki Wagyu Tenderloin",
    frenchSubtitle: "Filet de Wagyu Miyazaki A5 & Moelle Fumée",
    category: "mains",
    price: "$185",
    tags: ["Signature", "Chef's Special"],
    dietary: ["gluten-free"],
    image: "assets/e06269260c8ad73f.webp",
    description: "Charcoal-seared Miyazaki Japanese Wagyu (BMS 11), glazed with aged binchotan jus, smoked bone marrow potato mousseline, and heirloom baby root vegetables.",
    winePairing: "Château Margaux Premier Grand Cru Classé 2010",
    allergens: "Dairy",
    chefNote: "Cooked slowly over Japanese Binchotan oak charcoal to unlock extraordinary umami marbling."
  },
  {
    id: 5,
    name: "Glazed Challandais Duck Breast",
    frenchSubtitle: "Magret de Canard de Challans aux Cerises Noires",
    category: "mains",
    price: "$88",
    tags: ["Signature"],
    dietary: ["gluten-free"],
    image: "assets/2951a3d433dbe7ca.webp",
    description: "Dry-aged Challandais duck breast roasted on the bone, infused with spiced sour cherry gastrique, parsnip velvet puree, and crispy heritage duck skin crackling.",
    winePairing: "Vosne-Romanée Domaine de la Romanée-Conti 2017",
    allergens: "None",
    chefNote: "Aged for 21 days in our custom Himalayan salt chamber for concentrated game richness."
  },
  {
    id: 6,
    name: "Wild Morel & Chanterelle Risotto",
    frenchSubtitle: "Risotto Acquerello aux Morilles & Truffe Blanche",
    category: "mains",
    price: "$72",
    tags: ["Vegetarian", "Gluten-Free"],
    dietary: ["vegetarian", "gluten-free"],
    image: "assets/18609b5024fb936c.webp",
    description: "Aged Acquerello carnaroli rice simmered in golden vegetable broth, finished with 36-month Parmigiano Reggiano, forest-foraged chanterelles, and white truffle mist.",
    winePairing: "Barolo Monfortino Riserva Giacomo Conterno 2015",
    allergens: "Dairy",
    chefNote: "Acquerello rice is aged for one full year before milling to achieve incomparable starch structure."
  },

  // Ocean Delicacies
  {
    id: 7,
    name: "Brittany Blue Lobster Thermidor",
    frenchSubtitle: "Homard Bleu de Bretagne Thermidor Moderne",
    category: "ocean",
    price: "$145",
    tags: ["Signature", "Seafood"],
    dietary: ["seafood"],
    image: "assets/f81e80354dec94bd.webp",
    description: "Whole wild Brittany blue lobster poached in aromatic court-bouillon, gratinéed with Cognac reduction, Dijon velvet, tarragon sabayon, and black truffles.",
    winePairing: "Puligny-Montrachet Domaine Leflaive 2018",
    allergens: "Crustacean, Dairy, Gluten",
    chefNote: "Recognized universally as the king of crustaceans, harvested by hand in Brittany tidal reefs."
  },
  {
    id: 8,
    name: "Chilean Sea Bass en Papillote",
    frenchSubtitle: "Loup de Mer Chilien & Bouillon Dashi au Safran",
    category: "ocean",
    price: "$92",
    tags: ["Seafood", "Gluten-Free"],
    dietary: ["seafood", "gluten-free"],
    image: "assets/28ac2eec516b2873.webp",
    description: "Sustainably caught Patagonian sea bass enveloped in delicate parchment with saffron kaffir dashi, baby bok choy, lotus root, and crystallized ginger oil.",
    winePairing: "Condrieu La Doriane E. Guigal 2021",
    allergens: "Fish, Soy",
    chefNote: "Steamed gently at 82°C to yield buttery flakes that dissolve effortlessly on the palate."
  },

  // Decadent Desserts
  {
    id: 9,
    name: "Valrhona Guanaja Golden Sphere",
    frenchSubtitle: "Sphère Éclat d'Or & Chocolat Grand Cru",
    category: "desserts",
    price: "$45",
    tags: ["Signature", "Vegetarian"],
    dietary: ["vegetarian"],
    image: "assets/0b67e070227610cb.webp",
    description: "Thin 70% dark Valrhona sphere melted tableside with hot salted caramel ganache, revealing smoked hazelnut praline crunch and Tahitian vanilla bean gelato.",
    winePairing: "Château d'Yquem Premier Cru Supérieur 2011",
    allergens: "Dairy, Nuts, Gluten",
    chefNote: "An interactive tableside visual performance of heat melting the golden shell."
  },
  {
    id: 10,
    name: "Wild Violet & Lychee Soufflé",
    frenchSubtitle: "Soufflé Flambé à la Violette & Litchi Givré",
    category: "desserts",
    price: "$38",
    tags: ["Vegetarian"],
    dietary: ["vegetarian"],
    image: "assets/490c34d8bfdc3e65.webp",
    description: "Featherweight hot rising soufflé infused with alpine violet liqueur, paired with chilled rose lychee sorbet and candied violet petals.",
    winePairing: "Moscato d'Asti Vietti Cascinetta 2022",
    allergens: "Eggs, Dairy, Gluten",
    chefNote: "Baked strictly to order with an exact 14-minute oven rise window."
  },

  // Cellar & Mixology
  {
    id: 11,
    name: "The Aurelia Royal Smoked Old Fashioned",
    frenchSubtitle: "Cocktail d'Auteur au Bois de Chêne Fumé",
    category: "cellar",
    price: "$36",
    tags: ["Signature"],
    dietary: [],
    image: "assets/2ecc34b303ea6afb.webp",
    description: "Macallan 18-Year Double Cask, Madagascar smoked vanilla reduction, Angostura & chocolate bitters, flamed under French oak smoke inside a bell jar.",
    winePairing: "Enjoyed as an aperitif or digestif",
    allergens: "None",
    chefNote: "Smoked tableside with charred stave chips from vintage Bordeaux barrels."
  },
  {
    id: 12,
    name: "Dom Pérignon Reserve Sommelier Flight",
    frenchSubtitle: "Dégustation Prestige Trois Millésimes",
    category: "cellar",
    price: "$160",
    tags: ["Signature"],
    dietary: [],
    image: "assets/5ae0a4afe50d76f1.webp",
    description: "Three curated 75ml pours featuring vintage Dom Pérignon 2013, Rosé 2008, and rare P2 Plénitude 2004, guided with sommelier commentary.",
    winePairing: "Complements our whole tasting progression",
    allergens: "Sulphites",
    chefNote: "Presented in hand-blown Zalto Austrian crystal glassware."
  }
];

function initMenuSystem() {
  const cardsGrid = document.getElementById('menu-cards-grid');
  const tabBtns = document.querySelectorAll('.menu-tab-btn');
  const searchInput = document.getElementById('menu-search-input');
  const dietaryBtns = document.querySelectorAll('.dietary-tag-btn');

  let currentCategory = 'all';
  let activeDietary = 'all';
  let searchQuery = '';

  function renderMenu() {
    if (!cardsGrid) return;

    const filtered = MENU_ITEMS.filter(item => {
      const matchCategory = currentCategory === 'all' || item.category === currentCategory;
      const matchDietary = activeDietary === 'all' || item.dietary.includes(activeDietary);
      const matchSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.frenchSubtitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchDietary && matchSearch;
    });

    if (filtered.length === 0) {
      cardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
          <i class="fa-solid fa-utensils" style="font-size: 2.5rem; color: var(--gold-primary); margin-bottom: 16px; display:block;"></i>
          <h3 style="font-family: var(--font-serif-display); color: var(--text-pure); margin-bottom: 8px;">No culinary creations match your filter</h3>
          <p>Try clearing your dietary filter or search query to view our complete collection.</p>
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = filtered.map(dish => `
      <article class="food-card" data-dish-id="${dish.id}">
        <div class="food-card-img-wrap">
          <img src="${dish.image}" alt="${dish.name}" class="food-card-img" loading="lazy" />
          <div class="food-card-overlay-badge">
            ${dish.tags.map(tag => `<span class="badge-tag ${tag.toLowerCase().includes('signature') ? 'badge-signature' : tag.toLowerCase().includes('seafood') ? 'badge-wine' : 'badge-diet'}">${tag}</span>`).join('')}
          </div>
          <div class="food-card-price-tag">${dish.price}</div>
        </div>
        <div class="food-card-body">
          <div class="food-card-title-row">
            <h3 class="food-card-title">${dish.name}</h3>
          </div>
          <p class="food-card-french-sub">${dish.frenchSubtitle}</p>
          <p class="food-card-desc">${dish.description}</p>
          <div class="food-card-footer">
            <div class="sommelier-pairing">
              <i class="fa-solid fa-wine-glass"></i>
              <span>${dish.winePairing.length > 28 ? dish.winePairing.substring(0, 26) + '...' : dish.winePairing}</span>
            </div>
            <button class="btn-dish-details" onclick="openDishModal(${dish.id})">
              Details <i class="fa-solid fa-arrow-right" style="margin-left: 4px; font-size: 0.65rem;"></i>
            </button>
          </div>
        </div>
      </article>
    `).join('');
  }

  // Event Listeners for Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderMenu();
    });
  });

  // Dietary filter buttons
  dietaryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dietaryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDietary = btn.dataset.diet;
      renderMenu();
    });
  });

  // Search input live filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderMenu();
    });
  }

  // Initial render
  renderMenu();
}

// Global modal opener for dish
window.openDishModal = function(id) {
  const dish = MENU_ITEMS.find(item => item.id === id);
  if (!dish) return;

  const modal = document.getElementById('dish-modal');
  const modalBody = document.getElementById('dish-modal-content');

  modalBody.innerHTML = `
    <div style="position: relative; height: 260px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 24px;">
      <img src="${dish.image}" alt="${dish.name}" style="width:100%; height:100%; object-fit: cover; filter: brightness(0.9);" />
      <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(8,8,12,0.85); padding: 6px 14px; border-radius: 4px; border: 1px solid var(--gold-primary); font-family: var(--font-serif-display); color: var(--gold-light); font-size: 1.3rem;">
        ${dish.price}
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <span class="section-tag" style="margin-bottom: 8px;">AURELIA SIGNATURE CREATION</span>
      <h2 style="font-family: var(--font-serif-display); font-size: 1.8rem; margin-bottom: 4px; color: var(--text-pure);">${dish.name}</h2>
      <p style="font-family: var(--font-serif-body); font-style: italic; color: var(--gold-primary); font-size: 1.15rem;">${dish.frenchSubtitle}</p>
    </div>
    
    <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 24px;">
      ${dish.description}
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--gold-border); padding: 18px; border-radius: var(--radius-sm); margin-bottom: 24px;">
      <div>
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim); display: block; letter-spacing: 0.1em; margin-bottom: 4px;">Sommelier Cellar Pairing</span>
        <strong style="color: var(--gold-light); font-size: 0.85rem;"><i class="fa-solid fa-wine-bottle" style="color: var(--gold-primary); margin-right: 6px;"></i> ${dish.winePairing}</strong>
      </div>
      <div>
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim); display: block; letter-spacing: 0.1em; margin-bottom: 4px;">Allergen Transparency</span>
        <strong style="color: #fff; font-size: 0.85rem;"><i class="fa-solid fa-circle-exclamation" style="color: var(--gold-primary); margin-right: 6px;"></i> ${dish.allergens}</strong>
      </div>
    </div>

    <div style="border-left: 2px solid var(--gold-primary); padding-left: 16px; margin-bottom: 28px;">
      <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold-primary); font-weight: 700;">Chef Laurent's Gastronomic Note</span>
      <p style="font-family: var(--font-serif-body); font-style: italic; color: #d0d0d8; font-size: 1.05rem; margin-top: 4px;">
        "${dish.chefNote}"
      </p>
    </div>

    <div style="display: flex; gap: 14px; justify-content: flex-end;">
      <button class="btn btn-outline btn-sm" onclick="closeModal('dish-modal')">Close</button>
      <a href="#reservation" class="btn btn-gold btn-sm" onclick="closeModal('dish-modal')">Reserve Table for This Dish</a>
    </div>
  `;

  modal.classList.add('active');
};

/* ==========================================================================
   4. INTERACTIVE TABLE RESERVATION SYSTEM
   ========================================================================== */
function initReservationSystem() {
  const form = document.getElementById('reservation-form');
  const dateInput = document.getElementById('res-date');
  const timeSlotBtns = document.querySelectorAll('.time-slot-btn');
  const selectedTimeInput = document.getElementById('res-time-selected');

  // Set default minimum date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  // Interactive time slot selection
  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      timeSlotBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (selectedTimeInput) {
        selectedTimeInput.value = btn.dataset.time;
      }
    });
  });

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const guests = document.getElementById('res-guests').value;
      const date = document.getElementById('res-date').value;
      const time = selectedTimeInput.value || "20:00";
      const zoneEl = document.querySelector('input[name="seating_zone"]:checked');
      const zone = zoneEl ? zoneEl.value : "The Grand Salon";
      const name = document.getElementById('res-name').value;
      const email = document.getElementById('res-email').value;
      const phone = document.getElementById('res-phone').value;
      const occasion = document.getElementById('res-occasion').value;
      const notes = document.getElementById('res-notes').value;

      // Generate unique luxury booking code
      const bookingCode = "AUR-" + Math.floor(100000 + Math.random() * 900000);

      // Populate confirmation ticket modal
      const confModal = document.getElementById('confirmation-modal');
      const confDetails = document.getElementById('confirmation-ticket-content');

      confDetails.innerHTML = `
        <div class="ticket-badge-icon">
          <i class="fa-solid fa-check"></i>
        </div>
        <h3 style="font-family: var(--font-serif-display); text-align: center; color: var(--gold-light); font-size: 1.6rem; margin-bottom: 6px;">
          Reservation Confirmed
        </h3>
        <p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 24px;">
          An official confirmation receipt has been dispatched to <strong>${email}</strong>
        </p>

        <div class="ticket-details-box">
          <div class="ticket-row">
            <span class="ticket-label">Booking Reference</span>
            <span class="ticket-value" style="font-size: 1.1rem; letter-spacing: 0.1em; color: var(--gold-light);">${bookingCode}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Guest of Honor</span>
            <span class="ticket-value">${name}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Date & Time</span>
            <span class="ticket-value">${formatReservationDate(date)} at ${time}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Party Size</span>
            <span class="ticket-value">${guests} Guests</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Atmosphere / Zone</span>
            <span class="ticket-value">${zone}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Dining Occasion</span>
            <span class="ticket-value">${occasion}</span>
          </div>
          ${notes ? `
          <div class="ticket-row" style="flex-direction: column; gap: 4px;">
            <span class="ticket-label">Dietary / Concierge Notes</span>
            <span class="ticket-value" style="font-weight: 400; font-size: 0.8rem; color: var(--text-main);">${notes}</span>
          </div>` : ''}
        </div>

        <div style="background: rgba(212,175,55,0.06); border: 1px solid var(--gold-border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
          <i class="fa-solid fa-shield-halved" style="color: var(--gold-primary); font-size: 1.2rem;"></i>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Valet parking is reserved for your vehicle upon arrival. Please observe our smart-elegant dress code.
          </span>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-gold btn-sm" onclick="downloadICS('${bookingCode}', '${date}', '${time}', '${guests}', '${zone}')">
            <i class="fa-regular fa-calendar-plus"></i> Add to Calendar (.ics)
          </button>
          <button class="btn btn-outline btn-sm" onclick="closeModal('confirmation-modal')">
            Close
          </button>
        </div>
      `;

      confModal.classList.add('active');
      showToast(`Reservation #${bookingCode} confirmed for ${name}!`);
      form.reset();
    });
  }
}

function formatReservationDate(dateStr) {
  if (!dateStr) return "Tonight";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Generate calendar event (.ics) file directly on client
window.downloadICS = function(code, dateStr, timeStr, guests, zone) {
  const [hours, mins] = timeStr.split(':');
  const d = new Date(dateStr + "T" + hours.padStart(2, '0') + ":" + (mins || '00') + ":00");
  const endD = new Date(d.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hour dining slot

  function formatICSDate(date) {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  }

  const icsData = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aurelia Haute Cuisine//Dining Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:Dining Experience at Aurelia (Ref: ${code})`,
    `DESCRIPTION:Table for ${guests} in ${zone}. Booking Reference: ${code}. Valet parking included.`,
    "LOCATION:Aurelia Haute Cuisine, 482 Avenue Montaigne, 75008 Paris",
    `DTSTART:${formatICSDate(d)}`,
    `DTEND:${formatICSDate(endD)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Aurelia-Reservation-${code}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Calendar invitation (.ics) downloaded!");
};

/* ==========================================================================
   5. RESTAURANT GALLERY & LIGHTBOX
   ========================================================================== */
const GALLERY_DATA = [
  {
    id: 1,
    title: "The Grand Salon at Twilight",
    category: "ambiance",
    span: "item-wide",
    img: "assets/156a184be2ccee8c.webp",
    caption: "Intimate amber backlighting and hand-blown crystal chandeliers in our main dining salon."
  },
  {
    id: 2,
    title: "A5 Wagyu Charring Over Binchotan",
    category: "plating",
    span: "item-tall",
    img: "assets/e06269260c8ad73f.webp",
    caption: "Master Chef Antoine Laurent plating our signature Miyazaki Wagyu with botanical micro-herbs."
  },
  {
    id: 3,
    title: "Private Sommelier Reserve Vault",
    category: "cellar",
    span: "item-medium",
    img: "assets/5ae0a4afe50d76f1.webp",
    caption: "Over 850 vintage labels stored in our subterranean temperature-controlled limestone cellar."
  },
  {
    id: 4,
    title: "Haute Pastry Finishing",
    category: "kitchen",
    span: "item-medium",
    img: "assets/0b67e070227610cb.webp",
    caption: "Delicate golden foil leaf placement on our Grand Cru Valrhona chocolate sphere."
  },
  {
    id: 5,
    title: "The Glasshouse Garden Terrace",
    category: "ambiance",
    span: "item-tall",
    img: "assets/cf61215bd2d566ab.webp",
    caption: "Heated private courtyard tables enveloped in aromatic jasmine and evening breeze."
  },
  {
    id: 6,
    title: "Precision Knife Work on Diver Scallops",
    category: "kitchen",
    span: "item-wide",
    img: "assets/be039fed5b0d9cb8.webp",
    caption: "Culinary artisans orchestrating the evening service in our transparent theater kitchen."
  }
];

let currentLightboxIndex = 0;

function initGallerySystem() {
  const galleryGrid = document.getElementById('gallery-grid');
  const tabs = document.querySelectorAll('.gallery-tab-btn');

  function renderGallery(filter = 'all') {
    if (!galleryGrid) return;

    const filtered = filter === 'all' ? GALLERY_DATA : GALLERY_DATA.filter(g => g.category === filter);

    galleryGrid.innerHTML = filtered.map((item, index) => `
      <div class="gallery-item ${item.span}" onclick="openLightbox(${index}, '${filter}')">
        <img src="${item.img}" alt="${item.title}" loading="lazy" />
        <div class="gallery-item-overlay">
          <h4 class="gallery-caption-title">${item.title}</h4>
          <span class="gallery-caption-sub">${item.category} • View in High-Res</span>
        </div>
      </div>
    `).join('');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGallery(tab.dataset.filter);
    });
  });

  renderGallery('all');

  // Keyboard navigation for Lightbox
  window.addEventListener('keydown', (e) => {
    const lb = document.getElementById('gallery-lightbox-modal');
    if (!lb || !lb.classList.contains('active')) return;

    if (e.key === 'Escape') closeModal('gallery-lightbox-modal');
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

window.openLightbox = function(index, currentFilter = 'all') {
  const filtered = currentFilter === 'all' ? GALLERY_DATA : GALLERY_DATA.filter(g => g.category === currentFilter);
  currentLightboxIndex = index;
  window._currentFilteredGallery = filtered;

  updateLightboxContent();
  document.getElementById('gallery-lightbox-modal').classList.add('active');
};

function updateLightboxContent() {
  const list = window._currentFilteredGallery || GALLERY_DATA;
  const item = list[currentLightboxIndex];
  if (!item) return;

  const imgEl = document.getElementById('lightbox-target-img');
  const titleEl = document.getElementById('lightbox-target-title');
  const capEl = document.getElementById('lightbox-target-caption');

  if (imgEl) imgEl.src = item.img;
  if (titleEl) titleEl.textContent = item.title;
  if (capEl) capEl.textContent = item.caption;
}

window.navigateLightbox = function(direction) {
  const list = window._currentFilteredGallery || GALLERY_DATA;
  currentLightboxIndex = (currentLightboxIndex + direction + list.length) % list.length;
  updateLightboxContent();
};

/* ==========================================================================
   6. GUEST REVIEWS SYSTEM
   ========================================================================== */
const INITIAL_REVIEWS = [
  {
    name: "Eleanor & Henry Vance",
    source: "Verified Dining Experience",
    avatar: "assets/14b7eb1457221dce.webp",
    rating: 5,
    date: "September 2025",
    text: "Celebrating our 25th anniversary at Aurelia was transcendent. The Miyazaki Wagyu melted like silk, and the sommelier's Champagne pairing was poetry."
  },
  {
    name: "Chef Julian Mercier",
    source: "International Gastronomy Critic",
    avatar: "assets/e5e8b0ce749b843f.webp",
    rating: 5,
    date: "August 2025",
    text: "Antoine Laurent has forged something monumental here. Every plate balances classical French precision with visionary audacity. An easy 3 Michelin Stars."
  },
  {
    name: "Lady Sophia Kensington",
    source: "Private Salon Member",
    avatar: "assets/ec6dda874415d098.webp",
    rating: 5,
    date: "July 2025",
    text: "The service is telepathic — never intrusive, always anticipate your desires before you voice them. The Caviar Brioche is unmissable."
  }
];

function initReviewsSystem() {
  const track = document.getElementById('reviews-track');
  const newReviewForm = document.getElementById('new-review-form');

  function renderReviews() {
    if (!track) return;
    track.innerHTML = INITIAL_REVIEWS.map(r => `
      <div class="review-card">
        <div>
          <div class="review-stars">
            ${Array(r.rating).fill('<i class="fa-solid fa-star"></i>').join('')}
          </div>
          <p class="review-text">"${r.text}"</p>
        </div>
        <div class="reviewer-meta">
          <img src="${r.avatar}" alt="${r.name}" class="reviewer-avatar" />
          <div class="reviewer-info">
            <h5>${r.name}</h5>
            <span><i class="fa-solid fa-circle-check" style="color:var(--gold-primary); margin-right:4px;"></i>${r.source} • ${r.date}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderReviews();

  // Add review form
  if (newReviewForm) {
    newReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reviewer-name').value;
      const rating = parseInt(document.getElementById('reviewer-rating').value, 10);
      const text = document.getElementById('reviewer-text').value;

      INITIAL_REVIEWS.unshift({
        name: name,
        source: "Verified Dining Guest",
        avatar: "assets/09197a11c44dfd80.webp",
        rating: rating,
        date: "Just Now",
        text: text
      });

      renderReviews();
      closeModal('add-review-modal');
      newReviewForm.reset();
      showToast("Thank you! Your dining review has been published.");
    });
  }
}

/* ==========================================================================
   7. INTERACTIVE CONCIERGE CHATBOT WIDGET
   ========================================================================== */
function initConciergeChat() {
  const widgetBtn = document.getElementById('concierge-widget-btn');
  const chatWindow = document.getElementById('concierge-chat-window');
  const closeChatBtn = document.getElementById('close-chat-btn');
  const chatForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-text-input');
  const messagesBox = document.getElementById('chat-messages-container');
  const quickChips = document.querySelectorAll('.quick-prompt-chip');

  if (!widgetBtn || !chatWindow) return;

  function toggleChat() {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      setTimeout(() => chatInput && chatInput.focus(), 300);
    }
  }

  widgetBtn.addEventListener('click', toggleChat);
  if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChat);

  function appendMessage(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text;
    messagesBox.appendChild(bubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function handleUserQuery(query) {
    appendMessage('user', query);

    // Luxury Concierge Bot response logic
    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = "Good evening. It is my pleasure to assist you at Aurelia. How may I further orchestrate your dining arrangements?";

      if (q.includes('dress') || q.includes('wear') || q.includes('code')) {
        reply = "Our dress code is <strong>Smart Elegant</strong>. We politely ask gentlemen to wear tailored jackets or collared shirts. Athletic wear and beachwear are not permitted.";
      } else if (q.includes('corkage') || q.includes('wine')) {
        reply = "We offer a curated corkage policy for rare collector vintages: $75 per 750ml bottle (maximum 2 bottles per table), provided the vintage is not already represented on our sommelier list.";
      } else if (q.includes('valet') || q.includes('parking')) {
        reply = "Complimentary white-glove valet parking is provided directly in front of our main entrance on Avenue Montaigne.";
      } else if (q.includes('vegan') || q.includes('diet') || q.includes('gluten') || q.includes('allergy')) {
        reply = "Master Chef Antoine Laurent prepares dedicated 7-course Plant-Based Gastronomy and Gluten-Free tasting menus. Please alert us when booking so our kitchen can prepare fresh bespoke reductions.";
      } else if (q.includes('book') || q.includes('reserve') || q.includes('table') || q.includes('tonight')) {
        reply = "You can immediately reserve your table using our online booking engine on this page! Tonight we have limited seating at 20:30 and 21:45 in the Grand Salon.";
      } else if (q.includes('chef') || q.includes('michelin') || q.includes('antoine')) {
        reply = "Aurelia is under the culinary direction of Master Chef Antoine Laurent, holding 3 Michelin Stars and Ranked #4 in the World's 50 Best Restaurants.";
      }

      appendMessage('bot', reply);
    }, 600);
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = chatInput.value.trim();
      if (!val) return;
      chatInput.value = '';
      handleUserQuery(val);
    });
  }

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      handleUserQuery(chip.textContent.trim());
    });
  });
}

/* ==========================================================================
   8. AMBIENT AUDIO SYNTHESIZER (WEB AUDIO API)
   ========================================================================== */
function initAmbientAudio() {
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (!soundBtn) return;

  let audioCtx = null;
  let isPlaying = false;
  let synthInterval = null;

  soundBtn.addEventListener('click', () => {
    if (!isPlaying) {
      startSound();
    } else {
      stopSound();
    }
  });

  function startSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      isPlaying = true;
      soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      soundBtn.style.color = '#d4af37';
      soundBtn.style.borderColor = '#d4af37';
      showToast("Ambient dining ambiance activated");

      // Play soft warm harmonic chord tones periodically
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major 7th chord
      playSoftChime(notes[0], 0.08);

      synthInterval = setInterval(() => {
        const randNote = notes[Math.floor(Math.random() * notes.length)];
        playSoftChime(randNote, 0.06);
      }, 4000);
    } catch (e) {
      console.warn("Audio playback unsupported", e);
    }
  }

  function playSoftChime(freq, vol) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 4.0);
  }

  function stopSound() {
    isPlaying = false;
    if (synthInterval) clearInterval(synthInterval);
    soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    soundBtn.style.color = '';
    soundBtn.style.borderColor = '';
    showToast("Ambiance sound muted");
  }
}

/* ==========================================================================
   GLOBAL UTILITIES: MODALS & TOAST
   ========================================================================== */
window.openModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
};

window.closeModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
};

// Close modal when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-bell" style="color: var(--gold-primary);"></i> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

window.showToast = showToast;

