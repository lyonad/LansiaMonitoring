import streamlit as st
import requests

# URL untuk mengakses API GraphQL
API_URL = "http://localhost:5000/graphql"

# Fungsi untuk mengirimkan query GraphQL
def query_graphql(query, variables=None):
    response = requests.post(API_URL, json={'query': query, 'variables': variables})
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Query failed with a {} error".format(response.status_code))
        return None

# Fungsi untuk login
def login_user(username, password):
    query = """
    mutation LoginPengguna($username: String!, $password: String!) {
        loginPengguna(username: $username, password: $password) {
            pengguna {
                idPengguna
                username
                email
                peran
            }
        }
    }
    """
    variables = {
        "username": username,
        "password": password
    }
    result = query_graphql(query, variables)
    if result and result.get('data') and result['data'].get('loginPengguna'):
        return result['data']['loginPengguna']['pengguna']
    return None

# Fungsi untuk mendaftar pengguna (hanya untuk pengguna baru, admin tidak bisa mendaftar)
def register_user(username, password, email):
    query = """
    mutation RegisterPengguna($username: String!, $password: String!, $email: String!) {
        registerPengguna(username: $username, password: $password, email: $email) {
            pengguna {
                idPengguna
                username
                email
            }
        }
    }
    """
    variables = {
        "username": username,
        "password": password,
        "email": email
    }
    result = query_graphql(query, variables)
    if result and result.get('data') and result['data'].get('registerPengguna'):
        return result['data']['registerPengguna']['pengguna']
    return None

# Streamlit UI
st.title("Lansia Monitoring System")

# Menu Navigasi
menu = st.sidebar.radio("Pilih Aksi", ["Login", "Register"])

if menu == "Login":
    st.subheader("Login Pengguna dan Admin")

    # Form Login
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        pengguna = login_user(username, password)
        if pengguna:
            if pengguna['peran'] == 'Admin':
                st.success(f"Login berhasil sebagai Admin! Selamat datang, {pengguna['username']}")
            else:
                st.success(f"Login berhasil! Selamat datang, {pengguna['username']}")
            st.write(f"Email: {pengguna['email']}")
        else:
            st.error("Login gagal! Cek kembali username atau password Anda.")

elif menu == "Register":
    st.subheader("Pendaftaran Pengguna Baru")

    # Form Pendaftaran
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")
    email = st.text_input("Email")

    if st.button("Daftar"):
        pengguna = register_user(username, password, email)
        if pengguna:
            st.success(f"Pendaftaran berhasil! Selamat datang, {pengguna['username']}")
        else:
            st.error("Pendaftaran gagal! Coba lagi.")

def fetch_lansia_data(id_pengguna):
    query = """
    query GetLansia($idPengguna: Int!) {
        lansia(idPengguna: $idPengguna) {
            idLansia
            nama
            usia
            kondisi
        }
    }
    """
    variables = {
        "idPengguna": id_pengguna
    }
    result = query_graphql(query, variables)
    if result and result.get('data') and result['data'].get('lansia'):
        return result['data']['lansia']
    return None

def add_lansia(id_pengguna, nama, usia, kondisi):
    query = """
    mutation AddLansia($idPengguna: Int!, $nama: String!, $usia: Int!, $kondisi: String!) {
        addLansia(idPengguna: $idPengguna, nama: $nama, usia: $usia, kondisi: $kondisi) {
            idLansia
            nama
            usia
            kondisi
        }
    }
    """
    variables = {
        "idPengguna": id_pengguna,
        "nama": nama,
        "usia": usia,
        "kondisi": kondisi
    }
    result = query_graphql(query, variables)
    if result and result.get('data') and result['data'].get('addLansia'):
        return result['data']['addLansia']
    return None

if menu == "Manage Lansia":
    st.subheader("Pengelolaan Data Lansia")

    # Setelah login, tampilkan data lansia
    pengguna = login_user(username, password)
    if pengguna:
        lansia_data = fetch_lansia_data(pengguna['idPengguna'])
        
        if lansia_data:
            for lansia in lansia_data:
                st.write(f"Nama: {lansia['nama']}")
                st.write(f"Usia: {lansia['usia']}")
                st.write(f"Kondisi: {lansia['kondisi']}")
                st.write("---")
        
        # Menambahkan data lansia baru
        st.subheader("Tambah Data Lansia")
        nama = st.text_input("Nama Lansia")
        usia = st.number_input("Usia Lansia", min_value=0)
        kondisi = st.text_input("Kondisi Lansia")

        if st.button("Tambah Lansia"):
            new_lansia = add_lansia(pengguna['idPengguna'], nama, usia, kondisi)
            if new_lansia:
                st.success(f"Data lansia {new_lansia['nama']} berhasil ditambahkan!")
            else:
                st.error("Gagal menambahkan data lansia.")

def add_jadwal_konsumsi_obat(id_lansia, obat, dosis, waktu):
    query = """
    mutation AddJadwalKonsumsiObat($idLansia: Int!, $obat: String!, $dosis: String!, $waktu: String!) {
        addJadwalKonsumsiObat(idLansia: $idLansia, obat: $obat, dosis: $dosis, waktu: $waktu) {
            idJadwal
            obat
            dosis
            waktu
        }
    }
    """
    variables = {
        "idLansia": id_lansia,
        "obat": obat,
        "dosis": dosis,
        "waktu": waktu
    }
    result = query_graphql(query, variables)
    if result and result.get('data') and result['data'].get('addJadwalKonsumsiObat'):
        return result['data']['addJadwalKonsumsiObat']
    return None
