// ── COLORS ────────────────────────────────────────────────────────────────────
const COLORS={lavender:['#8875C7','#B4A8E0','#EDE9FF'],rose:['#C4607A','#E0A0B4','#FDEAF0'],ocean:['#4A90C4','#88BBE0','#E0F0FF'],sage:['#5D9068','#90C49B','#E5F3E8'],sunset:['#D47844','#E8AA80','#FEF0E5'],indigo:['#5B5E9E','#9598C8','#EEEEFF']};
function applyColor(n){const c=COLORS[n]||COLORS.lavender;document.documentElement.style.setProperty('--primary',c[0]);document.documentElement.style.setProperty('--primary-lt',c[1]);document.documentElement.style.setProperty('--primary-pale',c[2]);}

// ── DB ────────────────────────────────────────────────────────────────────────
const DB={db:null,
  init(){return new Promise((res,rej)=>{const r=indexedDB.open('Dayrift_db',3);r.onupgradeneeded=e=>{const db=e.target.result;['notes','journals','reminders','tasks'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});});};r.onsuccess=e=>{this.db=e.target.result;res();};r.onerror=()=>rej(r.error);});},
  all(s){return new Promise((res,rej)=>{const t=this.db.transaction(s,'readonly'),r=t.objectStore(s).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});},
  put(s,v){return new Promise((res,rej)=>{const t=this.db.transaction(s,'readwrite'),r=t.objectStore(s).put(v);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});},
  del(s,id){return new Promise((res,rej)=>{const t=this.db.transaction(s,'readwrite'),r=t.objectStore(s).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});},
  clr(s){return new Promise((res,rej)=>{const t=this.db.transaction(s,'readwrite'),r=t.objectStore(s).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error);})}
};
// ── STATE ─────────────────────────────────────────────────────────────────────
const S={notes:[],journals:[],reminders:[],tasks:[],folders:[],cfg:{theme:'light',notif:false,color:'lavender',name:''},
  loadCfg(){try{const c=localStorage.getItem('noted_s');if(c)this.cfg={...this.cfg,...JSON.parse(c)};}catch(e){}},
  saveCfg(){try{localStorage.setItem('noted_s',JSON.stringify(this.cfg));}catch(e){}},
  loadFolders(){try{this.folders=JSON.parse(localStorage.getItem('noted_fld')||'[]');}catch(e){this.folders=[];}},
  saveFolders(){try{localStorage.setItem('noted_fld',JSON.stringify(this.folders));}catch(e){}}
};
// ── UTILS ─────────────────────────────────────────────────────────────────────
const U={
  uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);},
  now(){return new Date().toISOString();},
  fdate(d){if(!d)return'';return new Date(d).toLocaleDateString('en-MY',{weekday:'long',year:'numeric',month:'long',day:'numeric'});},
  fshort(d){if(!d)return'';return new Date(d).toLocaleDateString('en-MY',{month:'short',day:'numeric',year:'numeric'});},
  ftime(d){if(!d)return'';return new Date(d).toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'});},
  fdt(d){if(!d)return'';const x=new Date(d);return x.toLocaleDateString('en-MY',{month:'short',day:'numeric'})+' '+x.toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'});},
  strip(h){const d=document.createElement('div');d.innerHTML=h;return d.textContent||d.innerText||'';},
  rel(d){if(!d)return'';const diff=Math.floor((new Date()-new Date(d))/864e5);if(diff===0)return'Today';if(diff===1)return'Yesterday';if(diff<7)return`${diff} days ago`;return U.fshort(d);},
  grpDate(arr,k){const g={};arr.forEach(x=>{const d=(x[k]||x.createdAt||'').split('T')[0];if(!g[d])g[d]=[];g[d].push(x);});return g;},
  today(){return new Date().toISOString().split('T')[0];}
};
// ── NLP ───────────────────────────────────────────────────────────────────────
const NLP={
  parse(s){
    if(!s)return null;s=s.toLowerCase().trim();
    const now=new Date(),tod=()=>new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(s==='now')return now;if(s==='today')return tod();
if(s==='tomorrow'){const d=tod();d.setDate(d.getDate()+1);return d;}
    if(s==='yesterday'){const d=tod();d.setDate(d.getDate()-1);return d;}
    if(s==='next week'){const d=tod();d.setDate(d.getDate()+7);return d;}
    const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const nd=s.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
    if(nd){const t=days.indexOf(nd[1]);const d=tod();d.setDate(d.getDate()+((t-d.getDay()+7)%7||7));return d;}
    const ix=s.match(/in\s+(\d+)\s+(minute|hour|day|week)s?/);
if(ix){const n=parseInt(ix[1]);const d=new Date(now);if(ix[2].startsWith('min'))d.setMinutes(d.getMinutes()+n);else if(ix[2].startsWith('h'))d.setHours(d.getHours()+n);else if(ix[2].startsWith('d'))d.setDate(d.getDate()+n);else d.setDate(d.getDate()+n*7);return d;}
    let base=null;
if(s.startsWith('tomorrow')){base=tod();base.setDate(base.getDate()+1);}
    else if(s.startsWith('today')){base=tod();}
    const mn=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mw=s.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec\w*)|((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*)\s+(\d{1,2})/);
if(mw){let mo,dy;if(mw[1]){dy=parseInt(mw[1]);mo=mn.findIndex(m=>mw[2].startsWith(m));}else{mo=mn.findIndex(m=>mw[4].startsWith(m));dy=parseInt(mw[5]);}if(mo>=0){base=new Date(now.getFullYear(),mo,dy);}}
    const sl=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if(sl){base=new Date(parseInt(sl[3]||now.getFullYear()),parseInt(sl[2])-1,parseInt(sl[1]));}
    const tm=s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    const tm24=s.match(/(\d{1,2}):(\d{2})(?!\s*(?:am|pm))/i);
if(tm){let h=parseInt(tm[1]);const m=parseInt(tm[2]||0),p=tm[3].toLowerCase();if(p==='pm'&&h!==12)h+=12;if(p==='am'&&h===12)h=0;const d=base||tod();d.setHours(h,m,0,0);return d;}
    if(tm24){const d=base||tod();d.setHours(parseInt(tm24[1]),parseInt(tm24[2]),0,0);return d;}
    if(base)return base;const nat=new Date(s);return isNaN(nat)?null:nat;
},
  fmt(d){if(!d)return'';return d.toLocaleDateString('en-MY',{weekday:'short',month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'});}
};

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg,ic='✓'){const e=document.createElement('div');e.className='toast';e.innerHTML=`<span>${ic}</span>${msg}`;document.getElementById('toast-wrap').appendChild(e);setTimeout(()=>{e.style.animation='toOut .3s ease forwards';setTimeout(()=>e.remove(),300);},2400);}

// ── APP ───────────────────────────────────────────────────────────────────────
// ── TAGS ──────────────────────────────────────────────────────────────────────
const TAGS={
  // Matches #word or #word/child/grandchild — stops at whitespace or another #
  RE:/#([a-zA-Z0-9_][a-zA-Z0-9_/-]*)/g,
  extract(html){
    if(!html)return[];
    const text=U.strip(html);
    const found=new Set();let m;
    TAGS.RE.lastIndex=0;
    while((m=TAGS.RE.exec(text))){found.add(m[1].toLowerCase());}
    return[...found];
  },
  // Rebuilds a tree: {work:{child:{}, other:{}}, personal:{}}
  tree(allTags){
    const root={};
    allTags.forEach(t=>{
      const parts=t.split('/').filter(Boolean);
      let node=root;
      parts.forEach(p=>{node[p]=node[p]||{};node=node[p];});
    });
    return root;
  },
  // Collect every tag used across notes+journals+tasks with counts
  all(){
    const counts={};
    const scan=arr=>arr.forEach(x=>(x.tags||[]).forEach(t=>{counts[t]=(counts[t]||0)+1;}));
    scan(S.notes);scan(S.journals);scan(S.tasks||[]);
    return counts;
  },
  // Highlight #tags in a contenteditable without breaking cursor position.
  // Saves & restores caret offset relative to the editor's text content.
  highlight(el){
    if(!el)return;
    const sel=window.getSelection();
    let caretOffset=null,anchorNode=null;
    if(sel.rangeCount&&el.contains(sel.anchorNode)){
      anchorNode=sel.anchorNode;caretOffset=sel.anchorOffset;
    }
    // Build plain text with tag spans, walking text nodes only (skip existing tag spans to avoid nesting)
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);
    const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(node=>{
      if(node.parentElement&&node.parentElement.classList.contains('tag-tok'))return;
      const txt=node.nodeValue;
      TAGS.RE.lastIndex=0;
      if(!TAGS.RE.test(txt))return;
      TAGS.RE.lastIndex=0;
      const frag=document.createDocumentFragment();
      let last=0,m;
      while((m=TAGS.RE.exec(txt))){
        if(m.index>last)frag.appendChild(document.createTextNode(txt.slice(last,m.index)));
        const span=document.createElement('span');
        span.className='tag-tok';span.textContent=m[0];
        frag.appendChild(span);
        last=m.index+m[0].length;
      }
      if(last<txt.length)frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag,node);
    });
    // Best-effort caret restore: if the exact node still exists, reuse it
    if(anchorNode&&anchorNode.isConnected&&el.contains(anchorNode)){
      try{const r=document.createRange();r.setStart(anchorNode,Math.min(caretOffset,anchorNode.nodeValue?.length||0));r.collapse(true);sel.removeAllRanges();sel.addRange(r);}catch(e){}
    }
  }
};
const App={

ctx: {
  id: null, type: null, timer: null,
  start(e, id, type) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { e.preventDefault(); this.show(e, id, type); }, 500);
  },
  cancel() { clearTimeout(this.timer); },
  show(e, id, type) {
    this.id = id; this.type = type;
    const m = document.getElementById('ctx-menu');
    let x = e.touches ? e.touches[0].clientX : e.clientX;
    let y = e.touches ? e.touches[0].clientY : e.clientY;
    if(x + 160 > window.innerWidth) x = window.innerWidth - 170;
    if(y + 160 > window.innerHeight) y = window.innerHeight - 170;
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m.classList.add('open');
    App.fab.close();
  },
  hide() { document.getElementById('ctx-menu').classList.remove('open'); },
  edit() { this.hide(); if(this.type==='notes') App.ed.open('note', this.id); else App.jview.open(this.id, 'home'); },
  async pin() { 
    this.hide(); 
    const item = S[this.type].find(x => x.id === this.id);
    if(item) { item.pinned = !item.pinned; await DB.put(this.type, item); App.home.render(); App.notes.render(); toast(item.pinned ? 'Pinned 📌' : 'Unpinned'); }
  },
  move() { this.hide(); App.ed._id = this.id; App.ed._type = this.type === 'notes' ? 'note' : 'journal'; App.folders.openMoveModal(); },
  async delete() {
    this.hide();
    if(confirm('Delete this item?')) {
      await DB.del(this.type, this.id);
      S[this.type] = S[this.type].filter(x => x.id !== this.id);
      App.home.render(); App.notes.render(); App.jour.render(); toast('Deleted 🗑️');
    }
  }
},

throwback: {
  render() {
    const el = document.getElementById('h-throwback'); if(!el) return;
    const today = new Date();
    const match = S.journals.find(j => {
      const d = new Date(j.date);
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() < today.getFullYear();
    });
    if(match) {
      const yrs = today.getFullYear() - new Date(match.date).getFullYear();
      el.innerHTML = `<div class="throwback fu" onclick="App.jview.open('${match.id}','home')"><div class="throwback-t"><span>⏳</span> On this day ${yrs} year${yrs>1?'s':''} ago</div><div class="throwback-c">${match.title || 'Untitled Entry'}</div><div style="font-size:12px;color:var(--text2)">${U.strip(match.content).slice(0,80)}</div></div>`;
    } else el.innerHTML = '';
  }
},

fab:{_o:false,toggle(){this._o?this.close():this.open();},open(){this._o=true;['fab','fab-menu','fab-ov'].forEach(id=>document.getElementById(id).classList.add('open'));},close(){this._o=false;['fab','fab-menu','fab-ov'].forEach(id=>document.getElementById(id).classList.remove('open'));}},

go(sc){
  App.fab.close();App.drawer.close();
document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  const ids={home:'s-home',notes:'s-notes',tasks:'s-tasks',journal:'s-journal',reminders:'s-rem'};
  document.getElementById(ids[sc]||'s-home')?.classList.add('active');
  document.querySelector(`.ni[data-nav="${sc}"]`)?.classList.add('on');
  if(sc==='home')App.home.render();
  if(sc==='notes')App.notes.render();
  if(sc==='tasks')App.tasks.renderScreen();
  if(sc==='journal')App.jour.render();
  if(sc==='reminders')App.rem.renderScreen();
},

drawer:{_tab:'cal',
  open(){document.getElementById('dr-ov').classList.add('open');document.getElementById('drawer').classList.add('open');if(this._tab==='cal')App.cal.render('dr-cal');else if(this._tab==='tags')App.tagview.render();else if(this._tab==='rem')App.rem.renderScreen('dr-rem');else App.cfg.renderCfg();},
  close(){document.getElementById('dr-ov').classList.remove('open');document.getElementById('drawer').classList.remove('open');},
  tab(t,btn){this._tab=t;document.querySelectorAll('.dr-tab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.getElementById('dr-cal').style.display=t==='cal'?'flex':'none';document.getElementById('dr-tags').style.display=t==='tags'?'block':'none';document.getElementById('dr-rem').style.display=t==='rem'?'block':'none';document.getElementById('dr-cfg').style.display=t==='cfg'?'block':'none';if(t==='cal')App.cal.render('dr-cal');else if(t==='tags')App.tagview.render();else if(t==='rem')App.rem.renderScreen('dr-rem');else App.cfg.renderCfg();}
},

home:{
  greets:['Hello! 👋','How are you? 🌟','Welcome back 🌸','Good to see you! ✨','What\'s on your mind? 💭','Ready to write? 🖊️','Hello, sunshine! ☀️','Hi there! 🌿','How\'s your day? 🌈'],
  subs:['Capture your day','Your thoughts matter','One note at a time','Let\'s write something beautiful','Journal your journey','Reflect. Write. Grow.'],
  render(){
    const now=new Date(),h=now.getHours();
    const tg=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    const name=S.cfg.name;
    document.getElementById('greet-t').textContent=name?`${tg}, ${name}! 🌸`:this.greets[Math.floor(Math.random()*this.greets.length)];
    document.getElementById('greet-d').textContent=U.fdate(now.toISOString());
document.getElementById('greet-s').textContent=this.subs[Math.floor(Math.random()*this.subs.length)];
    document.getElementById('sn-n').textContent=S.notes.length;document.getElementById('sn-j').textContent=S.journals.length;document.getElementById('sn-s').textContent=this.streak();
    const rn=[...S.notes].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,3);
    document.getElementById('h-notes').innerHTML=rn.length?rn.map(n=>`<div class="card fu" data-id="${n.id}" data-type="notes" onclick="App.ed.open('note','${n.id}')">${n.pinned?'<span class="card-pin">📌</span>':''}<div class="c-title">${n.title||'Untitled'}</div><div class="c-excerpt">${U.strip(n.content).slice(0,100)||'No content'}</div><div class="c-meta"><span class="c-date">${U.rel(n.updatedAt)}</span></div></div>`).join(''):`<div class="empty"><div class="empty-ic">📝</div><div class="empty-t">No notes yet</div><div class="empty-s">Tap + to create your first note</div></div>`;
const rj=[...S.journals].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,2);
    document.getElementById('h-jour').innerHTML=rj.length?rj.map(j=>{const ph=j.photos&&j.photos[0]?`<img src="${j.photos[0]}" class="c-photo" onclick="event.stopPropagation();App.photo('${j.photos[0]}')" loading="lazy">`:'';return`<div class="card fu" data-id="${j.id}" data-type="journals" onclick="App.jview.open('${j.id}','home')"><div style="overflow:hidden">${ph}<div class="c-title">${j.mood?j.mood+' ':''}${j.title||'Untitled'}</div><div class="c-excerpt">${U.strip(j.content).slice(0,100)||'No content'}</div><div class="c-meta"><span class="c-date">${U.fshort(j.date)}</span></div></div></div>`;}).join(''):`<div class="empty"><div class="empty-ic">📓</div><div class="empty-t">No journal entries</div><div class="empty-s">Start journaling today</div></div>`;
const ru=S.reminders.filter(r=>!r.done&&new Date(r.datetime)>new Date()).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)).slice(0,3);
    document.getElementById('h-rem').innerHTML=ru.length?ru.map(r=>`<div class="rem-item fu"><button class="rem-chk" onclick="App.rem.done('${r.id}')"></button><div style="flex:1"><div class="rem-title">${r.title}</div>${r.notes?`<div style="font-size:11px;color:var(--text2);margin-top:2px">${r.notes}</div>`:''}</div><div class="rem-time">${U.fdt(r.datetime)}</div></div>`).join(''):`<div class="empty"><div class="empty-ic">⏰</div><div class="empty-t">No upcoming reminders</div><div class="empty-s">Tap + to set a reminder</div></div>`;
    const rt=[...S.tasks].filter(t=>!t.done).sort((a,b)=>{if(a.datetime&&b.datetime)return new Date(a.datetime)-new Date(b.datetime);if(a.datetime)return -1;if(b.datetime)return 1;return new Date(b.createdAt)-new Date(a.createdAt);}).slice(0,3);
    const hTasksEl=document.getElementById('h-tasks');if(hTasksEl)hTasksEl.innerHTML=rt.length?rt.map(t=>`<div class="rem-item fu"><button class="rem-chk" onclick="App.tasks.done('${t.id}')"></button><div style="flex:1"><div class="rem-title">${t.title}</div></div>${t.datetime?`<div class="rem-time">${U.fdt(t.datetime)}</div>`:''}</div>`).join(''):`<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">No pending tasks</div><div class="empty-s">Tap + to add a task</div></div>`;
},
  streak(){if(!S.journals.length)return 0;const dates=[...new Set(S.journals.map(j=>j.date.split('T')[0]))].sort().reverse();let s=0;const chk=new Date();chk.setHours(0,0,0,0);for(const d of dates){const ds=chk.toISOString().split('T')[0];if(d===ds){s++;chk.setDate(chk.getDate()-1);}else if(d<ds)break;}return s;}
},

notes:{_sort:'new',_q:'',_tab:'notes',_fid:null,_tagFilter:null,
  get(){
    let a=[...S.notes];
    if(this._tagFilter){a=a.filter(n=>(n.tags||[]).some(t=>t===this._tagFilter||t.startsWith(this._tagFilter+'/')));a.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));return a;}
if(this._fid){
      const f=S.folders.find(f=>f.id===this._fid);
      a=a.filter(n=>n.folderId===this._fid);
      const s=f?.sort||this._sort;
      if(s==='new')a.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
      else if(s==='old')a.sort((a,b)=>new Date(a.updatedAt)-new Date(b.updatedAt));
      else if(s==='az')a.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
else a.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
      return a;
    }
    if(this._q){const q=this._q.toLowerCase();a=a.filter(n=>(n.title||'').toLowerCase().includes(q)||U.strip(n.content).toLowerCase().includes(q));}
    if(this._sort==='new')a.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
    else if(this._sort==='old')a.sort((a,b)=>new Date(a.updatedAt)-new Date(b.updatedAt));
else if(this._sort==='az')a.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
    else a.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    return a;
  },
  clearTagFilter(){this._tagFilter=null;document.getElementById('tag-active-bar').style.display='none';this.render();},
  render(){
    if(this._tab==='folders'){App.folders.renderList();return;}
    document.getElementById('tag-active-bar').style.display=this._tagFilter?'flex':'none';
    if(this._tagFilter)document.getElementById('tag-active-name').textContent='#'+this._tagFilter;
    const el=document.getElementById('notes-list');const items=this.get();
if(!items.length){el.innerHTML=`<div class="empty"><div class="empty-ic">📝</div><div class="empty-t">${this._tagFilter?'No notes with this tag':this._fid?'No notes in this folder':'No notes yet'}</div><div class="empty-s">Tap + to create a note</div></div>`;return;}
    el.innerHTML=items.map(n=>{
      const f=n.folderId?S.folders.find(x=>x.id===n.folderId):null;
      return`<div class="card fu" data-id="${n.id}" data-type="notes" onclick="App.ed.open('note','${n.id}')">${n.pinned?'<span class="card-pin">📌</span>':''}<div class="c-title">${n.title||'Untitled'}</div><div class="c-excerpt">${U.strip(n.content).slice(0,120)||'No content'}</div><div class="c-meta"><span class="c-date">${U.rel(n.updatedAt)}</span>${f?`<span style="font-size:10px;color:var(--primary);font-weight:700;background:var(--primary-pale);padding:2px 7px;border-radius:10px">📁 ${f.name}</span>`:''}</div></div>`;
    }).join('');
},
  mainTab(t,btn){
    this._tab=t;
    document.querySelectorAll('.ntab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
    document.getElementById('notes-pane').style.display=t==='notes'?'flex':'none';
    document.getElementById('folders-pane').style.display=t==='folders'?'block':'none';
    this.render();
},
  vw(v,btn){document.querySelectorAll('#notes-vsw .vbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');this.render();},
  srt(s,btn){this._sort=s;document.querySelectorAll('.chip').forEach(b=>b.classList.remove('on'));btn.classList.add('on');this.render();},
  srch(q){this._q=q;this.render();}
},

jour:{_sort:'new',_q:'',_tagFilter:null,
  render(){
    let items=[...S.journals];
    if(this._tagFilter){items=items.filter(j=>(j.tags||[]).some(t=>t===this._tagFilter||t.startsWith(this._tagFilter+'/')));}
if(this._q){const q=this._q.toLowerCase();items=items.filter(j=>(j.title||'').toLowerCase().includes(q)||U.strip(j.content).toLowerCase().includes(q));}
    if(this._sort==='new')items.sort((a,b)=>new Date(b.date)-new Date(a.date));else items.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const el=document.getElementById('jour-tl');
if(!items.length){el.innerHTML=`<div class="empty"><div class="empty-ic">📓</div><div class="empty-t">${this._q?'No results':'No journal entries'}</div><div class="empty-s">${this._q?'Try different keywords':'Start your journaling journey today ✨'}</div></div>`;return;}
    const grps=U.grpDate(items,'date');const dates=Object.keys(grps).sort((a,b)=>this._sort==='new'?(b>a?1:-1):(a>b?1:-1));
el.innerHTML=dates.map(ds=>{const ents=grps[ds];const lbl=U.rel(ds);
    return`<div class="tl-group"><div class="tl-label"><span title="${U.fdate(ds)}">${lbl===ds?U.fshort(ds):lbl}</span></div>${ents.map((j,i)=>`<div class="tl-entry fu"><div class="tl-spine"><div class="tl-dot"></div>${i<ents.length-1?'<div class="tl-line"></div>':''}</div><div class="tl-card" data-id="${j.id}" data-type="journals" data-id="${j.id}" data-type="journals" onclick="App.jview.open('${j.id}','journal')"><div class="tl-ch"><div class="tl-ct">${j.mood?j.mood+' ':''}${j.title||'Untitled'}</div><div class="tl-tm">${U.ftime(j.date)}</div></div><div class="tl-cx">${U.strip(j.content).slice(0,120)||'No content'}</div>${j.photos&&j.photos.length?`<div class="tl-photos">${j.photos.slice(0,3).map(p=>`<img src="${p}" class="tl-photo" onclick="event.stopPropagation();App.photo('${p}')" loading="lazy">`).join('')}${j.photos.length>3?`<div class="tl-more">+${j.photos.length-3}</div>`:''}</div>`:''}</div></div>`).join('')}</div>`;
    }).join('');
},
  srt(s,btn){this._sort=s;document.querySelectorAll('#s-journal .vbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');this.render();},
  srch(q){this._q=q;this.render();}
},

// ══ JOURNAL VIEW (read-only) ══
jview:{_entry:null,_from:'journal',
  open(id,from='journal'){
    const entry=S.journals.find(j=>j.id===id);if(!entry)return;
    this._entry=entry;this._from=from;
    App.fab.close();App.drawer.close();
document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
    document.getElementById('s-jv').classList.add('active');
    document.querySelector('.ni[data-nav="journal"]')?.classList.add('on');
    this.render();
  },
  render(){
    const j=this._entry;if(!j)return;
    document.getElementById('jv-hdr-date').textContent=U.fshort(j.date);
    const photos=j.photos||[];
    let photoHtml='';
if(photos.length){
      const gc=photos.length===1?'g1':photos.length===2?'g2':'g3';
      photoHtml=`<div class="jv-photos"><div class="jv-photo-lbl">Photos</div><div class="jv-grid ${gc}">${photos.map(p=>`<img src="${p}" onclick="App.photo('${p}')" loading="lazy">`).join('')}</div></div>`;
}
    document.getElementById('jv-content').innerHTML=`
      <div class="jv-top">
        ${j.mood?`<span class="jv-mood">${j.mood}</span>`:''}
        <div class="jv-date-str">${U.fdate(j.date)}</div>
        <div class="jv-main-title">${j.title||'<em style="opacity:.4;font-style:italic">Untitled</em>'}</div>
      </div>
      <div class="jv-divider"></div>
      <div class="jv-body-wrap">
        ${j.content?`<div class="jv-body">${j.content}</div>`:`<div class="jv-empty-body">No content written yet.</div>`}
        ${photoHtml}
      </div>`;
},
  refresh(){if(!this._entry)return;const updated=S.journals.find(j=>j.id===this._entry.id);if(updated){this._entry=updated;this.render();}},
  back(){App.go(this._from);},
  edit(){App.ed.open('journal',this._entry?.id);}
},
folders:{_editId:null,_ctxId:null,_sort:'new',
  renderList(){
    const el=document.getElementById('folders-list');if(!el)return;
if(!S.folders.length){
      el.innerHTML=`<div class="empty"><div style="margin-bottom:10px"><img src="empty_folder.jpg" style="width:80px;height:80px;object-fit:contain"></div><div class="empty-t">No folders yet</div><div class="empty-s">Tap 📁 in the header to create your first folder</div></div>`;
return;
    }
    el.innerHTML=`<div class="folder-grid">${S.folders.map(f=>{
      const count=S.notes.filter(n=>n.folderId===f.id).length;
      const icon=count>0?'filled_folder.jpg':'empty_folder.jpg';
      return`<div class="folder-card fu" onclick="App.folders.openFilter('${f.id}')">
        <img src="${icon}" class="folder-icon">
        <div style="flex:1;min-width:0">
          <div class="folder-name">${f.name}</div>
          <div class="folder-count">${count} note${count!==1?'s':''}</div>
        </div>
        <button class="folder-menu-btn" onclick="event.stopPropagation();App.folders.openCtx('${f.id}')">⋯</button>
      </div>`;
    }).join('')}</div>`;
},
  newFolder(){
    this._editId=null;this._sort='new';
    document.getElementById('folder-modal-title').textContent='📁 New Folder';
    document.getElementById('folder-name-inp').value='';
    document.getElementById('folder-del-btn').style.display='none';
    document.querySelectorAll('#folder-sort-row .chip').forEach(b=>b.classList.toggle('on',b.dataset.fsort==='new'));
    document.getElementById('m-folder').classList.add('open');
    setTimeout(()=>document.getElementById('folder-name-inp').focus(),300);
},
  openCtx(id){
    this._ctxId=id;
    const f=S.folders.find(f=>f.id===id);if(!f)return;
    document.getElementById('fctx-title').textContent='📁 '+f.name;
    document.getElementById('m-fctx').classList.add('open');
  },
  openEdit(){
    document.getElementById('m-fctx').classList.remove('open');
const f=S.folders.find(f=>f.id===this._ctxId);if(!f)return;
    this._editId=this._ctxId;this._sort=f.sort||'new';
    document.getElementById('folder-modal-title').textContent='✏️ Rename Folder';
    document.getElementById('folder-name-inp').value=f.name;
    document.getElementById('folder-del-btn').style.display='block';
    document.querySelectorAll('#folder-sort-row .chip').forEach(b=>b.classList.toggle('on',b.dataset.fsort===this._sort));
    document.getElementById('m-folder').classList.add('open');
    setTimeout(()=>document.getElementById('folder-name-inp').focus(),300);
  },
  openFilter(id){
    document.getElementById('m-fctx').classList.remove('open');
const fid=id||this._ctxId;
    const f=S.folders.find(f=>f.id===fid);if(!f)return;
    // Switch notes screen to notes tab, filter by folder
    App.notes._fid=fid;App.notes._tab='notes';
    document.getElementById('folder-active-bar').style.display='flex';
    document.getElementById('folder-active-name').textContent=f.name;
document.querySelectorAll('.ntab').forEach(b=>b.classList.remove('on'));
    document.getElementById('ntab-notes').classList.add('on');
    document.getElementById('notes-pane').style.display='flex';
    document.getElementById('folders-pane').style.display='none';
    App.notes.render();App.go('notes');
  },
  clearFilter(){
    App.notes._fid=null;
    document.getElementById('folder-active-bar').style.display='none';
    App.notes.render();
},
  setSort(s,btn){
    this._sort=s;
    document.querySelectorAll('#folder-sort-row .chip').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
  },
  save(){
    const name=document.getElementById('folder-name-inp').value.trim();
if(!name){toast('Please enter a folder name','⚠️');return;}
    if(this._editId){
      const f=S.folders.find(f=>f.id===this._editId);
if(f){f.name=name;f.sort=this._sort;}
    }else{
      S.folders.push({id:U.uid(),name,sort:this._sort,createdAt:U.now()});
    }
    S.saveFolders();document.getElementById('m-folder').classList.remove('open');
this.renderList();toast(this._editId?'Folder renamed 📁':'Folder created 📁');
  },
  confirmDel(){
    document.getElementById('m-fctx').classList.remove('open');
    document.getElementById('m-folder').classList.remove('open');
    const id=this._editId||this._ctxId;
    const f=S.folders.find(f=>f.id===id);if(!f)return;
if(!confirm(`Delete folder "${f.name}"?\nNotes inside will be unassigned.`))return;
    this._doDelete(id);
  },
  async _doDelete(id){
    S.folders=S.folders.filter(f=>f.id!==id);S.saveFolders();
for(const n of S.notes){if(n.folderId===id){n.folderId=null;await DB.put('notes',n);}}
    if(App.notes._fid===id)this.clearFilter();
    this.renderList();
    if(document.getElementById('s-notes')?.classList.contains('active'))App.notes.render();
    toast('Folder deleted','🗑️');
  },
  openMoveModal(){
    if(App.ed._type!=='note')return;
    const el=document.getElementById('move-folder-list');
if(!S.folders.length){toast('Create a folder first','💡');return;}
    const curFid=App.ed._id?S.notes.find(n=>n.id===App.ed._id)?.folderId:null;
    el.innerHTML=S.folders.map(f=>`<div class="sitem" onclick="App.folders.moveTo('${f.id}')">
      <div class="sil">
        <img src="${S.notes.filter(n=>n.folderId===f.id).length>0?'filled_folder.jpg':'empty_folder.jpg'}" style="width:34px;height:34px;object-fit:contain">
        <div><div class="s-t">${f.name}${curFid===f.id?' ✓':''}</div>
        <div class="s-sub">${S.notes.filter(n=>n.folderId===f.id).length} notes</div></div>
      </div>
    </div>`).join('');
document.getElementById('m-movefolder').classList.add('open');
  },
  async moveTo(fid){
    document.getElementById('m-movefolder').classList.remove('open');
    if(!App.ed._id||App.ed._type!=='note')return;
    const note=S.notes.find(n=>n.id===App.ed._id);
if(note){note.folderId=fid||null;await DB.put('notes',note);}
    toast(fid?`Moved to folder 📁`:'Removed from folder');
  }
},
cal:{_view:'month',_cur:new Date(),_sel:new Date(),_ctr:'dr-cal',
  render(ctr){if(ctr)this._ctr=ctr;const c=document.getElementById(this._ctr);if(!c)return;c.style.cssText='display:flex;flex-direction:column;flex:1;overflow:hidden';
const vs=`<div style="padding:7px 10px;border-bottom:1px solid var(--border);flex-shrink:0"><div class="vsw">${['month','week','day','agenda'].map(v=>`<button class="vbtn${this._view===v?' on':''}" onclick="App.cal.view('${v}',this)">${v==='month'?'Month':v==='week'?'Week':v==='day'?'Day':'List'}</button>`).join('')}</div></div>`;
    if(this._view==='month')this.month(c,vs);else if(this._view==='week')this.week(c,vs);else if(this._view==='day')this.day(c,vs);else this.agenda(c,vs);
},
  view(v,btn){this._view=v;this.render();},
  ents(ds){return{notes:S.notes.filter(n=>n.createdAt&&n.createdAt.startsWith(ds)),journals:S.journals.filter(j=>j.date&&j.date.startsWith(ds)),reminders:S.reminders.filter(r=>r.datetime&&r.datetime.startsWith(ds))};},
  month(c,vs){
    const y=this._cur.getFullYear(),m=this._cur.getMonth();const today=new Date();today.setHours(0,0,0,0);const sel=this._sel.toISOString().split('T')[0];
    const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),pd=new Date(y,m,0).getDate();
const ml=this._cur.toLocaleDateString('en-MY',{month:'long',year:'numeric'});
    let cells='';for(let i=fd-1;i>=0;i--)cells+=`<div class="cal-d other"><span class="cal-dn">${pd-i}</span></div>`;
    for(let i=1;i<=dim;i++){const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;const dd=new Date(y,m,i);const iT=dd.getTime()===today.getTime();const iS=ds===sel;const e=this.ents(ds);
cells+=`<div class="cal-d ${iT?'today':''} ${iS&&!iT?'sel':''}" onclick="App.cal.sel('${ds}')"><span class="cal-dn">${i}</span><div class="cal-dots">${e.notes.length?'<div class="cal-dot cd-n"></div>':''}${e.journals.length?'<div class="cal-dot cd-j"></div>':''}${e.reminders.length?'<div class="cal-dot cd-r"></div>':''}</div></div>`;}
    for(let i=1;i<=42-fd-dim;i++)cells+=`<div class="cal-d other"><span class="cal-dn">${i}</span></div>`;
const se=this.ents(sel);const sd=this._sel.toLocaleDateString('en-MY',{weekday:'long',month:'long',day:'numeric'});
    let det=`<div class="cal-dd">${sd}</div>`;
    if(!se.notes.length&&!se.journals.length&&!se.reminders.length){det+=`<div class="empty" style="padding:14px 0"><div class="empty-ic" style="font-size:32px">🌿</div><div class="empty-s">Nothing on this day</div></div>`;}
    else{if(se.notes.length){det+=`<div class="sec-t" style="margin-bottom:7px;font-size:13px">📝 Notes</div>`;det+=se.notes.map(n=>`<div class="card" data-id="${n.id}" data-type="notes" onclick="App.ed.open('note','${n.id}')"><div class="c-title">${n.title||'Untitled'}</div><div class="c-excerpt">${U.strip(n.content).slice(0,80)}</div></div>`).join('');}
    if(se.journals.length){det+=`<div class="sec-t" style="margin:10px 0 7px;font-size:13px">📓 Journal</div>`;det+=se.journals.map(j=>`<div class="card" data-id="${j.id}" data-type="journals" onclick="App.jview.open('${j.id}','calendar')"><div class="c-title">${j.mood||''}${j.title||'Untitled'}</div><div class="c-excerpt">${U.strip(j.content).slice(0,80)}</div></div>`).join('');}
    if(se.reminders.length){det+=`<div class="sec-t" style="margin:10px 0 7px;font-size:13px">⏰ Reminders</div>`;det+=se.reminders.map(r=>`<div class="rem-item ${r.done?'rem-done':''}"><button class="rem-chk ${r.done?'done':''}" onclick="App.rem.done('${r.id}')">${r.done?'✓':''}</button><div class="rem-title">${r.title}</div><div class="rem-time">${U.ftime(r.datetime)}</div></div>`).join('');}}
    c.innerHTML=`${vs}<div style="flex-shrink:0"><div class="cal-nav"><button class="ibtn" onclick="App.cal.pm()">‹</button><span class="cal-ml">${ml}</span><button class="ibtn" onclick="App.cal.nm()">›</button></div><div class="cal-legend"><span class="cal-leg"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--primary)"></span>Note</span><span class="cal-leg"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--secondary)"></span>Journal</span><span class="cal-leg"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent)"></span>Reminder</span></div><div class="cal-combined">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}${cells}</div></div><div class="cal-detail">${det}</div>`;
},
  week(c,vs){const d=new Date(this._cur),dow=d.getDay();const sow=new Date(d);sow.setDate(d.getDate()-dow);const wdays=Array.from({length:7},(_,i)=>{const w=new Date(sow);w.setDate(sow.getDate()+i);return w;});const today=new Date();today.setHours(0,0,0,0);const wl=`${wdays[0].toLocaleDateString('en-MY',{month:'short',day:'numeric'})} – ${wdays[6].toLocaleDateString('en-MY',{month:'short',day:'numeric',year:'numeric'})}`;
let hr=`<div style="width:34px"></div>`;wdays.forEach(wd=>{const iT=wd.getTime()===today.getTime();const e=this.ents(wd.toISOString().split('T')[0]);const hasE=e.notes.length||e.journals.length;hr+=`<div class="week-dh" style="${iT?'color:var(--primary)':''}">${['Su','Mo','Tu','We','Th','Fr','Sa'][wd.getDay()]}<span class="${iT?'week-num tod':'week-num'}">${wd.getDate()}</span>${hasE?`<div style="display:flex;justify-content:center;gap:2px;margin-top:1px">${e.notes.length?'<div style="width:4px;height:4px;border-radius:50%;background:var(--primary)"></div>':''}${e.journals.length?'<div style="width:4px;height:4px;border-radius:50%;background:var(--secondary)"></div>':''}</div>`:''}</div>`;});
let bc=`<div style="width:34px"></div>`;wdays.forEach(wd=>{const ds=wd.toISOString().split('T')[0];const e=this.ents(ds);let ev='';e.notes.forEach(n=>{ev+=`<div class="day-evt" data-id="${n.id}" data-type="notes" onclick="App.ed.open('note','${n.id}')" style="font-size:10px">${(n.title||'Note').slice(0,10)}</div>`;});e.journals.forEach(j=>{ev+=`<div class="day-evt" style="background:var(--sec-pale);border-color:var(--secondary);color:var(--secondary);font-size:10px" data-id="${j.id}" data-type="journals" onclick="App.jview.open('${j.id}','calendar')">${(j.title||'J').slice(0,10)}</div>`;});e.reminders.forEach(r=>{ev+=`<div class="day-evt" style="background:var(--acc-pale);border-color:var(--accent);color:var(--accent);font-size:10px">${r.title.slice(0,10)}</div>`;});bc+=`<div class="week-cell">${ev}</div>`;});
c.innerHTML=`${vs}<div style="flex-shrink:0"><div class="cal-nav"><button class="ibtn" onclick="App.cal.pw()">‹</button><span class="cal-ml" style="font-size:14px">${wl}</span><button class="ibtn" onclick="App.cal.nw()">›</button></div></div><div style="flex:1;overflow-y:auto;scrollbar-width:none"><div class="week-hdr-row">${hr}</div><div class="week-body">${bc}</div></div>`;},
  day(c,vs){const ds=this._sel.toISOString().split('T')[0];const e=this.ents(ds);const lbl=this._sel.toLocaleDateString('en-MY',{weekday:'short',month:'short',day:'numeric'});let slots='';for(let h=0;h<24;h++){const tl=h===0?'12am':h<12?`${h}am`:h===12?'12pm':`${h-12}pm`;let ev='';e.reminders.forEach(r=>{if(new Date(r.datetime).getHours()===h)ev+=`<div class="day-evt" style="background:var(--acc-pale);border-color:var(--accent);color:var(--accent);font-size:11px">${r.title}</div>`;});e.notes.forEach(n=>{if(new Date(n.createdAt).getHours()===h)ev+=`<div class="day-evt" data-id="${n.id}" data-type="notes" onclick="App.ed.open('note','${n.id}')" style="font-size:11px">${n.title||'Note'}</div>`;});e.journals.forEach(j=>{if(new Date(j.date).getHours()===h)ev+=`<div class="day-evt" style="background:var(--sec-pale);border-color:var(--secondary);color:var(--secondary);font-size:11px" data-id="${j.id}" data-type="journals" onclick="App.jview.open('${j.id}','calendar')">${j.title||'Journal'}</div>`;});slots+=`<div class="day-slot"><div class="day-tm">${tl}</div><div class="day-slot-c">${ev}</div></div>`;}
  c.innerHTML=`${vs}<div style="flex-shrink:0"><div class="cal-nav"><button class="ibtn" onclick="App.cal.pd()">‹</button><span class="cal-ml" style="font-size:14px">${lbl}</span><button class="ibtn" onclick="App.cal.nd()">›</button></div></div><div style="flex:1;overflow-y:auto;scrollbar-width:none;padding-bottom:16px">${slots}</div>`;setTimeout(()=>{const el=c.querySelector('div:last-child');if(el)el.scrollTop=8*40;},50);},
  agenda(c,vs){const all=[];S.notes.forEach(n=>all.push({...n,_t:'note',_d:n.createdAt}));S.journals.forEach(j=>all.push({...j,_t:'jour',_d:j.date}));S.reminders.forEach(r=>all.push({...r,_t:'rem',_d:r.datetime}));all.sort((a,b)=>new Date(a._d)-new Date(b._d));if(!all.length){c.innerHTML=`${vs}<div class="empty"><div class="empty-ic">📅</div><div class="empty-t">Nothing yet</div></div>`;return;}const grps=U.grpDate(all,'_d');const dates=Object.keys(grps).sort();const html=dates.map(ds=>{const ents=grps[ds];const lbl=U.rel(ds);return`<div style="margin-bottom:16px"><div class="tl-label" style="margin-bottom:7px"><span>${lbl===ds?U.fshort(ds):lbl}</span></div>${ents.map(e=>{if(e._t==='note')return`<div class="agenda-item" onclick="App.ed.open('note','${e.id}')"><div class="ag-dot" style="background:var(--primary)"></div><div class="ag-tm">${U.ftime(e._d)}</div><div><div class="ag-title">${e.title||'Note'}</div><div class="ag-sub">${U.strip(e.content).slice(0,50)}</div></div></div>`;if(e._t==='jour')return`<div class="agenda-item" onclick="App.jview.open('${e.id}','calendar')"><div class="ag-dot" style="background:var(--secondary)"></div><div class="ag-tm">${U.ftime(e._d)}</div><div><div class="ag-title">${e.mood||''}${e.title||'Journal'}</div><div class="ag-sub">${U.strip(e.content).slice(0,50)}</div></div></div>`;return`<div class="agenda-item"><div class="ag-dot" style="background:var(--accent)"></div><div class="ag-tm">${U.ftime(e._d)}</div><div><div class="ag-title">⏰ ${e.title}</div></div></div>`;}).join('')}</div>`;}).join('');c.innerHTML=`${vs}<div style="flex:1;overflow-y:auto;padding:12px;scrollbar-width:none;padding-bottom:16px">${html}</div>`;},
  sel(ds){this._sel=new Date(ds+'T00:00:00');this.month(document.getElementById(this._ctr),this._vsHtml());},
  _vsHtml(){return`<div style="padding:7px 10px;border-bottom:1px solid var(--border);flex-shrink:0"><div class="vsw">${['month','week','day','agenda'].map(v=>`<button class="vbtn${this._view===v?' on':''}" onclick="App.cal.view('${v}',this)">${v==='month'?'Month':v==='week'?'Week':v==='day'?'Day':'List'}</button>`).join('')}</div></div>`;},
  pm(){this._cur.setMonth(this._cur.getMonth()-1);this.render();},nm(){this._cur.setMonth(this._cur.getMonth()+1);this.render();},
 
  pw(){this._cur.setDate(this._cur.getDate()-7);this.render();},nw(){this._cur.setDate(this._cur.getDate()+7);this.render();},
  pd(){this._sel.setDate(this._sel.getDate()-1);this.render();},nd(){this._sel.setDate(this._sel.getDate()+1);this.render();}
},

ed:{_type:'note',_id:null,_photos:[],_pinned:false,_mood:null,_tblColor:'#EDE9FF',_range:null,_asT:null,

 _audioClips:[],_mediaRec:null,_recChunks:[],_recSecs:0,_recTimer:null,
  open(type,id=null){
    App.fab.close();this._type=type;this._id=id;this._photos=[];this._audioClips=[];this._pinned=false;this._mood=null;
    const badge=document.getElementById('ed-badge');badge.textContent=type==='note'?'📝 Note':'📓 Journal';badge.className='ed-badge '+(type==='note'?'b-note':'b-jour');
    document.getElementById('ed-meta').style.display=type==='journal'?'flex':'none';
    document.getElementById('del-btn').style.display=id?'flex':'none';
    const fb=document.getElementById('folder-btn');if(fb)fb.style.display=type==='note'?'flex':'none';
document.getElementById('as-ind').textContent='';
    document.getElementById('ed-dl').textContent=U.fdate(U.now());
    if(id){const data=type==='note'?S.notes.find(n=>n.id===id):S.journals.find(j=>j.id===id);
    if(data){document.getElementById('ed-t').value=data.title||'';document.getElementById('ed-c').innerHTML=data.content||'';this._photos=[...(data.photos||[])];this._audioClips=[...(data.audioClips||[])];this._pinned=data.pinned||false;if(type==='journal'){this._mood=data.mood||null;document.getElementById('ed-dl').textContent=U.fdate(data.date);document.querySelectorAll('.mood-btn').forEach(b=>b.classList.toggle('on',b.textContent===data.mood));}}
    }else{document.getElementById('ed-t').value='';document.getElementById('ed-c').innerHTML='';document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('on'));}
    const ta=document.getElementById('ed-t');ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';
    document.getElementById('m-ed').classList.add('open');
    if(!id)setTimeout(()=>document.getElementById('ed-t').focus(),450);
},
  close(){document.getElementById('m-ed').classList.remove('open');this._ps(true);},
  async _ps(ind){
    const title=document.getElementById('ed-t').value.trim();const content=document.getElementById('ed-c').innerHTML.trim();
    if(!title&&!content&&!this._photos.length)return;
    if(!this._id)this._id=U.uid();
    const now=U.now();const id=this._id;
    const tags=TAGS.extract(title+' '+content);
if(this._type==='note'){const ex=S.notes.find(n=>n.id===id);const note={id,title,content,tags,photos:this._photos,audioClips:this._audioClips,pinned:this._pinned,folderId:ex?.folderId||null,createdAt:ex?.createdAt||now,updatedAt:now};await DB.put('notes',note);const i=S.notes.findIndex(n=>n.id===id);if(i>=0)S.notes[i]=note;else S.notes.push(note);}
    else{const ex=S.journals.find(j=>j.id===id);const jour={id,title,content,tags,photos:this._photos,mood:this._mood,date:ex?.date||now,createdAt:ex?.createdAt||now,updatedAt:now};await DB.put('journals',jour);const i=S.journals.findIndex(j=>j.id===id);if(i>=0)S.journals[i]=jour;else S.journals.push(jour);}
    if(ind){document.getElementById('as-ind').textContent='Saved ✓';setTimeout(()=>{try{document.getElementById('as-ind').textContent='';}catch(e){}},2000);}
  },
  async save(){
    const title=document.getElementById('ed-t').value.trim();const content=document.getElementById('ed-c').innerHTML.trim();
if(!title&&!content&&!this._photos.length){toast('Nothing to save','⚠️');return;}
    await this._ps(false);document.getElementById('m-ed').classList.remove('open');
    toast(this._type==='note'?'Note saved 📝':'Journal saved 📓');
// Refresh journal view if open
    if(this._type==='journal'&&document.getElementById('s-jv').classList.contains('active'))App.jview.refresh();
    App.home.render();
    if(document.getElementById('s-notes').classList.contains('active'))App.notes.render();
    if(document.getElementById('s-journal').classList.contains('active'))App.jour.render();
},
  async del(){
    if(!this._id||!confirm('Delete this entry?'))return;
    await DB.del(this._type==='note'?'notes':'journals',this._id);
    if(this._type==='note')S.notes=S.notes.filter(n=>n.id!==this._id);else S.journals=S.journals.filter(j=>j.id!==this._id);
    document.getElementById('m-ed').classList.remove('open');
    App.home.render();App.notes.render();App.jour.render();
    if(this._type==='journal')App.go('journal');
    toast('Deleted','🗑️');
},
  pin(){this._pinned=!this._pinned;document.getElementById('pin-btn').textContent=this._pinned?'📌':'📍';toast(this._pinned?'Pinned 📌':'Unpinned');},
  mood(m,btn){this._mood=m;document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');},
  cmd(c){document.getElementById('ed-c').focus();document.execCommand(c,false,null);},
  checklist(){
    const el=document.getElementById('ed-c');el.focus();
    const item=document.createElement('div');item.className='chk-item';
    item.innerHTML=`<span class="chk-box" contenteditable="false" onclick="App.ed.toggleChk(this)"></span><span class="chk-text" contenteditable="true">&nbsp;</span>`;
    const sel=window.getSelection();
    if(sel.rangeCount&&el.contains(sel.anchorNode)){
      const r=sel.getRangeAt(0);r.collapse(false);r.insertNode(item);
      const after=document.createElement('br');item.after(after);
      const nr=document.createRange();nr.setStart(item.querySelector('.chk-text'),1);nr.collapse(true);sel.removeAllRanges();sel.addRange(nr);
    }else{el.appendChild(item);el.appendChild(document.createElement('br'));}
  },
  toggleChk(box){box.classList.toggle('checked');clearTimeout(this._asT);this._asT=setTimeout(()=>this._ps(true),400);},
  _sr(){const sel=window.getSelection();if(sel.rangeCount>0)this._range=sel.getRangeAt(0).cloneRange();},
  _rr(){if(this._range){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(this._range);}},
  dt(){this._sr();App.dtm.openModal();},
  tbl(){this._sr();document.getElementById('m-tbl').classList.add('open');},
  tbl_c(c,btn){this._tblColor=c;document.querySelectorAll('.tbl-clr').forEach(b=>{b.classList.remove('on');b.textContent='';});btn.classList.add('on');btn.textContent='✓';},
  do_tbl(){const cols=parseInt(document.getElementById('tbl-c').value)||3,rows=parseInt(document.getElementById('tbl-r').value)||3,col=this._tblColor||'#EDE9FF';let h=`<table class="Dayrift-table"><thead><tr>`;for(let c=0;c<cols;c++)h+=`<th style="background:${col}" contenteditable="true">Column ${c+1}</th>`;h+=`</tr></thead><tbody>`;for(let r=0;r<rows;r++){h+=`<tr>`;for(let c=0;c<cols;c++)h+=`<td contenteditable="true"></td>`;h+=`</tr>`;}h+=`</tbody></table><p><br></p>`;this._rr();document.getElementById('ed-c').focus();document.execCommand('insertHTML',false,h);document.getElementById('m-tbl').classList.remove('open');},
  photos(e){Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>{this._photos.push(ev.target.result);this._rPh();};r.readAsDataURL(f);});e.target.value='';},
  _rPh(){document.getElementById('ed-photos').innerHTML=this._photos.map((p,i)=>`<div class="ed-pw"><img src="${p}" onclick="App.photo('${p}')"><button class="ph-rm" onclick="App.ed._rmP(${i})">✕</button></div>`).join('');},
  _rmP(i){this._photos.splice(i,1);this._rPh();},
  _rAudio(){
    const el=document.getElementById('ed-audios');if(!el)return;
el.innerHTML=this._audioClips.map((src,i)=>`<div class="ed-audio-wrap">
      <audio controls src="${src}"></audio>
      <button onclick="App.ed._rmAudio(${i})" style="width:28px;height:28px;border-radius:50%;background:var(--sec-pale);border:none;cursor:pointer;font-size:14px;color:var(--secondary);flex-shrink:0">🗑️</button>
    </div>`).join('');
},
  _rmAudio(i){this._audioClips.splice(i,1);this._rAudio();},
  async voiceToggle(){
    if(this._mediaRec&&this._mediaRec.state==='recording'){this.voiceStop(false);return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
this._recChunks=[];this._recSecs=0;
      const mime=MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'audio/webm';
      this._mediaRec=new MediaRecorder(stream,{mimeType:mime});
      this._mediaRec.ondataavailable=e=>{if(e.data.size>0)this._recChunks.push(e.data);};
      this._mediaRec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(this._recChunks,{type:this._mediaRec.mimeType});
const reader=new FileReader();
        reader.onload=ev=>{this._audioClips.push(ev.target.result);this._rAudio();};
        reader.readAsDataURL(blob);
        this._stopRecUI();
      };
      this._mediaRec.start();
      const vb=document.getElementById('voice-bar');if(vb)vb.classList.add('active');
      document.getElementById('voice-btn').style.cssText='color:var(--secondary);background:var(--sec-pale)';
this._recTimer=setInterval(()=>{
        this._recSecs++;
        const m=Math.floor(this._recSecs/60),s=this._recSecs%60;
        document.getElementById('voice-time').textContent=`${m}:${String(s).padStart(2,'0')}`;
      },1000);
}catch(e){toast('Microphone access denied','⚠️');}
  },
  voiceStop(discard=false){
    if(!this._mediaRec)return;
    if(discard){this._mediaRec.stream?.getTracks().forEach(t=>t.stop());this._mediaRec=null;this._stopRecUI();}
    else if(this._mediaRec.state==='recording')this._mediaRec.stop();
},
  _stopRecUI(){
    clearInterval(this._recTimer);this._recTimer=null;this._recSecs=0;
    const vba=document.getElementById('voice-bar');if(vba)vba.classList.remove('active');
    const b=document.getElementById('voice-btn');if(b)b.style.cssText='';
    this._mediaRec=null;
}
},

rem:{_timers:[],
  form(){App.fab.close();['rem-t','rem-dt','rem-n'].forEach(id=>document.getElementById(id).value='');document.getElementById('rem-hint').textContent='';document.getElementById('m-rem').classList.add('open');},
  close(){document.getElementById('m-rem').classList.remove('open');},
  preview(v){const d=NLP.parse(v);document.getElementById('rem-hint').textContent=d?'→ '+NLP.fmt(d):(v?'⚠️ Could not parse':'');},
  async save(){
    const t=document.getElementById('rem-t').value.trim(),dtv=document.getElementById('rem-dt').value.trim(),n=document.getElementById('rem-n').value.trim();
if(!t){toast('Please enter a title','⚠️');return;}
    const d=NLP.parse(dtv)||new Date(dtv);if(!d||isNaN(d.getTime())){toast('Please enter a valid date/time','⚠️');return;}
    const r={id:U.uid(),title:t,datetime:d.toISOString(),notes:n,done:false,doneAt:null,createdAt:U.now()};
await DB.put('reminders',r);S.reminders.push(r);this.close();toast('Reminder set! ⏰');this._schedule(r);App.home.render();this.renderScreen();
  },
  _schedule(r){const delay=new Date(r.datetime)-Date.now();if(delay>0&&delay<2147483647){const t=setTimeout(()=>this._fire(r),delay);this._timers.push({id:r.id,t});}},
  _cancel(id){this._timers=this._timers.filter(x=>{if(x.id===id){clearTimeout(x.t);return false;}return true;});},
  schedAll(){S.reminders.filter(r=>!r.done).forEach(r=>this._schedule(r));},
  checkMissed(){
    const now=new Date();const ago=new Date(now-600000);
// 10 min window
    const missed=S.reminders.filter(r=>!r.done&&new Date(r.datetime)>=ago&&new Date(r.datetime)<=now);
    missed.forEach((r,i)=>setTimeout(()=>this._fire(r),1500+i*2500));
},
  async _fire(r){
    // In-app banner
    document.getElementById('ra-t').textContent=r.title;document.getElementById('ra-s').textContent=r.notes||U.fdt(r.datetime);
    document.getElementById('rem-alert').classList.add('show');setTimeout(()=>this.dismiss(),9000);
// Use service worker showNotification — works reliably in iOS PWA
    if(Notification.permission==='granted'&&'serviceWorker' in navigator){
      try{const reg=await navigator.serviceWorker.ready;await reg.showNotification('⏰ '+r.title,{body:r.notes||U.fdt(r.datetime),icon:'icon.jpg',badge:'icon.jpg',vibrate:[200,100,200]});}
      catch(e){try{new Notification('⏰ '+r.title,{body:r.notes||U.fdt(r.datetime)});}catch(e2){}}
    }
  },
  dismiss(){document.getElementById('rem-alert').classList.remove('show');},
  async done(id){const r=S.reminders.find(r=>r.id===id);if(!r)return;r.done=!r.done;r.doneAt=r.done?U.now():null;if(r.done)this._cancel(r.id);else this._schedule(r);await DB.put('reminders',r);App.home.render();this.renderScreen('dr-rem');},
  async del(id){this._cancel(id);await DB.del('reminders',id);S.reminders=S.reminders.filter(r=>r.id!==id);App.home.render();this.renderScreen('dr-rem');},
  renderScreen(targetId){
    const el=document.getElementById(targetId||'rem-screen');if(!el)return;
const today=U.today();
    const active=S.reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    const doneToday=S.reminders.filter(r=>r.done&&r.doneAt&&r.doneAt.startsWith(today));
    if(!active.length&&!doneToday.length){el.innerHTML=`<div class="empty"><div class="empty-ic">⏰</div><div class="empty-t">No reminders</div><div class="empty-s">Tap + to set a reminder<br><span style="font-size:11px;display:block;margin-top:6px">Completed reminders show today only<br>and are viewable in 📅 Calendar</span></div></div>`;return;}
    let html='';
if(active.length){html+=`<div class="rem-sec-lbl">Upcoming</div>`;html+=active.map(r=>`<div class="rem-item fu"><button class="rem-chk" onclick="App.rem.done('${r.id}')"></button><div style="flex:1"><div class="rem-title">${r.title}</div>${r.notes?`<div style="font-size:11px;color:var(--text2);margin-top:2px">${r.notes}</div>`:''}</div><div><div class="rem-time" style="${new Date(r.datetime)<new Date()?'color:var(--secondary)':''}">${U.fdt(r.datetime)}</div><button onclick="event.stopPropagation();App.rem.del('${r.id}')" style="font-size:16px;background:none;border:none;cursor:pointer;float:right;margin-top:2px;opacity:.5">🗑️</button></div></div>`).join('');}
    if(doneToday.length){html+=`<div class="rem-sec-lbl" style="margin-top:${active.length?'18px':'4px'}">Completed Today <span style="font-size:9px;font-weight:600;opacity:.6">(clears tomorrow)</span></div>`;html+=doneToday.map(r=>`<div class="rem-item rem-done fu"><button class="rem-chk done" onclick="App.rem.done('${r.id}')">✓</button><div style="flex:1"><div class="rem-title">${r.title}</div></div><div class="rem-time">${U.fdt(r.datetime)}</div></div>`).join('');}
    el.innerHTML=html;
}
},

tasks:{_timers:[],_filter:'active',
  form(id=null){
    App.fab.close();
    const t=id?S.tasks.find(x=>x.id===id):null;
    document.getElementById('task-t').value=t?.title||'';
    document.getElementById('task-dt').value=t?.datetime?U.fdt(t.datetime):'';
    document.getElementById('task-n').value=t?.notes||'';
    document.getElementById('task-hint').textContent='';
    document.getElementById('m-task').dataset.editId=id||'';
    document.getElementById('m-task').classList.add('open');
  },
  close(){document.getElementById('m-task').classList.remove('open');},
  preview(v){if(!v){document.getElementById('task-hint').textContent='';return;}const d=NLP.parse(v);document.getElementById('task-hint').textContent=d?'→ '+NLP.fmt(d):'⚠️ Could not parse';},
  async save(){
    const title=document.getElementById('task-t').value.trim(),dtv=document.getElementById('task-dt').value.trim(),notes=document.getElementById('task-n').value.trim();
    if(!title){toast('Please enter a title','⚠️');return;}
    let datetime=null;
    if(dtv){const d=NLP.parse(dtv)||new Date(dtv);if(!d||isNaN(d.getTime())){toast('Please enter a valid date/time','⚠️');return;}datetime=d.toISOString();}
    const editId=document.getElementById('m-task').dataset.editId;
    const tags=TAGS.extract(title+' '+notes);
    if(editId){
      const t=S.tasks.find(x=>x.id===editId);if(!t)return;
      this._cancel(t.id);
      Object.assign(t,{title,notes,datetime,tags,updatedAt:U.now()});
      await DB.put('tasks',t);
      if(datetime&&!t.done)this._schedule(t);
      toast('Task updated ✓');
    }else{
      const t={id:U.uid(),title,notes,datetime,tags,done:false,doneAt:null,createdAt:U.now(),updatedAt:U.now()};
      await DB.put('tasks',t);S.tasks.push(t);
      if(datetime)this._schedule(t);
      toast('Task created ✓');
    }
    this.close();App.home.render();this.renderScreen();
  },
  _schedule(t){const delay=new Date(t.datetime)-Date.now();if(delay>0&&delay<2147483647){const timer=setTimeout(()=>this._fire(t),delay);this._timers.push({id:t.id,t:timer});}},
  _cancel(id){this._timers=this._timers.filter(x=>{if(x.id===id){clearTimeout(x.t);return false;}return true;});},
  schedAll(){S.tasks.filter(t=>!t.done&&t.datetime).forEach(t=>this._schedule(t));},
  async _fire(t){
    document.getElementById('ra-t').textContent=t.title;document.getElementById('ra-s').textContent=t.notes||U.fdt(t.datetime);
    document.getElementById('rem-alert').classList.add('show');setTimeout(()=>App.rem.dismiss(),9000);
    if(Notification.permission==='granted'&&'serviceWorker' in navigator){
      try{const reg=await navigator.serviceWorker.ready;await reg.showNotification('✅ '+t.title,{body:t.notes||U.fdt(t.datetime),icon:'icon.jpg',badge:'icon.jpg',vibrate:[200,100,200]});}
      catch(e){try{new Notification('✅ '+t.title,{body:t.notes||U.fdt(t.datetime)});}catch(e2){}}
    }
  },
  async done(id){
    const t=S.tasks.find(x=>x.id===id);if(!t)return;
    t.done=!t.done;t.doneAt=t.done?U.now():null;
    if(t.done)this._cancel(t.id);else if(t.datetime)this._schedule(t);
    await DB.put('tasks',t);App.home.render();this.renderScreen();
  },
  async del(id){this._cancel(id);await DB.del('tasks',id);S.tasks=S.tasks.filter(t=>t.id!==id);App.home.render();this.renderScreen();},
  setFilter(f,btn){this._filter=f;document.querySelectorAll('#s-tasks .chip').forEach(c=>c.classList.remove('on'));btn?.classList.add('on');this.renderScreen();},
  get(){
    let a=[...S.tasks];
    if(this._filter==='active')a=a.filter(t=>!t.done);
    else if(this._filter==='done')a=a.filter(t=>t.done);
    a.sort((x,y)=>{
      if(x.done!==y.done)return x.done?1:-1;
      if(x.datetime&&y.datetime)return new Date(x.datetime)-new Date(y.datetime);
      if(x.datetime)return -1;if(y.datetime)return 1;
      return new Date(y.createdAt)-new Date(x.createdAt);
    });
    return a;
  },
  renderScreen(){
    const el=document.getElementById('tasks-screen');if(!el)return;
    const items=this.get();
    if(!items.length){el.innerHTML=`<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">No tasks${this._filter==='done'?' completed yet':''}</div><div class="empty-s">Tap + to create a task<br><span style="font-size:11px;display:block;margin-top:6px">You can also add checklist items inside any note using [ ]</span></div></div>`;return;}
    el.innerHTML=items.map(t=>`<div class="rem-item fu ${t.done?'rem-done':''}">
      <button class="rem-chk ${t.done?'done':''}" onclick="App.tasks.done('${t.id}')">${t.done?'✓':''}</button>
      <div style="flex:1;cursor:pointer" onclick="App.tasks.form('${t.id}')">
        <div class="rem-title">${t.title}</div>
        ${t.notes?`<div style="font-size:11px;color:var(--text2);margin-top:2px">${t.notes}</div>`:''}
        ${(t.tags&&t.tags.length)?`<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${t.tags.map(tg=>`<span class="tag-tok" style="font-size:10px">#${tg}</span>`).join('')}</div>`:''}
      </div>
      <div>
        ${t.datetime?`<div class="rem-time" style="${!t.done&&new Date(t.datetime)<new Date()?'color:var(--secondary)':''}">${U.fdt(t.datetime)}</div>`:''}
        <button onclick="event.stopPropagation();App.tasks.del('${t.id}')" style="font-size:16px;background:none;border:none;cursor:pointer;float:right;margin-top:2px;opacity:.5">🗑️</button>
      </div>
    </div>`).join('');
  }
},

tagview:{_expanded:{},
  render(){
    const el=document.getElementById('dr-tags');if(!el)return;
    const counts=TAGS.all();
    const tagList=Object.keys(counts);
    if(!tagList.length){el.innerHTML=`<div class="empty" style="padding:30px 14px"><div class="empty-ic">🏷️</div><div class="empty-t">No tags yet</div><div class="empty-s">Type #tag or #parent/child in any note, journal, or task to start organizing</div></div>`;return;}
    const tree=TAGS.tree(tagList);
    el.innerHTML=`<div style="padding:14px 14px 0"><div class="sec-t" style="margin-bottom:10px">Your Tags</div>${this._renderNode(tree,'',counts)}</div>`;
  },
  _renderNode(node,path,counts){
    const keys=Object.keys(node).sort();
    if(!keys.length)return'';
    return `<div class="tag-branch">${keys.map(k=>{
      const full=path?path+'/'+k:k;
      const hasChildren=Object.keys(node[k]).length>0;
      const isOpen=this._expanded[full];
      const cnt=counts[full]||0;
      return `<div class="tag-node">
        <div class="tag-row" onclick="App.tagview.tap('${full}',${hasChildren})">
          ${hasChildren?`<span class="tag-caret ${isOpen?'open':''}">▸</span>`:'<span class="tag-caret" style="visibility:hidden">▸</span>'}
          <span class="tag-hash">#</span><span class="tag-lbl">${k}</span>
          ${cnt?`<span class="tag-cnt">${cnt}</span>`:''}
        </div>
        ${hasChildren?`<div class="tag-children" style="display:${isOpen?'block':'none'}">${this._renderNode(node[k],full,counts)}</div>`:''}
      </div>`;
    }).join('')}</div>`;
  },
  tap(full,hasChildren){
    if(hasChildren){this._expanded[full]=!this._expanded[full];this.render();return;}
    this.filter(full);
  },
  filter(tag){
    App.drawer.close();
    App.notes._tagFilter=tag;App.jour._tagFilter=tag;
    App.go('notes');
    toast(`Filtering by #${tag}`,'🏷️');
  }
},

cfg:{
  renderCfg(){
    document.getElementById('cfg-name').value=S.cfg.name||'';
    document.querySelectorAll('.clr-sw').forEach(b=>b.classList.toggle('on',b.dataset.col===S.cfg.color));
    const isPWA=window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
    const perm='Notification' in window?Notification.permission:'not-supported';
    const el=document.getElementById('notif-status');
if(el){if(!isPWA)el.textContent='Add to Home Screen first';else if(perm==='granted')el.textContent='✅ Active — rings while app is open';else if(perm==='denied')el.textContent='❌ Blocked in iOS Settings';else el.textContent='Tap to enable';}
    document.getElementById('tog-notif').classList.toggle('on',perm==='granted'&&S.cfg.notif);
},
  saveName(){const name=document.getElementById('cfg-name').value.trim();S.cfg.name=name;S.saveCfg();App.home.render();toast(name?`Hi, ${name}! 👋`:'Name cleared');},
  color(name,btn){applyColor(name);S.cfg.color=name;S.saveCfg();document.querySelectorAll('.clr-sw').forEach(b=>b.classList.remove('on'));btn.classList.add('on');toast('Theme updated 🎨');},
  theme(){const dark=document.documentElement.getAttribute('data-theme')==='dark';const nt=dark?'light':'dark';document.documentElement.setAttribute('data-theme',nt);document.getElementById('tog-dark').classList.toggle('on',nt==='dark');S.cfg.theme=nt;S.saveCfg();},
  applyTheme(){document.documentElement.setAttribute('data-theme',S.cfg.theme);document.getElementById('tog-dark').classList.toggle('on',S.cfg.theme==='dark');},
  async notif(){
    const isPWA=window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
if(!isPWA){toast('Open from Home Screen first 📱','⚠️');return;}
    if(!('Notification' in window)){toast('Notifications not supported','⚠️');return;}
    if(Notification.permission==='denied'){toast('Blocked — enable in iOS Settings > Notifications','⚠️');return;}
    if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p==='granted'){S.cfg.notif=true;S.saveCfg();toast('Notifications enabled! 🔔');App.rem.schedAll();this.renderCfg();}else toast('Permission denied','⚠️');}
    else{S.cfg.notif=!S.cfg.notif;document.getElementById('tog-notif').classList.toggle('on',S.cfg.notif);S.saveCfg();}
  },
  applyNotif(){if('Notification' in window)document.getElementById('tog-notif').classList.toggle('on',Notification.permission==='granted'&&S.cfg.notif);},
  async clear(){if(!confirm('Delete ALL notes, journals, tasks, and reminders? This cannot be undone.'))return;await DB.clr('notes');await DB.clr('journals');await DB.clr('reminders');await DB.clr('tasks');S.notes=[];S.journals=[];S.reminders=[];S.tasks=[];App.home.render();toast('All data cleared','🗑️');}
},

bkp:{
  exp(){const data={ver:'1.3',at:U.now(),notes:S.notes,journals:S.journals,reminders:S.reminders,tasks:S.tasks,cfg:S.cfg};const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`Dayrift-backup-${new Date().toISOString().split('T')[0]}.json`;a.click();URL.revokeObjectURL(u);toast('Backup saved 📤');},
  async imp(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{try{const d=JSON.parse(ev.target.result);if(!d.notes&&!d.journals)throw new Error();if(!confirm(`Load backup from ${d.at?new Date(d.at).toLocaleDateString():'?'}?
Merges with existing data.`))return;for(const n of(d.notes||[])){await DB.put('notes',n);const i=S.notes.findIndex(x=>x.id===n.id);if(i>=0)S.notes[i]=n;else S.notes.push(n);}for(const j of(d.journals||[])){await DB.put('journals',j);const i=S.journals.findIndex(x=>x.id===j.id);if(i>=0)S.journals[i]=j;else S.journals.push(j);}for(const r of(d.reminders||[])){await DB.put('reminders',r);if(!S.reminders.find(x=>x.id===r.id))S.reminders.push(r);}for(const t of(d.tasks||[])){await DB.put('tasks',t);const i=S.tasks.findIndex(x=>x.id===t.id);if(i>=0)S.tasks[i]=t;else S.tasks.push(t);}App.home.render();toast('Backup loaded 📥');}catch{toast('Invalid backup file','❌');}};r.readAsText(f);e.target.value='';}
},

dtm:{_mode:'pick',_fmt:'both',
  openModal(){
    this._mode='pick';
document.getElementById('dt-m-pick').classList.add('on');document.getElementById('dt-m-nlp').classList.remove('on');
    document.getElementById('dt-pick').style.display='block';document.getElementById('dt-nlp').style.display='none';
    // Set current datetime as default
    const now=new Date();const local=new Date(now-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById('dt-picker').value=local;
    document.getElementById('dt-in').value='';document.getElementById('dt-prev').textContent='';
    document.getElementById('m-dt').classList.add('open');
},
  mode(m,btn){this._mode=m;document.querySelectorAll('#m-dt .vbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.getElementById('dt-pick').style.display=m==='pick'?'block':'none';document.getElementById('dt-nlp').style.display=m==='nlp'?'block':'none';},
  quick(type){const d=new Date();if(type==='today')d.setHours(9,0,0,0);else if(type==='tomorrow'){d.setDate(d.getDate()+1);d.setHours(9,0,0,0);}const local=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);document.getElementById('dt-picker').value=local;},
  prev(v){const d=NLP.parse(v);document.getElementById('dt-prev').textContent=d?'→ '+NLP.fmt(d):(v?'⚠️ Unrecognised':'');},
  fmt(f,btn){this._fmt=f;document.querySelectorAll('#dt-fmts .chip').forEach(b=>b.classList.remove('on'));btn.classList.add('on');},
  ins(){
    let d;
if(this._mode==='pick'){const v=document.getElementById('dt-picker').value;d=v?new Date(v):new Date();}
    else{const v=document.getElementById('dt-in').value.trim();d=v?NLP.parse(v):new Date();}
    if(!d||isNaN(d.getTime())){toast('Invalid date/time','⚠️');return;}
    let t='';if(this._fmt==='date')t=U.fdate(d.toISOString());else if(this._fmt==='time')t=U.ftime(d.toISOString());else if(this._fmt==='day')t=d.toLocaleDateString('en-MY',{weekday:'long'});else t=NLP.fmt(d);
App.ed._rr();document.getElementById('ed-c').focus();document.execCommand('insertText',false,`📅 ${t}`);document.getElementById('m-dt').classList.remove('open');
  }
},

photo(src){document.getElementById('ph-view-img').src=src;document.getElementById('ph-view').classList.add('open');},

async init(){
  S.loadCfg();S.loadFolders();await DB.init();
  S.notes=await DB.all('notes');S.journals=await DB.all('journals');S.reminders=await DB.all('reminders');S.tasks=await DB.all('tasks');
  App.cfg.applyTheme();applyColor(S.cfg.color||'lavender');App.cfg.applyNotif();
  App.rem.schedAll();App.rem.checkMissed();
  App.tasks.schedAll();
  App.home.render();
  App.throwback.render(); // Boot On This Day

  // Setup Context Menu Global Listeners
  document.addEventListener('click', e => { if(!e.target.closest('#ctx-menu')) App.ctx.hide(); });
  document.addEventListener('touchstart', e => { const c = e.target.closest('.card, .tl-card'); if(c && c.dataset.id) App.ctx.start(e, c.dataset.id, c.dataset.type); }, {passive: false});
  document.addEventListener('touchend', () => App.ctx.cancel());
  document.addEventListener('touchmove', () => App.ctx.cancel());
  document.addEventListener('mousedown', e => { const c = e.target.closest('.card, .tl-card'); if(c && c.dataset.id) App.ctx.start(e, c.dataset.id, c.dataset.type); });
  document.addEventListener('mouseup', () => App.ctx.cancel());
  document.addEventListener('contextmenu', e => { const c = e.target.closest('.card, .tl-card'); if(c && c.dataset.id) { e.preventDefault(); App.ctx.show(e, c.dataset.id, c.dataset.type); }});

  // Auto-save
  let asT;['ed-c','ed-t'].forEach(id=>{document.getElementById(id).addEventListener('input',()=>{clearTimeout(asT);asT=setTimeout(()=>App.ed._ps(true),1800);});});
  let tagT;document.getElementById('ed-c').addEventListener('input',()=>{clearTimeout(tagT);tagT=setTimeout(()=>TAGS.highlight(document.getElementById('ed-c')),700);});
// Close modals on backdrop
  document.querySelectorAll('.mo:not(.fs)').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});});
  // Register SW
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
};

document.addEventListener('DOMContentLoaded',()=>App.init());
