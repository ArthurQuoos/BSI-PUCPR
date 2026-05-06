import pymysql

def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="eric tan",
        database="rentflix",
        cursorclass=pymysql.cursors.DictCursor
    )