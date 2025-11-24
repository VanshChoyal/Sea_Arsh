document.querySelector('.add-to-cart').addEventListener('click', async () => {
    // Get the last segment of the URL → product ID
    const urlParts = window.location.pathname.split("/");
    const productId = urlParts[urlParts.length - 1];   // "123"

    // Send request to backend
    const res = await fetch("/api/add/cart", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ product_id: productId })
    });

    const data = await res.json();

    if (data.response) {
        alert(`Added to cart 🛒`);
    } else {
        alert(`Failed to add to cart`);
    }
});
