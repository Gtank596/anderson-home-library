'use strict';
const photoTypes=['Cover','Spine','Sprayed edges'];
const photoUrls=new Map();
const photoKey=(id,type)=>id+'/'+type;
function copyThumbnail(id) {
  for(const type of photoTypes) {
    const url=photoUrls.get(photoKey(id,type));
    if(url) return '<img class="copy-thumbnail" src="'+url+'" alt="'+esc(type)+' photo">';
  }
  return '';
}
function photoDatabase() {
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('anderson-copy-photos',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('photos');
    open.onsuccess=()=>resolve(open.result);
    open.onerror=()=>reject(open.error);
  });
}
const photoReady=photoDatabase().then(async db=>{
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('photos'), request=tx.objectStore('photos').openCursor();
    request.onsuccess=()=>{const c=request.result;if(c){photoUrls.set(c.key,URL.createObjectURL(c.value));c.continue();}};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  if(photoUrls.size) render();
  return db;
}).catch(()=>null);
async function resizePhoto(file) {
  const img=new Image(), url=URL.createObjectURL(file);
  try {
    img.src=url;await img.decode();
    const scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error()),'image/jpeg',.85));
  } finally {URL.revokeObjectURL(url);}
}
function showCopyPhotos(id) {
  const panel=$('#copy-photos');
  panel.innerHTML='<div class="edition-gallery"></div><details><summary>Add an edition photo</summary><form class="photo-form"><label>Photo of<select name="kind">'+photoTypes.map(k=>'<option>'+k+'</option>').join('')+'</select></label><label>Image<input name="image" type="file" accept="image/*" required></label><button>Save photo</button><p class="small">Photos stay on this device, outside family sync and JSON backups. Select a saved photo to download it.</p></form></details><p role="status"></p>';
  const form=panel.querySelector('form'), status=panel.querySelector('[role=status]');
  function gallery() {
    panel.querySelector('.edition-gallery').innerHTML=photoTypes.map(type=>{
      const url=photoUrls.get(photoKey(id,type));
      return url?'<a href="'+url+'" download="'+esc(id+'-'+type)+'.jpg"><img src="'+url+'" alt="'+esc(type)+'"><span>'+esc(type)+'</span></a>':'';
    }).join('');
  }
  photoReady.then(gallery);
  form.onsubmit=async e=>{
    e.preventDefault();const file=form.elements.image.files[0];if(!file)return;
    const key=photoKey(id,form.elements.kind.value);const button=form.querySelector('button');button.disabled=true;
    try {
      const db=await photoReady;if(!db)throw Error();
      const blob=await resizePhoto(file);
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(blob,key);
        tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);
      });
      const old=photoUrls.get(key);photoUrls.set(key,URL.createObjectURL(blob));if(old)URL.revokeObjectURL(old);
      gallery();form.reset();status.textContent='Photo saved on this device.';render();
    } catch {status.textContent='Could not save this photo. Try a JPEG or PNG and check device storage.';}
    finally {button.disabled=false;}
  };
}
