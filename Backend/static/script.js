// Máscara CPF
const cpfInput = document.getElementById("cpf");
if (cpfInput) {
  cpfInput.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    this.value = v;
  });
}

// Máscara Telefone
const telInput = document.getElementById("telefone");
if (telInput) {
  telInput.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
    this.value = v;
  });
}

// Validação matemática do CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

function alerta(mensagem) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "warning",
      title: "Atenção",
      text: mensagem,
      confirmButtonColor: "#c9a000"
    });
  } else {
    alert(mensagem);
  }
}

// Validação do formulário de cadastro
const formCadastro = document.querySelector("form[action='/cadastro']");
if (formCadastro) {
  formCadastro.addEventListener("submit", function (e) {
    const nome = this.querySelector("[name='nome']").value.trim();
    const cpf = this.querySelector("[name='cpf']").value.trim();
    const login = this.querySelector("[name='login']").value.trim();
    const senha = this.querySelector("[name='senha']").value;
    const confirmar = this.querySelector("[name='confirmar_senha']").value;
    const nascimento = this.querySelector("[name='data_nascimento']").value;

    if (nome.length < 5) {
      e.preventDefault();
      alerta("Nome completo deve ter no mínimo 5 caracteres.");
      return;
    }

    if (!validarCPF(cpf)) {
      e.preventDefault();
      alerta("CPF inválido.");
      return;
    }

    if (login.length < 4) {
      e.preventDefault();
      alerta("Login deve ter no mínimo 4 caracteres.");
      return;
    }

    if (senha.length < 8) {
      e.preventDefault();
      alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.");
      return;
    }

    if (!/[A-Z]/.test(senha)) {
      e.preventDefault();
      alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.");
      return;
    }

    if (!/[a-z]/.test(senha)) {
      e.preventDefault();
      alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.");
      return;
    }

    if (!/[0-9]/.test(senha)) {
      e.preventDefault();
      alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.");
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(senha)) {
      e.preventDefault();
      alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.");
      return;
    }

    if (senha !== confirmar) {
      e.preventDefault();
      alerta("As senhas não coincidem.");
      return;
    }

    if (!nascimento) {
      e.preventDefault();
      alerta("Informe a data de nascimento.");
      return;
    }

    const hoje = new Date();
    const nasc = new Date(nascimento);

    if (nasc >= hoje) {
      e.preventDefault();
      alerta("A data de nascimento não pode ser no futuro.");
      return;
    }

    const idade = hoje.getFullYear() - nasc.getFullYear();
    const aniversarioPassou = hoje.getMonth() > nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate());
    const idadeReal = aniversarioPassou ? idade : idade - 1;

    if (idadeReal < 18) {
      e.preventDefault();
      alerta("Você precisa ter pelo menos 18 anos para se cadastrar.");
      return;
    }
  });
}

// Filtro de gêneros
function filtrarGenero(idGenero, botao) {
  document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("ativo"));
  botao.classList.add("ativo");

  document.querySelectorAll(".card").forEach(card => {
    if (!idGenero || card.dataset.genero == idGenero) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// Admin - mostrar seções
function mostrarSecao(secao, botao) {
  document.querySelectorAll(".conteudo-admin section").forEach(s => s.style.display = "none");
  document.querySelectorAll(".btn-menu").forEach(b => b.classList.remove("ativo"));
  document.getElementById("secao-" + secao).style.display = "block";
  botao.classList.add("ativo");
}

// Admin - abrir modal editar filme
function abrirEditarFilme(id, titulo, genero, poster, ano, preco) {
  document.getElementById("editar-filme-id").value = id;
  document.getElementById("editar-titulo").value = titulo;
  document.getElementById("editar-ano-de-lancamento").value = ano;
  document.getElementById("editar-preco").value = preco;
  document.getElementById("editar-poster").value = poster;
  document.getElementById("editar-genero").value = genero;
  document.getElementById("modal-editar-filme").classList.add("ativo");
}

function fecharEditarFilme() {
  document.getElementById("modal-editar-filme").classList.remove("ativo");
}

// Admin - abrir modal editar usuário
function abrirEditar(id, nome, email, cpf, telefone, login, nascimento, tipo) {
  document.getElementById("editar-id").value = id;
  document.getElementById("editar-nome").value = nome;
  document.getElementById("editar-email").value = email;
  document.getElementById("editar-login").value = login;
  document.getElementById("editar-nascimento").value = nascimento;
  document.getElementById("editar-tipo").value = tipo;
  document.getElementById("editar-senha").value = "";

  // Aplica máscara no CPF
  let cpfFormatado = cpf.replace(/\D/g, "");
  cpfFormatado = cpfFormatado.replace(/(\d{3})(\d)/, "$1.$2");
  cpfFormatado = cpfFormatado.replace(/(\d{3})(\d)/, "$1.$2");
  cpfFormatado = cpfFormatado.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  document.getElementById("editar-cpf").value = cpfFormatado;

  // Aplica máscara no telefone
  let telFormatado = telefone.replace(/\D/g, "");
  telFormatado = telFormatado.replace(/^(\d{2})(\d)/, "($1) $2");
  telFormatado = telFormatado.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  document.getElementById("editar-telefone").value = telFormatado;

  document.getElementById("modal-editar").classList.add("ativo");
}

function fecharEditar() {
  document.getElementById("modal-editar").classList.remove("ativo");
}

function validarEdicao(form) {
  const nome = document.getElementById("editar-nome").value.trim();
  const cpf = document.getElementById("editar-cpf").value.trim();
  const login = document.getElementById("editar-login").value.trim();
  const senha = document.getElementById("editar-senha").value;
  const nascimento = document.getElementById("editar-nascimento").value;

  if (nome.length < 5) {
    alerta("Nome completo deve ter no mínimo 5 caracteres.");
    return false;
  }

  if (!validarCPF(cpf)) {
    alerta("CPF inválido.");
    return false;
  }

  if (login.length < 4) {
    alerta("Login deve ter no mínimo 4 caracteres.");
    return false;
  }

  if (senha) {
    if (senha.length < 8) { alerta("A senha deve ter no mínimo 8 caracteres."); return false; }
    if (!/[A-Z]/.test(senha)) { alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial."); return false; }
    if (!/[a-z]/.test(senha)) { alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial."); return false; }
    if (!/[0-9]/.test(senha)) { alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial."); return false; }
    if (!/[^a-zA-Z0-9]/.test(senha)) { alerta("A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial."); return false; }
  }

  if (!nascimento) {
    alerta("Informe a data de nascimento.");
    return false;
  }

  const hoje = new Date();
  const nasc = new Date(nascimento);

  if (nasc >= hoje) {
    alerta("A data de nascimento não pode ser no futuro.");
    return false;
  }

  const idade = hoje.getFullYear() - nasc.getFullYear();
  const aniversarioPassou = hoje.getMonth() > nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate());
  const idadeReal = aniversarioPassou ? idade : idade - 1;

  if (idadeReal < 18) {
    alerta("O usuário precisa ter pelo menos 18 anos.");
    return false;
  }

  return true;
}

// Admin - confirmar exclusão com SweetAlert
function confirmarExclusaoUsuario(form) {
  Swal.fire({
    icon: "warning",
    title: "Tem certeza?",
    text: "Esta ação não pode ser desfeita!",
    confirmButtonColor: "#c9a000",
    confirmButtonText: "Sim, excluir",
    showCancelButton: true,
    cancelButtonText: "Cancelar"
  }).then((result) => {
    if (result.isConfirmed) {
      form.submit();
    }
  });
}

function confirmarExclusaoFilme(form) {
  Swal.fire({
    icon: "warning",
    title: "Tem certeza?",
    text: "Esta ação não pode ser desfeita!",
    confirmButtonColor: "#c9a000",
    confirmButtonText: "Sim, excluir",
    showCancelButton: true,
    cancelButtonText: "Cancelar"
  }).then((result) => {
    if (result.isConfirmed) {
      form.submit();
    }
  });
}

// Máscara CPF no modal de edição
const cpfEditar = document.getElementById("editar-cpf");
if (cpfEditar) {
  cpfEditar.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    this.value = v;
  });
}

// Máscara Telefone no modal de edição
const telEditar = document.getElementById("editar-telefone");
if (telEditar) {
  telEditar.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
    this.value = v;
  });
}

function trocarAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    localStorage.setItem("avatarUsuario", e.target.result);
    const img = document.getElementById("avatar-img");
    if (img) img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Carrega avatar salvo
const avatarImg = document.getElementById("avatar-img");
if (avatarImg) {
  const avatarSalvo = localStorage.getItem("avatarUsuario");
  if (avatarSalvo) avatarImg.src = avatarSalvo;
}