'use strict';

function canonicalISBN(input) {
  const id = String(input ?? '').trim().replace(/^ISBN(?:-1[03])?\s*:?\s*/i,'').replace(/[\s-]/g,'').toUpperCase();
  if (/^\d{9}[\dX]$/.test(id)) {
    const sum = [...id].reduce((total,c,i)=>total+(10-i)*(c==='X'?10:Number(c)),0);
    if (sum%11) return '';
    const stem = '978'+id.slice(0,9);
    return stem+isbnCheckDigit(stem);
  }
  return /^97[89]\d{10}$/.test(id) && isbnCheckDigit(id.slice(0,12))===Number(id[12]) ? id : '';
}
function isbnCheckDigit(stem) {
  const sum = [...stem].reduce((total,c,i)=>total+Number(c)*(i%2 ? 3 : 1),0);
  return (10-sum%10)%10;
}
function bookstoreWords(s) {
  return norm(s).replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
}
function wordMatch(query,text) {
  const words=bookstoreWords(text);
  return bookstoreWords(query).every(q=>words.some(w=>w===q || (q.length>=5 && near(w,q))));
}
function searchBookstore(records,isbn,title,author) {
  if (isbn.trim()) {
    const key=canonicalISBN(isbn);
    if (!key) return {label:'Check the ISBN digits. Enter a valid ISBN-10 or ISBN-13.',copies:[]};
    const copies=records.filter(r=>key===canonicalISBN(r.data.ISBN));
    if (copies.length) return {label:'You own this edition.',copies};
    if (!bookstoreWords(title).length) return {label:'No matching ISBN is recorded. Enter the title and optionally the author to check other copies.',copies:[]};
  }
  if (!bookstoreWords(title).length) return {label:'Enter an ISBN or a book title.',copies:[]};
  const copies=records.filter(r=>wordMatch(title,r.data.Title) && wordMatch(author,r.data.Author));
  return {label:copies.length?'Possible title matches. Compare the binding and edition below.':'No title match in the catalog. Try a shorter title or leave the author blank.',copies};
}
function showBookstoreResults() {
  const records=active(), title=$('#store-title').value, author=$('#store-author').value;
  let {label,copies}=searchBookstore(records,$('#store-isbn').value,title,author);
  if (!copies.length && filledEdition && title===filledEdition.title && author) {
    copies=records.filter(r=>wordMatch(title,r.data.Title));
    if (copies.length) label='Similar titles on your shelves. Check the author and edition.';
  }
  $('#store-status').textContent=label;
  $('#store-results').innerHTML=copies.map(r=>'<li>'+copyLink(r)+'<p>'+
    [r.data.Author,binding(r.data),r.data['Edition / Cover']].filter(Boolean).map(esc).join(' Â· ')+'</p></li>').join('');
}

// Only an explicit scan or search starts a network lookup. Catalog redraws stay local.
const editionCache=new Map();
let lookupRequest=null, filledEdition=null;
function cancelLookup() {
  lookupRequest?.abort();
  lookupRequest=null;
}
function clearEdition(clearFields=false) {
  cancelLookup();
  if (clearFields && filledEdition) {
    if ($('#store-title').value===filledEdition.title) $('#store-title').value='';
    if ($('#store-author').value===filledEdition.author) $('#store-author').value='';
  }
  filledEdition=null;
  $('#store-edition').textContent='';
}
async function checkScannedBook() {
  cancelLookup();
  const isbn=canonicalISBN($('#store-isbn').value);
  showBookstoreResults();
  if (!isbn || active().some(r=>canonicalISBN(r.data.ISBN)===isbn) || $('#store-title').value.trim()) return;
  const request=new AbortController();
  lookupRequest=request;
  const timer=setTimeout(()=>request.abort(),9000);
  try {
    let edition=editionCache.get(isbn);
    if (!edition) {
      $('#store-status').textContent='Looking up this ISBN on Open Library…';
      const key='ISBN:'+isbn;
      const query=new URLSearchParams({bibkeys:key,format:'json',jscmd:'data'});
      const response=await fetch('https://openlibrary.org/api/books?'+query,{
        signal:request.signal,credentials:'omit',referrerPolicy:'no-referrer'
      });
      if (!response.ok) throw Error('Lookup unavailable');
      const book=(await response.json())[key];
      if (lookupRequest!==request) return;
      if (!book || typeof book.title!=='string' || !book.title.trim()) {
        $('#store-status').textContent='Open Library has no title for this ISBN. Enter a title below to check your shelves.';
        return;
      }
      edition={title:book.title.trim(),author:(Array.isArray(book.authors)?book.authors:[])
        .map(a=>a?.name).filter(n=>typeof n==='string' && n.trim()).join(', ')};
      editionCache.set(isbn,edition);
    }
    if (lookupRequest!==request) return;
    filledEdition=edition;
    $('#store-title').value=edition.title;
    $('#store-author').value=edition.author;
    $('#store-edition').textContent='Open Library · '+edition.title+(edition.author?' by '+edition.author:'');
    showBookstoreResults();
  } catch {
    if (lookupRequest===request) $('#store-status').textContent='Open Library could not be reached. Try again or enter the title to check your shelves.';
  } finally {
    clearTimeout(timer);
    if (lookupRequest===request) lookupRequest=null;
  }
}
$('#store-isbn').oninput=()=>clearEdition(true);
for (const id of ['#store-title','#store-author']) $(id).oninput=()=>clearEdition();

// EAN-13 digits occupy seven modules each. Guard patterns and the ISBN
// check digit reject spurious matches in ordinary camera frames.
const eanLeft=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const invertBits=s=>s.replace(/[01]/g,c=>c==='0'?'1':'0');
const eanRight=eanLeft.map(invertBits);
const eanEven=eanRight.map(s=>[...s].reverse().join(''));
const parityCodes=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function readEanBits(bits) {
  if (!bits.startsWith('101') || bits.slice(45,50)!=='01010' || !bits.endsWith('101')) return '';
  let left='',right='',parity='';
  for (let i=0;i<6;i++) {
    const pattern=bits.slice(3+i*7,10+i*7);
    let digit=eanLeft.indexOf(pattern);
    if (digit===-1) {digit=eanEven.indexOf(pattern);parity+='G';} else parity+='L';
    const rightDigit=eanRight.indexOf(bits.slice(50+i*7,57+i*7));
    if (digit<0 || rightDigit<0) return '';
    left+=digit;right+=rightDigit;
  }
  return canonicalISBN(String(parityCodes.indexOf(parity))+left+right);
}
function readBarcodeLine(pixels) {
  let min=255,max=0;
  for (const v of pixels) {min=Math.min(min,v);max=Math.max(max,v);}
  if (max-min<40) return '';
  const edges=[], threshold=(min+max)/2;
  let black=false;
  for (let i=0;i<pixels.length;i++) {
    const next=pixels[i]<threshold;
    if (next!==black) {edges.push(i);black=next;}
  }
  if (black) edges.push(pixels.length);
  for (let i=0;i+59<edges.length;i+=2) {
    const pitch=(edges[i+59]-edges[i])/95;
    if (pitch<1 || Math.abs(edges[i+1]-edges[i]-pitch)>pitch*.65) continue;
    let bits='';
    for (let j=0;j<95;j++) bits+=pixels[Math.floor(edges[i]+(j+.5)*pitch)]<threshold?'1':'0';
    const isbn=readEanBits(bits)||readEanBits([...bits].reverse().join(''));
    if (isbn) return isbn;
  }
  return '';
}
let scanGeneration=0, scanStream=null, scanTimer=null;
function stopBookCamera() {
  scanGeneration++;
  clearTimeout(scanTimer);
  scanStream?.getTracks().forEach(track=>track.stop());
  scanStream=null;
  $('#store-video').srcObject=null;
  $('#store-preview').hidden=true;
  $('#store-scan').disabled=false;
}
async function startBookCamera() {
  stopBookCamera();
  clearEdition();
  const generation=scanGeneration, video=$('#store-video');
  $('#store-isbn').value='';$('#store-title').value='';$('#store-author').value='';
  $('#store-results').replaceChildren();
  $('#store-scan').disabled=true;
  $('#store-preview').hidden=false;
  $('#store-status').textContent='Allow camera access, then center the ISBN barcode with the bars upright.';
  try {
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}});
    if (generation!==scanGeneration) {stream.getTracks().forEach(track=>track.stop());return;}
    scanStream=stream;video.srcObject=stream;await video.play();
    if (generation!==scanGeneration) return;
    let detector;
    try {if (window.BarcodeDetector && (await BarcodeDetector.getSupportedFormats()).includes('ean_13')) detector=new BarcodeDetector({formats:['ean_13']});} catch {}
    const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
    async function frame() {
      if (generation!==scanGeneration) return;
      let isbn='';
      if (video.readyState>=2 && video.videoWidth) {
        if (detector) {
          try {isbn=(await detector.detect(video)).map(hit=>canonicalISBN(hit.rawValue)).find(Boolean);}
          catch {detector=null;}
        }
        if (!isbn && ctx) {
          canvas.width=video.videoWidth;canvas.height=5;
          for (let y=0;y<5;y++) ctx.drawImage(video,0,Math.floor(video.videoHeight*(.3+y*.1)),video.videoWidth,1,0,y,canvas.width,1);
          const data=ctx.getImageData(0,0,canvas.width,5).data;
          for (let y=0;y<5 && !isbn;y++) {
            const line=new Uint8Array(canvas.width);
            for (let x=0;x<line.length;x++) {const k=(y*line.length+x)*4;line[x]=(data[k]+data[k+1]+data[k+2])/3;}
            isbn=readBarcodeLine(line);
          }
        }
      }
      if (generation!==scanGeneration) return;
      if (isbn) {stopBookCamera();$('#store-isbn').value=isbn;void checkScannedBook();return;}
      scanTimer=setTimeout(()=>frame().catch(fail),200);
    }
    await frame();
  } catch {fail();}
  function fail() {
    if (generation!==scanGeneration) return;
    stopBookCamera();
    $('#store-status').textContent='Camera unavailable. Enter the ISBN or search by title. Camera access requires a supported browser and permission.';
  }
}
$('#store-form').onsubmit=e=>{e.preventDefault();stopBookCamera();void checkScannedBook();};
$('#store-scan').onclick=startBookCamera;
$('#store-stop').onclick=()=>{stopBookCamera();$('#store-status').textContent='Scan stopped.';};
$('#store-results').onclick=e=>{const b=e.target.closest('[data-copy]');if(b){stopBookCamera();detail(b.dataset.copy);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden) stopBookCamera();});
window.addEventListener('pagehide',stopBookCamera);

