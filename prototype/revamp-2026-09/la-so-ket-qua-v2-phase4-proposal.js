// LSV75 visual proposal only. No network calls, stored profile, or commerce mutations.
(() => {
  const dialog = document.querySelector('#preview');
  let opener;
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    opener = button; document.querySelector('#notice').textContent = ''; dialog.showModal();
  }));
  document.querySelector('#close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  document.querySelector('#confirm').addEventListener('click', () => {
    document.querySelector('#notice').textContent = 'Bản mẫu dừng ở bước xem trước. Khi triển khai, bạn xác nhận báo giá mới từ máy chủ trước khi dùng Lá.';
  });
  document.querySelector('#theme').addEventListener('click', () => document.body.classList.toggle('light'));
  const mobile = window.matchMedia('(max-width:1023px)');
  let tab = 'overview';
  const links = [...document.querySelectorAll('nav a')];
  function show() {
    const map = {overview:['overview','palaces'],period:['period'],palaceMap:['palaceMap'],completion:['completion'],basis:['basis'],chart:[]};
    document.querySelectorAll('.reading>section').forEach(section => section.classList.toggle('desktop-hidden', !mobile.matches && !map[tab].includes(section.id) && !(tab==='overview' && section.classList.contains('save'))));
    links.forEach(link => link.setAttribute('aria-current', String(link.hash === '#'+tab)));
  }
  links.forEach(link => link.addEventListener('click', event => {
    tab = link.hash.slice(1);show(); if(!mobile.matches){event.preventDefault();document.querySelector('.layout').scrollIntoView({block:'start'});}
  }));
  mobile.addEventListener('change',show);show();
  let reached = false;
  const observer = new IntersectionObserver(entries => {
    if(entries.some(entry => entry.isIntersecting && entry.target.getClientRects().length)) reached = true;
    document.querySelector('#sticky').hidden = !reached;
  }, {threshold:.15});
  observer.observe(document.querySelector('#period'));observer.observe(document.querySelector('#completion'));
})();
