from sqlalchemy import Column, Integer, String, Date, DECIMAL, TIMESTAMP, CHAR, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Genero(Base):
    __tablename__ = "Genero"
    id_genero = Column(Integer, primary_key=True)
    nome_genero = Column(String(100))
    filmes = relationship("Filme", back_populates="genero")

class Usuario(Base):
    __tablename__ = "Usuario"
    id_usuario = Column(Integer, primary_key=True)
    nome = Column(String(100))
    email = Column(String(150), unique=True)
    cpf = Column(CHAR(14))
    telefone = Column(String(20))
    data_cadastro = Column(TIMESTAMP)
    login = Column(String(100))
    senha = Column(String(100))
    data_nascimento = Column(Date)
    Tipo = Column(String(100))
    locacoes = relationship("Locacao", back_populates="usuario")

class Filme(Base):
    __tablename__ = "Filme"
    id_filme = Column(Integer, primary_key=True)
    titulo = Column(String(100))
    ano_lancamento = Column(Integer)
    preco_diaria = Column(DECIMAL(6, 2))
    poster = Column(String(255))
    fk_Genero_id_genero = Column(Integer, ForeignKey("Genero.id_genero"))
    genero = relationship("Genero", back_populates="filmes")
    locacoes = relationship("Locacao", back_populates="filme")
    
class Locacao(Base):
    __tablename__ = "Locacao"
    id_locacao = Column(Integer, primary_key=True)
    data_inicio = Column(Date)
    data_devolucao = Column(Date)
    status = Column(String(50))
    fk_Usuario_id_usuario = Column(Integer, ForeignKey("Usuario.id_usuario"))
    fk_Filme_id_filme = Column(Integer, ForeignKey("Filme.id_filme"))
    usuario = relationship("Usuario", back_populates="locacoes")
    filme = relationship("Filme", back_populates="locacoes")
    pagamento = relationship("Pagamento", back_populates="locacao")

class Pagamento(Base):
    __tablename__ = "Pagamento"
    id_pagamento = Column(Integer, primary_key=True)
    valor_total = Column(DECIMAL(8, 2))
    forma_pagamento = Column(String(50))
    data_pagamento = Column(TIMESTAMP)
    fk_Locacao_id_locacao = Column(Integer, ForeignKey("Locacao.id_locacao"))
    locacao = relationship("Locacao", back_populates="pagamento")