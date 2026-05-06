from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from database import get_connection
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import os

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

env = Environment(loader=FileSystemLoader(os.path.join(BASE_DIR, "templates")))

def renovar_sessao(response, request: Request):
    usuario_nome = request.cookies.get("usuario_nome")
    usuario_tipo = request.cookies.get("usuario_tipo")
    usuario_id = request.cookies.get("usuario_id")
    
    if usuario_nome:
        response.set_cookie("usuario_nome", usuario_nome, max_age=120)
        response.set_cookie("usuario_tipo", usuario_tipo, max_age=120)
        response.set_cookie("usuario_id", usuario_id, max_age=120)
    return response

def render(template_name: str, context: dict) -> str:
    template = env.get_template(template_name)
    return template.render(**context)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_senha(senha: str):
    return pwd_context.hash(senha)

def verificar_senha(senha: str, hash: str):
    return pwd_context.verify(senha, hash)

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    import json
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Filme")
    filmes = [dict(f) for f in cursor.fetchall()]
    cursor.execute("SELECT * FROM Genero")
    generos = [dict(g) for g in cursor.fetchall()]
    conn.close()

    carrinho = json.loads(request.cookies.get("carrinho", "[]"))

    response = HTMLResponse(render("index.html", {
        "filmes": filmes,
        "generos": generos,
        "usuario_nome": request.cookies.get("usuario_nome"),
        "usuario_tipo": request.cookies.get("usuario_tipo"),
        "carrinho": carrinho,
        "qtd_carrinho": len(carrinho)
    }))
    return renovar_sessao(response, request)

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return HTMLResponse(render("login.html", {"erro": None}))

@app.post("/login", response_class=HTMLResponse)
def fazer_login(
    request: Request,
    login: str = Form(...),
    senha: str = Form(...)
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Usuario WHERE login = %s", (login,))
    usuario = cursor.fetchone()
    conn.close()

    if not usuario or not verificar_senha(senha, usuario["senha"]):
        return HTMLResponse(render("login.html", {"request": request, "erro": "Login ou senha incorretos."}))

    response = RedirectResponse("/", status_code=303)
    response.set_cookie("usuario_nome", usuario["nome"], max_age=120)
    response.set_cookie("usuario_tipo", usuario["Tipo"], max_age=120)
    response.set_cookie("usuario_id", str(usuario["id_usuario"]), max_age=120)
    return response

@app.get("/sair")
def sair():
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie("usuario_nome")
    response.delete_cookie("usuario_tipo")
    response.delete_cookie("usuario_id")
    return response

@app.get("/cadastro", response_class=HTMLResponse)
def cadastro_page(request: Request):
    return HTMLResponse(render("cadastro.html", {"erro": None}))

@app.post("/cadastro", response_class=HTMLResponse)
def cadastrar(
    request: Request,
    nome: str = Form(...),
    email: str = Form(...),
    cpf: str = Form(...),
    telefone: str = Form(...),
    login: str = Form(...),
    senha: str = Form(...),
    confirmar_senha: str = Form(...),
    data_nascimento: str = Form(...)
):
    erro = None

    if len(nome) < 5:
        erro = "Nome completo deve ter no mínimo 5 caracteres."
    elif senha != confirmar_senha:
        erro = "As senhas não coincidem."
    elif len(login) < 4:
        erro = "Login deve ter no mínimo 4 caracteres."
    else:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM Usuario WHERE email = %s", (email,))
        if cursor.fetchone():
            erro = "E-mail já cadastrado."

        if not erro:
            cursor.execute("SELECT * FROM Usuario WHERE cpf = %s", (cpf,))
            if cursor.fetchone():
                erro = "CPF já cadastrado."

        if not erro:
            cursor.execute("SELECT * FROM Usuario WHERE telefone = %s", (telefone,))
            if cursor.fetchone():
                erro = "Telefone já cadastrado."

        if not erro:
            cursor.execute("SELECT * FROM Usuario WHERE login = %s", (login,))
            if cursor.fetchone():
                erro = "Login já cadastrado."

        if not erro:
            cursor.execute("""
                INSERT INTO Usuario (nome, email, cpf, telefone, login, senha, data_nascimento, data_cadastro, Tipo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (nome, email, cpf, telefone, login, hash_senha(senha), data_nascimento, datetime.now(), "cliente"))
            conn.commit()
            conn.close()
            return RedirectResponse("/login", status_code=303)

        conn.close()

    return HTMLResponse(render("cadastro.html", {"erro": erro}))

@app.get("/carrinho", response_class=HTMLResponse)
def carrinho_page(request: Request):
    import json
    carrinho = json.loads(request.cookies.get("carrinho", "[]"))

    filmes = []
    if carrinho:
        conn = get_connection()
        cursor = conn.cursor()
        formato = ",".join(["%s"] * len(carrinho))
        cursor.execute(f"SELECT * FROM Filme WHERE id_filme IN ({formato})", carrinho)
        filmes = [dict(f) for f in cursor.fetchall()]
        conn.close()

    total = sum(float(f["preco_diaria"]) for f in filmes)

    response = HTMLResponse(render("carrinho.html", {
        "filmes": filmes,
        "total": total,
        "usuario_nome": request.cookies.get("usuario_nome"),
        "usuario_tipo": request.cookies.get("usuario_tipo")
    }))
    return renovar_sessao(response, request)

@app.post("/carrinho/adicionar")
def adicionar_carrinho(request: Request, id_filme: int = Form(...)):
    import json
    carrinho = json.loads(request.cookies.get("carrinho", "[]"))

    if id_filme not in carrinho:
        carrinho.append(id_filme)

    response = RedirectResponse("/#filmes", status_code=303)
    response.set_cookie("carrinho", json.dumps(carrinho))
    return response

@app.post("/carrinho/remover")
def remover_carrinho(request: Request, id_filme: int = Form(...)):
    import json
    carrinho = json.loads(request.cookies.get("carrinho", "[]"))

    if id_filme in carrinho:
        carrinho.remove(id_filme)

    response = RedirectResponse("/carrinho", status_code=303)
    response.set_cookie("carrinho", json.dumps(carrinho))
    return response


@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    tipo = request.cookies.get("usuario_tipo")
    if tipo != "administrador":
        return RedirectResponse("/", status_code=303)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Usuario")
    usuarios = [dict(u) for u in cursor.fetchall()]
    cursor.execute("SELECT * FROM Filme")
    filmes = [dict(f) for f in cursor.fetchall()]
    cursor.execute("SELECT * FROM Genero")
    generos = [dict(g) for g in cursor.fetchall()]
    cursor.execute("SELECT * FROM Locacao")
    locacoes = [dict(l) for l in cursor.fetchall()]
    conn.close()

    return HTMLResponse(render("admin.html", {
        "usuarios": usuarios,
        "filmes": filmes,
        "generos": generos,
        "locacoes": locacoes,
        "usuario_nome": request.cookies.get("usuario_nome"),
        "usuario_tipo": request.cookies.get("usuario_tipo")
    }))

@app.post("/admin/excluir-usuario")
def excluir_usuario(request: Request, id_usuario: int = Form(...)):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Usuario WHERE id_usuario = %s", (id_usuario,))
    conn.commit()
    conn.close()
    return RedirectResponse("/admin", status_code=303)

@app.post("/admin/editar-usuario")
def editar_usuario(
    request: Request,
    id_usuario: int = Form(...),
    nome: str = Form(...),
    email: str = Form(...),
    cpf: str = Form(...),
    telefone: str = Form(...),
    login: str = Form(...),
    data_nascimento: str = Form(...),
    senha: str = Form(default=""),
    tipo: str = Form(...)
):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()

    if senha:
        cursor.execute("""
            UPDATE Usuario SET nome=%s, email=%s, cpf=%s, telefone=%s, login=%s, data_nascimento=%s, senha=%s, Tipo=%s
            WHERE id_usuario=%s
        """, (nome, email, cpf, telefone, login, data_nascimento, hash_senha(senha), tipo, id_usuario))
    else:
        cursor.execute("""
            UPDATE Usuario SET nome=%s, email=%s, cpf=%s, telefone=%s, login=%s, data_nascimento=%s, Tipo=%s
            WHERE id_usuario=%s
        """, (nome, email, cpf, telefone, login, data_nascimento, tipo, id_usuario))

    conn.commit()
    conn.close()
    return RedirectResponse("/admin", status_code=303)

@app.post("/admin/adicionar-filme")
def adicionar_filme(
    request: Request,
    titulo: str = Form(...),
    ano_lancamento: int = Form(...),
    preco_diaria: float = Form(...),
    poster: str = Form(...),
    fk_Genero_id_genero: int = Form(...)
):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Filme (titulo, ano_lancamento, preco_diaria, poster, fk_Genero_id_genero)
        VALUES (%s, %s, %s, %s, %s)
    """, (titulo, ano_lancamento, preco_diaria, poster, fk_Genero_id_genero))
    conn.commit()
    conn.close()
    return RedirectResponse("/admin?secao=filmes", status_code=303)

@app.post("/admin/excluir-filme")
def excluir_filme(request: Request, id_filme: int = Form(...)):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Filme WHERE id_filme = %s", (id_filme,))
    conn.commit()
    conn.close()
    return RedirectResponse("/admin?secao=filmes", status_code=303)

@app.post("/admin/editar-filme")
def editar_filme(
    request: Request,
    id_filme: int = Form(...),
    titulo: str = Form(...),
    ano_lancamento: int = Form(...),
    preco: float = Form(...),
    poster: str = Form(...),
    fk_Genero_id_genero: int = Form(...)
):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Filme SET titulo=%s, ano_lancamento=%s, preco_diaria=%s, poster=%s, fk_Genero_id_genero=%s
        WHERE id_filme=%s
    """, (titulo, ano_lancamento, preco, poster, fk_Genero_id_genero, id_filme))
    conn.commit()
    conn.close()
    return RedirectResponse("/admin?secao=filmes", status_code=303)


@app.post("/admin/adicionar-genero")
def adicionar_genero(
    request: Request,
    nome_genero: str = Form(...)
):
    if request.cookies.get("usuario_tipo") != "administrador":
        return RedirectResponse("/", status_code=303)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO Genero (nome_genero) VALUES (%s)", (nome_genero,))
    conn.commit()
    conn.close()
    return RedirectResponse("/admin?secao=filmes", status_code=303)

@app.get("/carrinho/finalizar", response_class=HTMLResponse)
def finalizar_page(request: Request):
    import json
    usuario_id = request.cookies.get("usuario_id")
    if not usuario_id:
        return RedirectResponse("/login", status_code=303)

    carrinho = json.loads(request.cookies.get("carrinho", "[]"))
    if not carrinho:
        return RedirectResponse("/carrinho", status_code=303)

    conn = get_connection()
    cursor = conn.cursor()
    formato = ",".join(["%s"] * len(carrinho))
    cursor.execute(f"SELECT * FROM Filme WHERE id_filme IN ({formato})", carrinho)
    filmes = [dict(f) for f in cursor.fetchall()]
    conn.close()

    total = sum(float(f["preco_diaria"]) for f in filmes)

    return HTMLResponse(render("finalizar.html", {
        "filmes": filmes,
        "total": total,
        "usuario_nome": request.cookies.get("usuario_nome"),
        "usuario_tipo": request.cookies.get("usuario_tipo"),
        "erro": None
    }))

@app.post("/carrinho/finalizar")
async def finalizar_carrinho(request: Request):
    import json
    from datetime import date, timedelta
    usuario_id = request.cookies.get("usuario_id")
    if not usuario_id:
        return RedirectResponse("/login", status_code=303)

    form = await request.form()
    carrinho = json.loads(request.cookies.get("carrinho", "[]"))

    conn = get_connection()
    cursor = conn.cursor()

    erro = None
    for id_filme in carrinho:
        data_inicio_str = form.get(f"data_inicio_{id_filme}")

        if not data_inicio_str:
            erro = "Preencha todas as datas de início!"
            break

        data_inicio = date.fromisoformat(data_inicio_str)

        if data_inicio < date.today():
            erro = "A data de início não pode ser no passado!"
            break

        data_devolucao = data_inicio + timedelta(days=1)

        cursor.execute("""
            INSERT INTO Locacao (fk_Usuario_id_usuario, fk_Filme_id_filme, status, data_inicio, data_devolucao)
            VALUES (%s, %s, %s, %s, %s)
        """, (usuario_id, id_filme, "pendente", data_inicio, data_devolucao))

    if erro:
        conn.close()
        formato = ",".join(["%s"] * len(carrinho))
        conn2 = get_connection()
        cursor2 = conn2.cursor()
        cursor2.execute(f"SELECT * FROM Filme WHERE id_filme IN ({formato})", carrinho)
        filmes = [dict(f) for f in cursor2.fetchall()]
        conn2.close()
        total = sum(float(f["preco_diaria"]) for f in filmes)
        return HTMLResponse(render("finalizar.html", {
            "filmes": filmes,
            "total": total,
            "usuario_nome": request.cookies.get("usuario_nome"),
            "usuario_tipo": request.cookies.get("usuario_tipo"),
            "erro": erro
        }))

    conn.commit()
    conn.close()

    response = RedirectResponse("/locacoes", status_code=303)
    response.delete_cookie("carrinho")
    return response

@app.get("/locacoes", response_class=HTMLResponse)
def locacoes_page(request: Request):
    usuario_id = request.cookies.get("usuario_id")
    if not usuario_id:
        return RedirectResponse("/login", status_code=303)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT l.*, f.titulo, f.poster, f.preco_diaria
        FROM Locacao l
        JOIN Filme f ON f.id_filme = l.fk_Filme_id_filme
        WHERE l.fk_Usuario_id_usuario = %s
        ORDER BY l.id_locacao DESC
    """, (usuario_id,))
    locacoes = [dict(l) for l in cursor.fetchall()]
    conn.close()

    return HTMLResponse(render("locacoes.html", {
        "locacoes": locacoes,
        "usuario_nome": request.cookies.get("usuario_nome"),
        "usuario_tipo": request.cookies.get("usuario_tipo")
    }))