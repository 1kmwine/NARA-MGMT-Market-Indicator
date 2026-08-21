"""MariaDB(테스트 서버) 접속 헬퍼.

접속 정보는 backend/.env에서 읽는다(DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME).
비밀번호를 코드에 적지 않기 위한 것이므로 .env 없이는 동작하지 않는다.
"""
import os
from contextlib import contextmanager

import pymysql


def _settings(*, with_database: bool = True) -> dict:
    settings = {
        "host": os.getenv("DB_HOST", "192.168.47.105"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", ""),
        "password": os.getenv("DB_PASSWORD", ""),
        "charset": "utf8mb4",
        "autocommit": False,
        "cursorclass": pymysql.cursors.DictCursor,
        # DB가 응답하지 않을 때 화면 요청이 통째로 멈추지 않도록 짧게 끊는다.
        "connect_timeout": 5,
        "read_timeout": 10,
    }
    if with_database:
        settings["database"] = os.getenv("DB_NAME", "leading_indicator")
    return settings


@contextmanager
def connect(*, with_database: bool = True):
    """커넥션을 열고, 블록이 정상 종료되면 commit / 예외면 rollback 후 항상 닫는다.

    with_database=False는 스키마 자체를 만들기 전(=DB가 아직 없을 때) 접속용.
    """
    if not os.getenv("DB_USER"):
        raise RuntimeError(
            "DB 접속 정보가 없습니다. backend/.env에 DB_USER/DB_PASSWORD를 설정하세요."
        )

    conn = pymysql.connect(**_settings(with_database=with_database))
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
