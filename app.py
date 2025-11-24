from flask import Flask, render_template, request, redirect, url_for, session, abort, make_response, jsonify
import database
import asyncio
import secrets
import razorpay
from datetime import datetime, timedelta
import hmac
import hashlib
import json
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Set a secret key for session management
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
TEMP_ORDERS = {}   # stores orders until payment is verified


razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

# Amount expected (in paise)
EXPECTED_AMOUNT = 50000   # = ₹500.00



def load_products():
    with open('products.json', 'r') as f:
        return json.load(f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/product/<id>')
def product_page(id):
    products = load_products()
    product = next((p for p in products if p['id'] == id), None)
    if not product:
        abort(404)
    return render_template('product.html', product=product)

@app.route('/cart')
def cart_page():
    # Load products
    with open("products.json", "r") as f:
        products = json.load(f)

    # Load cart cookie
    cart_cookie = get_cookie("cart")

    if cart_cookie:
        try:
            cart = json.loads(cart_cookie)
        except:
            cart = []
    else:
        cart = []

    detailed_cart = []

    for item in cart:
        prod = next((p for p in products if p["id"] == item["product_id"]), None)
        if prod:
            detailed_cart.append({
                "id": prod["id"],
                "name": prod["name"],
                "price": prod["price"],
                "image": url_for("static", filename="images/" + prod["image"].split("/")[-1]),
                "qty": item["qty"],
                "total": prod["price"] * item["qty"]
            })

    return render_template("cart.html", cart=detailed_cart)

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.route('/contact')
def contact_page():
    return render_template('contact.html')

@app.route('/checkout')
def checkout_page():
    login_data = get_cookie('user')
    if not login_data:
        return redirect('/auth/login')
    return render_template('checkout.html')

@app.route('/auth/clear/cookie')
def clear_cookie():
    resp = make_response(jsonify({"cleared": True}))

    # Loop through all cookies and delete them
    for cookie in request.cookies:
        resp.set_cookie(cookie, '', expires=0)

    return resp

@app.route("/create-order", methods=["POST"])
def create_order():
    login = get_cookie('user')
    print(f"Login: {login}")
    if not login:
        return jsonify({"error":'login needed'}), 400

    data = request.get_json()
    print(f"Order Creation: {data}")
    cart = data.get("cart", [])
    user_location = data.get("user_location", {})
    print(user_location)

    print(data)

    if not cart:
        return jsonify({"error": "Cart is empty"}), 400

    # Validate user location
    required = ["name", "phone", "address", "pincode"]
    if not all(x in user_location and user_location[x] for x in required):
        return jsonify({"error": "Missing user address fields"}), 400

    # Load product DB
    with open("products.json") as f:
        products = {p["id"]: p for p in json.load(f)}

    subtotal = 0
    detailed_items = []

    for item in cart:
        pid = item.get("product_id")
        qty = int(item.get("qty", 0))

        if pid not in products or qty <= 0:
            return jsonify({"error": "Invalid product in cart"}), 400

        real_price = products[pid]["price"]
        total = real_price * qty
        subtotal += total

        detailed_items.append({
            "product_id": pid,
            "name": products[pid]["name"],
            "price": real_price,
            "qty": qty,
            "total": total
        })

    gst = round(subtotal * 0.05)
    final_amount = (subtotal + gst) * 100  # paise

    # Create Razorpay order
    order = razorpay_client.order.create({
        "amount": int(final_amount),
        "currency": "INR",
        "payment_capture": 1
    })

    # Store temporarily for verification
    TEMP_ORDERS[order["id"]] = {
        "items": detailed_items,
        "subtotal": subtotal,
        "gst": gst,
        "grand_total": subtotal + gst,
        "user_location": user_location
    }

    return jsonify({
        "id": order["id"],
        "amount": int(final_amount)
    })



@app.route("/verify-payment", methods=["POST"])
def verify_payment():
    data = request.get_json()

    required = ["razorpay_payment_id", "razorpay_order_id", "razorpay_signature"]
    if not all(k in data for k in required):
        return jsonify({"status": "failure", "error": "Missing fields"}), 400

    order_id = data["razorpay_order_id"]

    # Check stored temp order
    if order_id not in TEMP_ORDERS:
        return jsonify({"status": "failure", "error": "Order not found"}), 400

    # -------------------------------
    # VERIFY SIGNATURE
    # -------------------------------
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_signature": data["razorpay_signature"]
        })

    except:
        return jsonify({"status": "failure"}), 400

    # -------------------------------
    # BUILD ORDER OBJECT
    # -------------------------------
    order_record = {
        "order_id": order_id,
        "payment_id": data["razorpay_payment_id"],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "items": TEMP_ORDERS[order_id]["items"],
        "subtotal": TEMP_ORDERS[order_id]["subtotal"],
        "gst": TEMP_ORDERS[order_id]["gst"],
        "grand_total": TEMP_ORDERS[order_id]["grand_total"],
        "user_location": TEMP_ORDERS[order_id]["user_location"]
    }

    # -------------------------------
    # SAVE TO GLOBAL orders.json
    # -------------------------------
    if os.path.exists("orders.json"):
        with open("orders.json", "r") as f:
            orders = json.load(f)
    else:
        orders = []

    orders.append(order_record)

    with open("orders.json", "w") as f:
        json.dump(orders, f, indent=4)

    # -------------------------------
    # SAVE ORDER TO THE USER RECORD
    # -------------------------------
    login = get_cookie("user")
    if not login:
        return jsonify({"status": "failure", "error": "User not logged in"}), 400

    user_info = json.loads(login)  # string → dict
    user_id = user_info["id"]

    # load users.json
    with open("users.json", "r") as f:
        users_data = json.load(f)

    # find user
    user_found = False
    for u in users_data["users"]:
        if u["id"] == user_id:

            # Ensure user has an order history list
            if "orders" not in u:
                u["orders"] = []

            # Append new order
            u["orders"].append(order_record)
            user_found = True
            break

    if not user_found:
        return jsonify({"status": "failure", "error": "User not found in DB"}), 400

    # save updated users.json
    with open("users.json", "w") as f:
        json.dump(users_data, f, indent=4)

    # -------------------------------
    # CLEANUP TEMP
    # -------------------------------
    del TEMP_ORDERS[order_id]

    print("===== ORDER SAVED SUCCESSFULLY =====")
    print(json.dumps(order_record, indent=4))

    return jsonify({"status": "success"})

@app.route("/orders")
def orders_page():
    login = get_cookie("user")
    if not login:
        return redirect("/auth/login")

    return render_template("orders.html")

@app.route("/api/get-orders")
def api_get_orders():
    login = get_cookie("user")
    if not login:
        return jsonify({"error": "Not logged in"}), 400

    user_info = json.loads(login)
    user_id = user_info["id"]

    show_cancelled = request.args.get("show_cancelled", "0") == "1"

    with open("users.json", "r") as f:
        users_data = json.load(f)

    for u in users_data["users"]:
        if u["id"] == user_id:
            orders = u.get("orders", [])

            # Filter cancelled orders if not requested
            if not show_cancelled:
                orders = [o for o in orders if o.get("status") != "cancelled"]

            # Add ETA
            for o in orders:
                o["delivery_eta"] = calculate_delivery_eta(o["timestamp"])
            print(orders)
            return jsonify({"orders": orders})

    return jsonify({"orders": []})


@app.route("/api/cancel-order", methods=["POST"])
def cancel_order():
    data = request.get_json()
    order_id = data.get("order_id")

    login = get_cookie("user")
    if not login:
        return jsonify({"error": "Not logged in"}), 400

    user_info = json.loads(login)
    user_id = user_info["id"]

    with open("users.json", "r") as f:
        users_data = json.load(f)

    found = False

    for u in users_data["users"]:
        if u["id"] == user_id:
            for order in u.get("orders", []):
                if order["order_id"] == order_id:
                    order["status"] = "cancelled"
                    found = True
                    break

    if not found:
        return jsonify({"error": "Order not found"}), 404

    with open("users.json", "w") as f:
        json.dump(users_data, f, indent=4)

    return jsonify({"status": "cancelled"})


def calculate_delivery_eta(order_timestamp):
    # order_timestamp: "2025-11-20 17:22:10"
    dt = datetime.strptime(order_timestamp, "%Y-%m-%d %H:%M:%S")
    
    # If ordered after 6 PM → next day counts
    if dt.hour >= 18:
        dt += timedelta(days=1)

    eta = dt + timedelta(days=7)
    return eta.strftime("%Y-%m-%d")

@app.route("/api/reorder", methods=["POST"])
def reorder():
    data = request.get_json()
    order_id = data.get("order_id")

    login = get_cookie("user")
    if not login:
        return jsonify({"error": "Not logged in"}), 400

    user_info = json.loads(login)
    user_id = user_info["id"]

    with open("users.json", "r") as f:
        users_data = json.load(f)

    order_items = None
    for u in users_data["users"]:
        if u["id"] == user_id:
            for order in u.get("orders", []):
                if order["order_id"] == order_id:
                    order_items = order["items"]
                    break

    if not order_items:
        return jsonify({"error": "Order not found"}), 404

    return jsonify({"cart": order_items})


@app.route('/api/save/response', methods=["POST"])
def api_save_response():
    import json, os, threading

    responses_file = "responses.json"
    file_lock = threading.Lock()

    data = request.get_json()
    payload = {
        'full_name': data.get('full_name'),
        'email_address': data.get('email_address'),
        'subject': data.get('subject'),
        'message': data.get('message')
    }

    def save():
        with file_lock:
            # Ensure file exists
            if not os.path.exists(responses_file):
                with open(responses_file, "w") as f:
                    json.dump([], f, indent=4)

            # Load current responses
            with open(responses_file, "r") as f:
                try:
                    current = json.load(f)
                except json.JSONDecodeError:
                    current = []

            # Add the new response
            current.append(payload)

            # Save back to file
            with open(responses_file, "w") as f:
                json.dump(current, f, indent=4)

    # Run file saving in background
    threading.Thread(target=save, daemon=True).start()

    return jsonify({"success": True, "message": "Saved successfully"})


@app.route('/api/add/cart', methods=["POST"])
def api_add_cart():
    data = request.get_json()
    if not data or not data.get('product_id'):
        return jsonify({'response': False}), 403
    
    product_id = str(data.get('product_id'))

    # Load cookie
    cart_cookie = get_cookie('cart')

    if cart_cookie:
        try:
            cart = json.loads(cart_cookie)
        except:
            cart = []
    else:
        cart = []

    # Ensure cart entries are dicts
    if not all(isinstance(item, dict) for item in cart):
        cart = []

    # Try to find the item in cart
    item = next((i for i in cart if i["product_id"] == product_id), None)

    if item:
        # Increase quantity
        item["qty"] += 1
    else:
        # Add new item with quantity 1
        cart.append({"product_id": product_id, "qty": 1})

    # Create response
    resp = make_response(jsonify({"response": True}))

    resp.set_cookie(
        key='cart',
        value=json.dumps(cart),
        httponly=True,
        secure=False,
        samesite='Lax',
        max_age=86400 * 7,
        path='/'
    )

    return resp

@app.route('/api/cart/get', methods=["GET"])
def api_get_cart():
    cart_cookie = get_cookie('cart')

    if cart_cookie:
        try:
            cart = json.loads(cart_cookie)
        except:
            cart = []
    else:
        cart = []

    return jsonify({"response": True, "cart": cart})


@app.route('/api/remove/cart', methods=["POST"])
def api_remove_cart():
    data = request.get_json()
    if not data or not data.get('product_id'):
        return jsonify({'response': False}), 403

    product_id = str(data.get('product_id'))

    # Load cookie
    cart_cookie = get_cookie('cart')

    if cart_cookie:
        try:
            cart = json.loads(cart_cookie)
        except:
            cart = []
    else:
        cart = []

    # Ensure structured cart
    if not all(isinstance(item, dict) for item in cart):
        cart = []

    # Try to find item
    item = next((i for i in cart if i["product_id"] == product_id), None)

    if item:
        # If qty > 1 → decrement
        if item["qty"] > 1:
            item["qty"] -= 1
        else:
            # Remove item entirely if qty hits 0
            cart = [i for i in cart if i["product_id"] != product_id]

    # Create response
    resp = make_response(jsonify({"response": True}))

    resp.set_cookie(
        key='cart',
        value=json.dumps(cart),
        httponly=True,
        secure=False,
        samesite='Lax',
        max_age=86400 * 7,
        path='/'
    )

    return resp


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


def save_cookie(payload):
    response = redirect('/')
    cookie_value = json.dumps(payload)   # <-- convert dict to string
    response.set_cookie(
        'user',
        cookie_value,
        max_age=60*60*24*30,  # example: 30 days
        path='/',
        samesite='Lax'
    )
    return response

def save_user_cookie(username, email, id):
    payload = {
        "username": username,
        "email": email,
        "id": id
    }
    return save_cookie(payload)


@app.route('/auth/login')
def login():
    return render_template('login.html')

@app.route('/auth/signup')
def signup():
    return render_template('signup.html')

@app.route('/auth/logout')
def logout():
    session.clear()  # Clear the session data
    resp = redirect(url_for('home'))
    # Clear cookies by setting their expiration in the past
    resp.set_cookie('username', '', expires=0, path='/')
    resp.set_cookie('email', '', expires=0, path='/')
    return resp

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.form.to_dict()
    print('\n[Signup data received]')
    print(data, flush=True)

    if data.get('password') != data.get('confirm'):
        return "Passwords do not match!", 400

    result = database.save_user(
        username=data.get('username'),
        password=data.get('password'),
        email=data.get('email'),
        ip=request.remote_addr
    )
    
    if result['ok'] == 0:
        return result['msg'], 400

    response = save_user_cookie(
        username=data.get('username'),
        email=data.get('email'),
        id=result.get('id')
    )
    
    session['username'] = data.get('username')
    session['email'] = data.get('email')
    
    return response

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.form.to_dict()
    print('\n[Login data received]')
    print(data, flush=True)

    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return "Username and password are required", 400

    result = database.get_user(email=username, password=password)
    
    if not result:
        return "Invalid credentials", 400
        
    if result['ok'] == 0:
        return result['msg'], 400
    
    user = result['user']
    response = save_user_cookie(
        username=user['username'],
        email=user['email'],
        id=user.get('id')
    )
    
    session['user_id'] = str(user.get('_id'))
    session['username'] = user['username']
    session['email'] = user['email']
    
    return response

@app.route('/api/product/<product_id>', methods=['GET'])
def api_get_single_product(product_id):
    try:
        with open("products.json", "r") as f:
            products = json.load(f)

        # match using "id", not "product_id"
        product = next((p for p in products if str(p["id"]) == str(product_id)), None)

        if not product:
            return jsonify({"response": False, "error": "Product not found"}), 404

        # Fix image path if needed
        if not product["image"].startswith("/static/"):
            product["image"] = "/static/" + product["image"]

        return jsonify({"response": True, "product": product})

    except Exception as e:
        # Print error to console
        print("ERROR in /api/product:", e)
        return jsonify({"response": False, "error": str(e)}), 500


def get_cookie(key=None):
    # Get specified cookie or all cookies if key is None
    if key:
        return request.cookies.get(key)
    else:
        return request.cookies

@app.route('/test')
def test_route():
    return jsonify({'message': get_cookie()})

if __name__ == '__main__':
    app.run(debug=True)