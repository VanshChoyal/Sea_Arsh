
// Minimal behavior for the login page.
document.addEventListener('DOMContentLoaded', function () {
	// Keep a small, unobtrusive client-side check before submit.
	const form = document.getElementById('login-form');
	if (form) {
		form.addEventListener('submit', function (e) {
			const u = document.getElementById('username');
			const p = document.getElementById('password');
			if (!u.value.trim() || !p.value) {
				e.preventDefault();
				// Use a non-blocking inline message if desired; for now, simple alert.
				alert('Please enter both username and password.');
			}
		});
	}
});
