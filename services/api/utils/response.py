import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

def generate_request_id() -> str:
    """Returns UUID4 as string"""
    return str(uuid.uuid4())

def get_current_ist_timestamp() -> str:
    """Returns current IST datetime as ISO string"""
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).isoformat()

def success_response(data: Any, message: str = "Success") -> dict:
    """Returns standard envelope with success=True"""
    return {
        "success": True,
        "data": data,
        "message": message,
        "timestamp": get_current_ist_timestamp(),
        "request_id": generate_request_id()
    }

def error_response(message: str, code: str = "ERROR") -> dict:
    """Returns standard envelope with success=False"""
    return {
        "success": False,
        "data": None,
        "message": message,
        "error_code": code,
        "timestamp": get_current_ist_timestamp(),
        "request_id": generate_request_id()
    }
