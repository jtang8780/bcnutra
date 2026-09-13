// BC Nutra — Site Scripts
document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.toggle('active');
    });
  }
});
