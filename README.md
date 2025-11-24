# AppScriptify Login Template

A simple **Flask-based login and signup template** with session management and cookie support. This project uses **MongoDB** for user storage and includes asynchronous database handling.

## Features

- User signup with password confirmation
- User login with session and secure cookie management
- Logout functionality
- Session tracking on the server-side
- Async integration with MongoDB

## Installation

1. Install required Python packages:

```powershell
pip install -r requirements.txt
```

2. Change the `MONGO_URI` in the `.env`:
```env
MONGO_URI="your-mongodb-connection-string-here"
```

3. Change `config.json` if needed:
```json
{
  "users_database": "your_db_name",
  "users_collection": "users"
}
```

## Running the App

Start the Flask server:

```powershell
python app.py
```

By default, the server runs on:
```plaintext
http://127.0.0.1:5000/
```

## Usage

- Home: Go to http://127.0.0.1:5000/ to see links to login, signup, and logout.
- Login: Go to http://127.0.0.1:5000/auth/login
- Signup: Go to http://127.0.0.1:5000/auth/signup
- Logout: Go to http://127.0.0.1:5000/auth/logout

Cookies and session are automatically managed for logged-in users.

## Notes

- The app uses `secrets.token_hex(16)` for Flask `secret_key` for secure sessions.
- Cookies are set with `httponly=True` and `samesite='Lax'` for basic security. Change `secure=False` to `True` in production when using HTTPS.
- Make sure MongoDB connection string in .env and database/collection in config.json match your setup.