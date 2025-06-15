import graphene
from backend.resolvers.pengguna_resolver import RegisterPengguna, LoginPengguna

class Mutation(graphene.ObjectType):
    register_pengguna = RegisterPengguna.Field()
    login_pengguna = LoginPengguna.Field()

schema = graphene.Schema(mutation=Mutation)
