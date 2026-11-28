'use strict';
function todayForLoan() {
  const now=new Date();
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
function homeShelf(r) {
  return [r.data['Shelf Area'],r.data['Shelf Code']].filter(Boolean).join(' · ') || 'Shelf unrecorded';
}
function saveLoans(ids,loan) {
  const next=structuredClone(state), selected=new Set(ids);
  const copies=next.records.filter(r=>selected.has(r.id));
  if (!copies.length || copies.length!==selected.size) return false;
  if (copies.some(r=>r.historicalOnly || (loan ? r.loan || r.deleted : !r.loan))) return false;
  if (loan && (!loan.borrower.trim() || !validLoanDate(loan.date) || loan.date>todayForLoan())) return false;
  const at=new Date().toISOString();
  for (const copy of copies) {
    next.history.push({id:copy.id,action:loan?'lend':'return',at,before:copy.loan||null,after:loan});
    copy.loan=loan;
  }
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
    if (saveLoans([copy.id],{borrower,date:form.elements.date.value})) {render();detail(copy.id);}
  };
}
function returnCopy(id,inDetail) {
  if (!saveLoans([id],null)) return;
  const copy=state.records.find(r=>r.id===id);
  const msg=copy.data['Shelf Code'] || copy.data['Shelf Area'] ? 'Returned. Reshelve at '+homeShelf(copy)+'.' : 'Returned. This copy has no recorded shelf.';
  render();$('#loan-notice').textContent=msg;
  if (inDetail) {detail(id);const p=document.createElement('p');p.setAttribute('role','status');p.textContent=msg;$('#loan-controls').prepend(p);}
}
function drawLoans() {
  const loans=state.records.filter(r=>r.loan && !r.historicalOnly).sort((a,b)=>a.loan.date.localeCompare(b.loan.date));
  $('#loan-list').innerHTML=loans.map(r=>'<li>'+copyLink(r)+'<p>'+esc(binding(r.data))+' · Lent to '+esc(r.loan.borrower)+' on '+esc(r.loan.date)+'</p><button data-return="'+esc(r.id)+'">Mark returned</button></li>').join('') ||
    '<li>All books are checked in.</li>';
}
$('#loan-list').onclick=e=>{
  const button=e.target.closest('button');
  if (button?.dataset.return) returnCopy(button.dataset.return,false);
  else if (button?.dataset.copy) detail(button.dataset.copy);
};
function drawWishes() {
  const showFound=$('#wish-found').checked;
  const wishes=(state.wishes||[]).filter(w=>showFound || !w.found).sort((a,b)=>Number(a.found)-Number(b.found)||a.title.localeCompare(b.title));
  $('#wish-list').innerHTML=wishes.map(w=>'<li><h3>'+esc(w.title)+(w.found?' · Found':'')+'</h3><p>'+esc([w.author,w.edition||'Any edition',w.isbn].filter(Boolean).join(' · '))+'</p>'+
    (w.reason?'<p>'+esc(w.reason)+'</p>':'')+'<button data-edit="'+esc(w.id)+'">Edit wish</button> <button data-toggle="'+esc(w.id)+'">'+
    (w.found?'Look for again':'Mark found')+'</button></li>').join('') || '<li>No books on this list yet.</li>';
}
function editWish(id) {
  const item=(state.wishes||[]).find(w=>w.id===id), form=$('#wish-form');
  $('#wish-heading').textContent=item?'Edit wish':'Add a wish';
  form.reset();form.elements.isbn.setCustomValidity('');form.elements.isbn.oninput=()=>form.elements.isbn.setCustomValidity('');
  for (const key of ['title','author','edition','reason','isbn']) form.elements[key].value=item?.[key] || '';
  if (!item) {form.elements.title.value=$('#store-title').value.trim();form.elements.author.value=$('#store-author').value.trim();}
  form.onsubmit=e=>{
    e.preventDefault();
    const fields=Object.fromEntries(['title','author','edition','reason','isbn'].map(k=>[k,form.elements[k].value.trim()]));
    if (fields.isbn && !canonicalISBN(fields.isbn)) {form.elements.isbn.setCustomValidity('Enter a valid ISBN or leave this blank.');form.elements.isbn.reportValidity();return;}
    fields.isbn=canonicalISBN(fields.isbn);
    if (!fields.title) {form.elements.title.focus();return;}
    const next=structuredClone(state);
    const wish={...fields,id:item?.id || crypto.randomUUID(),found:item?.found || false};
    next.wishes=mergeImportedWishes(next.wishes,[wish]);
    if (commit(next)) {$('#wish-dialog').close();render();}
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
    if (wish) {wish.found=!wish.found;if (commit(next))render();}
  }
};
const checkoutIds=new Set();
function checkoutLabel(copy) {
  return [copy.data.Title,copy.data.Author,binding(copy.data),homeShelf(copy),copy.data['Edition / Cover']].filter(Boolean).join(' · ');
}
function checkoutChoices() {
  const words=bookstoreWords($('#checkout-query').value);
  const available=active().filter(r=>!r.loan);
  const matches=available.filter(r=>{
    const text=norm(checkoutLabel(r)+' '+(r.data.ISBN||'')+' '+canonicalISBN(r.data.ISBN));
    return words.every(word=>text.includes(word));
  }).sort((a,b)=>String(a.data.Title).localeCompare(String(b.data.Title),undefined,{numeric:true}));
  $('#checkout-choices').innerHTML=matches.map(r=>'<label class="checkout-choice"><input type="checkbox" value="'+esc(r.id)+'"'+(checkoutIds.has(r.id)?' checked':'')+'><span><strong>'+esc(r.data.Title)+'</strong><small>'+
    esc([r.data.Author,binding(r.data),homeShelf(r),r.data['Edition / Cover']].filter(Boolean).join(' · '))+'</small></span></label>').join('') || '<p>No available copies match this search.</p>';
}
function checkoutSummary() {
  const selected=state.records.filter(r=>checkoutIds.has(r.id));
  $('#checkout-selection').textContent=selected.length+' '+(selected.length===1?'copy':'copies')+' selected';
  $('#checkout-selected').innerHTML=selected.map(r=>'<button type="button" data-remove="'+esc(r.id)+'" aria-label="'+esc('Remove '+checkoutLabel(r))+'">'+esc([r.data.Title,binding(r.data),r.data['Shelf Code']].filter(Boolean).join(' · '))+' ×</button>').join(' ');
  $('#checkout-save').disabled=!selected.length;
  $('#checkout-save').textContent=selected.length>1?'Save '+selected.length+' loans':'Save loan';
}
$('#loan-start').onclick=()=>{
  checkoutIds.clear();const form=$('#checkout-form');form.reset();
  form.elements.date.max=form.elements.date.value=todayForLoan();
  $('#checkout-message').textContent='';checkoutChoices();checkoutSummary();
  $('#checkout-dialog').showModal();$('#checkout-query').focus();
};
$('#checkout-query').oninput=checkoutChoices;
$('#checkout-choices').onchange=e=>{
  const box=e.target.closest('input[type=checkbox]');if(!box)return;
  if(box.checked)checkoutIds.add(box.value);else checkoutIds.delete(box.value);
  checkoutSummary();
};
$('#checkout-selected').onclick=e=>{
  const button=e.target.closest('[data-remove]');if(!button)return;
  checkoutIds.delete(button.dataset.remove);checkoutChoices();checkoutSummary();
};
$('#checkout-form').onsubmit=e=>{
  e.preventDefault();
  const form=e.currentTarget, borrower=form.elements.borrower.value.trim(), date=form.elements.date.value;
  if(!borrower){form.elements.borrower.focus();return;}
  const count=checkoutIds.size;
  if(!saveLoans(checkoutIds,{borrower,date})){
    $('#checkout-message').textContent='Could not save this checkout. Review the available copies and try again.';
    const available=new Set(active().filter(r=>!r.loan).map(r=>r.id));
    for(const id of checkoutIds)if(!available.has(id))checkoutIds.delete(id);
    checkoutChoices();checkoutSummary();return;
  }
  $('#checkout-dialog').close();checkoutIds.clear();render();
  $('#loan-notice').textContent=count+' '+(count===1?'copy':'copies')+' lent to '+borrower+'.';
};
