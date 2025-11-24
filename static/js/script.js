// -------------------------
// LOAD CART ON PAGE LOAD
// -------------------------

document.addEventListener("DOMContentLoaded", async () => {
    let cartItems = [];

    // Fetch cart from backend
    try {
        const res = await fetch("/api/cart/get");
        const data = await res.json();
        if (data.response === true) {
            cartItems = data.cart; // list of {product_id, qty}
        }
    } catch (err) {
        console.error("Error fetching cart:", err);
    }

    // Update UI for each product card
    const productCards = document.querySelectorAll(".product-card");

    productCards.forEach(card => {
        const btn = card.querySelector("button");
        const productId = card.getAttribute("data-id");

        const isInCart = cartItems.some(item => item.product_id === productId);

        if (isInCart) {
            btn.textContent = "Go To Cart";
            btn.classList.add("go-to-cart");
            btn.addEventListener("click", () => {
                window.location.href = "/cart";
            });
        } else {
            btn.addEventListener("click", async () => {
                try {
                    const response = await fetch("/api/add/cart", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ product_id: productId })
                    });

                    const result = await response.json();

                    if (result.response === true) {
                        // Change UI to "Go To Cart"
                        btn.textContent = "Go To Cart";
                        btn.classList.add("go-to-cart");

                        // Replace add-to-cart click handler
                        btn.replaceWith(btn.cloneNode(true));
                        const newBtn = card.querySelector("button");
                        newBtn.addEventListener("click", () => {
                            window.location.href = "/cart";
                        });
                    } else {
                        alert("Failed to add item to cart.");
                    }
                } catch (err) {
                    console.error("Error adding to cart:", err);
                    alert("Something went wrong.");
                }
            });
        }
    });
});


// -------------------------
// NEWSLETTER FORM
// -------------------------

document.getElementById('newsletter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    alert(`Thanks for joining our green community, ${email}! 🌿`);
    e.target.reset();
});


// -------------------------
// SCROLL ANIMATIONS
// -------------------------

window.addEventListener('scroll', () => {
    document.querySelectorAll('.feature, .product-card').forEach((el) => {
        const pos = el.getBoundingClientRect().top;
        if (pos < window.innerHeight - 100) {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("bioTimelineChart");

    // REAL DATA (for hover)
    const realDays = {
        "Seaweed Packaging": 15,
        "Paper": 90,
        "PLA Bioplastic": 240,
        "Plastic": 146000 // 400 years
    };

    // FAKE DISPLAY DATA (for a visible & beautiful graph)
    const displayData = {
        "Seaweed Packaging": 10,
        "Paper": 30,
        "PLA Bioplastic": 50,
        "Plastic": 600
    };

    new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(displayData),
            datasets: [{
                label: "Biodegradation (visual scale)",
                data: Object.values(displayData),
                backgroundColor: [
                    "rgba(34, 197, 94, 0.8)",
                    "rgba(199, 146, 69, 0.8)",
                    "rgba(255, 165, 0, 0.8)",
                    "rgba(70, 130, 180, 0.8)"
                ],
                borderColor: [
                    "rgba(34, 197, 94, 1)",
                    "rgba(199, 146, 69, 1)",
                    "rgba(255, 165, 0, 1)",
                    "rgba(70, 130, 180, 1)"
                ],
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "Biodegradation Timeline Comparison",
                    color: "#ffffff",
                    font: { size: 20, weight: "bold" }
                },
                legend: { display: false },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label;
                            const real = realDays[label];

                            if (real >= 146000) {
                                return `${label}: ≈ 400 years`;
                            }
                            return `${label}: ${real} days`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#c9d1d9" },
                    grid: { color: "#2f343e" },
                    title: {
                        display: true,
                        text: "Visual Scale (Hover for real days)",
                        color: "#8b949e"
                    }
                },
                y: {
                    ticks: { color: "#ffffff" },
                    grid: { color: "#2f343e" }
                }
            }
        }
    });
});