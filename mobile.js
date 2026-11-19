'use strict';
// Only presentation controls; no changes to copy IDs, source data, or storage.
const filterToggle = document.querySelector('#filter-toggle');
function updateFilterToggle() {
  const open = filterToggle.getAttribute('aria-expanded') === 'true';
  const count = [...document.querySelectorAll('#filter-panel select')].filter(s => s.value).length;
  filterToggle.textContent = (open ? 'Hide filters' : 'Filters & shelves') + (count ? ` (${count} active)` : '');
}
filterToggle.addEventListener('click', () => {
  const open = filterToggle.getAttribute('aria-expanded') !== 'true';
  filterToggle.setAttribute('aria-expanded', String(open));
  filterToggle.closest('aside').classList.toggle('filters-open', open);
  updateFilterToggle();
});
document.querySelector('#filter-panel').addEventListener('change', updateFilterToggle);
document.querySelector('#clear').addEventListener('click', updateFilterToggle);
for (const id of ['prev', 'next']) {
  document.getElementById(id).addEventListener('click', () => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      document.querySelector('.resultbar').scrollIntoView({block: 'start'});
    }
  });
}
