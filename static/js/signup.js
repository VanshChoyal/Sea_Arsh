// Minimal client-side checks for signup form
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm');

    if (!username.value.trim() || !email.value.trim() || !password.value || !confirm.value) {
      e.preventDefault();
      alert('Please fill all fields.');
      return;
    }

    if (password.value !== confirm.value) {
      e.preventDefault();
      alert('Passwords do not match.');
      return;
    }

    // Allow form to submit; server will handle storing/validation
  });
});
