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
      <td>
        <button class="btn-excluir" onclick="editarUsuario(${u.id_usuario}, '${u.nome}', '${u.email}', '${u.login}', '${u.Tipo}')">Editar</button>
        <button class="btn-excluir" onclick="excluirUsuario(${u.id_usuario}, '${u.Tipo}')">Excluir</button>
      </td>
    </tr>
  `).join("");
}

// Ao excluir um usuário o ID não volta por conta do modo como o AUTO_INCREMENT é feito no Banco de Dados
// evita que links antigos ou referências em outros sistemas acabem apontando para o dado errado por acidente
async function excluirUsuario(id, tipoAtual) {
    if (tipoAtual === "administrador") {
    await Swal.fire({
      icon: "warning",
      title: "Ação não permitida",
      text: "Administradores não podem ser excluídos.",
      confirmButtonColor: "#c9a000"
    });
    return;
  }

  const result = await Swal.fire({
    icon: "warning",
    title: "Confirmar exclusão",
    text: "Tem certeza que deseja excluir este usuário?",
    showCancelButton: true,
    confirmButtonColor: "#c9a000",
    cancelButtonColor: "#555",
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar"
  });
  if (!result.isConfirmed) return;

  const res = await fetch(`${API}/usuarios/${id}`, { method: "DELETE" });
  if (res.ok) {
    await Swal.fire({ icon: "success", title: "Usuário excluído!", confirmButtonColor: "#c9a000" });
    carregarUsuarios();
  } else {
    await Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível excluir o usuário.", confirmButtonColor: "#c9a000" });
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
  const result = await Swal.fire({
    icon: "warning",
    title: "Confirmar exclusão",
    text: "Tem certeza que deseja excluir este filme?",
    showCancelButton: true,
    confirmButtonColor: "#c9a000",
    cancelButtonColor: "#555",
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar"
  });
  if (!result.isConfirmed) return;

  const res = await fetch(`${API}/filmes/${id}`, { method: "DELETE" });
  if (res.ok) {
    await Swal.fire({ icon: "success", title: "Filme excluído!", confirmButtonColor: "#c9a000" });
    carregarFilmesAdmin();
  } else {
    await Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível excluir o filme.", confirmButtonColor: "#c9a000" });
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
  const select = document.getElementById("novo-genero");

  if (select.options.length > 1) return;

  const res = await fetch(`${API}/generos`);
  const generos = await res.json();

  generos.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id_genero;
    option.textContent = g.nome_genero;
    select.appendChild(option);
  });
}

function ajustarPreco(valor) {
  const inputPreco = document.getElementById("novo-preco");
  let precoAtual = parseFloat(inputPreco.value) || 0;
  
  let novoPreco = precoAtual + valor;
  if (novoPreco < 0) novoPreco = 0;

  inputPreco.value = novoPreco.toFixed(2);
}

async function adicionarFilme() {
  const titulo  = document.getElementById("novo-titulo").value.trim();
  const ano     = document.getElementById("novo-ano").value;
  const preco   = document.getElementById("novo-preco").value;
  const poster  = document.getElementById("novo-poster").value.trim();
  const genero  = document.getElementById("novo-genero").value;
  const erro    = document.getElementById("erro-filme");

  if (!titulo)  { erro.textContent = "Informe o título."; return; }
  if (!ano)     { erro.textContent = "Informe o ano."; return; }
  if (!preco)   { erro.textContent = "Informe o preço."; return; }
  if (!poster)  { erro.textContent = "Informe o link do poster."; return; }
  if (!genero)  { erro.textContent = "Selecione o gênero."; return; }

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
    await Swal.fire({ icon: "success", title: "Filme adicionado!", confirmButtonColor: "#c9a000" });
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

async function editarUsuario(id, nomeAtual, emailAtual, loginAtual, tipoAtual) {
  if (tipoAtual === "administrador") {
    await Swal.fire({
      icon: "warning",
      title: "Ação não permitida",
      text: "Administradores não podem ser editados.",
      confirmButtonColor: "#c9a000"
    });
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: "Editar usuário",
    html:
      `<input id="swal-nome"  class="swal2-input" placeholder="Nome"    value="${nomeAtual}">` +
      `<input id="swal-email" class="swal2-input" placeholder="E-mail"  value="${emailAtual}">` +
      `<input id="swal-login" class="swal2-input" placeholder="Login"   value="${loginAtual}">`,
    confirmButtonText: "Salvar",
    confirmButtonColor: "#c9a000",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
    preConfirm: () => {
      const nome  = document.getElementById("swal-nome").value.trim();
      const email = document.getElementById("swal-email").value.trim();
      const login = document.getElementById("swal-login").value.trim();

      if (nome.length < 5) {
        Swal.showValidationMessage("Nome deve ter no mínimo 5 caracteres.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.showValidationMessage("Informe um e-mail válido (ex: nome@email.com).");
        return false;
      }
      if (login.length < 4) {
        Swal.showValidationMessage("Login deve ter no mínimo 4 caracteres.");
        return false;
      }

      return { nome, email, login };
    }
  });

  if (!formValues) return;

  const res = await fetch(`${API}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formValues)
  });

  if (res.ok) {
    await Swal.fire({ icon: "success", title: "Usuário atualizado!", confirmButtonColor: "#c9a000" });
    carregarUsuarios();
  } else {
    await Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível atualizar.", confirmButtonColor: "#c9a000" });
  }
}

function sairAdmin() {
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("tipoUsuario");
  localStorage.removeItem("avatarUsuario");
  window.location.href = "index.html";
}

carregarUsuarios();