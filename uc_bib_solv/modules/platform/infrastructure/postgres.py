from __future__ import annotations

from contextlib import contextmanager

import psycopg2
import psycopg2.extras

from config.settings import DB_CONFIG


def get_connection():
    conn_kwargs = {
        "host": DB_CONFIG["host"],
        "dbname": DB_CONFIG["dbname"],
        "user": DB_CONFIG["user"],
        "port": DB_CONFIG["port"],
    }
    if DB_CONFIG.get("password"):
        conn_kwargs["password"] = DB_CONFIG["password"]
    return psycopg2.connect(**conn_kwargs)


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                yield cur
    finally:
        conn.close()
