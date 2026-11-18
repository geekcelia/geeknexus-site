const en = document.documentElement.lang === 'en';
const products = [...document.querySelectorAll('[data-product]')];
const filters = [...document.querySelectorAll('[data-filter]')];
const count = document.querySelector('#result-count');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let visible = 0;
  products.forEach(product => {
    product.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== product.dataset.product;
    if (!product.hidden) visible++;
  });
  count.textContent = en ? `${visible} concepts shown` : `正在展示 ${visible} 款概念`;
}));
const dialog = document.querySelector('#product-dialog');
const title = document.querySelector('#dialog-title');
const description = document.querySelector('#dialog-description');
document.querySelectorAll('[data-details]').forEach(button => button.addEventListener('click', () => {
  const product = button.closest('[data-product]');
  title.textContent = product.querySelector('h3').textContent;
  description.textContent = product.querySelector('[data-description]').textContent;
  dialog.showModal();
}));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close(); } });
