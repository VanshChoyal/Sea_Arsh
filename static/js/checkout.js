document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("checkout-items");

    // Load selected items from sessionStorage
    let selected = sessionStorage.getItem("selected_cart_items");
    if (!selected) {
        container.innerHTML = "<p>No items selected.</p>";
        return;
    }

    selected = JSON.parse(selected);
    if (selected.length === 0) {
        container.innerHTML = "<p>No items selected.</p>";
        return;
    }

    let subtotal = 0;

    for (let selItem of selected) {
        const productId = selItem.product_id;

        // Fetch product info from backend
        let productData;
        try {
            const res = await fetch(`/api/product/${productId}`);
            const data = await res.json();

            if (!data.response) continue;

            productData = data.product;
        } catch (err) {
            console.error("Product fetch failed:", err);
            continue;
        }

        const qty = selItem.qty;
        const price = productData.price;
        const total = price * qty;

        subtotal += total;

        container.innerHTML += `
            <div class="item">
                <img class="product-img" src="${productData.image}" alt="Product">

                <div class="item-info">
                    <div class="item-name">${productData.name}</div>
                    <div class="item-qty">Qty: ${qty}</div>
                </div>

                <div class="item-details">
                    <div>Price: ₹${price}</div>
                    <div>Total: ₹${total}</div>
                </div>
            </div>
        `;
    }

    // Totals
    const gst = Math.round(subtotal * 0.05);
    const grand = subtotal + gst;

    document.getElementById("subtotal").textContent = `₹${subtotal}`;
    document.getElementById("gst").textContent = `₹${gst}`;
    document.getElementById("grand-total").textContent = `₹${grand}`;

   // Payment Button
    document.getElementById("pay-btn").addEventListener("click", async () => {

        const cart_items = JSON.parse(sessionStorage.getItem("selected_cart_items") || "[]");

        // ------------------------------
        // 1️⃣ FRONTEND VALIDATION
        // ------------------------------

        if (!cart_items || cart_items.length === 0) {
            alert("❗ Your cart is empty.");
            return;
        }

        for (let item of cart_items) {
            if (!item.product_id || !item.qty) {
                alert("❗ Invalid items in cart. Refresh and try again.");
                return;
            }
            if (item.qty <= 0) {
                alert("❗ Quantity cannot be zero.");
                return;
            }
        }

        // ------------------------------
        // 2️⃣ Create order on backend
        // ------------------------------

        const user_location = {
            name: document.getElementById("full-name").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            address: [
                document.getElementById("address1").value.trim(),
                document.getElementById("city").value.trim(),
                document.getElementById("state").value.trim(),
                document.getElementById("country").value.trim()
            ].join(", "),
            pincode: document.getElementById("pincode").value.trim()
        };

        console.log("User location:", user_location);

        const orderRes = await fetch("/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cart: cart_items,
                user_location: user_location
            })
        });

        // If the backend returns non-JSON or fails
        let orderData;
        try {
            orderData = await orderRes.json();
        } catch (err) {
            alert("Server error. Please try again.");
            console.error("Bad JSON:", err);
            return;
        }

        // 🔥 Check for "login needed" from backend
        if (orderRes.status === 400 && orderData.error === "login needed") {
            window.location.href = "/auth/login";
            return;
        }

        // Normal validation
        if (!orderData.id || !orderData.amount) {
            alert("⚠ Failed to create order. Try again.");
            console.error("Order creation error:", orderData);
            return;
        }

        // ------------------------------
        // 3️⃣ Razorpay Checkout
        // ------------------------------
        const options = {
            key: "rzp_test_RawIVqvTGuoDjZ",
            amount: orderData.amount,
            currency: "INR",
            order_id: orderData.id,
            name: "SeaArsh",
            description: "Order Payment",

            handler: async function (response) {

                // ------------------------------
                // 4️⃣ Verify payment
                // ------------------------------
                const verifyRes = await fetch("/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                const verifyData = await verifyRes.json();

                if (verifyData.status === "success") {
                    alert("Payment Successful & Verified!");

                    console.log("====== PAYMENT VERIFIED ======");
                    console.log("Payment ID:", response.razorpay_payment_id);
                    console.log("Order ID:", response.razorpay_order_id);
                    console.log("Signature:", response.razorpay_signature);
                    console.log("Cart Items:", cart_items);
                    console.log("Total Amount (Paise):", orderData.amount);
                    console.log("==============================");
                    window.location.href = '/orders'
                } else {
                    alert("Payment verification failed! Check console.");
                    console.error("Verification error:", verifyData);
                }
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();
    });


});
