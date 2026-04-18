const tipoUsuario = localStorage.getItem("tipoUsuario");
const usuarioLogado = localStorage.getItem("usuarioLogado");

if (!usuarioLogado || tipoUsuario !== "administrador") {
  alert("Acesso negado! Apenas administradores podem acessar esta página.");
  window.location.href = "index.html";
}

const API = "http://127.0.0.1:8000";

function mostrarSecao(secao, botao) {
  document.querySelectorAll(".conteudo-admin section").forEach(s => s.style.display = "none");
  document.querySelectorAll(".btn-menu").forEach(b => b.classList.remove("ativo"));
  document.getElementById(`secao-${secao}`).style.display = "block";
  botao.classList.add("ativo");

  if (secao === "usuarios") carregarUsuarios();
  if (secao === "filmes") { carregarFilmesAdmin(); carregarGenerosSelect(); }
  if (secao === "locacoes") carregarLocacoes();
}

async function carregarUsuarios() {
  const res = await fetch(`${API}/usuarios`);
  const usuarios = await res.json();
  const lista = document.getElementById("lista-usuarios");

  lista.innerHTML = usuarios.map(u => `
    <tr>
      <td>${u.id_usuario}</td>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.login}</td>
      <td>${u.Tipo}</td>
      <td><button class="btn-excluir" onclick="excluirUsuario(${u.id_usuario})">Excluir</button></td>
    </tr>
  `).join("");
}

async function excluirUsuario(id) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

  const res = await fetch(`${API}/usuarios/${id}`, { method: "DELETE" });
  if (res.ok) {
    alert("Usuário excluído com sucesso!");
    carregarUsuarios();
  } else {
    alert("Erro ao excluir usuário.");
  }
}

async function carregarFilmesAdmin() {
  const res = await fetch(`${API}/filmes`);
  const filmes = await res.json();
  const lista = document.getElementById("lista-filmes-admin");

  lista.innerHTML = filmes.map(f => `
    <tr>
      <td>${f.id_filme}</td>
      <td>${f.titulo}</td>
      <td>${f.ano_lancamento}</td>
      <td>R$ ${parseFloat(f.preco_diaria).toFixed(2)}</td>
      <td>${f.fk_Genero_id_genero}</td>
      <td><button class="btn-excluir" onclick="excluirFilme(${f.id_filme})">Excluir</button></td>
    </tr>
  `).join("");
}

async function excluirFilme(id) {
  if (!confirm("Tem certeza que deseja excluir este filme?")) return;

  const res = await fetch(`${API}/filmes/${id}`, { method: "DELETE" });
  if (res.ok) {
    alert("Filme excluído com sucesso!");
    carregarFilmesAdmin();
  } else {
    alert("Erro ao excluir filme.");
  }
}

async function carregarLocacoes() {
  const res = await fetch(`${API}/locacoes`);
  const locacoes = await res.json();
  const lista = document.getElementById("lista-locacoes");

  lista.innerHTML = locacoes.map(l => `
    <tr>
      <td>${l.id_locacao}</td>
      <td>${l.fk_Usuario_id_usuario}</td>
      <td>${l.fk_Filme_id_filme}</td>
      <td>${l.data_inicio}</td>
      <td>${l.data_devolucao}</td>
      <td>${l.status}</td>
    </tr>
  `).join("");
}

async function carregarGenerosSelect() {
  const res = await fetch(`${API}/generos`);
  const generos = await res.json();
  const select = document.getElementById("novo-genero");
  generos.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id_genero;
    option.textContent = g.nome_genero;
    select.appendChild(option);
  });
}

async function adicionarFilme() {
  const titulo = document.getElementById("novo-titulo").value.trim();
  const ano = document.getElementById("novo-ano").value;
  const preco = document.getElementById("novo-preco").value;
  const poster = document.getElementById("novo-poster").value.trim();
  const genero = document.getElementById("novo-genero").value;
  const erro = document.getElementById("erro-filme");

  if (!titulo) { erro.textContent = "Informe o título."; return; }
  if (!ano) { erro.textContent = "Informe o ano."; return; }
  if (!preco) { erro.textContent = "Informe o preço."; return; }
  if (!poster) { erro.textContent = "Informe o link do poster."; return; }
  if (!genero) { erro.textContent = "Selecione o gênero."; return; }

  erro.textContent = "";

  const res = await fetch(`${API}/filmes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      ano_lancamento: parseInt(ano),
      preco_diaria: parseFloat(preco),
      poster,
      fk_Genero_id_genero: parseInt(genero)
    })
  });

  if (res.ok) {
    alert("Filme adicionado com sucesso!");
    document.getElementById("novo-titulo").value = "";
    document.getElementById("novo-ano").value = "";
    document.getElementById("novo-preco").value = "";
    document.getElementById("novo-poster").value = "";
    document.getElementById("novo-genero").value = "";
    carregarFilmesAdmin();
  } else {
    erro.textContent = "Erro ao adicionar filme.";
  }
}

function sairAdmin() {
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("tipoUsuario");
  localStorage.removeItem("avatarUsuario");
  window.location.href = "index.html";
}

carregarUsuarios();