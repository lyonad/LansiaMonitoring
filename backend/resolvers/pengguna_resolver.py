import graphene
from backend.models.pengguna import Pengguna
from backend.config.db import session

class PenggunaType(graphene.SQLAlchemyObjectType):
    class Meta:
        model = Pengguna

class RegisterPengguna(graphene.Mutation):
    class Arguments:
        username = graphene.String()
        password = graphene.String()
        email = graphene.String()
        peran = graphene.String()

    pengguna = graphene.Field(PenggunaType)

    def mutate(self, info, username, password, email, peran):
        pengguna = Pengguna(username=username, email=email, peran=peran)
        pengguna.set_password(password)  # Hash password
        session.add(pengguna)
        session.commit()
        return RegisterPengguna(pengguna=pengguna)

class LoginPengguna(graphene.Mutation):
    class Arguments:
        username = graphene.String()
        password = graphene.String()

    pengguna = graphene.Field(PenggunaType)

    def mutate(self, info, username, password):
        pengguna = session.query(Pengguna).filter(Pengguna.username == username).first()
        if pengguna and pengguna.check_password(password):
            return LoginPengguna(pengguna=pengguna)
        else:
            raise Exception("Invalid credentials")
