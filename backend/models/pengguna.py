from sqlalchemy import Column, Integer, String
from backend.config.db import Base
import bcrypt

class Pengguna(Base):
    __tablename__ = 'pengguna'
    id_pengguna = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password_hash = Column(String)
    email = Column(String)
    peran = Column(String)  # Admin atau Pengguna

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash)
