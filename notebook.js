'use strict';
function todayForLoan() {
  const now=new Date();
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
function homeShelf(r) {
  return [r.data['Shelf Area'],r.data['Shelf Code']].filter(Boolean).join(' · ') || 'Shelf unrecorded';
}
function saveLoan(id,loan) {
  const next=structuredClone(state), copy=next.records.find(r=>r.id===id);
  if (!copy || copy.historicalOnly || (loan ? copy.loan || copy.deleted : !copy.loan)) return false;
  if (loan && (!loan.borrower.trim() || !validLoanDate(loan.date) || loan.date>todayForLoan())) return false;
  next.history.push({id,action:loan?'lend':'return',at:new Date().toISOString(),before:copy.loan||null,after:loan});
  copy.loan=loan;
  return commit(next);
}
function setupLoan(copy) {
  const region=$('#loan-controls');
  if (copy.historicalOnly || (copy.deleted && !copy.loan)) return;
  if (copy.loan) {
    region.innerHTML='<h3>Out on loan</h3><p>'+esc(copy.loan.borrower)+' · '+esc(copy.loan.date)+'</p><button id="detail-return">Mark returned</button>';
    $('#remove-copy').disabled=true;
    $('#detail-return').onclick=()=>returnCopy(copy.id,true);
    return;
  }
  region.innerHTML='<details><summary>Lend this copy</summary><form id="lend-form"><label>Borrower<input name="borrower" required maxlength="120"></label><label>Date lent<input name="date" type="date" required></label><button>Lend this copy</button></form></details>';
  const form=$('#lend-form');
  form.elements.date.max=form.elements.date.value=todayForLoan();
  form.onsubmit=e=>{
    e.preventDefault();
    const borrower=form.elements.borrower.value.trim();
    if (!borrower) {form.elements.borrower.focus();return;}
    if (saveLoan(copy.id,{borrower,date:form.elements.date.value})) {render();detail(copy.id);}
  };
}
function returnCopy(id,inDetail) {
  if (!saveLoan(id,null)) return;
  const copy=state.records.find(r=>r.id===id);
  const msg=copy.data['Shelf Code'] || copy.data['Shelf Area'] ? 'Returned. Reshelve at '+homeShelf(copy)+'.' : 'Returned. This copy has no recorded shelf.';
  render();$('#loan-notice').textContent=msg;
  if (inDetail) {detail(id);const p=document.createElement('p');p.setAttribute('role','status');p.textContent=msg;$('#loan-controls').prepend(p);}
}
function drawLoans() {
  const loans=state.records.filter(r=>r.loan && !r.historicalOnly).sort((a,b)=>a.loan.date.localeCompare(b.loan.date));
  $('#loan-list').innerHTML=loans.map(r=>'<li>'+copyLink(r)+'<p>'+esc(binding(r.data))+' · Lent to '+esc(r.loan.borrower)+' on '+esc(r.loan.date)+'</p><button data-return="'+esc(r.id)+'">Mark returned</button></li>').join('') ||
    '<li>All books are checked in. Open a book to lend its physical copy.</li>';
}
$('#loan-list').onclick=e=>{
  const button=e.target.closest('button');
  if (button?.dataset.return) returnCopy(button.dataset.return,false);
  else if (button?.dataset.copy) detail(button.dataset.copy);
};
function drawWishes() {
  const showFound=$('#wish-found').checked;
  const wishes=(state.wishes||[]).filter(w=>showFound || !w.found).sort((a,b)=>Number(a.found)-Number(b.found)||a.title.localeCompare(b.title));
  $('#wish-list').innerHTML=wishes.map(w=>'<li><h3>'+esc(w.title)+(w.found?' · Found':'')+'</h3><p>'+esc([w.author,w.edition||'Any edition'].filter(Boolean).join(' · '))+'</p>'+
    (w.reason?'<p>'+esc(w.reason)+'</p>':'')+'<button data-edit="'+esc(w.id)+'">Edit wish</button> <button data-toggle="'+esc(w.id)+'">'+
    (w.found?'Look for again':'Mark found')+'</button></li>').join('') || '<li>No books on this list yet.</li>';
}
function editWish(id) {
  const item=(state.wishes||[]).find(w=>w.id===id), form=$('#wish-form');
  $('#wish-heading').textContent=item?'Edit wish':'Add a wish';
  form.reset();
  for (const key of ['title','author','edition','reason']) form.elements[key].value=item?.[key] || '';
  if (!item) {form.elements.title.value=$('#store-title').value.trim();form.elements.author.value=$('#store-author').value.trim();}
  form.onsubmit=e=>{
    e.preventDefault();
    const fields=Object.fromEntries(['title','author','edition','reason'].map(k=>[k,form.elements[k].value.trim()]));
    if (!fields.title) {form.elements.title.focus();return;}
    const next=structuredClone(state);
    const wish={...fields,id:item?.id || crypto.randomUUID(),found:item?.found || false};
    next.wishes=mergeImportedWishes(next.wishes,[wish]);
    if (commit(next)) {$('#wish-dialog').close();drawWishes();}
  };
  $('#wish-dialog').showModal();
}
$('#wish-add').onclick=()=>editWish();
$('#wish-found').onchange=drawWishes;
$('#wish-list').onclick=e=>{
  const button=e.target.closest('button');
  if (button?.dataset.edit) editWish(button.dataset.edit);
  if (button?.dataset.toggle) {
    const next=structuredClone(state), wish=next.wishes.find(w=>w.id===button.dataset.toggle);
    if (wish) {wish.found=!wish.found;if (commit(next))drawWishes();}
  }
};
