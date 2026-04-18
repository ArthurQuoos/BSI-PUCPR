Trocar a senha para sua senha no backend no arquivo .env , onde estiver "PUC%401234" troque pela senha do seu banco de dados.
Para iniciar a conexao do backend com o banco de dados usar os comandos:
1 - cd /backend
2- python -m uvicorn main:app --reload

Usar esta versao do bcryp:
pip install bcrypt==4.0.1