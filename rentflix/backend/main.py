from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario, Filme, Genero, Locacao, Pagamento
from pydantic import BaseModel
from datetime import date, datetime
from passlib.context import CryptContext

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_senha(senha: str):
    return pwd_context.hash(senha)

def verificar_senha(senha: str, hash: str):
    return pwd_context.verify(senha, hash)

# Schemas
class UsuarioSchema(BaseModel):
    nome: str
    email: str
    cpf: str
    telefone: str
    login: str
    senha: str
    data_nascimento: date
    Tipo: str = "cliente"

class LoginSchema(BaseModel):
    login: str
    senha: str

# Rotas
@app.get("/filmes")
def listar_filmes(db: Session = Depends(get_db)):
    return db.query(Filme).all()

@app.get("/generos")
def listar_generos(db: Session = Depends(get_db)):
    return db.query(Genero).all()

@app.post("/cadastrar")
def cadastrar(usuario: UsuarioSchema, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Email já cadastrado.")

    novo = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        cpf=usuario.cpf,
        telefone=usuario.telefone,
        login=usuario.login,
        senha=hash_senha(usuario.senha),
        data_nascimento=usuario.data_nascimento,
        data_cadastro=datetime.now(),
        Tipo=usuario.Tipo
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"mensagem": "Usuário cadastrado com sucesso!"}

@app.post("/login")
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.login == dados.login
    ).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha):
        raise HTTPException(status_code=401, detail="Login ou senha incorretos.")
    return {"mensagem": "Login realizado com sucesso!", "nome": usuario.nome, "tipo": usuario.Tipo}

@app.get("/filmes/{id_filme}")
def buscar_filme(id_filme: int, db: Session = Depends(get_db)):
    filme = db.query(Filme).filter(Filme.id_filme == id_filme).first()
    if not filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado.")
    return filme

@app.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()

@app.delete("/usuarios/{id_usuario}")
def excluir_usuario(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    db.delete(usuario)
    db.commit()
    return {"mensagem": "Usuário excluído com sucesso!"}

@app.delete("/filmes/{id_filme}")
def excluir_filme(id_filme: int, db: Session = Depends(get_db)):
    filme = db.query(Filme).filter(Filme.id_filme == id_filme).first()
    if not filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado.")
    db.delete(filme)
    db.commit()
    return {"mensagem": "Filme excluído com sucesso!"}

@app.get("/locacoes")
def listar_locacoes(db: Session = Depends(get_db)):
    return db.query(Locacao).all()

@app.post("/filmes")
def adicionar_filme(filme: dict, db: Session = Depends(get_db)):
    novo = Filme(
        titulo=filme["titulo"],
        ano_lancamento=filme["ano_lancamento"],
        preco_diaria=filme["preco_diaria"],
        poster=filme["poster"],
        fk_Genero_id_genero=filme["fk_Genero_id_genero"]
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"mensagem": "Filme adicionado com sucesso!"}