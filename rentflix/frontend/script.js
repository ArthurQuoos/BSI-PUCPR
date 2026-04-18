
const carrinho = [];

const API = "http://127.0.0.1:8000";
let filmes = [];

async function carregarFilmes() {
  const res = await fetch(`${API}/filmes`);
  filmes = await res.json();

  const grid = document.getElementById("filmes");
  grid.innerHTML = filmes.map(f => `
    <div class="card">
      <img src="${f.poster}" alt="${f.titulo}">
      <h3>${f.titulo}</h3>
      <p>R$ ${parseFloat(f.preco_diaria).toFixed(2)}/dia</p>
      <button id="btn-${f.id_filme}" onclick="adicionarCarrinho(${f.id_filme})">Alugar</button>
    </div>
  `).join("");
}

async function carregarDestaque() {
  if (filmes.length === 0) {
    const res = await fetch(`${API}/filmes`);
    filmes = await res.json();
  }

  const f = filmes[0];
  document.getElementById("destaque-titulo").textContent = f.titulo;
  document.getElementById("destaque-preco").textContent = `R$ ${parseFloat(f.preco_diaria).toFixed(2)}/dia`;
  document.getElementById("destaque-btn").setAttribute("onclick", `adicionarCarrinho(${f.id_filme})`);
}

function adicionarCarrinho(id) {
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  if (carrinho.includes(id)) {
    alert("Este filme já está no seu carrinho!");
    return;
  }

  carrinho.push(id);
  localStorage.setItem("carrinho", JSON.stringify(carrinho));

  const usuario = localStorage.getItem("usuarioLogado");
  if (usuario) {
    document.getElementById("qtd-carrinho-logado").textContent = carrinho.length;
  } else {
    document.getElementById("qtd-carrinho").textContent = carrinho.length;
  }

  const btn = document.getElementById(`btn-${id}`);
  if (btn) {
    btn.textContent = "Adicionado ✓";
    btn.disabled = true;
    btn.style.backgroundColor = "#555";
  }

  if (filmes.length > 0 && id === filmes[0].id_filme) {
    const destBtn = document.getElementById("destaque-btn");
    destBtn.textContent = "Adicionado ✓";
    destBtn.disabled = true;
    destBtn.style.backgroundColor = "#555";
  }
}

function verificarLogin() {
  const usuario = localStorage.getItem("usuarioLogado");
  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  if (usuario) {
    document.getElementById("nav-deslogado").style.display = "none";
    document.getElementById("nav-logado").style.display = "flex";
    document.getElementById("nome-usuario").textContent = `Olá, ${usuario}!`;
    document.getElementById("qtd-carrinho-logado").textContent = carrinho.length;
  } else {
    document.getElementById("nav-deslogado").style.display = "flex";
    document.getElementById("nav-logado").style.display = "none";
    document.getElementById("qtd-carrinho").textContent = carrinho.length;
  }

  document.getElementById("input-avatar").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      localStorage.setItem("avatarUsuario", e.target.result);
      document.getElementById("avatar-img").src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function carregarFiltros() {
  const res = await fetch(`${API}/generos`);
  const generos = await res.json();

  const filtros = document.querySelector(".filtros");
  generos.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "btn-filtro";
    btn.textContent = g.nome_genero;
    btn.onclick = () => filtrarGenero(g.id_genero, btn);
    filtros.appendChild(btn);
  });
}

function filtrarGenero(idGenero, botao) {
  document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("ativo"));
  botao.classList.add("ativo");

  const grid = document.getElementById("filmes");
  const filmesFiltrados = idGenero
    ? filmes.filter(f => f.fk_Genero_id_genero === idGenero)
    : filmes;

  grid.innerHTML = filmesFiltrados.map(f => `
    <div class="card">
      <img src="${f.poster}" alt="${f.titulo}">
      <h3>${f.titulo}</h3>
      <p>R$ ${parseFloat(f.preco_diaria).toFixed(2)}/dia</p>
      <button id="btn-${f.id_filme}" onclick="adicionarCarrinho(${f.id_filme})">Alugar</button>
    </div>
  `).join("");

  const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  carrinho.forEach(id => {
    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
      btn.textContent = "Adicionado ✓";
      btn.disabled = true;
      btn.style.backgroundColor = "#555";
    }
  });
}

function sair() {
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("tipoUsuario");
  localStorage.removeItem("avatarUsuario");
  window.location.href = "index.html";
}

function abrirLogin() {
  window.location.href = "login.html";
}

function abrirCadastro() {
  window.location.href = "cadastro.html";
}

function abrirCarrinho() {
  window.location.href = "carrinho.html";
}

async function init() {
  await carregarFilmes();
  await carregarDestaque();
  await carregarFiltros();
  verificarLogin();
}

init();