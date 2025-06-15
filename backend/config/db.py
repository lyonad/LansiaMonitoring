import mysql.connector

def create_connection():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",  # Username default XAMPP
        password="",  # Password kosong untuk default XAMPP
        database="lansiamonitoring"  # Nama database yang sudah dibuat
    )
    return conn
