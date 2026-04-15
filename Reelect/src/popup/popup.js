document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = 'Ready. The extension is listening for saved reels on Instagram.';
  }
});
