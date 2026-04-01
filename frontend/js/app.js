/**
 * app.js — CineClube
 *
 * Toda a lógica da aplicação:
 *   - Renderização dos cards de filmes
 *   - Filtro por gênero
 *   - Busca em tempo real
 *   - Carrinho (array em memória)
 *   - Modal de detalhes
 *   - Notificação toast
 *   - Eventos do destaque da semana e planos
 *
 * Depende de:
 *   - movies.js (variável global MOVIES)
 *   - style.css  (classes usadas no HTML gerado)
 */

/* ═══════════════════════════════════════════════
   ESTADO DA APLICAÇÃO
════════════════════════════════════════════════ */

const state = {
  cart:          [],     // lista de filmes alugados
  currentFilter: 'all',  // gênero ativo no filtro
  searchQuery:   '',     // texto da busca
};

/* ═══════════════════════════════════════════════
   REFERÊNCIAS AO DOM
════════════════════════════════════════════════ */

const els = {
  movieGrid:      document.getElementById('movie-grid'),
  genreRow:       document.getElementById('genre-row'),
  searchInput:    document.getElementById('search-input'),
  cartBtn:        document.getElementById('cart-btn'),
  cartCount:      document.getElementById('cart-count'),
  modal:          document.getElementById('modal'),
  modalTitle:     document.getElementById('modal-title'),
  modalYear:      document.getElementById('modal-year'),
  modalRating:    document.getElementById('modal-rating'),
  modalGenre:     document.getElementById('modal-genre'),
  modalSinopse:   document.getElementById('modal-sinopse'),
  modalPrice:     document.getElementById('modal-price'),
  modalPosterBg:  document.getElementById('modal-poster-bg'),
  modalRentBtn:   document.getElementById('modal-rent-btn'),
  modalCloseBtn:  document.getElementById('modal-close-btn'),
  modalCloseAct:  document.getElementById('modal-close-action'),
  toast:          document.getElementById('toast'),
  toastTitle:     document.getElementById('toast-title'),
  toastMsg:       document.getElementById('toast-msg'),
  featuredRent:   document.getElementById('featured-rent-btn'),
  featuredInfo:   document.getElementById('featured-info-btn'),
  planCineofilo:  document.getElementById('plan-cineofilo-btn'),
  planFamilia:    document.getElementById('plan-familia-btn'),
};

/* ═══════════════════════════════════════════════
   RENDERIZAÇÃO DO GRID DE FILMES
════════════════════════════════════════════════ */

/**
 * Filtra o array MOVIES com base no gênero e na busca,
 * depois injeta os cards no grid via innerHTML.
 */
function renderMovies() {
  const filtered = MOVIES.filter(movie => {
    const matchGenre  = state.currentFilter === 'all' || movie.genre === state.currentFilter;
    const matchSearch = movie.title.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchGenre && matchSearch;
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

  // Adiciona eventos nos botões gerados dinamicamente
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
}

/**
 * Constrói o HTML de um card de filme.
 * @param {Object} movie — objeto do array MOVIES
 * @returns {string} HTML do card
 */
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
          ? `<img src="${movie.poster}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"> `
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
          <span class="movie-rating">⭐ ${movie.rating}</span>
        </div>
        <div class="movie-price">${movie.price} / 48h</div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   FILTRO DE GÊNERO
════════════════════════════════════════════════ */

els.genreRow.addEventListener('click', e => {
  const pill = e.target.closest('.genre-pill');
  if (!pill) return;

  // Atualiza estado e visual
  state.currentFilter = pill.dataset.genre;
  els.genreRow.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');

  renderMovies();
});

/* ═══════════════════════════════════════════════
   BUSCA EM TEMPO REAL
════════════════════════════════════════════════ */

els.searchInput.addEventListener('input', e => {
  state.searchQuery = e.target.value.trim();
  renderMovies();
});

/* ═══════════════════════════════════════════════
   CARRINHO
════════════════════════════════════════════════ */

/**
 * Adiciona um filme ao carrinho e atualiza o indicador na navbar.
 * @param {string} title — título do filme
 * @param {string} price — preço formatado (ex: "R$8,90")
 */
function rent(title, price) {
  state.cart.push({ title, price });
  updateCartBadge();
  showToast('Adicionado ao carrinho! 🎬', `"${title}" — ${price}/48h`);
}

function updateCartBadge() {
  els.cartCount.textContent = state.cart.length;
  els.cartCount.classList.toggle('visible', state.cart.length > 0);
}

els.cartBtn.addEventListener('click', () => {
  if (state.cart.length === 0) {
    showToast('Carrinho vazio', 'Explore o catálogo e alugue seus filmes favoritos!');
  } else {
    const titles = state.cart.map(c => c.title).join(', ');
    showToast(`${state.cart.length} filme(s) no carrinho`, titles);
  }
});

/* ═══════════════════════════════════════════════
   MODAL DE DETALHES
════════════════════════════════════════════════ */

/**
 * Abre o modal preenchido com os dados do filme buscado pelo título.
 * @param {string} title — título exato do filme
 */
function openModal(title) {
  const movie = MOVIES.find(m => m.title === title);
  if (!movie) return;

  // Preenche os campos
  els.modalTitle.textContent    = movie.title;
  els.modalYear.textContent     = '📅 ' + movie.year;
  els.modalRating.textContent   = '⭐ ' + movie.rating;
  els.modalGenre.textContent    = formatGenre(movie.genre);
  els.modalSinopse.textContent  = movie.sinopse;
  els.modalPrice.textContent    = movie.price;
  els.modalPosterBg.style.background = movie.bg;
  if (movie.poster) {
  els.modalPosterBg.innerHTML      = `<img src="${movie.poster}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  els.modalPosterBg.style.fontSize = '';
  } else {
  els.modalPosterBg.innerHTML      = '';
  els.modalPosterBg.style.fontSize = '4rem';
  }

  // Botão de alugar dentro do modal
  els.modalRentBtn.onclick = () => {
    rent(movie.title, movie.price);
    closeModal();
  };

  // Abre
  els.modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  els.modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Fecha ao clicar no overlay (fora do .modal)
els.modal.addEventListener('click', e => {
  if (e.target === els.modal) closeModal();
});

els.modalCloseBtn.addEventListener('click', closeModal);
els.modalCloseAct.addEventListener('click', closeModal);

// Fecha com Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ═══════════════════════════════════════════════
   DESTAQUE DA SEMANA (Oppenheimer)
════════════════════════════════════════════════ */

const FEATURED = {
  title:   'Oppenheimer',
  price:   'R$12,90',
  year:    2023,
  rating:  8.5,
  genre:   'drama',
  emoji:   '🔬',
  bg:      'linear-gradient(135deg, #1a1209, #5c4020)',
  sinopse: 'A história do físico J. Robert Oppenheimer e de seu papel no Projeto Manhattan, que levou ao desenvolvimento das primeiras bombas nucleares durante a Segunda Guerra Mundial. Dirigido por Christopher Nolan, o filme é uma jornada épica sobre ciência, moral e o peso das decisões humanas.',
};

els.featuredRent.addEventListener('click', () => {
  rent(FEATURED.title, FEATURED.price);
});

els.featuredInfo.addEventListener('click', () => {
  // Injeta o filme em destaque temporariamente para o modal funcionar
  const exists = MOVIES.find(m => m.title === FEATURED.title);
  if (!exists) MOVIES.unshift(FEATURED);
  openModal(FEATURED.title);
});

/* ═══════════════════════════════════════════════
   PLANOS
════════════════════════════════════════════════ */

els.planCineofilo.addEventListener('click', () => {
  showToast('Plano Cinéfilo selecionado!', 'Redirecionando para o cadastro...');
});

els.planFamilia.addEventListener('click', () => {
  showToast('Plano Família selecionado!', 'Redirecionando para o cadastro...');
});

/* ═══════════════════════════════════════════════
   TOAST (NOTIFICAÇÃO)
════════════════════════════════════════════════ */

let toastTimer = null;

/**
 * Exibe uma notificação toast por 3.5 segundos.
 * @param {string} title — título em destaque
 * @param {string} msg   — mensagem secundária
 */
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

/**
 * Escapa aspas simples e duplas para uso em atributos HTML.
 * @param {string} str
 * @returns {string}
 */
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Converte o slug de gênero para rótulo legível.
 * @param {string} genre
 * @returns {string}
 */
function formatGenre(genre) {
  const map = {
    acao:     'Ação',
    drama:    'Drama',
    comedia:  'Comédia',
    terror:   'Terror',
    ficcao:   'Ficção Científica',
    animacao: 'Animação',
    classico: 'Clássico',
  };
  return map[genre] || genre;
}

/* ═══════════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════════════ */

renderMovies();
