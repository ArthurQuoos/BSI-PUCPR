"""
app.py — RentFlix Backend
Flask + MySQL

Instalação das dependências:
    pip install flask flask-cors mysql-connector-python bcrypt

Como rodar:
    python app.py

Variáveis de ambiente (opcionais, têm defaults para dev):
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
    SECRET_KEY
"""

import os
import bcrypt
import mysql.connector
from functools import wraps
from datetime import date, timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS

# ══════════════════════════════════════════════════════
#  CONFIGURAÇÃO
# ══════════════════════════════════════════════════════

app = Flask(__name__)

# Chave secreta para a sessão — troque em produção!
app.secret_key = os.environ.get('SECRET_KEY', 'rentflix-dev-secret-key')

# Permite cookies de sessão com o frontend em localhost
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# CORS — libera o frontend (arquivo local ou servidor de dev)
CORS(app, supports_credentials=True, origins=[
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5500',   # Live Server do VS Code
    'http://127.0.0.1:5500',
    'null',                    # abertura direta pelo navegador (file://)
])

# ══════════════════════════════════════════════════════
#  CONEXÃO COM O BANCO DE DADOS
# ══════════════════════════════════════════════════════

DB_CONFIG = {
    'host':     os.environ.get('DB_HOST',     'localhost'),
    'port':     int(os.environ.get('DB_PORT', 3306)),
    'user':     os.environ.get('DB_USER',     'root'),
    'password': os.environ.get('DB_PASSWORD', 'eric tan'),
    'database': os.environ.get('DB_NAME',     'rentflix'),
    'charset':  'utf8mb4',
}


def get_db():
    """Retorna uma conexão nova com o MySQL (sem pool — simples para dev)."""
    return mysql.connector.connect(**DB_CONFIG)


# ══════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════

def ok(data=None, status=200, **kwargs):
    body = {'ok': True}
    if data is not None:
        body['data'] = data
    body.update(kwargs)
    return jsonify(body), status


def err(msg, status=400):
    return jsonify({'ok': False, 'error': msg}), status


def rows_as_dicts(cursor):
    """Converte os resultados do cursor em lista de dicts."""
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ══════════════════════════════════════════════════════
#  DECORATORS DE AUTENTICAÇÃO
# ══════════════════════════════════════════════════════

def login_required(f):
    """Exige que o usuário esteja autenticado (sessão ativa)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return err('Não autenticado.', 401)
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Exige que o usuário seja admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return err('Não autenticado.', 401)
        if session.get('role') != 'admin':
            return err('Acesso negado. Apenas administradores.', 403)
        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════════════════
#  ROTA DE STATUS
# ══════════════════════════════════════════════════════

@app.get('/api/status')
def status():
    return ok({'message': 'RentFlix API online'})


# ══════════════════════════════════════════════════════
#  AUTENTICAÇÃO
# ══════════════════════════════════════════════════════

@app.post('/api/login')
def login():
    """
    Body JSON: { "login": "...", "password": "..." }
    'login' pode ser o campo login OU o e-mail do usuário.
    """
    body = request.get_json(silent=True) or {}
    login_val = (body.get('login') or '').strip()
    password  = (body.get('password') or '')

    if not login_val or not password:
        return err('Informe login/e-mail e senha.')

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """SELECT id_cliente, nome, email, login, senha, role, ativo
               FROM Cliente
               WHERE (login = %s OR email = %s)
               LIMIT 1""",
            (login_val, login_val)
        )
        row = cur.fetchone()

        if not row:
            return err('Login ou senha inválidos.', 401)

        id_cli, nome, email, login_db, senha_hash, role, ativo = row

        if not ativo:
            return err('Conta desativada. Entre em contato com o suporte.', 403)

        if not check_password(password, senha_hash):
            return err('Login ou senha inválidos.', 401)

        # Cria sessão
        session.permanent = False
        session['user_id'] = id_cli
        session['role']    = role
        session['email']   = email
        session['login']   = login_db
        session['name']    = nome or login_db

        return ok({
            'id':    id_cli,
            'name':  nome or login_db,
            'email': email,
            'login': login_db,
            'role':  role,
        })

    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.post('/api/logout')
def logout():
    session.clear()
    return ok({'message': 'Sessão encerrada.'})


@app.get('/api/me')
@login_required
def me():
    """Retorna os dados do usuário logado (útil para verificar sessão no reload)."""
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "SELECT id_cliente, nome, email, login, role FROM Cliente WHERE id_cliente = %s",
            (session['user_id'],)
        )
        row = cur.fetchone()
        if not row:
            session.clear()
            return err('Usuário não encontrado.', 404)
        id_cli, nome, email, login_db, role = row
        return ok({'id': id_cli, 'name': nome, 'email': email, 'login': login_db, 'role': role})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  CADASTRO DE CLIENTE
# ══════════════════════════════════════════════════════

@app.post('/api/cadastro')
def cadastro():
    """
    Body JSON:
    {
      "nome": "...", "email": "...", "login": "...",
      "password": "...", "cpf": "...", "telefone": "...",
      "data_nascimento": "YYYY-MM-DD"
    }
    """
    body = request.get_json(silent=True) or {}

    nome     = (body.get('nome')     or '').strip()
    email    = (body.get('email')    or '').strip().lower()
    login_v  = (body.get('login')    or '').strip().lower()
    password = (body.get('password') or '')
    cpf      = (body.get('cpf')      or None)
    telefone = (body.get('telefone') or None)
    nasc     = (body.get('data_nascimento') or None)

    # Validações básicas
    if not email or '@' not in email:
        return err('E-mail inválido.')
    if not login_v or len(login_v) < 3:
        return err('Login deve ter pelo menos 3 caracteres.')
    if not password or len(password) < 6:
        return err('Senha deve ter pelo menos 6 caracteres.')

    senha_hash = hash_password(password)

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        # Verifica duplicidade
        cur.execute(
            "SELECT id_cliente FROM Cliente WHERE email = %s OR login = %s LIMIT 1",
            (email, login_v)
        )
        if cur.fetchone():
            return err('E-mail ou login já cadastrado.', 409)

        cur.execute(
            """INSERT INTO Cliente (nome, email, login, senha, cpf, telefone, data_nascimento)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (nome, email, login_v, senha_hash, cpf, telefone, nasc)
        )
        conn.commit()
        new_id = cur.lastrowid

        return ok({'id': new_id, 'email': email, 'login': login_v}, status=201)

    except mysql.connector.IntegrityError:
        return err('E-mail ou login já cadastrado.', 409)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  FILMES — PÚBLICO
# ══════════════════════════════════════════════════════

@app.get('/api/filmes')
def listar_filmes():
    """
    Parâmetros de query:
      genero  — slug do gênero (ex: 'acao')
      busca   — texto para filtrar título ou diretor
      diretor — nome exato do diretor
    Retorna apenas filmes com visivel = 1 (para usuários comuns).
    Admins recebem todos se passarem ?admin=1 E estiverem logados como admin.
    """
    genero   = request.args.get('genero',  '').strip()
    busca    = request.args.get('busca',   '').strip()
    diretor  = request.args.get('diretor', '').strip()
    is_admin = (
        session.get('role') == 'admin'
        and request.args.get('admin') == '1'
    )

    conditions = []
    params     = []

    if not is_admin:
        conditions.append('f.visivel = 1')

    if genero:
        conditions.append('g.slug = %s')
        params.append(genero)

    if diretor:
        conditions.append('f.diretor = %s')
        params.append(diretor)

    if busca:
        conditions.append('(f.titulo LIKE %s OR f.diretor LIKE %s)')
        params.extend([f'%{busca}%', f'%{busca}%'])

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            f"""SELECT f.id_filme, f.titulo, f.ano_lancamento, f.preco_diaria,
                       f.diretor, f.sinopse, f.poster, f.bg, f.badge, f.visivel,
                       g.nome_genero, g.slug AS genero
                FROM Filme f
                JOIN Genero g ON g.id_genero = f.fk_Genero_id_genero
                {where}
                ORDER BY f.titulo""",
            params
        )
        filmes = rows_as_dicts(cur)

        # Converte Decimal para float (JSON não serializa Decimal)
        for f in filmes:
            f['preco_diaria'] = float(f['preco_diaria'])
            # Formata preço no estilo do frontend: "R$9,90"
            f['price'] = 'R$' + f'{f["preco_diaria"]:.2f}'.replace('.', ',')

        return ok(filmes)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.get('/api/filmes/<int:id_filme>')
def detalhe_filme(id_filme):
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """SELECT f.id_filme, f.titulo, f.ano_lancamento, f.preco_diaria,
                      f.diretor, f.sinopse, f.poster, f.bg, f.badge, f.visivel,
                      g.nome_genero, g.slug AS genero
               FROM Filme f
               JOIN Genero g ON g.id_genero = f.fk_Genero_id_genero
               WHERE f.id_filme = %s""",
            (id_filme,)
        )
        row = cur.fetchone()
        if not row:
            return err('Filme não encontrado.', 404)
        cols  = [d[0] for d in cur.description]
        filme = dict(zip(cols, row))
        filme['preco_diaria'] = float(filme['preco_diaria'])
        filme['price'] = 'R$' + f'{filme["preco_diaria"]:.2f}'.replace('.', ',')
        return ok(filme)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  FILMES — ADMIN (CRUD)
# ══════════════════════════════════════════════════════

@app.post('/api/filmes')
@admin_required
def criar_filme():
    """
    Body JSON:
    {
      "titulo": "...", "ano_lancamento": 2024, "preco_diaria": 9.90,
      "diretor": "...", "sinopse": "...", "poster": "...", "bg": "...",
      "badge": "hot|new|classic|null", "genero_slug": "acao"
    }
    """
    body = request.get_json(silent=True) or {}

    titulo       = (body.get('titulo')       or '').strip()
    ano          = body.get('ano_lancamento')
    preco        = body.get('preco_diaria')
    diretor      = (body.get('diretor')      or '').strip() or None
    sinopse      = (body.get('sinopse')      or '').strip() or None
    poster       = (body.get('poster')       or '').strip() or None
    bg           = (body.get('bg')           or '').strip() or None
    badge        = (body.get('badge')        or '').strip() or None
    genero_slug  = (body.get('genero_slug')  or '').strip()

    if not titulo:
        return err('Título é obrigatório.')
    if not ano or not preco:
        return err('Ano e preço são obrigatórios.')
    if not genero_slug:
        return err('Gênero é obrigatório.')

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        cur.execute("SELECT id_genero FROM Genero WHERE slug = %s", (genero_slug,))
        genero_row = cur.fetchone()
        if not genero_row:
            return err(f'Gênero "{genero_slug}" não encontrado.', 404)
        id_genero = genero_row[0]

        cur.execute(
            """INSERT INTO Filme
               (titulo, ano_lancamento, preco_diaria, diretor, sinopse, poster, bg, badge, fk_Genero_id_genero)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (titulo, int(ano), float(preco), diretor, sinopse, poster, bg, badge or None, id_genero)
        )
        conn.commit()
        return ok({'id_filme': cur.lastrowid}, status=201)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.put('/api/filmes/<int:id_filme>')
@admin_required
def editar_filme(id_filme):
    body = request.get_json(silent=True) or {}

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        cur.execute("SELECT id_filme FROM Filme WHERE id_filme = %s", (id_filme,))
        if not cur.fetchone():
            return err('Filme não encontrado.', 404)

        campos = {}
        if 'titulo'       in body: campos['titulo']         = body['titulo']
        if 'ano_lancamento' in body: campos['ano_lancamento'] = int(body['ano_lancamento'])
        if 'preco_diaria' in body: campos['preco_diaria']   = float(body['preco_diaria'])
        if 'diretor'      in body: campos['diretor']        = body['diretor'] or None
        if 'sinopse'      in body: campos['sinopse']        = body['sinopse'] or None
        if 'poster'       in body: campos['poster']         = body['poster'] or None
        if 'bg'           in body: campos['bg']             = body['bg'] or None
        if 'badge'        in body: campos['badge']          = body['badge'] or None
        if 'visivel'      in body: campos['visivel']        = int(bool(body['visivel']))

        if 'genero_slug' in body:
            cur.execute("SELECT id_genero FROM Genero WHERE slug = %s", (body['genero_slug'],))
            g = cur.fetchone()
            if not g:
                return err(f'Gênero "{body["genero_slug"]}" não encontrado.', 404)
            campos['fk_Genero_id_genero'] = g[0]

        if not campos:
            return err('Nenhum campo para atualizar.')

        set_clause = ', '.join(f'{k} = %s' for k in campos)
        cur.execute(
            f"UPDATE Filme SET {set_clause} WHERE id_filme = %s",
            list(campos.values()) + [id_filme]
        )
        conn.commit()
        return ok({'updated': cur.rowcount})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.delete('/api/filmes/<int:id_filme>')
@admin_required
def deletar_filme(id_filme):
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        # Verifica se há locações ativas — RESTRICT no FK impede deleção
        cur.execute(
            "SELECT COUNT(*) FROM Locacao WHERE fk_Filme_id_filme = %s AND status = 'ativa'",
            (id_filme,)
        )
        if cur.fetchone()[0] > 0:
            return err('Não é possível excluir: filme possui locações ativas.', 409)

        cur.execute("DELETE FROM Filme WHERE id_filme = %s", (id_filme,))
        conn.commit()
        if cur.rowcount == 0:
            return err('Filme não encontrado.', 404)
        return ok({'deleted': id_filme})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.patch('/api/filmes/<int:id_filme>/visibilidade')
@admin_required
def toggle_visibilidade(id_filme):
    """Alterna visivel entre 0 e 1."""
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "UPDATE Filme SET visivel = NOT visivel WHERE id_filme = %s",
            (id_filme,)
        )
        conn.commit()
        if cur.rowcount == 0:
            return err('Filme não encontrado.', 404)
        cur.execute("SELECT visivel FROM Filme WHERE id_filme = %s", (id_filme,))
        novo = cur.fetchone()[0]
        return ok({'visivel': bool(novo)})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  CLIENTES — ADMIN (CRUD)
# ══════════════════════════════════════════════════════

@app.get('/api/clientes')
@admin_required
def listar_clientes():
    busca = request.args.get('busca', '').strip()
    role  = request.args.get('role',  '').strip()

    conditions = []
    params     = []

    if busca:
        conditions.append('(email LIKE %s OR login LIKE %s OR nome LIKE %s)')
        params.extend([f'%{busca}%'] * 3)
    if role in ('admin', 'user'):
        conditions.append('role = %s')
        params.append(role)

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            f"""SELECT id_cliente, nome, email, login, role, ativo, data_cadastro
                FROM Cliente {where} ORDER BY id_cliente""",
            params
        )
        clientes = rows_as_dicts(cur)
        # Converte datetime para string
        for c in clientes:
            if c.get('data_cadastro'):
                c['data_cadastro'] = c['data_cadastro'].isoformat()
        return ok(clientes)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.put('/api/clientes/<int:id_cliente>')
@admin_required
def editar_cliente(id_cliente):
    body = request.get_json(silent=True) or {}

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        cur.execute("SELECT id_cliente FROM Cliente WHERE id_cliente = %s", (id_cliente,))
        if not cur.fetchone():
            return err('Cliente não encontrado.', 404)

        campos = {}
        if 'email' in body:
            campos['email'] = body['email'].strip().lower()
        if 'login' in body:
            campos['login'] = body['login'].strip().lower()
        if 'nome'  in body:
            campos['nome']  = body['nome']
        if 'role'  in body and body['role'] in ('admin', 'user'):
            campos['role']  = body['role']
        if 'ativo' in body:
            campos['ativo'] = int(bool(body['ativo']))
        if 'password' in body and body['password']:
            if len(body['password']) < 6:
                return err('Senha deve ter pelo menos 6 caracteres.')
            campos['senha'] = hash_password(body['password'])

        if not campos:
            return err('Nenhum campo para atualizar.')

        set_clause = ', '.join(f'{k} = %s' for k in campos)
        cur.execute(
            f"UPDATE Cliente SET {set_clause} WHERE id_cliente = %s",
            list(campos.values()) + [id_cliente]
        )
        conn.commit()
        return ok({'updated': cur.rowcount})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.patch('/api/clientes/<int:id_cliente>/status')
@admin_required
def toggle_cliente_status(id_cliente):
    """Alterna ativo entre 0 e 1."""
    # Não permite desativar a si mesmo
    if id_cliente == session.get('user_id'):
        return err('Não é possível desativar sua própria conta.', 400)

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "UPDATE Cliente SET ativo = NOT ativo WHERE id_cliente = %s",
            (id_cliente,)
        )
        conn.commit()
        if cur.rowcount == 0:
            return err('Cliente não encontrado.', 404)
        cur.execute("SELECT ativo FROM Cliente WHERE id_cliente = %s", (id_cliente,))
        novo = cur.fetchone()[0]
        return ok({'ativo': bool(novo)})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.delete('/api/clientes/<int:id_cliente>')
@admin_required
def deletar_cliente(id_cliente):
    if id_cliente == session.get('user_id'):
        return err('Não é possível excluir sua própria conta.', 400)

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("DELETE FROM Cliente WHERE id_cliente = %s", (id_cliente,))
        conn.commit()
        if cur.rowcount == 0:
            return err('Cliente não encontrado.', 404)
        return ok({'deleted': id_cliente})
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.post('/api/clientes')
@admin_required
def criar_cliente():
    """Admin cria um cliente manualmente."""
    body = request.get_json(silent=True) or {}

    email    = (body.get('email')    or '').strip().lower()
    login_v  = (body.get('login')    or '').strip().lower()
    password = (body.get('password') or '')
    nome     = (body.get('nome')     or '').strip()
    role     = body.get('role', 'user')

    if not email or '@' not in email:
        return err('E-mail inválido.')
    if not login_v or len(login_v) < 3:
        return err('Login inválido.')
    if not password or len(password) < 6:
        return err('Senha deve ter pelo menos 6 caracteres.')
    if role not in ('admin', 'user'):
        role = 'user'

    senha_hash = hash_password(password)

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            "SELECT id_cliente FROM Cliente WHERE email = %s OR login = %s LIMIT 1",
            (email, login_v)
        )
        if cur.fetchone():
            return err('E-mail ou login já cadastrado.', 409)

        cur.execute(
            "INSERT INTO Cliente (nome, email, login, senha, role) VALUES (%s, %s, %s, %s, %s)",
            (nome, email, login_v, senha_hash, role)
        )
        conn.commit()
        return ok({'id_cliente': cur.lastrowid}, status=201)
    except mysql.connector.IntegrityError:
        return err('E-mail ou login já cadastrado.', 409)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  LOCAÇÕES
# ══════════════════════════════════════════════════════

@app.post('/api/alugar')
@login_required
def alugar():
    """
    Body JSON:
    {
      "filmes": [1, 3, 7],           -- lista de id_filme
      "forma_pagamento": "cartao"    -- opcional
    }
    Cria uma locação de 48h por filme e um pagamento consolidado.
    """
    body            = request.get_json(silent=True) or {}
    ids_filmes      = body.get('filmes', [])
    forma_pagamento = body.get('forma_pagamento', 'não informado')

    if not ids_filmes or not isinstance(ids_filmes, list):
        return err('Informe ao menos um filme.')

    id_cliente = session['user_id']
    hoje       = date.today()
    devolucao  = hoje + timedelta(days=2)  # 48h = 2 dias

    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()

        valor_total = 0.0
        locacoes    = []

        for id_filme in ids_filmes:
            cur.execute(
                "SELECT id_filme, preco_diaria, titulo, visivel FROM Filme WHERE id_filme = %s",
                (id_filme,)
            )
            filme = cur.fetchone()
            if not filme:
                return err(f'Filme ID {id_filme} não encontrado.', 404)
            if not filme[3]:
                return err(f'Filme "{filme[2]}" não está disponível.', 400)

            # Verifica se já tem locação ativa deste filme
            cur.execute(
                """SELECT id_locacao FROM Locacao
                   WHERE fk_Cliente_id_cliente = %s
                     AND fk_Filme_id_filme = %s
                     AND status = 'ativa'""",
                (id_cliente, id_filme)
            )
            if cur.fetchone():
                return err(f'Você já possui o filme "{filme[2]}" alugado.', 409)

            cur.execute(
                """INSERT INTO Locacao (data_inicio, data_devolucao, status,
                                        fk_Cliente_id_cliente, fk_Filme_id_filme)
                   VALUES (%s, %s, 'ativa', %s, %s)""",
                (hoje, devolucao, id_cliente, id_filme)
            )
            id_locacao = cur.lastrowid
            locacoes.append(id_locacao)
            valor_total += float(filme[1])

        # Um pagamento para todas as locações do pedido
        # (vinculado à primeira locação — adapte se quiser um pagamento por filme)
        cur.execute(
            """INSERT INTO Pagamento (valor_total, forma_pagamento, fk_Locacao_id_locacao)
               VALUES (%s, %s, %s)""",
            (round(valor_total, 2), forma_pagamento, locacoes[0])
        )
        conn.commit()

        return ok({
            'locacoes':    locacoes,
            'valor_total': round(valor_total, 2),
            'devolucao':   devolucao.isoformat(),
        }, status=201)

    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cur:  cur.close()
        if conn: conn.close()


@app.get('/api/locacoes')
@login_required
def minhas_locacoes():
    """Lista as locações do usuário logado."""
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute(
            """SELECT l.id_locacao, l.data_inicio, l.data_devolucao, l.status,
                      f.id_filme, f.titulo, f.poster, f.preco_diaria
               FROM Locacao l
               JOIN Filme f ON f.id_filme = l.fk_Filme_id_filme
               WHERE l.fk_Cliente_id_cliente = %s
               ORDER BY l.data_inicio DESC""",
            (session['user_id'],)
        )
        locacoes = rows_as_dicts(cur)
        for loc in locacoes:
            loc['data_inicio']    = loc['data_inicio'].isoformat()
            loc['data_devolucao'] = loc['data_devolucao'].isoformat()
            loc['preco_diaria']   = float(loc['preco_diaria'])
        return ok(locacoes)
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  GÊNEROS (auxiliar)
# ══════════════════════════════════════════════════════

@app.get('/api/generos')
def listar_generos():
    conn = cur = None
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT id_genero, nome_genero, slug FROM Genero ORDER BY nome_genero")
        return ok(rows_as_dicts(cur))
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ══════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=True,   # desative em produção!
    )