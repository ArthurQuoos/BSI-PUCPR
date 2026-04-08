/**
 * movies.js — RentFlix
 *
 * ANTES: array estático MOVIES exportado globalmente.
 * AGORA: carrega os filmes da API Flask (/api/filmes)
 *        e expõe a mesma interface que o app.js espera.
 *
 * Expõe globalmente:
 *   - MOVIES          : array de filmes (preenchido após fetch)
 *   - moviesReady     : Promise que resolve quando MOVIES estiver pronto
 *   - reloadMovies(params) : recarrega com filtros opcionais
 */

//const API_BASE = 'http://localhost:5000'; // ajuste se o backend rodar em outra porta

/** Array global de filmes — começa vazio, preenchido pelo fetch */
let MOVIES = [];

/** Resolve quando os filmes estiverem carregados pela primeira vez */
let _resolveReady;
const moviesReady = new Promise(res => { _resolveReady = res; });

/**
 * Busca filmes da API e preenche o array MOVIES.
 * @param {Object} params - Filtros opcionais: { genero, busca, diretor }
 * @returns {Promise<Array>} - Array de filmes normalizado
 */
async function reloadMovies(params = {}) {
  const qs = new URLSearchParams();
  if (params.genero)  qs.set('genero',  params.genero);
  if (params.busca)   qs.set('busca',   params.busca);
  if (params.diretor) qs.set('diretor', params.diretor);

  const url = `${API_BASE}/api/filmes${qs.toString() ? '?' + qs : ''}`;

  try {
    const res  = await fetch(url, { credentials: 'include' });
    const json = await res.json();

    if (!json.ok) throw new Error(json.error || 'Erro ao carregar filmes');

    // Normaliza os campos para manter compatibilidade com o app.js existente
    MOVIES = json.data.map(f => ({
      id:       f.id_filme,
      title:    f.titulo,
      year:     f.ano_lancamento,
      rating:   f.rating   || 0,          // campo extra — não está no SQL atual
      price:    f.price,                  // ex: "R$9,90" — gerado no backend
      genre:    f.genero,                 // slug: 'acao', 'drama' …
      badge:    f.badge    || null,
      poster:   f.poster   || null,
      bg:       f.bg       || 'linear-gradient(135deg, #1a1a2e, #16213e)',
      director: f.diretor  || '',
      sinopse:  f.sinopse  || '',
      visivel:  f.visivel,
    }));

    return MOVIES;
  } catch (err) {
    console.error('[movies.js] Falha ao carregar filmes:', err);
    MOVIES = [];
    return [];
  }
}

// ── Carregamento inicial ao incluir o script ──────────
(async () => {
  await reloadMovies();
  _resolveReady(MOVIES);
})();