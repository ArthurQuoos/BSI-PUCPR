// Máscara CPF
document.getElementById("cpf").addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  this.value = v;
});

// Máscara Telefone
document.getElementById("telefone").addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/, "($1) $2");
  v = v.replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  this.value = v;
});

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

function validarSenha(senha) {
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos 1 letra maiúscula.";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos 1 letra minúscula.";
  if (!/[^a-zA-Z0-9]/.test(senha)) return "A senha deve ter pelo menos 1 caractere especial.";
  return null;
}

async function cadastrar() {
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const login = document.getElementById("login").value.trim();
  const senha = document.getElementById("senha").value;
  const dataNasc = document.getElementById("data_nascimento").value;
  const erro = document.getElementById("erro-cadastro");

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

    alert("Cadastro realizado com sucesso!");
    window.location.href = "login.html";

  } catch (e) {
    erro.textContent = "Erro ao conectar com o servidor.";
  }
}