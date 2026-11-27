'use strict';
const seriesEnds = new Map([
  ['Attack on Titan', [34, 'https://kodansha.us/series/attack-on-titan/volume-34/']],
  ['Haikyu!!', [45, 'https://www.viz.com/manga-books/manga/haikyu-volume-45-0/product/6762']]
]);
function volumePositions(book) {
  const position = String(book['Series #'] ?? '').trim();
  const range = /\bvol(?:ume)?s\.?\s*(\d+)\s*[-–—]\s*(\d+)/i.exec(book.Title)
    || /^(\d+)\s*[-–—]\s*(\d+)$/.exec(position);
  if (range) {
    const first = Number(range[1]), last = Number(range[2]);
    if (last >= first && last <= 1000) return Array.from({length:last-first+1}, (_, i) => String(first+i));
    return [];
  }
  if (/omnibus/i.test(book.Title+' '+book['Edition / Cover'])) return [];
  return position ? [position] : [];
}
function seriesGuide(records, name) {
  const slots = new Map(), other = [];
  for (const record of records.filter(r => r.data.Series === name)) {
    let positions = volumePositions(record.data);
    if (!positions.length && record.data.Series === 'The Aeons’ Gate' &&
        /includes Tome of the Undergates, Black Halo, The Skybound Sea/i.test(record.data['Edition / Cover'])) positions = ['1','2','3'];
    if (!positions.length) other.push(record);
    for (const pos of positions) {
      if (!slots.has(pos)) slots.set(pos, []);
      slots.get(pos).push(record);
    }
  }
  const numbers = [...slots.keys()].map(s => /^(\d+(?:\.\d+)?)(?:, part \d+)?$/i.exec(s))
    .filter(Boolean).map(m => Number(m[1])).filter(n => n <= 1000);
  const end = seriesEnds.get(name);
  const max = end?.[0] ?? Math.floor(Math.max(0,...numbers));
  for (let i = 1; i <= max; i++) if (!numbers.includes(i)) slots.set(String(i), []);
  return {rows:[...slots].sort(([a],[b]) => a.localeCompare(b,'en',{numeric:true})), other, end};
}
const readerKey = name => norm(name).trim();
const workKey = b => JSON.stringify([norm(b.Title).trim(),norm(b.Author).trim()]);
function genresOf(b) {
  return [b.Genre,b['Other Genre']].filter(Boolean).flatMap(g => String(g).split('/')).map(g=>g.trim()).filter(Boolean);
}
function tonightPicks(records, reader, genre, includeUnknown) {
  const groups = new Map();
  for (const r of records) {
    const key = workKey(r.data);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const choices = [];
  for (const copies of groups.values()) {
    const statuses = copies.map(r => {
      const entry = (r.readers || []).find(n => readerKey(n.name) === readerKey(reader));
      if (entry?.status) return norm(entry.status);
      if (!reader || readerKey(reader) === readerKey(r.data['Owned By'])) return norm(r.data['Read Status']);
      return '';
    }).filter(Boolean);
    if (statuses.some(s=>!['unread','want to read','to read'].includes(s))) continue;
    if (!statuses.length && !includeUnknown) continue;
    const record = copies.find(r => !genre || genresOf(r.data).includes(genre));
    if (record) choices.push({record, known:statuses.length>0, notes:copies.flatMap(r=>r.readers||[]).filter(n=>n.note)});
  }
  for (let i = choices.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [choices[i],choices[j]] = [choices[j],choices[i]];
  }
  return choices.slice(0,3);
}
function copyLink(r) {
  return '<button class="copy-link" data-copy="'+esc(r.id)+'">'+esc(r.data.Title)+' · '+esc(r.data['Shelf Code'] || 'Shelf unknown')+'</button>';
}
function drawSeries() {
  const name = $('#series-name').value;
  const guide = seriesGuide(active(),name);
  const missing = guide.rows.find(([,copies])=>!copies.length);
  $('#series-summary').textContent = missing ? 'First unaccounted volume · '+missing[0] : 'No numbered gaps in the range shown.';
  $('#series-list').innerHTML = guide.rows.map(([n,copies])=>'<li><strong>Volume '+esc(n)+'</strong> '+
    (copies.length ? copies.map(copyLink).join(' ') : 'No numbered copy recorded')+'</li>').join('');
  $('#series-other').innerHTML = (guide.other.length ? '<h3>Order or contents unconfirmed</h3>'+guide.other.map(copyLink).join(' ') : '')+
    (guide.end ? '<p>Main series ends at volume '+guide.end[0]+'. <a href="'+guide.end[1]+'">Publisher listing</a></p>' :
    '<p>Gaps are checked up to the highest recorded number. Unnumbered copies may contain additional volumes.</p>');
}
function drawPicks() {
  const picks = tonightPicks(active(),$('#reader-name').value,$('#pick-genre').value,$('#unknown-status').checked);
  $('#pick-list').innerHTML = picks.map(({record,known,notes})=>'<li>'+copyLink(record)+'<p>'+esc(record.data.Author || 'Author unknown')+' · '+
    (known?'Unread':'Reading status unrecorded')+'</p>'+notes.map(n=>'<p>'+esc(n.name)+' recommends it · '+esc(n.note)+'</p>').join('')+'</li>').join('') ||
    '<li>No matching titles. Try another genre or include unrecorded reading statuses.</li>';
}
function updateReadingMenus() {
  const records = active();
  const menus = [['#series-name',records.map(r=>r.data.Series)],['#pick-genre',records.flatMap(r=>genresOf(r.data))],
    ['#reader-names',records.flatMap(r=>[r.data['Owned By'],...(r.readers||[]).map(n=>n.name)])]];
  for (const [id,values] of menus) {
    const select = $(id), previous = select.value;
    select.innerHTML = (id==='#pick-genre'?'<option value="">Any genre</option>':'')+
      [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
    if (previous && [...select.options].some(o=>o.value===previous)) select.value=previous;
  }
}
function readerForm(id) {
  const form = $('#reader-form');
  const record = state.records.find(r=>r.id===id);
  form.elements.reader.value = $('#reader-name').value;
  function loadEntry() {
    const entry = (record.readers || []).find(n=>readerKey(n.name)===readerKey(form.elements.reader.value));
    form.elements.status.value = entry?.status || '';
    form.elements.note.value = entry?.note || '';
  }
  loadEntry();
  form.elements.reader.oninput = loadEntry;
  form.onsubmit = e => {
    e.preventDefault();
    const name = form.elements.reader.value.trim();
    if (!name) return;
    const next = structuredClone(state), copy = next.records.find(r=>r.id===id);
    const before = copy.readers || [];
    copy.readers = before.filter(n=>readerKey(n.name)!==readerKey(name));
    const status = form.elements.status.value, note = form.elements.note.value.trim();
    if (status || note) copy.readers.push({name,status,note});
    next.history.push({id,action:'reader note',at:new Date().toISOString(),before,after:copy.readers});
    if (commit(next)) { $('#reader-name').value=name; updateReadingMenus(); drawPicks(); detail(id); }
  };
}
document.querySelector('#reading').onclick = e => {
  const button = e.target.closest('[data-copy]');
  if (button) detail(button.dataset.copy);
};
$('#series-name').onchange=drawSeries;
$('#pick-again').onclick=drawPicks;
$('#pick-genre').onchange=drawPicks;
$('#reader-name').onchange=drawPicks;
$('#unknown-status').onchange=drawPicks;

