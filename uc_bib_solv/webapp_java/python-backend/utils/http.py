from flask import jsonify


def ok(payload: dict, status_code: int = 200):
    response = jsonify(payload)
    response.status_code = status_code
    return response


def error(message: str, status_code: int = 400, **extra):
    payload = {"status": "error", "message": message}
    if extra:
        payload.update(extra)
    return ok(payload, status_code=status_code)
