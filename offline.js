'use strict';
const pendingKey=KEY+'-pending-isbns';
function pendingISBNs() {
  const items=JSON.parse(localStorage.getItem(pendingKey)||'[]');
  if(!Array.isArray(items))throw Error();
  return [...new Set(items.map(canonicalISBN).filter(Boolean))];
}
function drawPendingISBNs() {
  const root=$('#saved-scans');
  try {
    const isbns=pendingISBNs();
    root.innerHTML=isbns.length?'<h3>Saved for lookup on this device</h3><ul>'+isbns.map(n=>'<li>'+n+' <button data-lookup="'+n+'">Look up</button> <button data-forget="'+n+'">Remove</button></li>').join('')+'</ul>':'';
  } catch {root.textContent='Saved scans could not be read on this device.';}
}
function savePendingISBN(isbn) {
  try {
    localStorage.setItem(pendingKey,JSON.stringify([...new Set([...pendingISBNs(),isbn])]));
    drawPendingISBNs();$('#store-status').textContent='ISBN saved for lookup on this device.';
  } catch {$('#store-status').textContent='This device could not save the ISBN.';}
}
$('#saved-scans').onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.lookup){
    stopBookCamera();clearEdition(true);$('#store-isbn').value=button.dataset.lookup;
    $('#store-title').value='';$('#store-author').value='';void checkScannedBook();
  } else if(button.dataset.forget){
    try {localStorage.setItem(pendingKey,JSON.stringify(pendingISBNs().filter(n=>n!==button.dataset.forget)));drawPendingISBNs();}
    catch {$('#store-status').textContent='Could not update saved scans.';}
  }
};
drawPendingISBNs();
window.addEventListener('storage',e=>{if(e.key===pendingKey)drawPendingISBNs();});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./library-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{
    $('#offline-status').textContent='Ready for offline browsing on this device.';
  }).catch(()=>{$('#offline-status').textContent='Offline download unavailable. Open the library online to try again.';});
}
