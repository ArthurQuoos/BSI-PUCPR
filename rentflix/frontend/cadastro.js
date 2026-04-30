// Máscara CPF
// Enquanto o usuário digita o cpf separa visualmente entre digitos usando pontos e hífen
document.getElementById("cpf").addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  this.value = v;
});

// Máscara Telefone
// Enquanto o usuário digita o telefone separa visualmente entre ddd e hífen
document.getElementById("telefone").addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/, "($1) $2");
  v = v.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  this.value = v;
});

// Função de Validação de CPF
// Verifica se o CPF tem pelo menos 11 dígitos antes de continuar
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  // Parte matemática da função, onde valida pelo Cálculo de Dígitos Verificadores através do método Módulo 11
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

// Função de Validação da Senha
// Funciona por meio de etapas por validação de padrões (Regex) sem usar expressões regulares
function validarSenha(senha) {
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos 1 letra maiúscula.";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos 1 letra minúscula.";
  if (!/[^a-zA-Z0-9]/.test(senha)) return "A senha deve ter pelo menos 1 caractere especial.";
  return null;
}

// Funcção de Cadastro de Usuário
// Retorna a referência do elemento através do ID na página HTML
async function cadastrar() {
  const nome      = document.getElementById("nome").value.trim();
  const email     = document.getElementById("email").value.trim();
  const cpf       = document.getElementById("cpf").value.trim();
  const telefone  = document.getElementById("telefone").value.trim();
  const login     = document.getElementById("login").value.trim();
  const senha     = document.getElementById("senha").value;
  const dataNasc  = document.getElementById("data_nascimento").value;
  const erro      = document.getElementById("erro-cadastro");

  // Validação das Etapas de Cadastro
  // Com tratamento de erro
  if (!nome || nome.length < 5) { erro.textContent = "Nome completo deve ter no mínimo 5 caracteres."; return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro.textContent = "Informe um e-mail válido (ex: nome@email.com)."; return; }
  if (!validarCPF(cpf)) { erro.textContent = "CPF inválido."; return; }
  if (telefone.length < 14) { erro.textContent = "Telefone inválido."; return; }
  if (login.length < 4) { erro.textContent = "Login deve ter no mínimo 4 caracteres."; return; }

  const erroSenha = validarSenha(senha);
  if (erroSenha) { erro.textContent = erroSenha; return; }

  const confirmarSenha = document.getElementById("confirmar_senha").value;
  if (senha !== confirmarSenha) { erro.textContent = "As senhas não coincidem."; return; }

  if (!dataNasc) { erro.textContent = "Informe a data de nascimento."; return; }
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  if (nasc >= hoje) { erro.textContent = "A data de nascimento não pode ser no futuro."; return; }
  const idade = hoje.getFullYear() - nasc.getFullYear();
  const aniversarioPassou = hoje.getMonth() > nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate());
  const idadeReal = aniversarioPassou ? idade : idade - 1;
  if (idadeReal < 18) { erro.textContent = "Você precisa ter pelo menos 18 anos para se cadastrar."; return; }

  // O método POST envia dados ao servidor, o tipo do corpo da solicitação é indicado pelo cabeçalho (Content-Type)
  // Nesse caso, o Content-Type seria (application/json), o padrão que tanto o client quanto o servidor entendem
  try {
    const res = await fetch("http://127.0.0.1:8000/cadastrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome, email, cpf, telefone, login, senha,
        data_nascimento: dataNasc,
        Tipo: "cliente"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      erro.textContent = data.detail || "Erro ao cadastrar.";
      return;
    }

    await Swal.fire({
      icon: "success",
      title: "Cadastro realizado!",
      text: "Sua conta foi criada com sucesso.",
      confirmButtonColor: "#c9a000"
    });
    window.location.href = "login.html";

  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: "Não foi possível conectar com o servidor.",
      confirmButtonColor: "#c9a000"
    });
  }
}