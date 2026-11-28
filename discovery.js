'use strict';
function scannedEdition(copies) {
  const isbn=canonicalISBN($('#store-isbn').value);
  const owned=copies.find(r=>isbn && canonicalISBN(r.data.ISBN)===isbn)?.data;
  return {ISBN:isbn,Title:owned?.Title || $('#store-title').value.trim(),
    Author:owned?.Author || $('#store-author').value.trim(),Format:owned?.Format || filledEdition?.binding || ''};
}
function wishedTitles(edition) {
  return (state.wishes||[]).filter(w=>!w.found && (
    (edition.ISBN && canonicalISBN(w.isbn)===edition.ISBN) ||
    (edition.Title && (wordMatch(w.title,edition.Title)||wordMatch(edition.Title,w.title)))
  ));
}
function renderScanActions(copies) {
  const book=scannedEdition(copies);
  $('#scan-actions').innerHTML=book.ISBN?'<button id="attach-scan">That’s my copy</button> <button id="new-scanned">Add as new copy</button> <button id="queue-scan">Save ISBN for later</button>':'';
  if (book.ISBN) {
    $('#new-scanned').onclick=()=>edit(null,book);
    $('#attach-scan').onclick=()=>openAttachment(book,copies);
    $('#queue-scan').onclick=()=>savePendingISBN(book.ISBN);
  }
  const wishes=wishedTitles(book);
  $('#scan-wishes').innerHTML=wishes.length?'<h3>Family wish list matches</h3><p>Compare the copy in your hand with the edition requested.</p><ul>'+
    wishes.map(w=>'<li><strong>'+esc(w.title)+'</strong> '+esc(w.author)+' · '+esc(w.edition||'Any edition')+'<p>'+esc(w.isbn && book.ISBN?(canonicalISBN(w.isbn)===book.ISBN?'Wanted ISBN matches this edition.':'Different ISBN from the requested edition.'):(book.Format?'Scanned binding: '+book.Format+'. Check any edition details.':'Possible title match. Check the edition details.'))+'</p>'+(w.reason?'<p>'+esc(w.reason)+'</p>':'')+'</li>').join('')+'</ul>':'';
}
function openAttachment(book,matches) {
  const filter=$('#attach-filter'), select=$('#attach-copy'), form=$('#attach-form');
  filter.value='';
  function preview() {
    const copy=active().find(r=>r.id===select.value);
    $('#attach-preview').textContent=copy?'Save '+book.ISBN+' to '+copy.data.Title+' at '+homeShelf(copy)+
      (copy.data.ISBN?' (currently '+copy.data.ISBN+').':'.'):'Choose the physical copy you are holding.';
  }
  function populate() {
    const current=active(), preferred=new Set(matches.map(r=>r.id));
    const sorted=current.filter(r=>!filter.value.trim()||matchesText(r)).sort((a,b)=>Number(preferred.has(b.id))-Number(preferred.has(a.id))||String(a.data.Title).localeCompare(String(b.data.Title)));
    function matchesText(r){return wordMatch(filter.value,[r.data.Title,r.data.Author,r.data['Shelf Code']].join(' '));}
    select.innerHTML='<option value="">Select a copy</option>'+sorted.map(r=>'<option value="'+esc(r.id)+'">'+esc([r.data.Title,binding(r.data),homeShelf(r),r.data['Edition / Cover']].filter(Boolean).join(' · '))+'</option>').join('');
    preview();
  }
  populate();filter.oninput=populate;select.onchange=preview;
  form.onsubmit=e=>{
    e.preventDefault();
    const next=structuredClone(state), copy=next.records.find(r=>r.id===select.value && !r.deleted && !r.historicalOnly);
    if (!copy) return;
    const before=copy.data.ISBN || null;
    copy.data.ISBN=book.ISBN;
    next.history.push({id:copy.id,action:'save scanned ISBN',at:new Date().toISOString(),before,after:book.ISBN});
    if(commit(next)) {$('#attach-dialog').close();render();detail(copy.id);}
  };
  $('#attach-dialog').showModal();
}
function setupCopyDiscovery(copy) {
  if (copy.deleted || copy.historicalOnly) return;
  const code=String(copy.data['Shelf Code']||'').trim().toUpperCase();
  const mapped=/^P(0[1-9]|1\d|2[0-4])$/.test(code);
  $('#copy-discovery').innerHTML=(mapped?'<button id="locate-copy">Find my copy · '+esc(code)+'</button>':'<p>Home shelf · '+esc(homeShelf(copy))+'</p>')+
    '<div id="copy-photos"></div><details><summary>Recommend to a reader</summary><form id="send-pick"><label>For reader<input name="recipient" list="reader-names" maxlength="80" required></label><label>From<input name="sender" maxlength="80" required></label><label>Personal note<textarea name="message" maxlength="400" required></textarea></label><button>Save to their profile</button><p role="status"></p></form></details>';
  if(mapped) $('#locate-copy').onclick=()=>{
    $('#detail').close();$('#search').value='';navigate('pretty');
    const cubby=document.querySelector('[data-shelf="'+code+'"]');
    cubby.open=true;cubby.classList.add('located-cubby');
    const message=document.createElement('p');message.className='notice';message.textContent=copy.data.Title+' · '+(copy.loan?'Out on loan. Home cubby ':'Home cubby ')+code;
    cubby.querySelector('summary').after(message);cubby.querySelector('summary').focus();cubby.scrollIntoView({block:'center'});
  };
  showCopyPhotos(copy.id);
  const form=$('#send-pick');form.elements.sender.value=$('#reader-name').value.trim();
  form.onsubmit=e=>{
    e.preventDefault();
    const reader=form.elements.recipient.value.trim(), sender=form.elements.sender.value.trim(), message=form.elements.message.value.trim();
    if (!reader || !sender || !message) return;
    const next=structuredClone(state);
    next.history.push({id:copy.id,action:'reader pick',reader,sender,message,at:new Date().toISOString(),eventId:crypto.randomUUID()});
    if(commit(next)){form.querySelector('p').textContent='Saved to '+reader+'’s profile.';form.elements.message.value='';updateReadingMenus();drawProfile();}
  };
}
function profileDiscoveries(records,name,finished) {
  const byId=new Map(records.map(r=>[r.id,r]));
  const picks=state.history.filter(h=>h?.action==='reader pick' && readerKey(h.reader)===readerKey(name) && byId.has(h.id));
  const done=new Set(finished.map(r=>workKey(r.data)));
  const series=[...new Set(finished.map(r=>r.data.Series).filter(Boolean))].sort();
  const suggestions=[];
  for(const name of series) {
    const guide=seriesGuide(records,name);
    let latest=-1;
    guide.rows.forEach(([,copies],i)=>{if(copies.some(r=>done.has(workKey(r.data)))) latest=i;});
    if(latest<0) continue;
    const next=guide.rows[latest+1];
    if(!next) {
      suggestions.push('<li>'+esc(name)+' · '+(guide.end?'You reached the final main-series volume.':'You reached the last numbered volume recorded here.')+'</li>');
      continue;
    }
    const [number,copies]=next;
    const copy=copies.find(r=>!r.loan)||copies[0];
    suggestions.push('<li>'+esc(name)+' · Volume '+esc(number)+' '+(copy?copyLink(copy):'No numbered copy recorded.')+'</li>');
  }
  return '<h4>Picked for you</h4>'+(picks.length?'<ul>'+picks.slice().reverse().map(p=>'<li>'+copyLink(byId.get(p.id))+'<p>'+esc(p.sender)+' · '+esc(p.message)+'</p></li>').join('')+'</ul>':'<p>No personal recommendations yet.</p>')+
    '<h4>Next in your series</h4>'+(suggestions.length?'<ul>'+suggestions.join('')+'</ul>':'<p>Mark a numbered series book Finished to see what follows.</p>');
}
