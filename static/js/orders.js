async function loadOrders() {
    const showCancelled = document.getElementById("toggleCancelled").checked ? "1" : "0";

    const res = await fetch(`/api/get-orders?show_cancelled=${showCancelled}`);
    const data = await res.json();

    const list = document.getElementById("orders-list");
    list.innerHTML = "";

    if (!data.orders.length) {
        list.innerHTML = `<p>No orders found.</p>`;
        return;
    }

    data.orders.forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";

        const isCancelled = order.status === "cancelled";

        card.innerHTML = `
            <div class="order-header">
                <strong>Order #${order.order_id}</strong>
                <div class="order-id">${order.timestamp}</div>
            </div>

            <div class="order-items">
                ${order.items.map(i => `
                    <div>${i.qty} × ${i.name} — ₹${i.total}</div>
                `).join("")}
            </div>

            <div class="status">Status: <strong>${order.status || "Success"}</strong></div>
            <div class="delivery">Delivery ETA: <strong>${order.delivery_eta}</strong></div>

            <div class="buttons">
                ${isCancelled ? "" : `
                    <button class="reorder-btn" onclick="reorder('${order.order_id}')">Re-Order</button>
                    <button class="cancel-btn" onclick="cancelOrder('${order.order_id}')">Cancel Order</button>
                `}
            </div>
        `;

        if (isCancelled) {
            card.style.opacity = "0.55";
            card.style.filter = "grayscale(100%)";
        }

        list.appendChild(card);
    });
}

async function cancelOrder(order_id) {
    const sure = confirm("Are you sure you want to cancel this order?");
    if (!sure) return;

    const res = await fetch("/api/cancel-order", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ order_id })
    });

    const data = await res.json();

    if (data.status === "cancelled") {
        alert("Order Cancelled Successfully.");
        loadOrders();
    }
}

async function reorder(order_id) {
    const res = await fetch("/api/reorder", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ order_id })
    });

    const data = await res.json();

    if (!data.cart) return alert("Unable to reorder.");

    // Set selected items in sessionStorage
    sessionStorage.setItem("selected_cart_items", JSON.stringify(data.cart));

    // Redirect to checkout
    window.location.href = "/checkout";
}

loadOrders();
document.getElementById("toggleCancelled").addEventListener("change", loadOrders);
