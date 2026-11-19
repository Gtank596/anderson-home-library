const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const path=require('node:path');process.chdir(__dirname);
const nodes=new Map();function el(s){if(!nodes.has(s))nodes.set(s,{value:s==='#sort'?'source':'',innerHTML:'',textContent:'',dataset:{},classList:{toggle(){}},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}});return nodes.get(s)}
const mem=new Map();const context=vm.createContext({document:{querySelector:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},structuredClone,alert:()=>{},console,crypto:crypto.webcrypto,setTimeout,Blob,URL});
vm.runInContext(fs.readFileSync('data.js','utf8')+'\n'+fs.readFileSync('app.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('active().length'),564);assert.equal(run('new Set(state.records.map(r=>r.id)).size'),564);
assert.equal(run('JSON.stringify(original)'),JSON.stringify(JSON.parse(fs.readFileSync('source/books.json','utf8'))));
assert.equal(run("active().filter(r=>binding(r.data)==='Unknown').length"),2);
assert.equal(run("active().filter(r=>binding(r.data)==='Paperback').length"),414);
assert.equal(run("active().filter(r=>binding(r.data)==='Hardcover').length"),147);
assert.equal(run("matches(original[0],'sherlok holmes')"),true);
assert.equal(run("matches(original[1],'CHARLOTTE BRONTE')"),true);
assert.equal(run("original.filter(b=>contained(b).length).length"),17);
assert.equal(run("original.filter(b=>matches(b,'Sadie Shapiro')).length"),1);
assert.equal(run("original.filter(b=>/Aeons.*Gate/i.test(b.Title)).length"),1);
assert.equal(run("original.filter(b=>/Cleric Quintet/i.test(b.Title)).length"),1);
assert.equal(run("(()=>{let x=structuredClone(state);x.records.push({...structuredClone(x.records[0]),id:'copy-distinct'});return validateBackup(x).records.length})()"),565);
assert.throws(()=>run("validateBackup({...state,records:[state.records[0],state.records[0]]})"));
assert.throws(()=>run("validateBackup({...state,records:[{id:'source-row-9999',data:{_source_row:9999},deleted:false}]})"));
assert.equal(run("commit(structuredClone(state))"),true);assert.equal(JSON.parse(mem.values().next().value).records.length,564);
assert.equal(run("(()=>{localStorage.setItem=()=>{throw Error('full')};let x=structuredClone(state);x.records[0].data.Title='Must not save';return commit(x)})()"),false);assert.equal(run('state.records[0].data.Title'),'Sherlock Holmes');
for(const [name,hash] of Object.entries(JSON.parse(fs.readFileSync('source-sha256.json','utf8')))){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('source',name))).digest('hex'),hash,name);}
console.log('PASS: 564 copies, all source hashes, identity, unknown bindings, 17 contained-work links, fuzzy/accent search, omnibus counts, import validation and persistence.');
