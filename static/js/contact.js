// Fade-in animations
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
});

document.querySelectorAll("section").forEach(sec => {
    sec.classList.add("hidden");
    observer.observe(sec);
});

// Form submit request
const form = document.getElementById("contact-form");
const statusMsg = document.querySelector(".form-status");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    statusMsg.textContent = "Sending...";
    statusMsg.style.color = "#00ff9d";

    const formData = {
        full_name: form.full_name.value,
        email_address: form.email_address.value,
        subject: form.subject.value,
        message: form.message.value
    };

    try {
        const res = await fetch("/api/save/response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.success) {
            statusMsg.textContent = "Message sent successfully!";
            form.reset();
        } else {
            statusMsg.textContent = "Failed to send message.";
            statusMsg.style.color = "red";
        }

    } catch (err) {
        statusMsg.textContent = "Network error.";
        statusMsg.style.color = "red";
    }
});
