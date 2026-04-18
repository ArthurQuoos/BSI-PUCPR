const API = "http://127.0.0.1:8000";
let filmes = [];
const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

async function carregarFilmes() {
  const res = await fetch(`${API}/filmes`);
  filmes = await res.json();
}

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function carregarCarrinho() {
  const lista = document.getElementById("lista-carrinho");
  const vazio = document.getElementById("carrinho-vazio");
  const resumo = document.getElementById("resumo-carrinho");

  if (carrinho.length === 0) {
    vazio.style.display = "flex";
    resumo.style.display = "none";
    lista.innerHTML = "";
    return;
  }

  vazio.style.display = "none";
  resumo.style.display = "block";

  const filmesNoCarrinho = carrinho.map(id => filmes.find(f => f.id_filme === parseInt(id)));

  lista.innerHTML = filmesNoCarrinho.map(f => `
    <div class="item-carrinho">
      <img src="${f.poster}" alt="${f.titulo}">
      <div class="item-info">
        <h3>${f.titulo}</h3>
        <p>R$ ${parseFloat(f.preco_diaria).toFixed(2)}/dia</p>
      </div>
      <button class="btn-remover" onclick="removerFilme(${f.id_filme})">Remover</button>
    </div>
  `).join("");

  const total = filmesNoCarrinho.reduce((acc, f) => acc + parseFloat(f.preco_diaria), 0);
  document.getElementById("total-filmes").textContent = carrinho.length;
  document.getElementById("total-valor").textContent = `R$ ${total.toFixed(2)}`;
}

function removerFilme(id) {
  const index = carrinho.indexOf(id);
  if (index !== -1) carrinho.splice(index, 1);
  salvarCarrinho();
  carregarCarrinho();
}

function finalizarAluguel() {
  const usuarioLogado = localStorage.getItem("usuarioLogado");
  if (!usuarioLogado) {
    alert("Você precisa estar logado para finalizar o aluguel!");
    window.location.href = "login.html";
    return;
  }
  alert("Aluguel finalizado com sucesso!");
}

async function init() {
  await carregarFilmes();
  carregarCarrinho();
}

init();