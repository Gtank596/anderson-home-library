'use strict';
const navigationButtons=[...document.querySelectorAll('nav [data-view]')];
function selectView(name) {
  const button=navigationButtons.find(item=>item.dataset.view===name);
  view=button?.dataset.view || 'catalog';
  page=0;
  const browsing=view==='catalog' || view==='pretty';
  for (const item of navigationButtons) {
    const selected=item.dataset.view===view;
    item.classList.toggle('active',selected);
    if (selected) item.setAttribute('aria-current','page');
    else item.removeAttribute('aria-current');
  }
  $('.intro').hidden=view!=='catalog';
  $('.tools').hidden=!browsing;
  $('#catalog').hidden=!browsing;
  $('#bookstore').hidden=view!=='store';
  $('#reading').hidden=view!=='reading';
  $('#loans').hidden=view!=='loans';
  $('#history').hidden=view!=='history';
  if (view!=='store') stopBookCamera();
  if (view==='reading') {updateReadingMenus();drawSeries();drawPicks();}
  if (view==='history') renderHistory();
  render();
}
function navigate(name) {
  if (location.hash!=='#'+name) history.pushState(null,'','#'+name);
  selectView(name);
  window.scrollTo(0,0);
}
for (const button of navigationButtons) button.onclick=()=>navigate(button.dataset.view);
$('#catalog-scan').onclick=()=>{navigate('store');startBookCamera();};
window.addEventListener('hashchange',()=>selectView(location.hash.slice(1)));
selectView(location.hash.slice(1));
