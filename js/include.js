document.addEventListener("DOMContentLoaded", function() {
    // Підставлення header
    fetch('./partials/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
            document.dispatchEvent(new Event("headerLoaded")); // <- повідомлення
        });

    // Підставлення footer
    fetch('./partials/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        });
});