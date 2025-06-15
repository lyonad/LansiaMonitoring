from sqlalchemy import Column, Integer, String
from backend.config.db import Base

class Lansia(Base):
    __tablename__ = 'lansia'
    id_lansia = Column(Integer, primary_key=True)
    id_pengguna = Column(Integer)  # FK ke Pengguna
    nama = Column(String)
    usia = Column(Integer)
    kondisi = Column(String)
