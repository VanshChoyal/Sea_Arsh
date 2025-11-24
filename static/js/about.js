// Fade-in scroll animations
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

// Seaweed Packaging Growth Chart (Line Graph)
const ctx = document.getElementById('seaweedGrowthChart').getContext('2d');

new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
        datasets: [{
            label: 'Global Usage of Seaweed Packaging (in tonnes)',
            data: [10, 25, 40, 90, 140, 220, 310, 430], // example growth numbers
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.3)',
            borderWidth: 3,
            tension: 0.4,       // smooth curve
            pointRadius: 5,
            pointBackgroundColor: '#4CAF50'
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#fff' }
            },
            x: {
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#fff' }
            }
        },
        plugins: {
            legend: {
                labels: { color: '#fff' }
            }
        }
    }
});
