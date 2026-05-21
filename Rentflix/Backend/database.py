import pymysql

def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="PUC@1234",
        database="rentflix",
        cursorclass=pymysql.cursors.DictCursor
    )