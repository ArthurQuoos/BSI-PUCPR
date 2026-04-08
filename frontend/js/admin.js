/**
 * admin.js — RentFlix Backoffice
 *
 * Alterações em relação à versão original:
 *   - Proteção de rota via GET /api/me (cookie de sessão) em vez de sessionStorage
 *   - Filmes: todas as operações chamam a API (/api/filmes)
 *   - Contas: todas as operações chamam a API (/api/clientes)
 *   - Logout: POST /api/logout
 */

//const API_BASE = 'http://localhost:5000'; // ajuste se necessário

/* ══════════════════════════════════════════════
   HELPERS GERAIS
══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const GENRE_MAP = {
  acao: 'Ação', drama: 'Drama', ficcao: 'Ficção Científica',
  terror: 'Terror', animacao: 'Animação', comedia: 'Comédia', classico: 'Clássico',
};
function formatGenre(g) { return GENRE_MAP[g] || g; }

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer = null;
function showToast(title, msg, isError = false) {
  $('toast-title').textContent = title;
  $('toast-msg').textContent   = msg;
  $('toast').style.borderLeftColor = isError ? 'var(--red)' : 'var(--gold)';
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500);
}

function openModal(el)  { el.classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = ''; }

function showFieldError(fieldId, errId, msg) {
  $(fieldId).classList.add('error');
  $(errId).textContent = msg;
}

/* ══════════════════════════════════════════════
   FETCH HELPERS
══════════════════════════════════════════════ */
async function apiFetch(path, options = {}) {
  const res  = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json();
  return { res, json };
}

/* ══════════════════════════════════════════════
   ESTADO DA UI
══════════════════════════════════════════════ */
let session = null;

const ui = {
  movieSearch:      '',
  movieGenre:       'all',
  movieStatus:      'all',
  accountSearch:    '',
  accountRole:      'all',
  editingMovieId:   null,
  editingAccountId: null,
};

/* ══════════════════════════════════════════════
   DADOS EM MEMÓRIA (carregados da API)
══════════════════════════════════════════════ */
let db_movies   = [];
let db_accounts = [];

/* ══════════════════════════════════════════════
   PROTEÇÃO DE ROTA — via /api/me
══════════════════════════════════════════════ */
async function initAdmin() {
  try {
    const { json } = await apiFetch('/api/me');
    if (!json.ok || json.data.role !== 'admin') {
      window.location.href = 'login.html';
      return;
    }
    session = json.data;
    $('sidebar-email').textContent = session.email;
  } catch (_) {
    window.location.href = 'login.html';
    return;
  }

  // Carrega dados iniciais em paralelo
  await Promise.all([loadMovies(), loadAccounts()]);

  // Atualiza thead de contas para incluir Nome
  document.querySelector('#accounts-table thead tr').innerHTML =
    '<th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th>';

  renderMovies();
  renderAccounts();
}

/* ══════════════════════════════════════════════
   SIDEBAR — NAVEGAÇÃO E LOGOUT
══════════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    $('view-movies').classList.toggle('hidden', view !== 'movies');
    $('view-accounts').classList.toggle('hidden', view !== 'accounts');
  });
});

$('btn-logout').addEventListener('click', async () => {
  await apiFetch('/api/logout', { method: 'POST' });
  window.location.href = 'login.html';
});

/* ══════════════════════════════════════════════
   FILMES — CARREGAR DA API
══════════════════════════════════════════════ */
async function loadMovies() {
  try {
    const { json } = await apiFetch('/api/filmes?admin=1');
    if (json.ok) {
      db_movies = json.data.map(f => ({
        id:       f.id_filme,
        title:    f.titulo,
        year:     f.ano_lancamento,
        rating:   f.rating   || 0,
        price:    f.price,
        genre:    f.genero,
        badge:    f.badge    || null,
        poster:   f.poster   || null,
        bg:       f.bg       || '',
        director: f.diretor  || '',
        sinopse:  f.sinopse  || '',
        visible:  !!f.visivel,
      }));
    }
  } catch (e) {
    showToast('Erro', 'Não foi possível carregar os filmes.', true);
  }
}

/* ══════════════════════════════════════════════
   FILMES — RENDERIZAÇÃO
══════════════════════════════════════════════ */
function getFilteredMovies() {
  return db_movies.filter(m => {
    const q = ui.movieSearch;
    const matchSearch = m.title.toLowerCase().includes(q) || (m.director || '').toLowerCase().includes(q);
    const matchGenre  = ui.movieGenre  === 'all' || m.genre === ui.movieGenre;
    const matchStatus = ui.movieStatus === 'all'
      || (ui.movieStatus === 'active' && m.visible)
      || (ui.movieStatus === 'hidden' && !m.visible);
    return matchSearch && matchGenre && matchStatus;
  });
}

function renderMovies() {
  const list = getFilteredMovies();
  $('movies-count').textContent = `${list.length} filme(s) de ${db_movies.length} no total`;

  if (list.length === 0) {
    $('movies-tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted)">Nenhum filme encontrado.</td></tr>`;
    return;
  }

  $('movies-tbody').innerHTML = list.map(m => {
    const poster = m.poster
      ? `<div class="td-poster"><img src="${esc(m.poster)}" alt="${esc(m.title)}"></div>`
      : `<div class="td-poster"><div class="td-poster-bg" style="background:${m.bg||'#222'}"></div></div>`;
    const status = m.visible
      ? `<span class="status-badge active">● Ativo</span>`
      : `<span class="status-badge hidden">○ Oculto</span>`;

    return `<tr>
      <td><div class="td-movie">${poster}<span class="td-movie-name">${esc(m.title)}</span></div></td>
      <td>${esc(m.director || '—')}</td>
      <td><span class="genre-tag">${formatGenre(m.genre)}</span></td>
      <td>${m.year}</td>
      <td>⭐ ${m.rating || '—'}</td>
      <td>${esc(m.price)}</td>
      <td>${status}</td>
      <td>
        <div class="td-actions">
          <button class="action-btn edit"   onclick="editMovie(${m.id})">Editar</button>
          <button class="action-btn toggle" onclick="toggleMovieVisibility(${m.id})">${m.visible ? 'Ocultar' : 'Ativar'}</button>
          <button class="action-btn delete" onclick="confirmDeleteMovie(${m.id})">Excluir</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   FILMES — FILTROS
══════════════════════════════════════════════ */
$('admin-search').addEventListener('input', e => { ui.movieSearch = e.target.value.toLowerCase(); renderMovies(); });
$('admin-filter-genre').addEventListener('change', e => { ui.movieGenre = e.target.value; renderMovies(); });
$('admin-filter-status').addEventListener('change', e => { ui.movieStatus = e.target.value; renderMovies(); });

/* ══════════════════════════════════════════════
   FILMES — AÇÕES (chamam a API)
══════════════════════════════════════════════ */
async function toggleMovieVisibility(id) {
  try {
    const { json } = await apiFetch(`/api/filmes/${id}/visibilidade`, { method: 'PATCH' });
    if (json.ok) {
      const m = db_movies.find(x => x.id === id);
      if (m) m.visible = json.data.visivel;
      renderMovies();
      showToast(json.data.visivel ? 'Filme ativado' : 'Filme ocultado', m?.title || '');
    } else {
      showToast('Erro', json.error, true);
    }
  } catch (_) {
    showToast('Erro de conexão', 'Tente novamente.', true);
  }
}

function confirmDeleteMovie(id) {
  const m = db_movies.find(x => x.id === id);
  if (!m) return;
  $('confirm-title').textContent = 'Excluir filme?';
  $('confirm-msg').textContent   = `"${m.title}" será removido permanentemente.`;
  openModal($('confirm-modal'));
  $('confirm-ok').onclick = async () => {
    try {
      const { json } = await apiFetch(`/api/filmes/${id}`, { method: 'DELETE' });
      if (json.ok) {
        db_movies = db_movies.filter(x => x.id !== id);
        closeModal($('confirm-modal'));
        renderMovies();
        showToast('Filme excluído', m.title, true);
      } else {
        showToast('Erro', json.error, true);
      }
    } catch (_) {
      showToast('Erro de conexão', 'Tente novamente.', true);
    }
  };
}

function editMovie(id) {
  const m = db_movies.find(x => x.id === id);
  if (!m) return;
  ui.editingMovieId = id;
  $('movie-modal-title').textContent = 'Editar Filme';
  $('f-title').value    = m.title    || '';
  $('f-director').value = m.director || '';
  $('f-genre').value    = m.genre    || '';
  $('f-badge').value    = m.badge    || '';
  $('f-year').value     = m.year     || '';
  $('f-rating').value   = m.rating   || '';
  $('f-price').value    = m.price    || '';
  $('f-poster').value   = m.poster   || '';
  $('f-sinopse').value  = m.sinopse  || '';
  clearMovieFormErrors();
  openModal($('movie-modal'));
}

/* ══════════════════════════════════════════════
   FILMES — MODAL FORM
══════════════════════════════════════════════ */
$('btn-add-movie').addEventListener('click', () => {
  ui.editingMovieId = null;
  $('movie-modal-title').textContent = 'Novo Filme';
  clearMovieForm();
  openModal($('movie-modal'));
});

$('movie-form-save').addEventListener('click', async () => {
  if (!validateMovieForm()) return;

  // Extrai preço numérico do formato "R$9,90"
  const priceStr    = $('f-price').value.trim();
  const preco       = parseFloat(priceStr.replace('R$', '').replace(',', '.'));
  const genero_slug = $('f-genre').value;

  const payload = {
    titulo:         $('f-title').value.trim(),
    diretor:        $('f-director').value.trim(),
    genero_slug,
    badge:          $('f-badge').value  || null,
    ano_lancamento: parseInt($('f-year').value),
    preco_diaria:   preco,
    poster:         $('f-poster').value.trim()   || null,
    sinopse:        $('f-sinopse').value.trim(),
    bg:             'linear-gradient(135deg, #1a1a2e, #2d2d4a)',
  };

  try {
    let json;
    if (ui.editingMovieId) {
      ({ json } = await apiFetch(`/api/filmes/${ui.editingMovieId}`, {
        method: 'PUT',
        body:   JSON.stringify(payload),
      }));
    } else {
      ({ json } = await apiFetch('/api/filmes', {
        method: 'POST',
        body:   JSON.stringify(payload),
      }));
    }

    if (json.ok) {
      await loadMovies();   // recarrega lista atualizada
      renderMovies();
      closeModal($('movie-modal'));
      showToast(ui.editingMovieId ? 'Filme atualizado!' : 'Filme adicionado!', payload.titulo);
    } else {
      showToast('Erro ao salvar', json.error, true);
    }
  } catch (_) {
    showToast('Erro de conexão', 'Tente novamente.', true);
  }
});

function validateMovieForm() {
  let ok = true;
  clearMovieFormErrors();
  [['f-title','err-title','Título obrigatório.'],
   ['f-director','err-director','Diretor obrigatório.'],
   ['f-sinopse','err-sinopse','Sinopse obrigatória.']
  ].forEach(([fId, eId, msg]) => {
    if (!$(fId).value.trim()) { showFieldError(fId, eId, msg); ok = false; }
  });
  if (!$('f-genre').value) { showFieldError('f-genre','err-genre','Selecione um gênero.'); ok = false; }
  const year = parseInt($('f-year').value);
  if (!year || year < 1888 || year > 2099) { showFieldError('f-year','err-year','Ano inválido (1888–2099).'); ok = false; }
  const rating = parseFloat($('f-rating').value);
  if (isNaN(rating) || rating < 0 || rating > 10) { showFieldError('f-rating','err-rating','Nota entre 0 e 10.'); ok = false; }
  const price = $('f-price').value.trim();
  if (!price || !/^R\$\d+[,.]\d{2}$/.test(price)) { showFieldError('f-price','err-price','Formato: R$9,90'); ok = false; }
  return ok;
}

function clearMovieFormErrors() {
  ['f-title','f-director','f-genre','f-year','f-rating','f-price','f-sinopse'].forEach(id => $(id).classList.remove('error'));
  ['err-title','err-director','err-genre','err-year','err-rating','err-price','err-sinopse'].forEach(id => $(id).textContent = '');
}

function clearMovieForm() {
  ['f-title','f-director','f-year','f-rating','f-price','f-poster','f-sinopse'].forEach(id => $(id).value = '');
  $('f-genre').value = '';
  $('f-badge').value = '';
  clearMovieFormErrors();
}

$('movie-modal-close').addEventListener('click', () => closeModal($('movie-modal')));
$('movie-form-cancel').addEventListener('click', () => closeModal($('movie-modal')));
$('movie-modal').addEventListener('click', e => { if (e.target === $('movie-modal')) closeModal($('movie-modal')); });

/* ══════════════════════════════════════════════
   CONTAS — CARREGAR DA API
══════════════════════════════════════════════ */
async function loadAccounts() {
  try {
    const { json } = await apiFetch('/api/clientes');
    if (json.ok) {
      db_accounts = json.data.map(c => ({
        id:     c.id_cliente,
        name:   c.nome   || '',
        email:  c.email,
        login:  c.login  || '',
        role:   c.role,
        active: !!c.ativo,
      }));
    }
  } catch (e) {
    showToast('Erro', 'Não foi possível carregar as contas.', true);
  }
}

/* ══════════════════════════════════════════════
   CONTAS — RENDERIZAÇÃO
══════════════════════════════════════════════ */
function getFilteredAccounts() {
  return db_accounts.filter(a => {
    const matchSearch = a.email.toLowerCase().includes(ui.accountSearch)
      || (a.name  || '').toLowerCase().includes(ui.accountSearch)
      || (a.login || '').toLowerCase().includes(ui.accountSearch);
    const matchRole = ui.accountRole === 'all' || a.role === ui.accountRole;
    return matchSearch && matchRole;
  });
}

function renderAccounts() {
  const list = getFilteredAccounts();
  $('accounts-count').textContent = `${list.length} conta(s) de ${db_accounts.length} no total`;

  if (list.length === 0) {
    $('accounts-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted)">Nenhuma conta encontrada.</td></tr>`;
    return;
  }

  $('accounts-tbody').innerHTML = list.map(a => {
    const roleBadge   = `<span class="role-badge ${a.role}">${a.role === 'admin' ? 'Admin' : 'Usuário'}</span>`;
    const statusBadge = a.active
      ? `<span class="status-badge active">● Ativo</span>`
      : `<span class="status-badge hidden">○ Inativo</span>`;
    const isSelf = session && a.email.toLowerCase() === session.email.toLowerCase();

    return `<tr>
      <td>${esc(a.name  || '—')}</td>
      <td>${esc(a.email)}</td>
      <td>${roleBadge}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="td-actions">
          <button class="action-btn edit" onclick="editAccount(${a.id})">Editar</button>
          ${!isSelf ? `<button class="action-btn toggle" onclick="toggleAccountStatus(${a.id})">${a.active ? 'Desativar' : 'Ativar'}</button>` : ''}
          ${!isSelf ? `<button class="action-btn delete" onclick="confirmDeleteAccount(${a.id})">Excluir</button>`
                    : '<span style="font-size:0.72rem;color:var(--muted);padding:5px 10px">Sua conta</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   CONTAS — FILTROS
══════════════════════════════════════════════ */
$('accounts-search').addEventListener('input', e => { ui.accountSearch = e.target.value.toLowerCase(); renderAccounts(); });
$('accounts-filter-role').addEventListener('change', e => { ui.accountRole = e.target.value; renderAccounts(); });

/* ══════════════════════════════════════════════
   CONTAS — AÇÕES (chamam a API)
══════════════════════════════════════════════ */
async function toggleAccountStatus(id) {
  try {
    const { json } = await apiFetch(`/api/clientes/${id}/status`, { method: 'PATCH' });
    if (json.ok) {
      const a = db_accounts.find(x => x.id === id);
      if (a) a.active = json.data.ativo;
      renderAccounts();
      showToast(json.data.ativo ? 'Conta ativada' : 'Conta desativada', a?.email || '');
    } else {
      showToast('Erro', json.error, true);
    }
  } catch (_) {
    showToast('Erro de conexão', 'Tente novamente.', true);
  }
}

function confirmDeleteAccount(id) {
  const a = db_accounts.find(x => x.id === id);
  if (!a) return;
  $('confirm-title').textContent = 'Excluir conta?';
  $('confirm-msg').textContent   = `A conta "${a.email}" será removida permanentemente.`;
  openModal($('confirm-modal'));
  $('confirm-ok').onclick = async () => {
    try {
      const { json } = await apiFetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (json.ok) {
        db_accounts = db_accounts.filter(x => x.id !== id);
        closeModal($('confirm-modal'));
        renderAccounts();
        showToast('Conta excluída', a.email, true);
      } else {
        showToast('Erro', json.error, true);
      }
    } catch (_) {
      showToast('Erro de conexão', 'Tente novamente.', true);
    }
  };
}

function editAccount(id) {
  const a = db_accounts.find(x => x.id === id);
  if (!a) return;
  ui.editingAccountId = id;
  $('account-modal-title').textContent = 'Editar Conta';
  $('a-email').value    = a.email;
  $('a-password').value = '';
  $('a-role').value     = a.role;
  $('a-password').closest('.form-field').querySelector('label').textContent = 'Nova Senha (deixe em branco para manter)';
  clearAccountFormErrors();
  openModal($('account-modal'));
}

/* ══════════════════════════════════════════════
   CONTAS — MODAL FORM
══════════════════════════════════════════════ */
$('btn-add-account').addEventListener('click', () => {
  ui.editingAccountId = null;
  $('account-modal-title').textContent = 'Nova Conta';
  clearAccountForm();
  $('a-password').closest('.form-field').querySelector('label').textContent = 'Senha *';
  openModal($('account-modal'));
});

$('account-form-save').addEventListener('click', async () => {
  if (!validateAccountForm()) return;

  const email    = $('a-email').value.trim().toLowerCase();
  const pw       = $('a-password').value;
  const role     = $('a-role').value;

  const payload = { email, role };
  if (pw) payload.password = pw;

  try {
    let json;
    if (ui.editingAccountId !== null) {
      ({ json } = await apiFetch(`/api/clientes/${ui.editingAccountId}`, {
        method: 'PUT',
        body:   JSON.stringify(payload),
      }));
    } else {
      payload.login = email.split('@')[0]; // login padrão = parte antes do @
      ({ json } = await apiFetch('/api/clientes', {
        method: 'POST',
        body:   JSON.stringify(payload),
      }));
    }

    if (json.ok) {
      await loadAccounts();
      renderAccounts();
      closeModal($('account-modal'));
      showToast(ui.editingAccountId !== null ? 'Conta atualizada!' : 'Conta criada!', email);
    } else {
      showToast('Erro ao salvar conta', json.error, true);
    }
  } catch (_) {
    showToast('Erro de conexão', 'Tente novamente.', true);
  }
});

function validateAccountForm() {
  let ok = true;
  clearAccountFormErrors();
  const email = $('a-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showFieldError('a-email','err-a-email','E-mail inválido.'); ok = false;
  }
  const pw = $('a-password').value;
  if (!ui.editingAccountId && (!pw || pw.length < 8)) {
    showFieldError('a-password','err-a-password','Senha deve ter ao menos 8 caracteres.'); ok = false;
  } else if (pw && pw.length < 8) {
    showFieldError('a-password','err-a-password','Senha deve ter ao menos 8 caracteres.'); ok = false;
  }
  return ok;
}

function clearAccountFormErrors() {
  ['a-email','a-password'].forEach(id => $(id).classList.remove('error'));
  ['err-a-email','err-a-password'].forEach(id => $(id).textContent = '');
}

function clearAccountForm() {
  $('a-email').value    = '';
  $('a-password').value = '';
  $('a-role').value     = 'user';
  clearAccountFormErrors();
}

$('toggle-a-pw').addEventListener('click', () => {
  const input = $('a-password');
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  $('toggle-a-pw').textContent = isText ? '👁' : '🙈';
});

$('account-modal-close').addEventListener('click', () => closeModal($('account-modal')));
$('account-form-cancel').addEventListener('click', () => closeModal($('account-modal')));
$('account-modal').addEventListener('click', e => { if (e.target === $('account-modal')) closeModal($('account-modal')); });

/* ══════════════════════════════════════════════
   MODAL CONFIRMAÇÃO
══════════════════════════════════════════════ */
$('confirm-cancel').addEventListener('click', () => closeModal($('confirm-modal')));
$('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeModal($('confirm-modal')); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['movie-modal','account-modal','confirm-modal'].forEach(id => {
    if ($(id).classList.contains('open')) closeModal($(id));
  });
});

/* ══════════════════════════════════════════════
   INICIALIZAÇÃO
══════════════════════════════════════════════ */
initAdmin();