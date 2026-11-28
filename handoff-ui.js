'use strict';
function migrateHandoff(saved) {
  if(saved.catalogRevision===HANDOFF.revision)return saved;
  const next=structuredClone(saved);
  next.handoffConflicts=next.handoffConflicts||[];
  for(const incoming of HANDOFF.records){
    const existing=next.records.find(r=>r.id===incoming.id);
    const baseline=LIBRARY_DATA.books.find(b=>'source-row-'+b._source_row===incoming.id);
    if(!existing){
      // A missing original ID in a personal backup is not silently reintroduced.
      if(!baseline)next.records.push(structuredClone(incoming));
      continue;
    }
    const before=structuredClone(existing.data);
    if(incoming.historicalOnly)existing.historicalOnly=true;
    for(const [field,value] of Object.entries(incoming.data)){
      const old=baseline?.[field]??null, local=existing.data[field]??null;
      if(JSON.stringify(value)===JSON.stringify(old))continue;
      if(JSON.stringify(local)===JSON.stringify(old))existing.data[field]=structuredClone(value);
      else if(JSON.stringify(local)!==JSON.stringify(value))next.handoffConflicts.push({id:existing.id,Title:existing.data.Title,Field:field,'Your value':local,'Handoff value':value,Status:'Local value preserved'});
    }
    if(JSON.stringify(before)!==JSON.stringify(existing.data))next.history.push({id:existing.id,at:'2026-11-21',action:'handoff update',before,after:structuredClone(existing.data)});
  }
  next.catalogRevision=HANDOFF.revision;
  return next;
}
function renderHandoff(){
  $('#shelf-map').hidden=view!=='pretty';
  const query=$('#search').value;
  $('#shelf-map-grid').innerHTML=Array.from({length:24},(_,i)=>{
    const code='P'+String(i+1).padStart(2,'0');
    const all=HANDOFF.placements.filter(x=>x.position===code);
    const rows=all.filter(x=>!query||norm(Object.values(x).join(' ')).includes(norm(query)));
    return `<details class="cubby" data-shelf="${code}"><summary>${code} <span>${all.length} placements</span></summary><ol>${rows.map(x=>`<li ${x.sequence?`value="${x.sequence}"`:""}>${x.copy_id?`<button class="placement-link" data-copy="${esc(x.copy_id)}">${esc(x.title)}</button>`:`<strong>${esc(x.title)}</strong>`}<small>${esc(x.binding)}${x.sequence===null?' · within-cubby order unconfirmed':''}${x.edition_or_cover?' · '+esc(x.edition_or_cover):''}</small>${x.review?`<p class="small">${esc(x.review)}</p>`:''}</li>`).join('')||'<li>No search matches</li>'}</ol></details>`;
  }).join('');
  $('#shelf-map-grid').querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>detail(b.dataset.copy));
  $('#handoff-review').innerHTML=HANDOFF.review.map(r=>`<details class="history-row"><summary>${esc(r.Position||'Catalog')} · ${esc(r.Title)}</summary>${dl(r)}</details>`).join('');
  $('#local-conflicts').innerHTML=(state.handoffConflicts||[]).length?'<h3>Browser edits preserved</h3><p>These personal values differ from the handoff. Review them before editing a copy.</p>'+state.handoffConflicts.map(r=>dl(r)).join(''):'';
}
