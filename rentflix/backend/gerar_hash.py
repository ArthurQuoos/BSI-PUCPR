from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
senha = "Admin1234!"
print(pwd_context.hash(senha))