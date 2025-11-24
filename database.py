import json
import hashlib
import secrets
import base64
import hmac
import datetime
import threading
import uuid
import time
from dotenv import load_dotenv

load_dotenv()

# JSON file path
DB_FILE = "users.json"

# Queue lock to avoid simultaneous read/write crashes
db_lock = threading.Lock()

# Ensure file exists
try:
    with open(DB_FILE, "r") as f:
        pass
except FileNotFoundError:
    with open(DB_FILE, "w") as f:
        json.dump({"users": []}, f, indent=4)


# INTERNAL JSON HELPERS -----------------------------

def _load_json():
    with db_lock:  # prevents race conditions
        with open(DB_FILE, "r") as f:
            return json.load(f)


def _save_json(data):
    with db_lock:
        with open(DB_FILE, "w") as f:
            json.dump(data, f, indent=4)


# SIMULATED COLLECTION-LIKE FUNCTIONS ---------------

def write_data(data, collection=None):
    """Simulates insert_one()"""
    db = _load_json()
    db["users"].append(data)
    _save_json(db)

    print("Inserted ID:", data.get("id"))
    print("Data Updated")


def read_data(query):
    """
    Simulates find_one()
    Supports:
        {"email": "..."}
        {"username": "..."}
        {"id": "..."}
        {"$or": [ {...}, {...} ]}
    """
    db = _load_json()
    users = db["users"]

    # Handle $or
    if "$or" in query:
        conditions = query["$or"]
        for user in users:
            for cond in conditions:
                k, v = list(cond.items())[0]
                if user.get(k) == v:
                    return user
        return None

    # Normal query
    key, value = list(query.items())[0]
    for user in users:
        if user.get(key) == value:
            return user

    return None


# USER FUNCTIONS -------------------------------------

def save_user(username, password, email, ip):
    existing_user = read_data({'email': email})
    if existing_user:
        return {'ok': 0, 'msg': 'Email already registered'}

    id = secrets.token_hex(16)

    # Hash+salt
    salt = secrets.token_bytes(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    pwd_storage = base64.b64encode(salt + pwd_hash).decode('utf-8')

    user_data = {
        'username': username,
        'password': pwd_storage,
        'email': email,
        'ip': ip,
        'id': id
    }

    write_data(user_data)
    return {'ok': 1, 'id': id}


def get_user(email, password):
    if not email or not password:
        return {'ok': 0, 'msg': 'Email/username and password are required'}

    try:
        user = read_data({
            '$or': [
                {'email': email},
                {'username': email}
            ]
        })

        if not user:
            return {'ok': 0, 'msg': 'User not found'}

        stored_data = base64.b64decode(user['password'])
        salt = stored_data[:16]
        stored_hash = stored_data[16:]

        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)

        if hmac.compare_digest(stored_hash, pwd_hash):
            return {'ok': 1, 'user': user}

        return {'ok': 0, 'msg': 'Invalid password'}

    except Exception as e:
        print("Error in get_user:", str(e))
        return {'ok': 0, 'msg': 'An error occurred during login'}
