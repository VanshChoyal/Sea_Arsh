document.addEventListener("DOMContentLoaded", () => {

    console.log("cart.js loaded!");

    function updateTotals() {
        let items = document.querySelectorAll(".cart-item");
        let grandTotal = 0;

        items.forEach(el => {
            let price = parseInt(el.querySelector(".price").innerText.replace("₹", ""));
            let qty = parseInt(el.querySelector(".qty").innerText);
            let total = price * qty;

            el.querySelector(".item-total").innerText = "₹" + total;
        });

        updateSelectedTotal();
    }

    // UPDATE ONLY SELECTED ITEMS TOTAL
    function updateSelectedTotal() {
        let selectedItems = document.querySelectorAll(".select-item:checked");
        let total = 0;

        selectedItems.forEach(cb => {
            let item = cb.closest(".cart-item");
            let itemTotal = parseInt(item.querySelector(".item-total").innerText.replace("₹", ""));
            total += itemTotal;
        });

        document.getElementById("selected-total").innerText = total;
    }

    // POST helper
    function postJSON(url, data) {
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }).then(res => res.json());
    }

    // + BUTTON HANDLER
    document.querySelectorAll(".increase").forEach(btn => {
        btn.addEventListener("click", () => {
            let item = btn.closest(".cart-item");
            let productId = item.dataset.id;
            let qtyEl = item.querySelector(".qty");

            qtyEl.innerText = parseInt(qtyEl.innerText) + 1;
            updateTotals();

            postJSON("/api/add/cart", { product_id: productId })
                .then(r => console.log("Increase:", r));
        });
    });

    // - BUTTON HANDLER
    document.querySelectorAll(".decrease").forEach(btn => {
        btn.addEventListener("click", () => {
            let item = btn.closest(".cart-item");
            let productId = item.dataset.id;
            let qtyEl = item.querySelector(".qty");
            let current = parseInt(qtyEl.innerText);

            if (current > 1) {
                qtyEl.innerText = current - 1;
                updateTotals();

                postJSON("/api/remove/cart", { product_id: productId })
                    .then(r => console.log("Decrease:", r));
            }
        });
    });

    // Checkbox selection → update selected total
    document.querySelectorAll(".select-item").forEach(cb => {

        // ✅ ADDED: enable checkbox
        cb.disabled = false;

        // ✅ ADDED: check checkbox by default
        cb.checked = true;

        // keep original listener
        cb.addEventListener("change", updateSelectedTotal);
    });

    // Checkout button → save selected items to sessionStorage
    document.getElementById("checkout-button").addEventListener("click", () => {
        let selected = [];

        document.querySelectorAll(".select-item:checked").forEach(cb => {
            let item = cb.closest(".cart-item");

            selected.push({
                product_id: item.dataset.id,
                qty: parseInt(item.querySelector(".qty").innerText),
                price: parseInt(item.querySelector(".price").innerText.replace("₹", "")),
                total: parseInt(item.querySelector(".item-total").innerText.replace("₹", "")),
            });
        });

        sessionStorage.setItem("selected_cart_items", JSON.stringify(selected));

        window.location.href = '/checkout'
    });

    // Update totals & selected amount immediately
    updateTotals();
});
