const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const path=require('node:path');process.chdir(__dirname);
const nodes=new Map();function el(s){if(!nodes.has(s))nodes.set(s,{value:s==='#sort'?'source':'',innerHTML:'',textContent:'',dataset:{},classList:{toggle(){}},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}});return nodes.get(s)}
const mem=new Map();const context=vm.createContext({document:{querySelector:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},structuredClone,alert:()=>{},console,crypto:crypto.webcrypto,setTimeout,Blob,URL});
vm.runInContext(['data.js','handoff.js','handoff-ui.js','app.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('active().length'),572);assert.equal(run('new Set(state.records.map(r=>r.id)).size'),574);
assert.equal(run('JSON.stringify(original)'),JSON.stringify(JSON.parse(fs.readFileSync('source/books.json','utf8'))));
assert.equal(run("active().filter(r=>binding(r.data)==='Unknown').length"),3);
assert.equal(run("matches(original[0],'sherlok holmes')"),true);
assert.equal(run("matches(original[1],'CHARLOTTE BRONTE')"),true);
assert.equal(run("original.filter(b=>contained(b).length).length"),17);
assert.equal(run("original.filter(b=>matches(b,'Sadie Shapiro')).length"),1);
assert.equal(run("original.filter(b=>/Aeons.*Gate/i.test(b.Title)).length"),1);
assert.equal(run("original.filter(b=>/Cleric Quintet/i.test(b.Title)).length"),1);
assert.equal(run("(()=>{let x=structuredClone(state);x.records.push({...structuredClone(x.records[0]),id:'copy-distinct'});return validateBackup(x).records.length})()"),575);
assert.throws(()=>run("validateBackup({...state,records:[state.records[0],state.records[0]]})"));
assert.throws(()=>run("validateBackup({...state,records:[{id:'source-row-9999',data:{_source_row:9999},deleted:false}]})"));
assert.equal(run("commit(structuredClone(state))"),true);assert.equal(JSON.parse(mem.values().next().value).records.length,574);
assert.equal(run("(()=>{localStorage.setItem=()=>{throw Error('full')};let x=structuredClone(state);x.records[0].data.Title='Must not save';return commit(x)})()"),false);assert.equal(run('state.records[0].data.Title'),'The Adventures of Sherlock Holmes');
for(const [name,hash] of Object.entries(JSON.parse(fs.readFileSync('source-sha256.json','utf8')))){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('source',name))).digest('hex'),hash,name);}
assert.equal(run('HANDOFF.placements.length'),139);
assert.equal(run("HANDOFF.placements.filter(p=>p.position==='P18').length"),7);
assert.equal(run("active().filter(r=>r.data['Shelf Code']==='P18').length"),7);
assert.equal(run("active().filter(r=>r.data['Shelf Code']==='P18'&&r.data.Title.startsWith('The Red Pyramid')).length"),3);
assert.equal(run('active().filter(r=>contained(r.data).length).length'),17);
assert.equal(run("state.records.find(r=>r.id==='source-row-29').data.Title.includes('1990')"),true);
assert.equal(run("contained(state.records.find(r=>r.id==='source-row-29').data)[0]['Contained works'].includes('Straight')"),true);
assert.equal(run("state.records.find(r=>r.id==='acquisition-2026-11-21-danceofthieves').data['Shelf Code']"),'P11');
assert.equal(run("state.records.find(r=>r.id==='acquisition-2026-11-21-thebonesharddaughter').data['Shelf Code']"),'P20');
assert.equal(run("new Set(HANDOFF.placements.filter(x=>x.copy_id).map(x=>x.copy_id)).size"),run('HANDOFF.placements.filter(x=>x.copy_id).length'));
// Upgrade an old browser catalog: keep personal changes, archive state, history and manual copies.
run(`var oldSave={version:1,records:original.map(b=>({id:sourceId(b),data:structuredClone(b),deleted:false})),history:[{action:'personal-note'}]};
oldSave.records[11].data['Shelf Code']='My desk';oldSave.records[11].deleted=true;
oldSave.records.push({id:'copy-personal',data:{Title:'My own entry'},deleted:false});
var upgraded=migrateHandoff(oldSave);`);
assert.equal(run("upgraded.records.find(r=>r.id==='source-row-13').data['Shelf Code']"),'My desk');
assert.equal(run("upgraded.records.find(r=>r.id==='source-row-13').deleted"),true);
assert.equal(run("upgraded.records.find(r=>r.id==='source-row-13').data.Format"),'Paperback');
assert.equal(run("upgraded.records.some(r=>r.id==='copy-personal')"),true);
assert.equal(run('upgraded.records.length'),575);
assert.equal(run('upgraded.handoffConflicts.length'),1);
assert.equal(run('JSON.stringify(migrateHandoff(upgraded))===JSON.stringify(upgraded)'),true);
assert.equal(run("oldSave.records[11].data.Format"),'Hardcover');
for(const [name,hash] of Object.entries(JSON.parse(fs.readFileSync('handoff-sha256.json','utf8')))){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'),hash,name);}
console.log('PASS: 572 copies; 139 placements; seven P18 books; original and handoff hashes; 17 anthology links; identity, search, backup validation, and safe browser migration.');

assert.equal(run("active().filter(r=>r.data.Title==='The Battle for Skandia').length"),2);
assert.equal(run("state.records.filter(r=>r.historicalOnly).length"),2);
assert.equal(run("active().some(r=>r.id==='source-row-34'||r.id==='source-row-52')"),false);
assert.equal(run("active().find(r=>r.id==='inventory-2026-11-21-skandia-hardcover').data['Shelf Code']"),'P16');
assert.equal(run("upgraded.records.filter(r=>!r.historicalOnly).length"),573);
