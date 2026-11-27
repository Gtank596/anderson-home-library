'use strict';
(() => {
  let session = null, busy = false;
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const defaults = new Map(HANDOFF.records.map(r=>[r.id,r]));
  const notice = message => { $('#sync-status').textContent=message; };
  function snapshot(records, history) {
    return {version:1,catalogRevision:HANDOFF.revision,records:records.filter(r=>!same(defaults.get(r.id),r)),history};
  }
  const empty = () => snapshot([],[]);
  function unpack(snapshot) {
    if (snapshot.catalogRevision !== HANDOFF.revision) throw Error('Catalog versions differ. Open the same app version on each device.');
    validateBackup(snapshot);
    return new Map([...defaults,...snapshot.records.map(r=>[r.id,r])]);
  }
  function mergeValue(base,local,remote,label,resolve) {
    if (same(local,remote) || same(remote,base)) return local;
    if (same(local,base)) return remote;
    const plain = v => v && typeof v==='object' && !Array.isArray(v);
    if (plain(local) && plain(remote) && plain(base)) {
      return Object.fromEntries([...new Set([...Object.keys(local),...Object.keys(remote)])].map(key=>
        [key,mergeValue(base[key],local[key],remote[key],label+' / '+key,resolve)]).filter(([,v])=>v!==undefined));
    }
    return resolve(label,local,remote);
  }
  async function request(s,url,method='GET',body) {
    return fetch('https://api.github.com/repos/'+s.repo+url,{method,redirect:'error',cache:'no-store',
      headers:{Authorization:'Bearer '+s.token,Accept:'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined});
  }
  async function check(response) {
    if (!response.ok) throw Error(response.status===409 || response.status===422 ?
      'Another device may have saved first. Sync again to merge its changes.' :
      'GitHub returned '+response.status+'. Check your connection, repository and token permissions.');
    return response.json();
  }
  function encode(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let raw='';
    for (let i=0;i<bytes.length;i+=16000) raw+=String.fromCharCode(...bytes.subarray(i,i+16000));
    return btoa(raw);
  }
  async function sync(manual=false) {
    if (!session || busy || storageError || document.querySelector('dialog[open]')) return;
    busy=true;
    const s=session, path='/contents/anderson-library-sync.json';
    try {
      notice('Checking shared updates…');
      const meta=await check(await request(s,''));
      if (!meta.private || !meta.permissions?.push) throw Error('Choose a private repository you can write to.');
      const response=await request(s,path);
      const info=response.status===404 ? null : await check(response);
      if (info && (!info.content || info.encoding!=='base64')) throw Error('Shared file exceeds the supported GitHub inline size or has an unsupported format.');
      const remote=info ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(info.content),c=>c.charCodeAt(0)))) : empty();
      if (document.querySelector('dialog[open]') || session!==s) return;
      if (state.syncBase && state.syncRepo!==s.repo) throw Error('This browser is paired with '+state.syncRepo+'. Use that repository or another browser profile.');
      if (!info && state.syncBase) throw Error('The shared file is missing. Restore it in the private repository before syncing.');
      const base=unpack(state.syncBase || empty()), incoming=unpack(remote);
      const local=new Map(state.records.map(r=>[r.id,r]));
      const resolve=(label,mine,theirs)=>{
        if (!manual) throw Error('Two devices changed '+label+'. Choose Sync now to review.');
        const choice=prompt('Both devices changed '+label+'\n\nThis device: '+JSON.stringify(mine)+'\n\nShared: '+JSON.stringify(theirs)+'\n\nType local or shared. Cancel keeps both copies pending.');
        if (choice==='local') return mine;
        if (choice==='shared') return theirs;
        throw Error('Conflict review paused. Both versions are preserved.');
      };
      const records=[...new Set([...local.keys(),...incoming.keys()])].map(id=>mergeValue(base.get(id),local.get(id),incoming.get(id),
        (local.get(id)?.data.Title || id)+' ('+id+')',resolve)).filter(Boolean);
      const history=[...new Map([...remote.history,...state.history].map(h=>[JSON.stringify(h),h])).values()];
      const shared=snapshot(records,history);
      const content=encode(shared);
      if (content.length>1320000) throw Error('Shared history exceeds the supported file size. Export a backup.');
      const changes=!same(shared,remote);
      const next={...state,records,history,syncRepo:s.repo,syncBase:structuredClone(remote)};
      if (!same(state,next)) {
        if (!commit(next)) throw Error('Browser storage could not save the merged catalog.');
        options(); render();
        if (view==='reading') {updateReadingMenus();drawSeries();drawPicks();}
      }
      if (!info || changes) {
        await check(await request(s,path,'PUT',{message:'Sync family library updates',content,...(info?{sha:info.sha}:{})}));
        if (!commit({...state,syncRepo:s.repo,syncBase:structuredClone(shared)})) throw Error('Shared changes saved. Local sync checkpoint could not be saved.');
      }
      notice('Connected to '+s.repo+' · Last checked '+new Date().toLocaleTimeString());
    } catch (error) {notice(error.message);}
    finally {busy=false;}
  }
  $('#sync-form').onsubmit=e=>{
    e.preventDefault();
    if (busy) return;
    const repo=$('#sync-repo').value.trim().toLowerCase();
    if (!/^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(repo)) return notice('Enter a GitHub owner/repository name.');
    session={repo,token:$('#sync-token').value.trim()};
    $('#sync-token').value='';
    sync(true);
  };
  $('#sync-repo').value=state.syncRepo || '';
  $('#sync-now').onclick=()=>session?sync(true):notice('Connect with a token for this session first.');
  $('#sync-off').onclick=()=>{if (!busy) {session=null;notice('Disconnected. Edits are saved on this device.');}};
  setInterval(()=>{if (!document.hidden) sync();},30000);
  window.addEventListener('focus',()=>sync());
})();

