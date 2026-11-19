/* ============================================================
   CONFIGURAÇÃO — cole aqui a URL do App da Web do Apps Script
   (termina em /exec). Veja o README.
   ============================================================ */
const API_URL = 'https://script.google.com/macros/s/AKfycbz6rM0ujiim8dZY294Gotazw4MXzRlVpS9OihgDv8k7NVAO7Q938dlzE2rOzuFmZizS/exec';

{
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const ST={ideia:'Ideia',producao:'Em produção',pronto:'Pronto',publicado:'Publicado'};
const CANAIS=['Feed','Carrossel','Reels','Stories','WhatsApp','Outro'];
const EXT={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',pdf:'application/pdf'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dm=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
/* links do Google Drive */
const local={}; // prévias locais dos arquivos enviados nesta sessão
const thumb=(id,w=600)=>local[id]||`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
const orig=id=>`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
const viewUrl=id=>`https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));

let senha='',posts=new Map(),weeks=new Map(),filtro='todos',ed=null,pasteKind='idea',pickKind='idea',logged=false;
const cur=new Date();cur.setDate(1);
const m0=/^#m-(\d{4})-(\d{2})$/.exec(location.hash);if(m0){cur.setFullYear(+m0[1],+m0[2]-1,1)}
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};

const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),3200)};
const note=t=>{$('#note').textContent=t};

/* ---------- API (Apps Script) ---------- */
async function api(acao,dados={}){
 if(!/^https:\/\/script\.google\.com\//.test(API_URL))throw new Error('Configure a API_URL no app.js (veja o README).');
 const r=await fetch(API_URL,{method:'POST',body:JSON.stringify({senha,acao,...dados})}); // text/plain: sem preflight
 const j=await r.json();
 if(!j.ok){if(j.erro==='senha'){sair();throw new Error('Senha incorreta')}throw new Error(j.erro||'Erro no servidor')}
 return j;
}
async function carregar(silencioso){
 try{
  const j=await api('listar');
  posts=new Map(j.posts.map(p=>[p.id,p]));
  weeks=new Map(Object.entries(j.weeks||{}));
  note('');render();return true;
 }catch(e){if(!silencioso)note('Não consegui carregar: '+e.message);throw e}
}

/* ---------- login ---------- */
$('#lform').onsubmit=async e=>{
 e.preventDefault();senha=$('#lsenha').value;$('#lerr').textContent='';$('#lbtn').disabled=true;$('#lbtn').textContent='Entrando…';
 try{await carregar(true);entrar($('#lkeep').checked)}catch(err){$('#lerr').textContent=err.message==='Senha incorreta'?'Senha incorreta.':err.message}
 finally{$('#lbtn').disabled=false;$('#lbtn').textContent='Entrar'}
};
function entrar(keep){logged=true;if(keep)store.set('cal_senha',senha);$('#login').classList.remove('on')}
function sair(){logged=false;senha='';store.set('cal_senha',null);$('#lsenha').value='';$('#login').classList.add('on');setTimeout(()=>$('#lsenha').focus(),30)}
$('#sair').onclick=sair;
setInterval(()=>{if(logged&&!ed&&document.visibilityState==='visible')carregar(true).catch(()=>{})},60000);
document.addEventListener('visibilitychange',()=>{if(logged&&!ed&&document.visibilityState==='visible')carregar(true).catch(()=>{})});

/* ---------- calendário ---------- */
$('#head').innerHTML=DIAS.map(d=>`<div>${d}</div>`).join('')+'<div>Ideias da semana</div>';
$('#fchan').innerHTML=CANAIS.map(c=>`<option>${c}</option>`).join('');
$('#fstatus').innerHTML=Object.entries(ST).map(([k,l])=>`<button type="button" data-st="${k}" aria-pressed="false"><span class="dot" style="--c:var(--s-${k})"></span>${l}</button>`).join('');

function thumbOf(p){const f=(p.final||[]).find(x=>/^(image|video)\//.test(x.type||''));return f?f.id:(p.ideaImgs||[])[0]?.id}

function render(){
 const y=cur.getFullYear(),m=cur.getMonth();
 $('#mes').textContent=MESES[m]+' '+y;
 try{history.replaceState(null,'','#m-'+y+'-'+String(m+1).padStart(2,'0'))}catch(e){}
 const first=new Date(y,m,1),last=new Date(y,m+1,0);
 const d=new Date(y,m,1-first.getDay()),end=new Date(y,m,last.getDate()+(6-last.getDay()));
 const byDate={};
 for(const [id,p] of posts){(byDate[p.date]??=[]).push([id,p])}
 for(const k in byDate)byDate[k].sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
 const today=iso(new Date()),cnt={ideia:0,producao:0,pronto:0,publicado:0},mes=iso(first).slice(0,7);let tot=0;
 for(const p of posts.values()){if(p.date?.slice(0,7)===mes&&cnt[p.status]!=null){cnt[p.status]++;tot++}}
 const act=document.activeElement,fid=act?.id,fval=act?.value,ss=act?.selectionStart,se=act?.selectionEnd;
 let h='';
 while(d<=end){
  const ws=iso(d),wsD=new Date(d);let cells='';
  for(let i=0;i<7;i++){
   const k=iso(d),out=d.getMonth()!==m;
   const list=(byDate[k]||[]).filter(([,p])=>filtro==='todos'||p.status===filtro);
   cells+=`<div class="day${out?' out':''}${k===today?' today':''}" data-date="${k}"><div class="dh"><span class="wd">${DIAS[i]}</span><b>${d.getDate()}</b><button class="add" data-add="${k}" aria-label="Adicionar post em ${dm(d)}">+</button></div>`+
    list.map(([id,p])=>{const t=thumbOf(p);return `<button class="chip" draggable="true" data-id="${esc(id)}" style="--c:var(--s-${ST[p.status]?p.status:'ideia'})" title="${esc(ST[p.status]||'')}">${t?`<img src="${esc(thumb(t,120))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span>${esc(p.title||'Sem título')}</span><i>${esc(p.channel||'')}</i></button>`}).join('')+'</div>';
   d.setDate(d.getDate()+1);
  }
  const we=new Date(d);we.setDate(we.getDate()-1);
  h+=`<div class="week">${cells}<div class="wk"><label for="w-${ws}">Ideias da semana<small>${dm(wsD)} – ${dm(we)}</small></label><textarea id="w-${ws}" data-week="${ws}" placeholder="Temas, séries, avisos, datas especiais…">${esc(weeks.get(ws)||'')}</textarea></div></div>`;
 }
 $('#cal').innerHTML=h;
 if(fid){const el=document.getElementById(fid);if(el&&el.closest('#cal')){el.value=fval;el.focus();try{el.setSelectionRange(ss,se)}catch(e){}}}
 $('#empty').hidden=tot>0;
 $('#stats').innerHTML=`<button class="stat" data-f="todos" aria-pressed="${filtro==='todos'}"><b>${tot}</b>no mês</button>`+Object.entries(ST).map(([k,l])=>`<button class="stat" data-f="${k}" aria-pressed="${filtro===k}"><span class="dot" style="--c:var(--s-${k})"></span><b>${cnt[k]}</b>${l}</button>`).join('');
}

$('#prev').onclick=()=>{cur.setMonth(cur.getMonth()-1);render()};
$('#next').onclick=()=>{cur.setMonth(cur.getMonth()+1);render()};
$('#hoje').onclick=()=>{const t=new Date();cur.setFullYear(t.getFullYear(),t.getMonth(),1);render()};
$('#stats').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;filtro=filtro===b.dataset.f?'todos':b.dataset.f;render()};

$('#cal').addEventListener('click',e=>{
 const a=e.target.closest('[data-add]');if(a)return openEd(null,a.dataset.add);
 const c=e.target.closest('.chip');if(c)return openEd(c.dataset.id);
 const day=e.target.closest('.day');if(day&&e.target===day)openEd(null,day.dataset.date);
});
$('#cal').addEventListener('dragstart',e=>{const c=e.target.closest('.chip');if(c)e.dataTransfer.setData('text/plain',c.dataset.id)});
$('#cal').addEventListener('dragover',e=>{const d=e.target.closest('.day');if(d){e.preventDefault();d.classList.add('over')}});
$('#cal').addEventListener('dragleave',e=>{const d=e.target.closest('.day');if(d)d.classList.remove('over')});
$('#cal').addEventListener('drop',async e=>{
 const d=e.target.closest('.day');if(!d)return;e.preventDefault();d.classList.remove('over');
 const id=e.dataTransfer.getData('text/plain'),p=posts.get(id);if(!p||p.date===d.dataset.date)return;
 const antes=p.date,novo={...p,date:d.dataset.date};posts.set(id,novo);render();
 try{await api('salvarPost',{post:novo});toast('Post movido para '+d.dataset.date.split('-').reverse().slice(0,2).join('/'))}
 catch(err){posts.set(id,{...p,date:antes});render();toast('Não foi possível mover: '+err.message)}
});

/* ideias da semana: salva sozinho */
const wTimers={};
async function saveWeek(ws,text){
 if((weeks.get(ws)||'')===text)return;
 const antes=weeks.get(ws)||'';weeks.set(ws,text);
 try{await api('salvarSemana',{semana:ws,texto:text})}catch(e){weeks.set(ws,antes);toast('Não salvou as ideias da semana: '+e.message)}
}
$('#cal').addEventListener('input',e=>{const t=e.target.closest('[data-week]');if(!t)return;clearTimeout(wTimers[t.dataset.week]);wTimers[t.dataset.week]=setTimeout(()=>saveWeek(t.dataset.week,t.value),1200)});
$('#cal').addEventListener('focusout',e=>{const t=e.target.closest('[data-week]');if(!t)return;clearTimeout(wTimers[t.dataset.week]);saveWeek(t.dataset.week,t.value)});

/* ---------- editor de post ---------- */
function openEd(id,date){
 const p=id?posts.get(id):null;if(id&&!p)return;
 ed={id,ideaImgs:[...(p?.ideaImgs||[])],final:[...(p?.final||[])],fresh:[],drop:[],status:p?.status||'ideia',createdAt:p?.createdAt||Date.now()};
 $('#mdt').textContent=id?'Editar post':'Novo post';
 $('#ftitle').value=p?.title||'';$('#fdate').value=p?.date||date;$('#fchan').value=p?.channel||'Feed';
 $('#fidea').value=p?.idea||'';$('#fcap').value=p?.caption||'';$('#fowner').value=p?.owner||'';
 $('#del').hidden=!id;$('#del').classList.remove('sure');$('#del').textContent='Excluir';
 pasteKind='idea';setStatus(ed.status);renderFiles();
 $('#ov').classList.add('on');document.body.style.overflow='hidden';
 setTimeout(()=>$('#ftitle').focus(),30);
}
function setStatus(s){ed.status=s;for(const b of $('#fstatus').children)b.setAttribute('aria-pressed',b.dataset.st===s)}
$('#fstatus').onclick=e=>{const b=e.target.closest('[data-st]');if(b)setStatus(b.dataset.st)};

function fileCard(f,kind,i){
 const t=f.type||'',name=esc(f.name||'arquivo'),id=esc(f.id);
 const view=t.startsWith('image/')?`<img src="${esc(thumb(f.id))}" alt="${name}" data-zoom="${id}" referrerpolicy="no-referrer">`
  :t.startsWith('video/')?`<a class="play" href="${esc(viewUrl(f.id))}" target="_blank" rel="noopener" aria-label="Assistir ${name}"><img src="${esc(thumb(f.id))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"><b>▶</b></a>`
  :`<a class="pdf" href="${esc(viewUrl(f.id))}" target="_blank" rel="noopener">PDF</a>`;
 return `<div class="th">${view}<div class="meta"><span title="${name}">${name}</span><span>${f.size?kb(f.size):''}</span><a href="${esc(orig(f.id))}" target="_blank" rel="noopener">Baixar original ↓</a></div><button type="button" class="x" data-rm="${kind}" data-i="${i}" aria-label="Remover ${name}">✕</button></div>`;
}
const pendCards=k=>pend.filter(x=>x.kind===k).map(x=>`<div class="th busy"><span>Enviando ${Math.round(x.p*100)}%<br><small>${esc(x.name)}</small></span></div>`).join('');
function renderFiles(){
 $('#tIdea').innerHTML=ed.ideaImgs.map((f,i)=>fileCard(f,'idea',i)).join('')+pendCards('idea');
 $('#tFinal').innerHTML=ed.final.map((f,i)=>fileCard(f,'final',i)).join('')+pendCards('final');
}
const toB64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>no(r.error);r.readAsDataURL(f)});
const LIM_FINAL=1024*1048576; // 1 GB
let pend=[],raf=0;
const busyN=()=>pend.length;
/* prints de inspiração: reduz para enviar rápido (não precisam de qualidade máxima) */
async function comprimir(f){
 if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size<300*1024)return f;
 try{
  const bmp=await createImageBitmap(f),k=Math.min(1,1600/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  const b=await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.82));
  return b&&b.size<f.size?new File([b],f.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}):f;
 }catch(e){return f}
}
/* envio direto para o Google Drive (sem passar pelo Apps Script): rápido e sem limite de 20 MB */
function putDireto(url,file,onp){
 return new Promise((ok,no)=>{const x=new XMLHttpRequest();x.open('PUT',url);
  x.upload.onprogress=e=>{if(e.lengthComputable)onp(e.loaded/e.total)};
  x.onload=()=>{if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch(e){no(new Error('resposta inválida do Drive'))}}else no(new Error('Drive respondeu '+x.status))};
  x.onerror=()=>no(new Error('falha de rede'));x.send(file)});
}
async function enviarArquivo(f,type,onp){
 try{
  const {url}=await api('iniciarEnvio',{nome:f.name,tipo:type,tamanho:f.size,origem:location.origin});
  const r=await putDireto(url,f,onp);
  return (await api('concluirEnvio',{id:r.id})).arquivo;
 }catch(err){
  if(err.message==='Senha incorreta')throw err;
  if(f.size>20*1048576)throw new Error(err.message+' (arquivos acima de 20 MB precisam do Code.gs atualizado)');
  onp(.5);return (await api('enviar',{nome:f.name,tipo:type,dados:await toB64(f)})).arquivo; // plano B
 }
}
async function pool(tasks,n){const fila=[...tasks];await Promise.all(Array.from({length:Math.min(n,fila.length)},async()=>{while(fila.length)await fila.shift()()}))}
async function upload(files,kind){
 const tasks=[];
 for(const f0 of files){
  const ext=(f0.name.split('.').pop()||'').toLowerCase(),type0=EXT[ext]||f0.type;
  if(!Object.values(EXT).includes(type0)){toast(`${f0.name}: formato não aceito. Use PNG, JPG, MP4, MOV ou PDF (fotos HEIC do iPhone: exporte como JPG).`);continue}
  if(f0.size>LIM_FINAL){toast(`${f0.name} passa de 1 GB.`);continue}
  const job={kind,name:f0.name,p:0};pend.push(job);
  tasks.push(async()=>{
   try{
    const f=kind==='idea'?await comprimir(f0):f0,type=kind==='idea'&&f!==f0?'image/jpeg':type0;
    const a=await enviarArquivo(f,type,p=>{job.p=p;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(ed)renderFiles()})});
    if(type.startsWith('image/'))local[a.id]=URL.createObjectURL(f);
    if(!ed){api('apagarArquivo',{id:a.id}).catch(()=>{});return}
    ed.fresh.push(a.id);(kind==='idea'?ed.ideaImgs:ed.final).push({id:a.id,name:a.name||f.name,type:a.type||type,size:a.size||f.size});
    if(kind==='final'&&(ed.status==='ideia'||ed.status==='producao'))setStatus('pronto');
   }catch(e){toast(`Falha ao enviar ${f0.name}: ${e.message}`)}
   finally{pend=pend.filter(x=>x!==job);if(ed)renderFiles()}
  });
 }
 if(ed)renderFiles();
 await pool(tasks,3);
}
for(const z of ['#dIdea','#dFinal']){
 const el=$(z);
 el.onclick=()=>{pickKind=pasteKind=el.dataset.kind;$('#file').click()};
 el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}};
 el.onfocus=()=>{pasteKind=el.dataset.kind};
 el.ondragover=e=>{e.preventDefault();el.classList.add('over')};
 el.ondragleave=()=>el.classList.remove('over');
 el.ondrop=e=>{e.preventDefault();el.classList.remove('over');upload([...e.dataTransfer.files],el.dataset.kind)};
}
$('#file').setAttribute('accept','image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm,application/pdf');
$('#fcap').onfocus=()=>{pasteKind='final'};$('#fidea').onfocus=()=>{pasteKind='idea'};
$('#file').onchange=e=>{upload([...e.target.files],pickKind);e.target.value=''};
$('#form').addEventListener('paste',e=>{
 const fs=[...(e.clipboardData?.items||[])].filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);
 if(!fs.length)return;e.preventDefault();
 upload(fs.map((f,i)=>f.name&&f.name!=='image.png'?f:new File([f],`print-${Date.now()}-${i}.${(f.type.split('/')[1]||'png').replace('jpeg','jpg')}`,{type:f.type})),pasteKind);
});
$('#form').addEventListener('click',e=>{
 const rm=e.target.closest('[data-rm]');
 if(rm){const arr=rm.dataset.rm==='idea'?ed.ideaImgs:ed.final,[f]=arr.splice(+rm.dataset.i,1);
  if(ed.fresh.includes(f.id)){ed.fresh=ed.fresh.filter(x=>x!==f.id);api('apagarArquivo',{id:f.id}).catch(()=>{})}else ed.drop.push(f.id);
  renderFiles();return}
 const z=e.target.closest('[data-zoom]');if(z){$('#lbimg').src=thumb(z.dataset.zoom,2000);$('#lba').href=orig(z.dataset.zoom);$('#lba').textContent='Baixar original ↓';$('#lb').classList.add('on')}
});
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#fcap').value);toast('Legenda copiada')}catch(e){$('#fcap').select();toast('Selecionei a legenda — use Ctrl+C')}};

function closeEd(discard){
 if(discard&&ed)for(const id of ed.fresh)api('apagarArquivo',{id}).catch(()=>{});
 ed=null;$('#ov').classList.remove('on');document.body.style.overflow='';
}
$('#cancel').onclick=()=>closeEd(true);
$('#ov').addEventListener('mousedown',e=>{if(e.target===$('#ov'))closeEd(true)});
$('#form').onsubmit=async e=>{
 e.preventDefault();if(!ed)return;
 if(busyN()){toast('Espere terminar o envio dos arquivos.');return}
 const date=$('#fdate').value;if(!date){$('#fdate').focus();return}
 const post={id:ed.id||uid(),date,title:$('#ftitle').value.trim(),channel:$('#fchan').value,status:ed.status,idea:$('#fidea').value,caption:$('#fcap').value,owner:$('#fowner').value.trim(),ideaImgs:ed.ideaImgs,final:ed.final,createdAt:ed.createdAt,updatedAt:Date.now()};
 const btn=$('#save');btn.disabled=true;btn.textContent='Salvando…';
 try{
  await api('salvarPost',{post});
  for(const id of ed.drop)api('apagarArquivo',{id}).catch(()=>{});
  posts.set(post.id,post);
  const [y,m]=date.split('-');if(+y!==cur.getFullYear()||+m-1!==cur.getMonth())cur.setFullYear(+y,+m-1,1);
  closeEd(false);render();toast('Post salvo');
 }catch(err){toast('Não salvou: '+err.message)}
 finally{btn.disabled=false;btn.textContent='Salvar'}
};
$('#del').onclick=async()=>{
 const b=$('#del');if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Confirmar exclusão';return}
 b.disabled=true;
 try{await api('excluirPost',{id:ed.id});for(const id of ed.fresh)api('apagarArquivo',{id}).catch(()=>{});posts.delete(ed.id);ed.fresh=[];closeEd(false);render();toast('Post excluído')}
 catch(err){toast('Não excluiu: '+err.message)}
 finally{b.disabled=false}
};
$('#lbx').onclick=()=>$('#lb').classList.remove('on');
$('#lb').onclick=e=>{if(e.target===$('#lb'))$('#lb').classList.remove('on')};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if($('#lb').classList.contains('on'))$('#lb').classList.remove('on');else if(ed)closeEd(true)}
 if(ed&&e.key==='Enter'&&(e.ctrlKey||e.metaKey))$('#form').requestSubmit();
});

render();
/* entra direto se a senha estiver salva neste aparelho */
const salva=store.get('cal_senha');
if(salva){senha=salva;$('#login').classList.remove('on');note('Carregando…');
 carregar(true).then(()=>{logged=true}).catch(err=>{if(err.message!=='Senha incorreta'){$('#login').classList.add('on');$('#lerr').textContent=err.message}})}
else setTimeout(()=>$('#lsenha').focus(),50);
}
