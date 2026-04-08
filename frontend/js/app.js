/**
 * app.js — RentFlix
 *
 * Alterações em relação à versão original (localStorage):
 *   1. Sessão: verificada via GET /api/me (cookie de sessão Flask)
 *   2. Filmes: renderização aguarda moviesReady (Promise do movies.js)
 *   3. Checkout: POST /api/alugar em vez de simular localmente
 *   4. Logout: POST /api/logout em vez de só limpar sessionStorage
 *   5. Carrinho: ainda em memória/localStorage (sem mudanças)
 *
 * Depende de:
 *   - movies.js  (variável global MOVIES + Promise moviesReady)
 *   - style.css
 */

const API_BASE = 'http://localhost:5000'; // ajuste se necessário

/* ═══════════════════════════════════════════════
   ESTADO DA APLICAÇÃO
════════════════════════════════════════════════ */

const state = {
  cart:           JSON.parse(localStorage.getItem('rf_cart') || '[]'),
  currentFilter:  'all',
  directorFilter: 'all',
  searchQuery:    '',
};

/* ═══════════════════════════════════════════════
   REFERÊNCIAS AO DOM
════════════════════════════════════════════════ */

const els = {
  movieGrid:      document.getElementById('movie-grid'),
  searchInput:    document.getElementById('search-input'),
  cartBtn:        document.getElementById('cart-btn'),
  cartCount:      document.getElementById('cart-count'),
  modal:          document.getElementById('modal'),
  modalTitle:     document.getElementById('modal-title'),
  modalYear:      document.getElementById('modal-year'),
  modalRating:    document.getElementById('modal-rating'),
  modalGenre:     document.getElementById('modal-genre'),
  modalDirector:  document.getElementById('modal-director'),
  modalSinopse:   document.getElementById('modal-sinopse'),
  modalPrice:     document.getElementById('modal-price'),
  modalPosterBg:  document.getElementById('modal-poster-img'),
  modalRentBtn:   document.getElementById('modal-rent-btn'),
  modalCloseBtn:  document.getElementById('modal-close-btn'),
  modalCloseAct:  document.getElementById('modal-close-action'),
  toast:          document.getElementById('toast'),
  toastTitle:     document.getElementById('toast-title'),
  toastMsg:       document.getElementById('toast-msg'),
  featuredRent:   document.getElementById('featured-rent-btn'),
  featuredInfo:   document.getElementById('featured-info-btn'),
};

/* ═══════════════════════════════════════════════
   SESSÃO — verifica via API (cookie Flask)
════════════════════════════════════════════════ */

let session = null; // preenchido após /api/me

const btnEntrar    = document.getElementById('btn-entrar');
const userInfo     = document.getElementById('user-info');
const userGreeting = document.getElementById('user-greeting');
const btnSair      = document.getElementById('btn-sair');

async function checkSession() {
  try {
    const res  = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
    const json = await res.json();
    if (json.ok) {
      session = json.data;
      if (btnEntrar)    btnEntrar.style.display  = 'none';
      if (userInfo)     userInfo.style.display   = 'flex';
      if (userGreeting) {
        const firstName = (session.name || session.login || session.email).split(' ')[0];
        userGreeting.textContent = `Olá, ${firstName}`;
      }
    }
  } catch (_) {
    // sem sessão — usuário não autenticado
  }
}

btnSair?.addEventListener('click', async () => {
  await fetch(`${API_BASE}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  session = null;
  window.location.reload();
});

/* ═══════════════════════════════════════════════
   RENDERIZAÇÃO DO GRID DE FILMES
════════════════════════════════════════════════ */

function renderMovies() {
  const filtered = MOVIES.filter(movie => {
    const matchGenre    = state.currentFilter  === 'all' || movie.genre    === state.currentFilter;
    const matchDirector = state.directorFilter === 'all' || movie.director === state.directorFilter;
    const matchSearch   = movie.title.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchGenre && matchDirector && matchSearch;
  });

  if (filtered.length === 0) {
    els.movieGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--muted);">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🎬</div>
        <p>Nenhum filme encontrado. Tente outro filtro ou busca.</p>
      </div>`;
    return;
  }

  els.movieGrid.innerHTML = filtered.map(movie => buildMovieCard(movie)).join('');

  els.movieGrid.querySelectorAll('.overlay-btn-rent').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.movie-card');
      rent(card.dataset.title, card.dataset.price);
    });
  });

  els.movieGrid.querySelectorAll('.overlay-btn-info').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.movie-card');
      openModal(card.dataset.title);
    });
  });

  els.movieGrid.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.title));
  });

  updateRentButtons();
}

function buildMovieCard(movie) {
  const badgeHTML = movie.badge
    ? `<span class="movie-badge badge-${movie.badge}">
         ${movie.badge === 'classic' ? 'Clássico' : movie.badge === 'new' ? 'Novo' : '🔥 Hot'}
       </span>`
    : '';

  return `
    <div class="movie-card"
         data-title="${escapeAttr(movie.title)}"
         data-price="${escapeAttr(movie.price)}">
      <div class="movie-poster">
        <div class="poster-bg" style="background:${movie.bg};">${movie.poster
          ? `<img src="${movie.poster}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
          : ''}
        </div>
        ${badgeHTML}
        <div class="movie-overlay">
          <div class="overlay-actions">
            <button class="overlay-btn overlay-btn-rent">🎬 Alugar</button>
            <button class="overlay-btn overlay-btn-info">Info</button>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-meta">
          <span class="movie-year">${movie.year}</span>
          <span class="movie-rating">⭐ ${movie.rating || '—'}</span>
        </div>
        <div class="movie-price">${movie.price} / 48h</div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   FILTRO DE GÊNERO — DROPDOWN
════════════════════════════════════════════════ */

const genreTrigger  = document.getElementById('genre-trigger');
const genreDropdown = document.getElementById('genre-dropdown');
const genreLabel    = document.getElementById('genre-trigger-label');

const GENRE_LABELS = {
  all:      'Gêneros',
  acao:     'Ação',
  drama:    'Drama',
  comedia:  'Comédia',
  terror:   'Terror',
  ficcao:   'Ficção Científica',
  animacao: 'Animação',
  classico: 'Clássicos',
};

function openGenreDropdown()  { genreTrigger.classList.add('open');    genreDropdown.classList.add('open');    genreTrigger.setAttribute('aria-expanded', 'true');  }
function closeGenreDropdown() { genreTrigger.classList.remove('open'); genreDropdown.classList.remove('open'); genreTrigger.setAttribute('aria-expanded', 'false'); }

genreTrigger.addEventListener('click', e => {
  e.stopPropagation();
  genreDropdown.classList.contains('open') ? closeGenreDropdown() : openGenreDropdown();
});
document.addEventListener('click', () => closeGenreDropdown());
genreDropdown.addEventListener('click', e => e.stopPropagation());

genreDropdown.addEventListener('click', e => {
  const option = e.target.closest('.genre-option');
  if (!option) return;
  state.currentFilter = option.dataset.genre;
  genreDropdown.querySelectorAll('.genre-option').forEach(o => o.classList.remove('active'));
  option.classList.add('active');
  genreLabel.textContent = state.currentFilter === 'all' ? 'Gêneros' : (GENRE_LABELS[state.currentFilter] || state.currentFilter);
  closeGenreDropdown();
  renderMovies();
});

/* ═══════════════════════════════════════════════
   FILTRO DE DIRETOR — DROPDOWN
════════════════════════════════════════════════ */

const directorTrigger  = document.getElementById('director-trigger');
const directorDropdown = document.getElementById('director-dropdown');
const directorLabel    = document.getElementById('director-trigger-label');

function buildDirectorDropdown() {
  // Remove opções antigas (exceto a "Todos")
  directorDropdown.querySelectorAll('[data-director]').forEach(el => el.remove());

  const directors = [...new Set(MOVIES.map(m => m.director).filter(Boolean))].sort();
  directors.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'genre-option';
    btn.dataset.director = name;
    btn.setAttribute('role', 'option');
    btn.innerHTML = `<span class="genre-option-check">&#10003;</span> ${name}`;
    directorDropdown.appendChild(btn);
  });
}

function openDirectorDropdown()  { directorTrigger.classList.add('open');    directorDropdown.classList.add('open');    directorTrigger.setAttribute('aria-expanded', 'true');  }
function closeDirectorDropdown() { directorTrigger.classList.remove('open'); directorDropdown.classList.remove('open'); directorTrigger.setAttribute('aria-expanded', 'false'); }

directorTrigger.addEventListener('click', e => {
  e.stopPropagation();
  directorDropdown.classList.contains('open') ? closeDirectorDropdown() : openDirectorDropdown();
});
document.addEventListener('click', () => closeDirectorDropdown());
directorDropdown.addEventListener('click', e => e.stopPropagation());

directorDropdown.addEventListener('click', e => {
  const option = e.target.closest('.genre-option');
  if (!option) return;
  state.directorFilter = option.dataset.director || 'all';
  directorDropdown.querySelectorAll('.genre-option').forEach(o => o.classList.remove('active'));
  option.classList.add('active');
  directorLabel.textContent = state.directorFilter === 'all' ? 'Diretor' : state.directorFilter;
  closeDirectorDropdown();
  renderMovies();
});

/* ═══════════════════════════════════════════════
   BUSCA COM AUTOCOMPLETE
════════════════════════════════════════════════ */

const searchInput       = els.searchInput;
const searchSuggestions = document.getElementById('search-suggestions');
const searchClear       = document.getElementById('search-clear');

function openSuggestions()  { searchSuggestions.classList.add('open');    }
function closeSuggestions() { searchSuggestions.classList.remove('open'); }

function highlightMatch(title, query) {
  if (!query) return title;
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return title;
  return title.slice(0, idx) + `<mark>${title.slice(idx, idx + query.length)}</mark>` + title.slice(idx + query.length);
}

function renderSuggestions(query) {
  if (!query) { closeSuggestions(); searchSuggestions.innerHTML = ''; return; }

  const results = MOVIES.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase()) ||
    (m.director && m.director.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  searchSuggestions.innerHTML = '';

  if (results.length === 0) {
    searchSuggestions.innerHTML = `<div class="suggestion-empty">Nenhum resultado para "<strong>${query}</strong>"</div>`;
    openSuggestions();
    return;
  }

  results.forEach(movie => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    const posterHTML = movie.poster
      ? `<img src="${movie.poster}" alt="${movie.title}">`
      : `<div class="suggestion-poster-bg" style="background:${movie.bg};"></div>`;
    item.innerHTML = `
      <div class="suggestion-poster">${posterHTML}</div>
      <div class="suggestion-info">
        <span class="suggestion-title">${highlightMatch(movie.title, query)}</span>
        <span class="suggestion-meta">${movie.year} &middot; ${movie.director || ''}</span>
      </div>`;
    item.addEventListener('click', () => {
      closeSuggestions();
      searchInput.value = '';
      searchClear.classList.remove('visible');
      state.searchQuery = '';
      renderMovies();
      openModal(movie.title);
    });
    searchSuggestions.appendChild(item);
  });

  openSuggestions();
}

searchInput.addEventListener('input', e => {
  const query = e.target.value.trim();
  state.searchQuery = query;
  searchClear.classList.toggle('visible', query.length > 0);
  renderSuggestions(query);
  renderMovies();
});

searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) openSuggestions(); });

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.searchQuery = '';
  searchClear.classList.remove('visible');
  closeSuggestions();
  searchSuggestions.innerHTML = '';
  renderMovies();
  searchInput.focus();
});

document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) closeSuggestions();
});
searchSuggestions.addEventListener('click', e => e.stopPropagation());

/* ═══════════════════════════════════════════════
   CARRINHO — PAINEL
════════════════════════════════════════════════ */

const cartPanel      = document.getElementById('cart-panel');
const cartItems      = document.getElementById('cart-items');
const cartEmpty      = document.getElementById('cart-empty');
const cartFooter     = document.getElementById('cart-footer');
const cartTotal      = document.getElementById('cart-total');
const cartPanelClose = document.getElementById('cart-panel-close');

function openCartPanel()  { cartPanel.classList.add('open');    els.cartBtn.setAttribute('aria-expanded', 'true');  }
function closeCartPanel() { cartPanel.classList.remove('open'); els.cartBtn.setAttribute('aria-expanded', 'false'); }

els.cartBtn.addEventListener('click', e => {
  e.stopPropagation();
  cartPanel.classList.contains('open') ? closeCartPanel() : openCartPanel();
});
cartPanelClose.addEventListener('click', closeCartPanel);
cartPanel.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', () => closeCartPanel());

document.getElementById('cart-clear-btn').addEventListener('click', e => {
  e.stopPropagation();
  state.cart = [];
  updateCartBadge();
  renderCartPanel();
  updateRentButtons();
});

function isInCart(title) { return state.cart.some(item => item.title === title); }

function updateRentButtons() {
  document.querySelectorAll('.overlay-btn-rent').forEach(btn => {
    const card     = btn.closest('.movie-card');
    const title    = card?.dataset.title;
    const disabled = title ? isInCart(title) : false;
    btn.disabled = disabled;
    btn.classList.toggle('rent-disabled', disabled);
  });

  if (els.modalRentBtn) {
    const title    = els.modalTitle?.textContent;
    const disabled = title ? isInCart(title) : false;
    els.modalRentBtn.disabled = disabled;
    els.modalRentBtn.classList.toggle('rent-disabled', disabled);
  }

  if (els.featuredRent) {
    const disabled = isInCart(FEATURED.title);
    els.featuredRent.disabled = disabled;
    els.featuredRent.classList.toggle('rent-disabled', disabled);
  }
}

function rent(title, price) {
  if (isInCart(title)) return;
  state.cart.push({ title, price, id: Date.now() });
  updateCartBadge();
  renderCartPanel();
  updateRentButtons();
  showToast('Adicionado ao carrinho! 🎬', `"${title}" — ${price}/48h`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  updateCartBadge();
  renderCartPanel();
  updateRentButtons();
}

function updateCartBadge() {
  els.cartCount.textContent = state.cart.length;
  els.cartCount.classList.toggle('visible', state.cart.length > 0);
  localStorage.setItem('rf_cart', JSON.stringify(state.cart));
}

function renderCartPanel() {
  const isEmpty = state.cart.length === 0;
  cartEmpty.classList.toggle('visible', isEmpty);
  cartFooter.classList.toggle('visible', !isEmpty);
  cartItems.innerHTML = '';
  if (isEmpty) return;

  state.cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-title">${item.title}</span>
        <span class="cart-item-price">${item.price} / 48h</span>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" title="Remover">&#10005;</button>`;
    cartItems.appendChild(li);
  });

  cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      removeFromCart(Number(btn.dataset.id));
    });
  });

  const total = state.cart.reduce((sum, item) => {
    const val = parseFloat(item.price.replace('R$', '').replace(',', '.'));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  cartTotal.textContent = 'R$' + total.toFixed(2).replace('.', ',');

  const btnCheckout   = document.getElementById('btn-checkout');
  const cartLoginHint = document.getElementById('cart-login-hint');
  if (session) {
    btnCheckout.disabled        = false;
    btnCheckout.style.display   = '';
    cartLoginHint.style.display = 'none';
  } else {
    btnCheckout.disabled        = true;
    btnCheckout.style.opacity   = '0.45';
    btnCheckout.style.cursor    = 'not-allowed';
    cartLoginHint.style.display = '';
  }
}

/* ═══════════════════════════════════════════════
   CHECKOUT — chama /api/alugar
════════════════════════════════════════════════ */

document.getElementById('btn-checkout')?.addEventListener('click', async e => {
  e.stopPropagation();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  if (state.cart.length === 0) return;

  // Monta a lista de IDs a partir dos títulos no carrinho
  const ids = state.cart.map(item => {
    const movie = MOVIES.find(m => m.title === item.title);
    return movie?.id;
  }).filter(Boolean);

  if (ids.length === 0) {
    showToast('Erro', 'Não foi possível identificar os filmes. Tente novamente.', true);
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/api/alugar`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ filmes: ids }),
    });
    const json = await res.json();

    if (json.ok) {
      const devolucao = new Date(json.data.devolucao).toLocaleDateString('pt-BR');
      state.cart = [];
      updateCartBadge();
      renderCartPanel();
      updateRentButtons();
      closeCartPanel();
      showToast('Aluguel confirmado! 🎉', `Devolução até ${devolucao}. Bom filme!`);
    } else {
      showToast('Erro no aluguel', json.error || 'Tente novamente.');
    }
  } catch (_) {
    showToast('Erro de conexão', 'Não foi possível conectar ao servidor.');
  }
});

/* ═══════════════════════════════════════════════
   MODAL DE DETALHES
════════════════════════════════════════════════ */

function openModal(title) {
  const movie = MOVIES.find(m => m.title === title);
  if (!movie) return;

  els.modalTitle.textContent    = movie.title;
  els.modalYear.textContent     = '📅 ' + movie.year;
  els.modalRating.textContent   = '⭐ ' + (movie.rating || '—');
  els.modalGenre.textContent    = formatGenre(movie.genre);
  els.modalDirector.textContent = movie.director ? '🎬 ' + movie.director : '';
  els.modalSinopse.textContent  = movie.sinopse;
  els.modalPrice.textContent    = movie.price;

  if (movie.poster) {
    els.modalPosterBg.src = movie.poster;
    els.modalPosterBg.alt = movie.title;
  } else {
    els.modalPosterBg.removeAttribute('src');
    els.modalPosterBg.alt = '';
  }

  els.modalRentBtn.onclick = () => { rent(movie.title, movie.price); closeModal(); };
  els.modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateRentButtons();
}

function closeModal() {
  els.modal.classList.remove('open');
  document.body.style.overflow = '';
}

els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });
els.modalCloseBtn.addEventListener('click', closeModal);
els.modalCloseAct.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ═══════════════════════════════════════════════
   DESTAQUE DA SEMANA
════════════════════════════════════════════════ */

const FEATURED = {
  title:    'Oppenheimer',
  price:    'R$12,90',
  year:     2023,
  rating:   8.5,
  genre:    'drama',
  director: 'Christopher Nolan',
  emoji:    '🔬',
  bg:       'linear-gradient(135deg, #1a1209, #5c4020)',
  poster:   './assets/posters/oppenheimer.png',
  sinopse:  'A história do físico J. Robert Oppenheimer e de seu papel no Projeto Manhattan, que levou ao desenvolvimento das primeiras bombas nucleares durante a Segunda Guerra Mundial.',
};

els.featuredRent.addEventListener('click', () => rent(FEATURED.title, FEATURED.price));
els.featuredInfo.addEventListener('click', () => openModal(FEATURED.title));

/* ═══════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════ */

let toastTimer = null;

function showToast(title, msg) {
  els.toastTitle.textContent = title;
  els.toastMsg.textContent   = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3500);
}

/* ═══════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════ */

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatGenre(genre) {
  const map = { acao: 'Ação', drama: 'Drama', comedia: 'Comédia', terror: 'Terror', ficcao: 'Ficção Científica', animacao: 'Animação', classico: 'Clássico' };
  return map[genre] || genre;
}

/* ═══════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════ */

(async () => {
  // 1. Verifica sessão e monta navbar
  await checkSession();

  // 2. Aguarda os filmes carregarem da API (movies.js)
  await moviesReady;

  // 3. Popula o dropdown de diretores (agora que MOVIES está pronto)
  buildDirectorDropdown();

  // 4. Renderiza o grid
  renderMovies();

  // 5. Restaura carrinho salvo
  if (state.cart.length > 0) {
    updateCartBadge();
    renderCartPanel();
    updateRentButtons();
  }
})();