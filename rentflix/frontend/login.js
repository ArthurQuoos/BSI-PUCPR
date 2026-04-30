async function fazerLogin() {
  const login = document.getElementById("login").value.trim();
  const senha = document.getElementById("senha").value;
  const erro = document.getElementById("erro-login");

  if (!login) { erro.textContent = "Informe o login."; return; }
  if (!senha) { erro.textContent = "Informe a senha."; return; }
  if (login.length < 4) { erro.textContent = "Login deve ter no mínimo 4 caracteres."; return; }

  try {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      erro.textContent = data.detail || "Login ou senha incorretos.";
      return;
    }

    // Entende qual usuário efetuou o login e redireciona para a devida página
    localStorage.setItem("usuarioLogado", data.nome);
    localStorage.setItem("tipoUsuario", data.tipo);
    if (data.tipo === "administrador") {
        window.location.href = "admin.html";
    } else {
         window.location.href = "index.html";
    }
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: "Não foi possível conectar com o servidor.",
      confirmButtonColor: "#c9a000"
    });
  }
}