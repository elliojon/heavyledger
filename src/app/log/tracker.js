
// Heavy Ledger training log. Plain DOM rendering inside one container, mounted by app/log/page.jsx.
// Storage goes to Supabase when configured and signed in; otherwise to this browser (local preview).
export function mountTracker(opts){
"use strict";
const sb=opts&&opts.supabase||null;
const embedded=!!(opts&&opts.embedded);
const notifyProfile=()=>{ if(opts&&opts.onProfile&&Store.profile)opts.onProfile(Object.assign({},Store.profile)); };
const afterInit=()=>{ if(Store.mode==="db"&&opts&&opts.onReady&&opts.onReady(Store.profile))return; route(); };
const cleanups=[];
const on=(target,ev,fn)=>{ target.addEventListener(ev,fn); cleanups.push(()=>target.removeEventListener(ev,fn)); };

/* ================= Library ================= */
const LIB={
  "Olympic":["Snatch","Clean & Jerk","Clean","Jerk","Power Snatch","Power Clean","Power Jerk","Split Jerk","Snatch Pull","Clean Pull","Snatch High Pull","Snatch Balance","Overhead Squat","Snatch Deadlift","Clean Deadlift"],
  "Squat":["Back Squat","Front Squat","Goblet Squat","Bulgarian Split Squat","Lunge","Step-up","Leg Press"],
  "Hinge":["Deadlift","Romanian Deadlift","Trap Bar Deadlift","Good Morning","Hip Thrust","Kettlebell Swing","Back Extension"],
  "Press":["Bench Press","Overhead Press","Push Press","Incline Bench Press","Dip","Push-up","Behind-the-neck Press"],
  "Pull":["Pull-up","Chin-up","Barbell Row","Dumbbell Row","Lat Pulldown","Face Pull","Ring Row"],
  "Accessory":["Biceps Curl","Triceps Extension","Lateral Raise","Calf Raise","Plank","Hanging Leg Raise","Farmer Carry","Ab Wheel"]
};
const MODS={
  "Position":["from floor","from blocks","hang","high hang","below knee","deficit","from rack"],
  "Grip":["wide grip","close grip","neutral grip","supinated","pronated","towel grip","mixed grip","hook grip","clean grip","snatch grip"],
  "Style":["power","muscle","paused","tempo","no feet","no hook","no contact","strict","kipping","weighted","banded"],
  "Equipment":["dumbbell","kettlebell","safety bar","cable","machine","single-arm","single-leg"]
};
const REP_TARGETS=[1,2,3,5,8,10];

/* ================= State ================= */
let state={workouts:[],programs:[],goals:[],draft:null,
  settings:{unit:"kg",convert:true,exUnits:{},custom:[],customMods:[],inc:5,incLb:10,rpe:false,autoTimer:true,visibility:"private",tcfg:{}}};
let view="log", openHistory=null, openLift=null, confirmKey=null, lastResult=null;
let missCx={at:null,custom:false};
let planOpen=null, planEdit=null, picker=null, missOpen=null, goalForm=false, progForm=false;
let timer={kind:"up",key:"up",segs:null,label:"",running:false,t0:0,acc:0,beeped:false,lastSeg:-1,lastPip:null,cfg:null};

/* ================= Utils ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const clone=o=>JSON.parse(JSON.stringify(o));
const LB=2.20462262;
const U=()=>state.settings.unit;
const toKg=v=>U()==="lb"?v/LB:v;
const fromKg=kg=>U()==="lb"?kg*LB:kg;
function fmtW(kg){ if(!kg||isNaN(kg))return ""; let v=Math.round(fromKg(kg)*2)/2; return v%1===0?v.toFixed(0):v.toFixed(1); }
const kgFrom=(v,u)=>u==="lb"?v/LB:v;
const inU=(kg,u)=>u==="lb"?kg*LB:kg;
function fmtIn(kg,u){ if(!kg||isNaN(kg))return ""; let v=Math.round(inU(kg,u)*2)/2; return v%1===0?v.toFixed(0):v.toFixed(1); }
const fmtNum=v=>String(Math.round(v*100)/100);
const conv=()=>state.settings.convert!==false;
const entryUnit=name=>(state.settings.exUnits||{})[name]||U();
const unitFor=name=>conv()?U():entryUnit(name);
const incFor=u=>u==="lb"?(+state.settings.incLb||10):(+state.settings.inc||5);
function rawIn(s,u){ return (s.wr!=null&&s.u===u)?fmtNum(s.wr):fmtIn(s.w,u); }
function setW(s,n,u){ s.wr=n; s.u=u; s.w=kgFrom(n,u); }
function wDisp(s,lu){ if(!(s.w>0))return "BW"; if(conv())return fmtW(s.w); const u=s.u||U(); return rawIn(s,u)+(u!==lu?" "+u:""); }
function fmtL(kg,name){ if(!kg)return "—"; const u=unitFor(name); return fmtIn(kg,u)+(u!==U()?" "+u:""); }
const e1rm=(w,r)=>(!w||!r||r>10)?0:(r===1?w:w*(1+r/30));
const sum=a=>(a||[]).reduce((x,y)=>x+(+y||0),0);
function fmtDate(s,o){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,o||{weekday:"short",month:"short",day:"numeric"})}
function mmss(ms){const s=Math.max(0,Math.floor(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")}
const sorted=()=>state.workouts.slice().sort((a,b)=>(b.date+String(b.finishedAt||0).padStart(15,"0")).localeCompare(a.date+String(a.finishedAt||0).padStart(15,"0")));

const partName=p=>p.base+(p.mods&&p.mods.length?" ("+p.mods.join(", ")+")":"");
const exName=e=>e.parts.map(partName).join(" + ");
const isCx=e=>e.parts.length>1;
const normPart=p=>({base:p.base,mods:(p.mods||[]).filter(m=>m!=="from floor")});
const liftKey=e=>isCx(e)?exName(e):partName(normPart(e.parts[0]));
const attempted=e=>e.sets.filter(s=>s.made);
const fullMake=s=>!!s.made&&sum(s.plan)>0&&s.plan.every((p,i)=>(s.made[i]||0)>=p);
const isMiss=s=>!!s.made&&!fullMake(s);
function partLabel(parts,i){
  const p=parts[i]; const short=m=>m.replace(/^from /,"");
  const dup=parts.filter(x=>x.base===p.base).length>1;
  if(dup)return p.mods&&p.mods.length?p.mods.map(short).join("/"):"full";
  const b=p.base.length<=9?p.base:p.base.split(/[\s-]+/).filter(Boolean).map(w=>w[0].toUpperCase()).join("");
  return b+(p.mods&&p.mods.length?" "+p.mods.map(short).join("/"):"");
}
function repsStr(s,parts){
  const one=i=>{ const p=s.plan[i]; const m=s.made?(s.made[i]||0):null; if(m===null)return String(p); return m>=p?String(m):m+"/"+p; };
  const idx=s.plan.map((p,i)=>i).filter(i=>s.plan[i]>0||(s.made&&s.made[i]>0));
  if(parts&&parts.length>1&&idx.length<s.plan.length) return idx.map(one).join("+")+" ("+idx.map(i=>partLabel(parts,i)).join("+")+")";
  return s.plan.map((_,i)=>one(i)).join("+");
}
function setStr(s,planMode,parts){ const lu=parts?unitFor(exName({parts})):U(); const w=planMode&&s.pct?s.pct+"%":wDisp(s,lu); return w+"×"+repsStr(s,parts)+(s.rpe?" @"+s.rpe:""); }
function compactSets(sets,planMode,parts){
  const out=[];sets.forEach(s=>{const k=setStr(s,planMode,parts);const l=out[out.length-1];if(l&&l.k===k)l.n++;else out.push({k,n:1})});
  return out.map(o=>o.n>1?o.k+" (×"+o.n+")":o.k).join(", ");
}
function volumeKg(w){let v=0;w.exercises.forEach(e=>attempted(e).forEach(s=>v+=(s.w||0)*sum(s.made)));return v}
function newSet(prev,cx,nParts){ return prev?{w:prev.w||0,u:prev.u,wr:prev.wr,pct:prev.pct||null,plan:prev.plan.slice(),made:null,rpe:""}:{w:0,pct:null,plan:cx?Array(nParts).fill(1):[0],made:null,rpe:""}; }

/* ================= Migration (v1 → v2) ================= */
function migrate(w){
  if(!w||w.v===2)return [w,false];
  w.exercises=(w.exercises||[]).map(e=>({id:uid(),parts:[{base:e.name,mods:[]}],group:null,
    sets:(e.sets||[]).map(s=>({w:s.w||0,pct:null,plan:[s.r||0],made:(s.done||(w.finishedAt&&s.r))?[s.r||0]:null,rpe:s.rpe||""}))}));
  w.v=2; if(!w.visibility)w.visibility="private";
  return [w,true];
}

/* ================= Storage ================= */
const Store={mode:"local",col:null,queue:{},timers:{},
  uid:null,email:null,profile:null,
  reset(){ state.workouts=[];state.programs=[];state.goals=[];state.draft=null; this.mode="local"; this.col=null; this.profile=null; },
  async init(){
    if(sb){
      try{
        const { data:{ session } }=await sb.auth.getSession();
        if(!session){ this.mode="auth"; return; }
        this.uid=session.user.id; this.email=session.user.email;
        const prof=await sb.from("profiles").select("*").eq("id",this.uid).maybeSingle();
        if(prof.error)throw prof.error;
        this.profile=prof.data;
        if(!this.profile){ this.mode="onboard"; return; }
        this.col=supaCol(sb,this.uid);
        this.ingest(await this.col.get()); this.mode="db"; return this.afterLoad();
      }catch(e){ console.error("Supabase load failed",e); this.mode="error"; this.err=String(e.message||e); return; }
    }
    this.mode="local";
    try{const raw=localStorage.getItem("hl-log");if(raw){const d=JSON.parse(raw);
      state.workouts=d.workouts||[];state.programs=d.programs||[];state.goals=d.goals||[];
      state.settings=Object.assign(state.settings,d.settings||{});state.draft=d.draft||null}}catch(e){}
    this.afterLoad();
  },
  ingest(list){
    list.forEach(d=>{ if(!d)return;
      if(d.kind==="workout")state.workouts.push(d.w);
      else if(d.kind==="settings")state.settings=Object.assign(state.settings,d.s);
      else if(d.kind==="draft")state.draft=d.w||null;
      else if(d.kind==="program")state.programs.push(d.p);
      else if(d.kind==="goals")state.goals=d.g||[]; });
  },
  afterLoad(){
    state.workouts=state.workouts.map(w=>{const [m,ch]=migrate(w);if(ch)this.saveWorkout(m);return m});
    if(state.draft){const [m,ch]=migrate(state.draft);state.draft=m;if(ch)this.saveDraft()}
    state.programs.sort((a,b)=>(a.created||0)-(b.created||0));
  },
  localSave(){try{localStorage.setItem("hl-log",JSON.stringify(state))}catch(e){}},
  put(key,obj,delay){
    if(this.mode!=="db"){this.localSave();flash();return}
    clearTimeout(this.timers[key]);
    this.timers[key]=setTimeout(()=>this.flush(key,obj),delay||0);
  },
  async flush(key,obj){
    if(this.queue[key]){this.queue[key].next={o:obj};return}
    this.queue[key]={next:null};
    try{ if(obj===null) await this.col.doc(key).delete(); else await this.col.doc(key).set(obj); flash(); }
    catch(e){console.warn(e);$("#savestate").textContent="Not saved — retrying";setTimeout(()=>this.put(key,obj,3000),0)}
    const n=this.queue[key].next;delete this.queue[key];
    if(n)this.flush(key,n.o);
  },
  saveWorkout(w){this.put("w_"+w.id,{kind:"workout",w})},
  deleteWorkout(id){this.mode==="db"?this.put("w_"+id,null):this.localSave()},
  saveSettings(){this.put("settings",{kind:"settings",s:state.settings})},
  saveDraft(delay){this.mode==="db"?this.put("draft",state.draft?{kind:"draft",w:state.draft}:null,delay):this.localSave()},
  saveProgram(p){this.put("p_"+p.id,{kind:"program",p})},
  deleteProgram(id){this.mode==="db"?this.put("p_"+id,null):this.localSave()},
  saveGoals(){this.put("goals",{kind:"goals",g:state.goals})}
};
function supaCol(sb,uid){
  const ok=r=>{ if(r.error)throw r.error; return r; };
  const now=()=>new Date().toISOString();
  return {
    async get(){
      const [w,p,s]=await Promise.all([sb.from("workouts").select("data,visibility").eq("user_id",uid),sb.from("programs").select("data").eq("user_id",uid),sb.from("user_state").select("*").eq("user_id",uid).maybeSingle()]);
      ok(w);ok(p);ok(s); const out=[];
      w.data.forEach(r=>out.push({kind:"workout",w:Object.assign({},r.data,{visibility:r.visibility})}));
      p.data.forEach(r=>out.push({kind:"program",p:r.data}));
      if(s.data){ if(s.data.settings)out.push({kind:"settings",s:s.data.settings}); if(s.data.goals)out.push({kind:"goals",g:s.data.goals}); if(s.data.draft)out.push({kind:"draft",w:s.data.draft}); }
      return out;
    },
    doc(key){ return {
      async set(obj){
        if(key.startsWith("w_")){ const w=obj.w; ok(await sb.from("workouts").upsert({user_id:uid,id:w.id,date:w.date,visibility:w.visibility||"private",data:w,updated_at:now()})); }
        else if(key.startsWith("p_")) ok(await sb.from("programs").upsert({user_id:uid,id:obj.p.id,data:obj.p,updated_at:now()}));
        else if(key==="settings") ok(await sb.from("user_state").upsert({user_id:uid,settings:obj.s,updated_at:now()}));
        else if(key==="goals") ok(await sb.from("user_state").upsert({user_id:uid,goals:obj.g,updated_at:now()}));
        else if(key==="draft") ok(await sb.from("user_state").upsert({user_id:uid,draft:obj.w,updated_at:now()}));
      },
      async delete(){
        if(key.startsWith("w_")) ok(await sb.from("workouts").delete().eq("user_id",uid).eq("id",key.slice(2)));
        else if(key.startsWith("p_")) ok(await sb.from("programs").delete().eq("user_id",uid).eq("id",key.slice(2)));
        else if(key==="draft") ok(await sb.from("user_state").upsert({user_id:uid,draft:null,updated_at:now()}));
      } };
    }
  };
}
/* ---------- Profile (public) ---------- */
function featuredSnapshot(){
  const names=(Store.profile&&Store.profile.featured||[]).map(f=>f.name); const L=liftSummary();
  return names.map(n=>{ const o=L[n]; const u=unitFor(n); if(!o)return {name:n,unit:u};
    const reps={}; if(!o.cx)REP_TARGETS.forEach(t=>{const v=o.repMax(t); if(v)reps[t]=+fmtIn(v,u)});
    return {name:n,unit:u,cx:o.cx,heavy:+fmtIn(o.heavy,u)||0,e1:o.cx?0:(+fmtIn(o.e1,u)||0),reps,sessions:o.sessions,last:o.last}; });
}
let featT=null;
function syncFeatured(){ if(!sb||Store.mode!=="db"||!Store.profile)return; clearTimeout(featT); featT=setTimeout(async()=>{ const featured=featuredSnapshot(); Store.profile.featured=featured; const r=await sb.from("profiles").update({featured,unit:U(),updated_at:new Date().toISOString()}).eq("id",Store.uid); if(r.error)console.warn(r.error); else { flash(); notifyProfile(); } },800); }
function isFeatured(n){ return !!(Store.profile&&(Store.profile.featured||[]).some(f=>f.name===n)); }
function rows(res){
  const arr=Array.isArray(res)?res:(res&&(res.docs||res.items||res.rows))||[];
  return arr.map(d=>{ if(d&&typeof d.data==="function")return d.data(); if(d&&d.data&&typeof d.data==="object"&&d.data.kind)return d.data; return d; });
}
let flashT;function flash(){const el=$("#savestate");if(!el)return;el.textContent="Saved";clearTimeout(flashT);flashT=setTimeout(()=>el.textContent="",1500)}

/* ================= Analysis ================= */
function exStats(e){
  const o={heavy:0,e1:0,reps:{},planned:0,made:0,misses:[]};
  attempted(e).forEach(s=>{
    o.planned+=sum(s.plan); o.made+=Math.min(sum(s.made),sum(s.plan)); if(isMiss(s))o.misses.push(s);
    if(isCx(e)){ if(fullMake(s)&&s.w>o.heavy)o.heavy=s.w; }
    else { const r=s.made[0]||0; if(r>0&&s.w>0){ if(s.w>o.heavy)o.heavy=s.w; const x=e1rm(s.w,r); if(x>o.e1)o.e1=x;
      REP_TARGETS.forEach(t=>{ if(r>=t&&s.w>(o.reps[t]||0))o.reps[t]=s.w }); } }
  });
  return o;
}
function lastFor(name,excludeId){
  for(const w of sorted()){ if(w.id===excludeId)continue; const e=w.exercises.find(x=>exName(x)===name); if(e&&attempted(e).length)return {date:w.date,sets:attempted(e)} }
  return null;
}
function creditsOf(w){ // per-lift credit from one workout, including reps made inside complexes
  const c={}; const get=(n,parts)=>c[n]||(c[n]={heavy:0,e1:0,reps:{},via:[],items:[],parts});
  const add=(o,wt,r)=>{ if(!(wt>0)||!(r>0))return; o.heavy=Math.max(o.heavy,wt); o.e1=Math.max(o.e1,e1rm(wt,r)); o.reps[r]=Math.max(o.reps[r]||0,wt); };
  w.exercises.forEach(e=>{ if(!attempted(e).length)return; const n=liftKey(e);
    if(!isCx(e)){ const o=get(n,[normPart(e.parts[0])]); attempted(e).forEach(s=>add(o,s.w,s.made[0]||0)); return; }
    const o=get(n,e.parts); attempted(e).forEach(s=>{ if(fullMake(s))o.heavy=Math.max(o.heavy,s.w) });
    e.parts.forEach((p,pi)=>{ const np=normPart(p), pn=partName(np);
      attempted(e).forEach(s=>{ const r=s.made[pi]||0; if(r>0&&s.w>0){ const q=get(pn,[np]); add(q,s.w,r); q.items.push({w:s.w,u:s.u,wr:s.wr,r}); if(!q.via.includes(exName(e)))q.via.push(exName(e)); } }); });
  });
  return c;
}
function prsIn(w){
  const cur=creditsOf(w), prior={};
  state.workouts.forEach(x=>{ if(x.id===w.id)return; const c=creditsOf(x); for(const n in c){ const p=prior[n]||(prior[n]={heavy:0,e1:0}); p.heavy=Math.max(p.heavy,c[n].heavy); p.e1=Math.max(p.e1,c[n].e1); } });
  const out=[];
  for(const n in cur){ const v=cur[n], p=prior[n]; if(!p||!v.heavy)continue;
    const inCx=v.via.length&&!w.exercises.some(e=>!isCx(e)&&liftKey(e)===n);
    if(v.heavy>p.heavy+1e-6)out.push({name:n,kind:"heaviest"+(inCx?", in a complex":""),val:v.heavy});
    else if(v.e1>p.e1+1e-6)out.push({name:n,kind:"est. 1RM"+(inCx?", in a complex":""),val:v.e1}); }
  return out;
}
function liftSummary(){
  const m={};
  const mk=(n,parts)=>m[n]||(m[n]={name:n,base:parts.length>1?"Complexes":parts[0].base,cx:parts.length>1,parts,sessions:0,last:"",heavy:0,e1:0,reps:{},planned:0,made:0,misses:[],viaCx:false});
  state.workouts.forEach(w=>{
    const c=creditsOf(w);
    for(const n in c){ const v=c[n], o=mk(n,v.parts); o.sessions++; if(w.date>o.last)o.last=w.date;
      o.heavy=Math.max(o.heavy,v.heavy); o.e1=Math.max(o.e1,v.e1); for(const r in v.reps)o.reps[r]=Math.max(o.reps[r]||0,v.reps[r]); if(v.via.length)o.viaCx=true; }
    w.exercises.forEach(e=>{ const o=m[liftKey(e)]; if(!o)return; const st=exStats(e); o.planned+=st.planned; o.made+=st.made; st.misses.forEach(s=>o.misses.push({date:w.date,s,parts:e.parts})); });
  });
  Object.values(m).forEach(o=>{ o.repMax=t=>Math.max(0,...Object.keys(o.reps).filter(r=>+r>=t).map(r=>o.reps[r])); });
  return m;
}
function bestAtReps(name,reps){ const o=liftSummary()[name]; if(!o)return 0; return o.cx?o.heavy:o.repMax(reps||1); }
function refBest(e){ // reference 1RM for % planning
  const L=liftSummary(); const pick=n=>L[n]?(L[n].e1||L[n].heavy):0;
  return pick(partName(normPart(e.parts[0])))||(isCx(e)?pick(exName(e)):0)||pick(e.parts[0].base)||0;
}
function sessionsFor(name){
  const pts=[];
  state.workouts.forEach(w=>{ const c=creditsOf(w)[name]; if(!c)return; const e=w.exercises.find(x=>liftKey(x)===name);
    pts.push({date:w.date,heavy:c.heavy,e1:c.e1,sets:e?attempted(e):[],via:c.via,items:c.items}) });
  return pts.sort((a,b)=>a.date.localeCompare(b.date));
}
function variationsUsed(base){
  const s=new Map(); state.workouts.forEach(w=>w.exercises.forEach(e=>e.parts.forEach(p=>{ if(p.base===base&&p.mods&&p.mods.length){const k=p.mods.join("|");s.set(k,(s.get(k)||0)+1)} })));
  return [...s.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0].split("|"));
}

/* ================= Render ================= */
function getDoc(){ return (view==="plan"&&planEdit)?planEdit.doc:state.draft; }
function persist(){ if(getDoc()===state.draft)Store.saveDraft(700); }

function render(){
  document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===view));
  const gate=Store.mode==="auth"||Store.mode==="onboard"||Store.mode==="error";
  $("#nav").style.display=gate?"none":""; $("#acct").innerHTML=!embedded&&Store.mode==="db"&&Store.profile?`<a href="/u/${esc(Store.profile.username)}">@${esc(Store.profile.username)}</a>`:"";
  if(gate){ $("#app").innerHTML=Store.mode==="auth"?vLogin():Store.mode==="onboard"?vOnboard():`<div class="card" style="margin-top:24px"><b>Couldn't load your log.</b><p class="hint">${esc(Store.err||"")}</p><button class="btn" data-a="reload">Try again</button></div>`; $("#timerSlot").innerHTML=""; return; }
  let h="";
  if(Store.mode==="local")h+=`<div class="banner">Preview mode — saving on this device only.</div>`;
  h+=({log:vLog,plan:vPlan,history:vHistory,lifts:vLifts,settings:vSettings}[view])();
  $("#app").innerHTML=h; renderTimer();
}

/* ---------- Sign-in & onboarding ---------- */
let authMsg="", onboardMsg="";
function vLogin(){
  return `<div style="max-width:420px;margin:48px auto 0"><h1 style="font-size:28px;margin:0 0 6px">Your training log</h1>
  <p class="hint" style="font-size:15px">Free, and yours. Log sets, misses and complexes; keep your records; share only what you choose.</p>
  <div class="card stack" style="margin-top:18px"><label class="field">Email<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
  <button class="btn primary big" data-a="sendlink">Email me a sign-in link</button><div id="authMsg" class="small muted">${esc(authMsg)}</div></div>
  <p class="hint" style="margin-top:14px">No password. We'll send a one-time link — open it on this device or any other.</p></div>`;
}
function vOnboard(){
  return `<div style="max-width:420px;margin:40px auto 0"><h1 style="font-size:26px;margin:0 0 6px">Pick your username</h1>
  <p class="hint" style="font-size:15px">Your profile will live at heavyledger.com/u/<b>username</b>. Nothing is public until you choose to share it.</p>
  <div class="card stack" style="margin-top:16px"><label class="field">Username<input id="obUser" autocomplete="off" autocapitalize="none" placeholder="e.g. jon_lifts" maxlength="24"></label>
  <label class="field">Display name<input id="obName" placeholder="How your name appears"></label>
  <button class="btn primary big" data-a="onboard">Create my log</button><div id="obMsg" class="small" style="color:var(--danger)">${esc(onboardMsg)}</div></div>
  <p class="hint">Signed in as ${esc(Store.email||"")} · <a href="#" data-a="signout">use a different email</a></p></div>`;
}
async function sendLink(){
  const email=($("#authEmail").value||"").trim(); const m=$("#authMsg");
  if(!/^\S+@\S+\.\S+$/.test(email)){ m.textContent="Enter a valid email."; return; }
  m.textContent="Sending…";
  const { error }=await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin+"/log" } });
  authMsg=error?("Couldn't send: "+error.message):("Check "+email+" for your sign-in link.");
  m.textContent=authMsg;
}
async function createProfile(){
  const u=($("#obUser").value||"").trim().toLowerCase(), name=($("#obName").value||"").trim(), m=$("#obMsg");
  if(!/^[a-z0-9_]{3,24}$/.test(u)){ m.textContent="3–24 characters: lowercase letters, numbers, underscores."; return; }
  m.textContent="";
  const r=await sb.from("profiles").insert({id:Store.uid,username:u,display_name:name||u});
  if(r.error){ m.textContent=r.error.code==="23505"?"That username is taken.":r.error.message; return; }
  Store.mode="local"; await Store.init(); afterInit();
}

/* ---------- Timer ---------- */
const PRESETS=[60,90,120,180,300];
const TCFG_DEF={emom:{i:60,n:10},tabata:{w:20,r:10,n:8},int:{w:40,r:20,n:10},amrap:{m:12}};
const TMODES=[["emom","EMOM"],["tabata","Tabata"],["int","Intervals"],["amrap","AMRAP"]];
let actx=null, wakeLock=null;
function tcfg(k){ const T=state.settings.tcfg=state.settings.tcfg||{}; return T[k]=Object.assign({},TCFG_DEF[k],T[k]||{}); }
function tElapsed(){return timer.acc+(timer.running?Date.now()-timer.t0:0)}
function loadSeq(key,label,segs,prep){ tReset(); timer.kind="seq"; timer.key=key; timer.label=label; timer.segs=(prep?[{name:"Get ready",dur:prep,k:"prep"}]:[]).concat(segs); }
function loadPreset(key){
  if(key==="up"){ tReset(); timer.kind="up"; timer.key="up"; timer.segs=null; return }
  if(key[0]==="r"){ loadSeq(key,"Rest",[{name:"Rest",dur:+key.slice(1)*1000,k:"rest"}],0); return }
  const c=tcfg(key), segs=[];
  if(key==="emom"){ for(let i=0;i<c.n;i++)segs.push({name:"Round",dur:Math.max(1,c.i)*1000,k:"work",r:i+1,n:c.n}); loadSeq(key,"EMOM",segs,5000) }
  else if(key==="tabata"||key==="int"){ for(let i=0;i<c.n;i++){ segs.push({name:"Work",dur:Math.max(1,c.w)*1000,k:"work",r:i+1,n:c.n}); if(i<c.n-1&&c.r>0)segs.push({name:"Rest",dur:c.r*1000,k:"rest",r:i+1,n:c.n}) } loadSeq(key,key==="tabata"?"Tabata":"Intervals",segs,5000) }
  else if(key==="amrap"){ loadSeq(key,"AMRAP",[{name:"Go",dur:Math.max(1,c.m)*60000,k:"work"}],5000) }
}
const seqTotal=()=>timer.segs?timer.segs.reduce((a,x)=>a+x.dur,0):0;
function curSeg(el){ let acc=0; for(let i=0;i<timer.segs.length;i++){ const x=timer.segs[i]; if(el<acc+x.dur)return {i,s:x,rem:acc+x.dur-el}; acc+=x.dur } return null }
function cfgSummary(k){ const c=tcfg(k); return k==="emom"?"every "+mmss(c.i*1000)+" × "+c.n:k==="amrap"?c.m+" min":c.w+"s on / "+c.r+"s off × "+c.n; }
function renderTimer(){
  const slot=$("#timerSlot");
  if(view!=="log"){slot.innerHTML="";return}
  const k=timer.key; let cfg="";
  if(timer.cfg){ const c=tcfg(timer.cfg);
    const f=(key,label,suf)=>`<label class="field tf">${label}<span class="row" style="gap:4px"><input data-tc="${timer.cfg}.${key}" inputmode="numeric" value="${c[key]}">${suf?`<span class="small muted">${suf}</span>`:""}</span></label>`;
    const fields=timer.cfg==="emom"?f("i","Every","sec")+f("n","Rounds"):timer.cfg==="amrap"?f("m","Time cap","min"):f("w","Work","sec")+f("r","Rest","sec")+f("n","Rounds");
    cfg=`<div class="tcfg">${fields}<button class="btn sm primary" data-a="tcfgclose">Done</button></div>`; }
  slot.innerHTML=`<div class="timer" id="tbox"><div class="t-main"><div class="tdig" id="tdig"></div><div class="t-sub" id="tsub"></div></div>
    <div class="t-btns"><button class="tbtn" data-a="treset">Reset</button><button class="tbtn go" id="tgo" data-a="tgo">Start</button></div></div>
    <div class="t-modes"><button class="chip ${k==="up"?"on":""}" data-a="tpreset" data-k="up">Stopwatch</button>${PRESETS.map(p=>`<button class="chip ${k==="r"+p?"on":""}" data-a="tpreset" data-k="r${p}">${mmss(p*1000)}</button>`).join("")}<span class="tsep"></span>${TMODES.map(([m,l])=>`<button class="chip ${k===m||timer.cfg===m?"on":""}" data-a="tcfg" data-k="${m}">${l}${timer.cfg===m?" ▾":""}</button>`).join("")}</div>${cfg}`;
  tick();
}
function tick(){
  const d=$("#tdig"); if(!d)return; const el=tElapsed(), box=$("#tbox");
  const sess=state.draft?"Session "+mmss(Date.now()-state.draft.startedAt):"";
  let txt, sub="", phase="", over=false, idle=!timer.running&&el===0;
  if(timer.kind==="up"){ txt=mmss(el); sub=sess?sess+(state.settings.autoTimer?" · auto-restart":""):"Stopwatch"; }
  else{
    const rest=timer.key[0]==="r"; const c=curSeg(el);
    if(idle&&!rest){ txt=mmss(seqTotal()-(timer.segs[0].k==="prep"?timer.segs[0].dur:0)); sub=timer.label+" · "+cfgSummary(timer.key); }
    else if(c){ txt=mmss(c.rem+999); phase=c.s.k;
      sub=rest?("Rest"+(sess?" · "+sess:"")):timer.label+" · "+c.s.name+(c.s.r?" "+c.s.r+"/"+c.s.n:"");
      if(timer.running){
        if(c.i!==timer.lastSeg){ if(timer.lastSeg!==-1)tone(c.s.k); timer.lastSeg=c.i; }
        const sec=Math.ceil(c.rem/1000), pk=c.i+":"+sec; if(sec<=3&&sec>=1&&timer.lastPip!==pk&&c.s.dur>4000){ timer.lastPip=pk; tone("pip"); }
      }
    } else if(rest){ over=true; txt="+"+mmss(el-seqTotal()); sub="Rest's up"+(sess?" · "+sess:""); if(timer.running&&!timer.beeped){timer.beeped=true;tone("done")} }
    else { txt="Done"; sub=timer.label+" complete"; if(timer.running){ tStop(); tone("done"); } }
  }
  d.textContent=txt; d.classList.toggle("over",over); d.classList.toggle("idle",idle);
  if(box)box.className="timer "+(timer.running?phase:"");
  const g=$("#tgo"); if(g){g.textContent=timer.running?"Stop":(idle?"Start":(txt==="Done"?"Again":"Resume"));g.className="tbtn "+(timer.running?"stop":"go")}
  const sb=$("#tsub"); if(sb)sb.textContent=sub;
}
const tickTimer=setInterval(tick,250);
function audioInit(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume&&actx.resume()}catch(e){}}
function tone(kind){
  try{ if(actx){ const seq={pip:[[880,.12]],work:[[1046,.4]],rest:[[523,.5]],prep:[[880,.12]],done:[[1046,.2],[1046,.2],[1318,.6]]}[kind]||[[880,.2]];
    let t=actx.currentTime; seq.forEach(([f,dd])=>{ const o=actx.createOscillator(),g=actx.createGain(); o.frequency.value=f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.4,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dd); o.start(t); o.stop(t+dd+.02); t+=dd+.08; }); } }catch(e){}
  try{navigator.vibrate&&navigator.vibrate(kind==="pip"?60:[200,80,200])}catch(e){}
}
async function wake(on){ try{ if(on&&!wakeLock&&navigator.wakeLock){ wakeLock=await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release",()=>{wakeLock=null}) } else if(!on&&wakeLock){ await wakeLock.release(); wakeLock=null } }catch(e){} }
function tStart(){timer.t0=Date.now();timer.running=true;timer.beeped=false;wake(true)}
function tStop(){if(timer.running){timer.acc+=Date.now()-timer.t0;timer.running=false;wake(false)}}
function tReset(){timer.acc=0;timer.running=false;timer.beeped=false;timer.lastSeg=-1;timer.lastPip=null;wake(false)}

/* ---------- Log ---------- */
function upNext(){ return state.programs.filter(p=>p.sessions.length).map(p=>({p,s:p.sessions[(p.next||0)%p.sessions.length],i:(p.next||0)%p.sessions.length})); }
function vLog(){
  const d=state.draft;
  if(!d){
    const ws=sorted(); const now=new Date(); const wk=new Date(now);wk.setDate(now.getDate()-6);
    const wkStr=wk.getFullYear()+"-"+String(wk.getMonth()+1).padStart(2,"0")+"-"+String(wk.getDate()).padStart(2,"0"); const mo=today().slice(0,7);
    let h="";
    if(lastResult&&(lastResult.prs.length||lastResult.misses)){ h+=`<div class="prbox">${lastResult.prs.length?`<b>New records</b><div class="small" style="margin-top:6px">${lastResult.prs.map(p=>esc(p.name)+" — "+fmtIn(p.val,unitFor(p.name))+" "+unitFor(p.name)+" ("+p.kind+")").join("<br>")}</div>`:""}${lastResult.misses?`<div class="small muted" style="margin-top:${lastResult.prs.length?8:0}px">${lastResult.misses} missed set${lastResult.misses>1?"s":""} logged — they count toward your make rate, not your records.</div>`:""}</div>` }
    h+=`<div class="stats"><div class="stat"><div class="n">${ws.filter(w=>w.date>=wkStr).length}</div><div class="l">Last 7 days</div></div><div class="stat"><div class="n">${ws.filter(w=>w.date.startsWith(mo)).length}</div><div class="l">This month</div></div><div class="stat"><div class="n">${ws.length}</div><div class="l">All sessions</div></div></div>`;
    if(opts&&opts.profileHref) h+=`<div class="row" style="gap:16px;margin-top:12px;font-size:14px"><a href="${opts.profileHref}">My page →</a><a href="${opts.statsHref}">Stats →</a></div>`;
    const nx=upNext();
    if(nx.length){ h+=`<h2>Up next</h2>`; nx.forEach(x=>{ h+=`<button class="list-item" data-a="startplan" data-p="${x.p.id}" data-s="${x.s.id}"><div class="li-top"><span class="li-title">${esc(x.s.title||"Day "+(x.i+1))}</span><span class="small muted">${esc(x.p.name)} · ${x.i+1}/${x.p.sessions.length}</span></div><div class="li-sub">${x.s.exercises.map(e=>esc(exName(e))).join(" · ")||"No exercises yet"}</div></button>` }) }
    h+=`<div style="margin-top:18px"><button class="btn ${nx.length?"":"primary"} big" data-a="start">Start an empty session</button></div>`;
    if(ws.length){ h+=`<h2>Repeat a recent session</h2>`; ws.slice(0,3).forEach(w=>{ h+=`<button class="list-item" data-a="repeat" data-id="${w.id}"><div class="li-top"><span class="li-title">${esc(w.title||"Session")}</span><span class="small muted">${fmtDate(w.date)}</span></div><div class="li-sub">${w.exercises.map(e=>esc(exName(e))).join(" · ")}</div></button>` }) }
    else if(!nx.length) h+=`<p class="hint" style="margin-top:22px">Log what you actually lifted — including the reps you missed. Each exercise shows what you did last time, records are flagged automatically, and the Plan tab holds your goals and programs.</p>`;
    return h;
  }
  let h=`<div class="sess-head"><input class="title" data-f="title" placeholder="Untitled session" value="${esc(d.title)}"><input type="date" data-f="date" value="${esc(d.date)}"></div>`;
  h+=vSession(d,"log");
  h+=`<div style="margin-top:14px"><button class="btn" style="width:100%" data-a="pick">+ Add exercise</button></div>
  <h2>Notes</h2><textarea data-f="notes" placeholder="How did it feel? Anything to change next time?">${esc(d.notes)}</textarea>`;
  const unmarked=d.exercises.reduce((n,e)=>n+e.sets.filter(s=>!s.made&&sum(s.plan)>0).length,0);
  if(confirmKey==="unmarked") h+=`<div class="card" style="margin-top:16px"><div class="small">${unmarked} set${unmarked>1?"s aren't":" isn't"} marked made or missed.</div><div class="actions" style="margin-top:10px"><button class="btn" data-a="finish" data-u="drop">Leave ${unmarked>1?"them":"it"} out</button><button class="btn primary" data-a="finish" data-u="made">Count as made</button></div><div style="text-align:center"><button class="btn ghost sm" data-a="cancel">Keep logging</button></div></div>`;
  else h+=`<div class="actions">${confirmKey==="discard"?`<button class="btn danger" data-a="discard">${d.editing?"Discard changes":"Discard session"}</button><button class="btn" data-a="cancel">Keep logging</button>`:`<button class="btn ghost" data-a="askdiscard">${d.editing?"Cancel edit":"Discard"}</button><button class="btn primary" data-a="finish">${d.editing?"Save changes":"Finish &amp; save"}</button>`}</div>`;
  return h;
}

function vSession(doc,mode){
  if(!doc.exercises.length)return `<div class="empty">${mode==="plan"?"Add the exercises for this session.":"Add your first exercise."}</div>`;
  const blocks=[]; doc.exercises.forEach((e,i)=>{ const L=blocks[blocks.length-1]; if(e.group&&L&&L.group===e.group)L.items.push(i); else blocks.push({group:e.group,items:[i]}) });
  let h="";
  blocks.forEach((b,bi)=>{ const L=String.fromCharCode(65+(bi%26)); const multi=b.items.length>1;
    if(multi)h+=`<div class="grp-wrap"><div class="grp-label">${b.items.length>2?"Circuit":"Superset"} ${L} · alternate sets</div>`;
    b.items.forEach((ei,k)=>h+=exCard(doc,ei,mode,multi?L+(k+1):L));
    if(multi)h+=`</div>`; });
  return h;
}

function exCard(doc,ei,mode,label){
  const e=doc.exercises[ei], name=exName(e), cx=isCx(e), plan=mode==="plan", rpe=state.settings.rpe&&!plan;
  const last=lastFor(name,doc.id), eu=entryUnit(name);
  const linked=ei>0&&e.group&&doc.exercises[ei-1].group===e.group;
  let h=`<div class="ex" data-ei="${ei}" style="--rpecol:${rpe?"52px":"0px"}"><div class="ex-h"><div class="ex-t"><span class="lbl">${label}</span><div>
    <div class="name">${cx?e.parts.map(p=>esc(partName(p))).join('<span class="plus">+</span>'):esc(name)}</div>
    <div class="last">${last?"Last "+fmtDate(last.date,{month:"short",day:"numeric"})+": "+esc(compactSets(last.sets,false,e.parts)):"No history yet"}</div></div></div>
    <div class="ex-btns">${ei>0?`<button class="btn ghost sm mv" data-a="mvup" aria-label="Move up" title="Move up">↑</button>`:""}${ei<doc.exercises.length-1?`<button class="btn ghost sm mv" data-a="mvdown" aria-label="Move down" title="Move down">↓</button>`:""}
    ${confirmKey==="ex"+ei?`<span class="confirm"><button class="btn sm danger" data-a="rmex">Remove</button><button class="btn sm ghost" data-a="cancel">Keep</button></span>`:`<button class="btn ghost sm" data-a="askrmex" aria-label="Remove exercise">✕</button>`}</div></div>`;
  h+=`<div class="shead"><span>#</span><span><button class="unitbtn" data-a="exunit" title="The numbers you type for this exercise are in ${eu}. Tap to switch.">${plan?eu+" / %":eu} ⇄</button></span><span>${cx?"":"Reps"}</span><span>${rpe?"RPE":""}</span><span>${plan?"":"Made"}</span><span></span></div>`;
  e.sets.forEach((s,si)=>{
    const ls=last&&last.sets[Math.min(si,last.sets.length-1)];
    const cls=s.made?(fullMake(s)?"made":"miss"):"";
    const wVal=plan&&s.pct?s.pct+"%":(s.w?rawIn(s,eu):"");
    const wPh=plan?"—":(s.pct&&!s.w?s.pct+"%":(ls&&ls.w?rawIn(ls,eu):"—"));
    h+=`<div class="srow ${cls}" data-si="${si}"><span class="idx">${si+1}</span>
      <span class="wcell"><input ${plan?'inputmode="text"':'inputmode="decimal"'} data-f="w" value="${esc(wVal)}" placeholder="${esc(wPh)}">${eu!==U()?`<span class="conv">${s.w>0&&!(plan&&s.pct)?"≈ "+fmtW(s.w)+" "+U():""}</span>`:""}</span>`;
    if(cx){ const mi=isMiss(s)?s.plan.findIndex((p,i)=>(s.made[i]||0)<p):-1; h+=`<span class="missnote">${mi>=0?"missed at "+esc(partLabel(e.parts,mi)):""}</span>`; }
    else h+=`<span style="display:flex;flex-direction:column;align-items:center"><input inputmode="numeric" data-f="p" data-pi="0" value="${s.plan[0]||""}" placeholder="${ls?ls.plan[0]:"—"}">${isMiss(s)?`<span class="missnote">made ${s.made[0]}</span>`:""}</span>`;
    h+=`<span>${rpe?`<input inputmode="decimal" data-f="rpe" value="${esc(s.rpe)}">`:""}</span>`;
    h+=plan?`<span></span>`:`<span class="res"><button class="rb ok" data-a="made" aria-label="Made all reps">✓</button><button class="rb no" data-a="miss" aria-label="Missed reps">✗</button></span>`;
    h+=`<button class="del-set" data-a="rmset" aria-label="Delete set">×</button></div>`;
    if(cx){ h+=`<div class="cxline" data-si="${si}">`+e.parts.map((p,pi)=>`${pi?'<span class="cxplus">+</span>':""}<span class="cxp ${s.plan[pi]?"":"zero"}"><label title="${esc(partName(p))}">${esc(partLabel(e.parts,pi))}</label><input inputmode="numeric" data-f="p" data-pi="${pi}" value="${s.plan[pi]}">${s.made&&(s.made[pi]||0)<s.plan[pi]?`<span class="mk">made ${s.made[pi]||0}</span>`:""}</span>`).join("")+`</div>` }
    if(missOpen===ei+":"+si) h+=missRow(e,s);
  });
  h+=`<div class="ex-f"><button class="btn sm" data-a="addset">+ Set</button><button class="btn sm" data-a="addup">+ Set, ${plan&&e.sets.length&&e.sets[e.sets.length-1].pct?"+5%":"+"+incFor(eu)+" "+eu}</button><span style="flex:1"></span><button class="btn sm ghost" data-a="editex">${cx?"Edit complex":"Variation / complex"}</button>${ei>0?`<button class="btn sm ghost" data-a="link" title="${linked?"Unlink from the exercise above":"Superset with the exercise above"}">${linked?"Unlink":"Superset ↑"}</button>`:""}</div>${cx&&!plan?`<div class="hint" style="padding:0 12px 12px">Missed partway? Tap ✗ and pick the movement you missed on — everything before it counts. Set a movement to 0 to drop it from a set.</div>`:""}</div>`;
  return h;
}
function shortPart(p){ const b=p.base.length<=9?p.base:p.base.split(/[\s-]+/).filter(Boolean).map(w=>w[0].toUpperCase()).join(""); const m=p.mods&&p.mods.length?p.mods.map(x=>x.split(" ")[0]).join("/"):""; return b+(m?" "+m:""); }
function missRow(e,s){
  if(!isCx(e)){ const p=s.plan[0]||0; let c=""; for(let i=0;i<p;i++)c+=`<button class="chip" data-a="missn" data-n="${i}">${i}</button>`;
    return `<div class="missrow"><div class="q">Planned ${p} — how many did you make?</div>${c}<button class="btn ghost sm" data-a="misscancel">Cancel</button></div>`; }
  if(!missCx.custom){
    if(missCx.at==null) return `<div class="missrow"><div class="q">Which movement did you miss on? Everything before it counts as made.</div>${e.parts.map((p,pi)=>s.plan[pi]>0?`<button class="chip" data-a="missat" data-i="${pi}">${esc(partLabel(e.parts,pi))}</button>`:"").join("")}<button class="btn ghost sm" data-a="misscustom">Enter counts</button><button class="btn ghost sm" data-a="misscancel">Cancel</button></div>`;
    const k=missCx.at, p=s.plan[k]; let c=""; for(let i=0;i<p;i++)c+=`<button class="chip" data-a="missatn" data-n="${i}">${i}</button>`;
    return `<div class="missrow"><div class="q">Planned ${p} ${esc(partLabel(e.parts,k))} — how many did you make?</div>${c}<button class="btn ghost sm" data-a="missback">Back</button></div>`;
  }
  return `<div class="missrow"><div class="q">How many of each did you make?</div>${e.parts.map((p,pi)=>`<span class="cxp"><label>${esc(partLabel(e.parts,pi))}</label><input inputmode="numeric" class="mkin" data-pi="${pi}" value="${s.made?(s.made[pi]||0):s.plan[pi]}"></span>`).join("")}<button class="btn sm primary" data-a="misssave">Save</button><button class="btn ghost sm" data-a="misscancel">Cancel</button></div>`;
}

/* ---------- Plan ---------- */
function vPlan(){
  if(planEdit)return planEditor();
  const prog=planOpen&&state.programs.find(p=>p.id===planOpen);
  if(prog)return programView(prog);
  planOpen=null;
  const L=liftSummary();
  let h=`<h2>Goals</h2>`;
  if(!state.goals.length&&!goalForm)h+=`<p class="hint">Big-picture targets, like a 100 kg snatch by the spring meet. Progress updates from what you log.</p>`;
  state.goals.forEach(g=>{
    const cur=bestAtReps(g.lift,g.reps||1); const pct=g.w?Math.min(100,Math.round(cur/g.w*100)):0; const done=cur>=g.w&&g.w>0;
    h+=`<div class="card" style="margin-top:8px"><div class="li-top"><span class="li-title">${esc(g.lift)} — ${fmtW(g.w)} ${U()}${(g.reps||1)>1?" × "+g.reps:""}${done?'<span class="badge">Done</span>':""}</span>
      ${confirmKey==="goal"+g.id?`<span class="confirm"><button class="btn sm danger" data-a="delgoal" data-id="${g.id}">Delete</button><button class="btn sm ghost" data-a="cancel">Keep</button></span>`:`<button class="btn ghost sm" data-a="askdelgoal" data-id="${g.id}">✕</button>`}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="li-sub">${cur?"Best so far "+fmtW(cur)+" "+U()+" ("+pct+"%)":"Nothing logged for this yet"}${g.by?" · by "+fmtDate(g.by,{month:"short",day:"numeric",year:"numeric"}):""}</div></div>`;
  });
  if(goalForm){
    const names=[...new Set([...Object.keys(L),...Object.values(LIB).flat(),...state.settings.custom])];
    h+=`<div class="card" style="margin-top:8px"><div class="form-grid"><label class="field wide">Lift<input id="g_lift" list="liftnames" placeholder="e.g. Snatch"></label><label class="field">Weight (${U()})<input id="g_w" inputmode="decimal"></label><label class="field">Reps<input id="g_r" inputmode="numeric" value="1"></label><label class="field wide">By (optional)<input id="g_by" type="date"></label></div>
      <datalist id="liftnames">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <div class="row" style="margin-top:10px"><button class="btn primary sm" data-a="savegoal">Add goal</button><button class="btn ghost sm" data-a="goalform">Cancel</button><span id="gmsg" class="small muted"></span></div></div>`;
  } else h+=`<div style="margin-top:8px"><button class="btn sm" data-a="goalform">+ Goal</button></div>`;

  h+=`<h2>Programs</h2>`;
  if(!state.programs.length&&!progForm)h+=`<p class="hint">A program is a set of planned sessions run in order — a training block, a meet prep, or just your Monday/Wednesday/Friday. Weights can be written as a % of your best.</p>`;
  state.programs.forEach(p=>{ h+=`<button class="list-item" data-a="openprog" data-id="${p.id}"><div class="li-top"><span class="li-title">${esc(p.name)}</span><span class="small muted">${p.sessions.length} session${p.sessions.length===1?"":"s"}</span></div>${p.sessions.length?`<div class="li-sub">Up next: ${esc(p.sessions[(p.next||0)%p.sessions.length].title||"Day "+((p.next||0)%p.sessions.length+1))}</div>`:""}</button>` });
  if(progForm)h+=`<div class="card row" style="margin-top:8px"><input class="inline-in" id="p_name" placeholder="Program name, e.g. 8-week snatch block"><button class="btn primary sm" data-a="saveprog">Create</button><button class="btn ghost sm" data-a="progform">Cancel</button></div>`;
  else h+=`<div style="margin-top:8px"><button class="btn sm" data-a="progform">+ Program</button></div>`;
  return h;
}
function programView(p){
  let h=`<div style="margin-top:14px"><button class="btn ghost sm" data-a="closeprog">← Plan</button></div>
  <div class="sess-head" style="margin-top:4px"><input class="title" data-f="pname" value="${esc(p.name)}"></div>
  <textarea data-f="pnotes" placeholder="Big picture — the purpose of this block, how to progress, what to watch for">${esc(p.notes||"")}</textarea>
  <h2>Sessions</h2>`;
  if(!p.sessions.length)h+=`<p class="hint">Add the sessions in the order you'll run them. After you finish one, the next comes up on the Log tab.</p>`;
  p.sessions.forEach((s,i)=>{ const nx=i===(p.next||0)%p.sessions.length;
    h+=`<div class="list-item"><div class="li-top"><span class="li-title">${i+1}. ${esc(s.title||"Day "+(i+1))}${nx?'<span class="badge next">Up next</span>':""}</span></div>
      <div class="detail" style="margin-top:8px;padding-top:6px">${s.exercises.map(e=>`<div class="exl"><b>${esc(exName(e))}</b><span>${esc(compactSets(e.sets,true,e.parts))}</span></div>`).join("")||'<span class="small muted">Empty</span>'}</div>
      <div class="row wrapf" style="margin-top:10px;gap:6px"><button class="btn sm primary" data-a="startplan" data-p="${p.id}" data-s="${s.id}" ${state.draft?"disabled":""}>Start</button><button class="btn sm" data-a="editsess" data-i="${i}">Edit</button><button class="btn sm" data-a="dupsess" data-i="${i}">Duplicate</button>${i>0?`<button class="btn sm ghost" data-a="upsess" data-i="${i}">↑</button>`:""}${nx?"":`<button class="btn sm ghost" data-a="setnext" data-i="${i}">Make next</button>`}
      ${confirmKey==="sess"+i?`<button class="btn sm danger" data-a="delsess" data-i="${i}">Delete</button><button class="btn sm ghost" data-a="cancel">Keep</button>`:`<button class="btn sm ghost danger" data-a="askdelsess" data-i="${i}">Delete</button>`}</div></div>`; });
  h+=`<div style="margin-top:10px"><button class="btn" style="width:100%" data-a="newsess">+ Add session</button></div>`;
  h+=`<div style="margin-top:30px;text-align:center">${confirmKey==="delprog"?`<button class="btn sm danger" data-a="delprog">Delete this program</button> <button class="btn sm ghost" data-a="cancel">Keep</button>`:`<button class="btn ghost sm danger" data-a="askdelprog">Delete program</button>`}</div>`;
  return h;
}
function planEditor(){
  const d=planEdit.doc; const p=state.programs.find(x=>x.id===planEdit.progId);
  let h=`<div style="margin-top:14px" class="small muted">${esc(p?p.name:"")} · ${planEdit.index==null?"new session":"session "+(planEdit.index+1)}</div>
  <div class="sess-head" style="margin-top:2px"><input class="title" data-f="title" placeholder="Session name, e.g. Day 1 — Heavy snatch" value="${esc(d.title)}"></div>
  <p class="hint" style="margin:4px 0 0">Write weights in ${U()}, or as a % (e.g. 80%) to be worked out from your best when you start the session.</p>`;
  h+=vSession(d,"plan");
  h+=`<div style="margin-top:14px"><button class="btn" style="width:100%" data-a="pick">+ Add exercise</button></div>
  <h2>Notes</h2><textarea data-f="notes" placeholder="Cues, intent, what to do if it's a bad day">${esc(d.notes||"")}</textarea>
  <div class="actions"><button class="btn ghost" data-a="cancelplan">Cancel</button><button class="btn primary" data-a="saveplan">Save session</button></div>`;
  return h;
}

/* ---------- History ---------- */
function vHistory(){
  const ws=sorted(); if(!ws.length)return `<div class="empty">No sessions yet. Your history will build here.</div>`;
  let h="",mo="";
  ws.forEach(w=>{
    const m=w.date.slice(0,7); if(m!==mo){mo=m;h+=`<div class="month">${fmtDate(m+"-01",{month:"long",year:"numeric"})}</div>`}
    const prs=w.prs||[]; const misses=w.exercises.reduce((n,e)=>n+attempted(e).filter(isMiss).length,0); const open=openHistory===w.id; const vol=volumeKg(w);
    h+=`<div class="list-item" data-a="toggle" data-id="${w.id}" style="cursor:pointer"><div class="li-top"><span class="li-title">${esc(w.title||"Session")}${prs.length?`<span class="badge">${prs.length} PR</span>`:""}${misses?`<span class="badge miss">${misses} missed</span>`:""}</span><span class="small muted">${fmtDate(w.date)}</span></div>
    <div class="li-sub">${w.exercises.length} exercise${w.exercises.length===1?"":"s"} · ${w.exercises.reduce((n,e)=>n+attempted(e).length,0)} sets${vol?" · "+Math.round(fromKg(vol)).toLocaleString()+" "+U()+" volume":""}${w.finishedAt&&w.startedAt?" · "+Math.round((w.finishedAt-w.startedAt)/60000)+" min":""}</div>`;
    if(open){
      h+=`<div class="detail">`;
      w.exercises.forEach(e=>{ h+=`<div class="exl"><b>${e.group?"⛓ ":""}${esc(exName(e))}${prs.some(p=>p.name===liftKey(e))?'<span class="badge">PR</span>':""}</b><span>${esc(compactSets(attempted(e),false,e.parts))}</span></div>` });
      const cxp=prs.filter(p=>!w.exercises.some(e=>liftKey(e)===p.name)); if(cxp.length)h+=`<div class="cxpr">Records inside complexes: ${cxp.map(p=>esc(p.name)+" "+fmtIn(p.val,unitFor(p.name))+" "+unitFor(p.name)).join(" · ")}</div>`;
      if(w.notes)h+=`<p class="small muted" style="white-space:pre-wrap">${esc(w.notes)}</p>`;
      if(Store.mode==="db")h+=`<div class="row wrapf" style="margin-top:10px;gap:8px"><span class="small muted">Who can see this:</span><div class="seg">${["private","connections","public"].map(v=>`<button class="${(w.visibility||"private")===v?"on":""}" data-a="wvis" data-id="${w.id}" data-v="${v}">${v==="private"?"Only me":v==="connections"?"Connections":"Public"}</button>`).join("")}</div></div>`;
      h+=`<div class="row wrapf" style="margin-top:10px;gap:8px">${state.draft?"":`<button class="btn sm" data-a="repeat" data-id="${w.id}">Repeat</button><button class="btn sm" data-a="edit" data-id="${w.id}">Edit</button>`}${state.programs.length?`<button class="btn sm" data-a="toplan" data-id="${w.id}">Save as plan</button>`:""}
      ${confirmKey==="del"+w.id?`<button class="btn sm danger" data-a="delw" data-id="${w.id}">Delete for good</button><button class="btn sm ghost" data-a="cancel">Cancel</button>`:`<button class="btn sm ghost danger" data-a="askdel" data-id="${w.id}">Delete</button>`}</div>
      ${confirmKey==="toplan"+w.id?`<div class="row wrapf" style="margin-top:8px;gap:6px"><span class="small muted">Add to:</span>${state.programs.map(p=>`<button class="chip" data-a="toplango" data-id="${w.id}" data-p="${p.id}">${esc(p.name)}</button>`).join("")}</div>`:""}</div>`;
    }
    h+=`</div>`;
  });
  return h;
}

/* ---------- Lifts ---------- */
function vLifts(){
  const L=liftSummary(); const list=Object.values(L); if(!list.length)return `<div class="empty">Log a session and your lifts will show up here with bests, trends and make rates.</div>`;
  if(openLift){ if(L[openLift])return liftDetail(L[openLift],L); openLift=null; }
  const groups={}; list.forEach(o=>(groups[o.base]=groups[o.base]||[]).push(o));
  const lastOf=g=>groups[g].map(o=>o.last).sort().pop();
  const order=Object.keys(groups).sort((a,b)=>lastOf(b).localeCompare(lastOf(a)));
  let h="";
  order.forEach(b=>{ h+=`<div class="month">${esc(b)}</div>`;
    groups[b].sort((x,y)=>y.sessions-x.sessions).forEach(o=>{ const rate=o.planned?Math.round(o.made/o.planned*100):null;
      h+=`<button class="list-item" data-a="lift" data-name="${esc(o.name)}"><div class="lift-row"><div><div class="li-title">${esc(o.name)}</div><div class="li-sub">${o.sessions} session${o.sessions>1?"s":""}${rate!=null&&rate<100?" · "+rate+"% made":""} · last ${fmtDate(o.last,{month:"short",day:"numeric"})}</div></div>
      <div><div class="v">${fmtL(o.heavy,o.name)}</div><div class="k">Heaviest</div></div><div><div class="v">${o.cx?"":fmtL(o.e1,o.name)}</div><div class="k">${o.cx?"":"Est. 1RM"}</div></div></div></button>` }) });
  return h;
}
function liftDetail(o,L){
  const pts=sessionsFor(o.name); const rate=o.planned?Math.round(o.made/o.planned*100):null;
  let h=`<div style="margin-top:14px"><button class="btn ghost sm" data-a="liftback">← All lifts</button></div>
  <div class="card" style="margin-top:8px"><div class="row spread"><div style="font-size:20px;font-weight:600">${esc(o.name)}</div><div class="small muted">${o.sessions} sessions</div></div>
  ${Store.mode==="db"?`<div style="margin-top:10px"><button class="btn sm ${isFeatured(o.name)?"primary":""}" data-a="feature" data-name="${esc(o.name)}">${isFeatured(o.name)?"★ Featured on your profile":"☆ Feature on your profile"}</button></div>`:""}`;
  if(!o.cx)h+=`<div class="rep-grid">${REP_TARGETS.map(t=>`<div><div class="r">${t}RM</div><div class="w">${fmtL(o.repMax(t),o.name)}</div></div>`).join("")}</div>
    <p class="hint" style="margin:10px 0 0">Best weight made for at least that many reps. Missed reps never count. Est. 1RM uses the Epley formula on sets of 10 or fewer.${o.viaCx?" Includes reps made inside complexes.":""}</p>`;
  else h+=`<p class="hint" style="margin:10px 0 0">Heaviest weight where every planned rep of the complex was made: <b class="mono">${o.heavy?fmtIn(o.heavy,unitFor(o.name))+" "+unitFor(o.name):"—"}</b></p>`;
  h+=`<div class="toggle" style="margin-top:12px;border-top:1px solid var(--line2);padding-top:12px"><span>Make rate</span><span class="mono">${rate!=null?rate+"% ("+o.made+"/"+o.planned+" reps)":"—"}</span></div></div>`;
  const chartPts=pts.filter(p=>p.heavy>0);
  if(chartPts.length>=2)h+=`<h2>Trend (${unitFor(o.name)})</h2><div class="card">${chart(chartPts,!o.cx,unitFor(o.name))}</div>`;
  if(o.misses.length){ h+=`<h2>Misses</h2>`; o.misses.slice().reverse().slice(0,10).forEach(m=>{h+=`<div class="list-item"><div class="li-top"><span class="mono small">${esc(setStr(m.s,false,m.parts||o.parts))}</span><span class="small muted">${fmtDate(m.date)}</span></div></div>`}) }
  const sib=Object.values(L).filter(x=>x.base===o.base&&x.name!==o.name&&!o.cx);
  if(sib.length){ h+=`<h2>Other variations</h2><div class="chips" style="padding:0">${sib.map(x=>`<button class="chip" data-a="lift" data-name="${esc(x.name)}">${esc(x.name)}</button>`).join("")}</div>` }
  h+=`<h2>Every session</h2>`;
  pts.slice().reverse().forEach(p=>{h+=`<div class="list-item"><div class="li-top"><span class="mono small">${esc(p.sets.length?compactSets(p.sets,false,o.parts):"")}${p.via.length?`<span class="muted">${p.sets.length?" · ":""}in complex: ${esc(p.items.map(x=>wDisp(x,unitFor(o.name))+"×"+x.r).join(", "))}</span>`:""}</span><span class="small muted" style="white-space:nowrap">${fmtDate(p.date)}</span></div></div>`});
  return h;
}
function chart(pts,showE1,u){ const cv=v=>inU(v,u);
  const W=640,H=220,pl=44,pr=12,pt=12,pb=28;
  const ts=d=>{const [y,m,dd]=d.split("-").map(Number);return new Date(y,m-1,dd).getTime()};
  const t0=ts(pts[0].date),t1=ts(pts[pts.length-1].date);
  const vals=pts.flatMap(p=>showE1?[cv(p.e1),cv(p.heavy)]:[cv(p.heavy)]); let lo=Math.min(...vals),hi=Math.max(...vals); const pad=(hi-lo)*.12||5; lo=Math.max(0,lo-pad);hi+=pad;
  const x=d=>pl+(t1===t0?.5:(ts(d)-t0)/(t1-t0))*(W-pl-pr), y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  let g=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress over time">`;
  for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3;g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line2)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono">${Math.round(v)}</text>`}
  g+=`<text x="${pl}" y="${H-8}" font-size="11" fill="var(--muted)">${fmtDate(pts[0].date,{month:"short",day:"numeric"})}</text><text x="${W-pr}" y="${H-8}" text-anchor="end" font-size="11" fill="var(--muted)">${fmtDate(pts[pts.length-1].date,{month:"short",day:"numeric"})}</text>`;
  const key=showE1?"e1":"heavy";
  g+=`<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p=>x(p.date)+","+y(cv(p[key]))).join(" ")}"/>`;
  pts.forEach(p=>{ if(showE1)g+=`<circle cx="${x(p.date)}" cy="${y(cv(p.heavy))}" r="3.5" fill="var(--pr)"><title>${fmtDate(p.date)}: heaviest ${fmtIn(p.heavy,u)}</title></circle>`; g+=`<circle cx="${x(p.date)}" cy="${y(cv(p[key]))}" r="3" fill="var(--accent)"><title>${fmtDate(p.date)}: ${fmtIn(p[key],u)}</title></circle>` });
  g+=`</svg><div class="row small muted" style="gap:16px;margin-top:4px">${showE1?`<span><span style="color:var(--accent)">●</span> Est. 1RM</span><span><span style="color:var(--pr)">●</span> Heaviest set</span>`:`<span><span style="color:var(--accent)">●</span> Heaviest complete complex</span>`}</div>`;
  return g;
}

/* ---------- Settings ---------- */
function vSettings(){
  const S=state.settings; const sw=(k,label,sub)=>`<div class="toggle"><div><div>${label}</div>${sub?`<div class="hint">${sub}</div>`:""}</div><button class="sw ${S[k]?"on":""}" data-a="sw" data-k="${k}" aria-label="${label}"></button></div>`;
  const xu=Object.entries(S.exUnits||{});
  const P=Store.profile;
  const prof=Store.mode==="db"&&P?`<h2>Profile</h2><div class="card row spread wrapf"><div><b>@${esc(P.username)}</b><div class="hint">Photo, banner, bio, credentials and connections live on your page.</div></div><a class="btn sm" href="/u/${esc(P.username)}">Edit on my page</a></div>
    <p class="hint">Featured lifts: open any lift on the Lifts tab and tap “Feature on your profile”. Only the numbers you feature are shown, never your private sessions.</p>`:"";
  return prof+`<h2>Units</h2><div class="card">
    <div class="toggle"><div><div>Main unit</div><div class="hint">Records, goals and totals are shown in this.</div></div><div class="seg"><button class="${U()==="kg"?"on":""}" data-a="unit" data-u="kg">kg</button><button class="${U()==="lb"?"on":""}" data-a="unit" data-u="lb">lb</button></div></div>
    ${sw("convert","Convert everything to "+U(),"Type dumbbells in lb, see "+U()+" everywhere else. Turn off to show each set in the unit you typed it in.")}
    <div class="toggle"><div>“+ Set, +” jump</div><div class="row small muted" style="gap:6px"><input class="inline-in" style="width:56px;flex:none;text-align:center" data-f="inc" inputmode="decimal" value="${S.inc}">kg<input class="inline-in" style="width:56px;flex:none;text-align:center" data-f="incLb" inputmode="decimal" value="${S.incLb||10}">lb</div></div>
    <div class="toggle" style="display:block"><div>Exercises typed in ${U()==="kg"?"lb":"kg"}</div><div class="hint">Tap the unit above any exercise's weight column to switch it. It's remembered next time.</div>
      ${xu.length?`<div class="chips" style="padding:8px 0 0">${xu.map(([n,u])=>`<button class="chip" data-a="rmexunit" data-n="${esc(n)}" title="Switch back to ${U()}">${esc(n)} · ${u} ✕</button>`).join("")}</div>`:""}</div>
  </div>
  <h2>Logging</h2><div class="card">${sw("autoTimer","Restart the timer when a set is marked","Use it as a rest timer without an extra tap.")}${sw("rpe","Log RPE","Adds an optional effort column to each set.")}</div>
  <h2>Default visibility</h2><div class="seg">${["private","connections","public"].map(v=>`<button class="${S.visibility===v?"on":""}" data-a="vis" data-v="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join("")}</div>
  <p class="hint">Applied to new sessions. “Public” sessions appear on your profile; you can change any session from History. “Connections” sessions are visible to people you've connected with.</p>
  <h2>Your data</h2><div class="card stack"><p class="hint" style="margin:0">Your log belongs to you. Copy it out as JSON anytime, or paste a backup to restore it.</p>
  <div class="row wrapf"><button class="btn" data-a="export">Copy my data</button><button class="btn" data-a="importopen">Restore from backup</button><span id="exmsg" class="small muted"></span></div>
  <div id="importbox"></div></div>
  ${S.custom.length||S.customMods.length?`<h2>Your additions</h2><div class="card small stack">${S.custom.length?`<div><span class="muted">Exercises:</span> ${S.custom.map(esc).join(" · ")}</div>`:""}${S.customMods.length?`<div><span class="muted">Variations:</span> ${S.customMods.map(esc).join(" · ")}</div>`:""}</div>`:""}
  <h2>About</h2><p class="hint">Heavy Ledger is free and open. A record is flagged when a fully made set beats your heaviest weight or estimated 1RM for that exact variation. Saved to ${Store.mode==="db"?"your Heavy Ledger account":"this browser only"}.</p>${Store.mode==="db"?`<p class="hint">Signed in as ${esc(Store.email||"")} · <a href="#" data-a="signout">Sign out</a></p>`:""}`;
}

/* ================= Exercise picker ================= */
function openPicker(replace){ if(replace!=null){ const e=getDoc().exercises[replace]; picker={step:"build",parts:clone(e.parts),cur:0,replace,cxMode:isCx(e)} } else picker={step:"base",parts:[],cur:0,replace:null,cxMode:false}; drawPicker(); }
function closePicker(){ picker=null; $("#modal").innerHTML=""; }
function drawPicker(){
  const m=$("#modal");
  if(picker.step==="base"){
    m.innerHTML=`<div class="overlay" data-a="closepick"><div class="sheet"><div class="sheet-h"><input id="q" placeholder="${picker.parts.length||picker.cxMode?"Movement "+(picker.parts.length+1)+" of the complex":"Search or type any exercise"}" autocomplete="off"><button class="btn ghost sm" data-a="closepick">Close</button></div><div class="sheet-b" id="plist"></div></div></div>`;
    const q=$("#q"); const draw=()=>{
      const s=q.value.trim().toLowerCase(); let h="";
      const L=liftSummary(); const recent=picker.parts.length?[]:Object.values(L).sort((a,b)=>b.last.localeCompare(a.last)).slice(0,8);
      const fr=recent.filter(o=>!s||o.name.toLowerCase().includes(s));
      if(fr.length)h+=`<div class="grp">Recent</div>`+fr.map(o=>`<button class="opt" data-a="pickrecent" data-name="${esc(o.name)}">${esc(o.name)}</button>`).join("");
      const groups=Object.assign({},state.settings.custom.length?{"Yours":state.settings.custom}:{},LIB);
      for(const [g,arr] of Object.entries(groups)){ const f=arr.filter(x=>!s||x.toLowerCase().includes(s)); if(f.length)h+=`<div class="grp">${esc(g)}</div>`+f.map(x=>`<button class="opt" data-a="pickbase" data-name="${esc(x)}">${esc(x)}</button>`).join("") }
      const raw=q.value.trim(); const all=new Set([...Object.values(LIB).flat(),...state.settings.custom].map(x=>x.toLowerCase()));
      if(raw&&!all.has(raw.toLowerCase())){
        if(raw.includes("+")&&!picker.parts.length){ const bits=raw.split("+").map(x=>x.trim()).filter(Boolean); if(bits.length>1)h=`<button class="opt add" data-a="pickcxtext" data-name="${esc(raw)}">⛓ Log as a complex: ${bits.map(esc).join(" + ")}</button>`+h; }
        h=`<button class="opt add" data-a="pickbase" data-name="${esc(raw)}" data-new="1">+ Use “${esc(raw)}”</button>`+h; }
      if(!s&&!picker.parts.length&&!picker.cxMode)h=`<button class="opt add" data-a="startcx">⛓ Build a complex <small>several movements in one set, e.g. floor + hang + OHS</small></button>`+h;
      if(picker.cxMode&&!picker.parts.length&&!s)h=`<div class="hint" style="padding:10px 8px 0">Pick the first movement. You'll add the rest one at a time — e.g. Snatch (from floor), then Snatch (hang), then Overhead Squat.</div>`+h;
      if(!h)h=`<div class="empty">Type a name to add your own.</div>`;
      $("#plist").innerHTML=h;
    };
    q.addEventListener("input",draw); q.addEventListener("keydown",e=>{if(e.key==="Enter"){const b=$("#plist .opt");if(b)b.click()}}); draw(); setTimeout(()=>q.focus(),30);
    return;
  }
  const P=picker.parts, cp=P[picker.cur];
  const used=variationsUsed(cp.base);
  const chip=(mod)=>`<button class="chip ${cp.mods.includes(mod)?"on":""}" data-a="mod" data-m="${esc(mod)}">${esc(mod)}</button>`;
  let body=`<div class="preview">${P.map((p,i)=>`<span class="pt ${i===picker.cur?"cur":""}" data-a="selpart" data-i="${i}">${esc(partName(p))}</span>`).join('<span class="plus">+</span>')}</div>`;
  if(P.length>1)body+=`<div class="row" style="padding:0 8px;gap:6px"><span class="small muted">Editing: ${esc(cp.base)}</span><button class="btn ghost sm danger" data-a="rmpart">Remove from complex</button></div>`;
  if(used.length)body+=`<div class="grp">Used before</div><div class="chips">${used.slice(0,6).map(ms=>`<button class="chip" data-a="usemods" data-m="${esc(JSON.stringify(ms))}">${esc(ms.join(", "))}</button>`).join("")}</div>`;
  if(state.settings.customMods.length)body+=`<div class="grp">Yours</div><div class="chips">${state.settings.customMods.map(chip).join("")}</div>`;
  for(const [g,arr] of Object.entries(MODS))body+=`<div class="grp">${g}</div><div class="chips">${arr.map(chip).join("")}</div>`;
  body+=`<div class="grp">Something else</div><div class="row" style="padding:0 8px"><input id="cmod" class="inline-in" placeholder="e.g. 2-sec pause at knee, 3-position"><button class="btn sm" data-a="cmodadd">Add</button></div>`;
  m.innerHTML=`<div class="overlay" data-a="closepick"><div class="sheet"><div class="sheet-h"><b style="flex:1">${picker.cxMode||P.length>1?"Complex — movement "+(picker.cur+1)+" of "+P.length:"Variation"}</b><button class="btn ghost sm" data-a="closepick">Close</button></div><div class="sheet-b">${body}</div>
   <div class="sheet-f">${picker.cxMode||P.length>1?`<button class="btn ${P.length<2?"primary":""}" data-a="cxadd">+ Next movement</button><button class="btn ${P.length<2?"":"primary"}" data-a="pickdone" ${P.length<2&&picker.cxMode?"disabled":""}>${picker.replace!=null?"Save":"Add complex"} (${P.length})</button>`:`<button class="btn" data-a="cxadd" title="Chain movements done back-to-back in one set">⛓ Make it a complex</button><button class="btn primary" data-a="pickdone">${picker.replace!=null?"Save":"Add"}</button>`}</div></div></div>`;
  const ci=$("#cmod"); ci.addEventListener("keydown",e=>{if(e.key==="Enter")$('[data-a="cmodadd"]').click()});
}
function addExerciseToDoc(parts){
  const doc=getDoc(); const e={id:uid(),parts:clone(parts),group:null,sets:[]};
  const n=exName(e); const last=lastFor(n,doc.id);
  if(last&&getDoc()===state.draft) e.sets=last.sets.map(s=>({w:0,pct:null,plan:s.plan.slice(),made:null,rpe:""}));
  else e.sets=[newSet(null,isCx(e),e.parts.length)];
  doc.exercises.push(e); closePicker(); persist(); render();
  setTimeout(()=>{const els=document.querySelectorAll(".ex");const el=els[els.length-1];if(el)el.scrollIntoView({behavior:"smooth",block:"center"})},30);
}

/* ================= Actions ================= */
function newDraft(exercises,title,from){
  state.draft={id:uid(),v:2,date:today(),title:title||"",notes:"",startedAt:Date.now(),visibility:state.settings.visibility,from:from||null,exercises:exercises||[]};
  lastResult=null; confirmKey=null; missOpen=null; tReset(); Store.saveDraft(); view="log"; if(location.hash!=="#log")location.hash="log"; render(); window.scrollTo(0,0);
}
function fromWorkout(w){ return clone(w.exercises).map(e=>{ e.id=uid(); const at=attempted(e); e.sets=(at.length?at:e.sets).map(s=>({w:s.w||0,u:s.u,wr:s.wr,pct:null,plan:s.plan.slice(),made:null,rpe:""})); return e }); }
function fromTemplate(sess){ return clone(sess.exercises).map(e=>{ e.id=uid(); const ref=refBest(e);
  const eu=entryUnit(exName(e)); e.sets=e.sets.map(s=>{ let w=s.w||0, wr=s.wr, u=s.u; if(s.pct){ if(!ref){w=0;wr=null} else { wr=eu==="kg"?Math.round(ref*s.pct/100):Math.round(inU(ref,"lb")*s.pct/100/5)*5; w=kgFrom(wr,eu); u=eu } } return {w,u,wr,pct:s.pct||null,plan:s.plan.slice(),made:null,rpe:""} }); return e }); }
function moveEx(doc,ei,dir){ // moves within a superset, or moves whole blocks past each other
  const ex=doc.exercises, blocks=[]; ex.forEach((e,i)=>{ const L=blocks[blocks.length-1]; if(e.group&&L&&L.group===e.group)L.items.push(i); else blocks.push({group:e.group,items:[i]}) });
  const bi=blocks.findIndex(b=>b.items.includes(ei)), b=blocks[bi], pos=b.items.indexOf(ei);
  if(b.items.length>1&&pos+dir>=0&&pos+dir<b.items.length){ const j=b.items[pos+dir]; [ex[ei],ex[j]]=[ex[j],ex[ei]]; return; }
  const nb=bi+dir; if(nb<0||nb>=blocks.length)return;
  const order=blocks.map(x=>x.items); [order[bi],order[nb]]=[order[nb],order[bi]]; doc.exercises=order.flat().map(i=>ex[i]);
}
function markDone(){ if(state.settings.autoTimer&&(timer.kind==="up"||timer.key[0]==="r")){ audioInit(); tReset(); tStart(); tick(); } }

on(document,"click",ev=>{
  const t=ev.target.closest("[data-a]"); if(!t)return; const a=t.dataset.a;
  const exEl=t.closest("[data-ei]"); const ei=exEl?+exEl.dataset.ei:null; const rowEl=t.closest("[data-si]"); const si=rowEl?+rowEl.dataset.si:null;
  const doc=getDoc(); const ex=(doc&&ei!=null)?doc.exercises[ei]:null; const set=(ex&&si!=null)?ex.sets[si]:null;
  switch(a){
    /* account */
    case "sendlink": sendLink(); break;
    case "onboard": createProfile(); break;
    case "signout": ev.preventDefault(); if(sb)sb.auth.signOut(); break;
    case "reload": Store.reset(); Store.init().then(afterInit); break;
    case "saveprofile": { const P=Store.profile; const upd={display_name:$("#pfName").value.trim(),location:$("#pfLoc").value.trim(),bio:$("#pfBio").value.trim(),updated_at:new Date().toISOString()};
      $("#pfMsg").textContent="Saving…"; sb.from("profiles").update(upd).eq("id",Store.uid).then(r=>{ if(r.error){$("#pfMsg").textContent=r.error.message;return} Object.assign(P,upd); notifyProfile(); $("#pfMsg").textContent="Saved."; }); break; }
    case "feature": { const n=t.dataset.name; const P=Store.profile; P.featured=P.featured||[]; if(isFeatured(n))P.featured=P.featured.filter(f=>f.name!==n); else P.featured.push({name:n}); syncFeatured(); render(); break; }
    case "wvis": { const w=state.workouts.find(x=>x.id===t.dataset.id); if(!w)break; w.visibility=t.dataset.v; Store.saveWorkout(w); render(); break; }
    /* timer */
    case "tgo": audioInit(); if(timer.running)tStop(); else { if(timer.kind==="seq"&&timer.key[0]!=="r"&&!curSeg(tElapsed()))tReset(); tStart(); } tick(); break;
    case "treset": tReset(); tick(); break;
    case "tpreset": { audioInit(); const k=t.dataset.k; timer.cfg=null; loadPreset(k); if(k[0]==="r")tStart(); renderTimer(); break; }
    case "tcfg": { audioInit(); const k=t.dataset.k; if(timer.cfg===k)timer.cfg=null; else { timer.cfg=k; if(!timer.running)loadPreset(k); } renderTimer(); break; }
    case "tcfgclose": { const k=timer.cfg; timer.cfg=null; if(k&&timer.key!==k)loadPreset(k); renderTimer(); break; }
    /* session start */
    case "start": newDraft([],""); break;
    case "repeat": { const w=state.workouts.find(x=>x.id===t.dataset.id); if(w&&!state.draft)newDraft(fromWorkout(w),w.title); break; }
    case "startplan": { if(state.draft)break; const p=state.programs.find(x=>x.id===t.dataset.p); const s=p&&p.sessions.find(x=>x.id===t.dataset.s); if(s)newDraft(fromTemplate(s),(s.title||"Day "+(p.sessions.indexOf(s)+1))+" · "+p.name,{p:p.id,s:s.id}); break; }
    case "edit": { const w=state.workouts.find(x=>x.id===t.dataset.id); if(!w||state.draft)break; state.draft=clone(w); state.draft.editing=true; Store.saveDraft(); confirmKey=null; if(location.hash!=="#log")location.hash="log"; else {view="log";render()} window.scrollTo(0,0); break; }
    /* picker */
    case "pick": openPicker(); break;
    case "closepick": if(ev.target===t||t.tagName==="BUTTON")closePicker(); break;
    case "pickrecent": { const L=liftSummary(); const o=L[t.dataset.name]; if(o)addExerciseToDoc(o.parts); break; }
    case "pickbase": { const name=t.dataset.name.trim(); if(t.dataset.new&&!state.settings.custom.includes(name)){state.settings.custom.push(name);Store.saveSettings()} picker.parts.push({base:name,mods:[]}); picker.cur=picker.parts.length-1; picker.step="build"; drawPicker(); break; }
    case "mod": { const cp=picker.parts[picker.cur]; const m=t.dataset.m; cp.mods=cp.mods.includes(m)?cp.mods.filter(x=>x!==m):[...cp.mods,m]; drawPicker(); break; }
    case "usemods": picker.parts[picker.cur].mods=JSON.parse(t.dataset.m); drawPicker(); break;
    case "cmodadd": { const v=$("#cmod").value.trim(); if(!v)break; if(!state.settings.customMods.includes(v)){state.settings.customMods.push(v);Store.saveSettings()} const cp=picker.parts[picker.cur]; if(!cp.mods.includes(v))cp.mods.push(v); drawPicker(); break; }
    case "selpart": picker.cur=+t.dataset.i; drawPicker(); break;
    case "rmpart": picker.parts.splice(picker.cur,1); picker.cur=Math.max(0,picker.cur-1); drawPicker(); break;
    case "cxadd": picker.cxMode=true; picker.step="base"; drawPicker(); break;
    case "startcx": picker.cxMode=true; drawPicker(); break;
    case "pickcxtext": { const all=[...Object.values(LIB).flat(),...state.settings.custom];
      picker.parts=t.dataset.name.split("+").map(x=>x.trim()).filter(Boolean).map(x=>{ const hit=all.find(y=>y.toLowerCase()===x.toLowerCase()); if(!hit&&!state.settings.custom.includes(x)){state.settings.custom.push(x);Store.saveSettings()} return {base:hit||x,mods:[]} });
      picker.cxMode=true; picker.cur=0; picker.step="build"; drawPicker(); break; }
    case "editex": openPicker(ei); break;
    case "pickdone": { if(picker.replace!=null){ const E=doc.exercises[picker.replace], n=picker.parts.length, was=E.parts.length;
        E.parts=clone(picker.parts); E.sets.forEach(x=>{ const old=x.plan; x.plan=Array.from({length:n},(_,i)=>i<old.length?old[i]:1); if(was===1&&n>1&&x.plan[0]>1)x.plan[0]=1; if(n===1)x.plan=[old[0]||0]; x.made=null; });
        closePicker(); persist(); render(); break; }
      addExerciseToDoc(picker.parts); break; }
    /* sets */
    case "addset": case "addup": { const p=ex.sets[ex.sets.length-1]; const s=newSet(p,isCx(ex),ex.parts.length);
      if(a==="addup"&&p){ if(s.pct&&doc!==state.draft)s.pct+=5; else { const eu=entryUnit(exName(ex)); const b=(p.wr!=null&&p.u===eu)?p.wr:(+fmtIn(p.w||0,eu)||0); setW(s,Math.round((b+incFor(eu))*2)/2,eu); } }
      ex.sets.push(s); persist(); render(); break; }
    case "rmset": ex.sets.splice(si,1); missOpen=null; persist(); render(); break;
    case "made": { if(fullMake(set)){set.made=null;persist();render();break}
      const row=t.closest(".srow"); const inW=row.querySelector('[data-f=w]'); const inR=row.querySelector('[data-f=p]');
      if(!set.w&&inW.placeholder&&!isNaN(parseFloat(inW.placeholder))){setW(set,parseFloat(inW.placeholder),entryUnit(exName(ex)))}
      if(!isCx(ex)&&!set.plan[0]&&inR&&inR.placeholder&&!isNaN(parseInt(inR.placeholder)))set.plan[0]=parseInt(inR.placeholder);
      if(!sum(set.plan)){ inR&&inR.focus(); break }
      set.made=set.plan.slice(); missOpen=null; markDone(); persist(); render(); break; }
    case "miss": { if(isMiss(set)&&missOpen!==ei+":"+si){ missOpen=ei+":"+si; missCx={at:null,custom:false}; render(); break }
      const row=t.closest(".srow"); const inW=row.querySelector('[data-f=w]'); const inR=row.querySelector('[data-f=p]');
      if(!set.w&&inW.placeholder&&!isNaN(parseFloat(inW.placeholder)))setW(set,parseFloat(inW.placeholder),entryUnit(exName(ex)));
      if(!isCx(ex)&&!set.plan[0]&&inR&&inR.placeholder&&!isNaN(parseInt(inR.placeholder)))set.plan[0]=parseInt(inR.placeholder);
      if(!sum(set.plan)){ inR&&inR.focus(); break }
      missOpen=missOpen===ei+":"+si?null:ei+":"+si; missCx={at:null,custom:false}; render(); break; }
    case "missn": { const s=doc.exercises[+missOpen.split(":")[0]].sets[+missOpen.split(":")[1]]; s.made=[+t.dataset.n]; missOpen=null; markDone(); persist(); render(); break; }
    case "misssave": { const [e1,s1]=missOpen.split(":").map(Number); const s=doc.exercises[e1].sets[s1]; s.made=s.plan.map((_,pi)=>{const el=document.querySelector(`.mkin[data-pi="${pi}"]`);return Math.max(0,parseInt(el&&el.value)||0)}); missOpen=null; markDone(); persist(); render(); break; }
    case "misscancel": missOpen=null; render(); break;
    case "missat": case "missatn": { const [e1,s1]=missOpen.split(":").map(Number); const E=doc.exercises[e1], S=E.sets[s1];
      const k=a==="missat"?+t.dataset.i:missCx.at;
      if(a==="missat"&&S.plan[k]>1){ missCx.at=k; render(); break; }
      const got=a==="missatn"?+t.dataset.n:0;
      S.made=S.plan.map((p,i)=>i<k?p:(i===k?got:0)); missOpen=null; markDone(); persist(); render(); break; }
    case "missback": missCx.at=null; render(); break;
    case "misscustom": missCx.custom=true; render(); break;
    /* exercises */
    case "mvup": case "mvdown": { moveEx(doc,ei,a==="mvup"?-1:1); confirmKey=null; missOpen=null; persist(); render();
      const ni=doc.exercises.indexOf(ex); setTimeout(()=>{const el=document.querySelector(`.ex[data-ei="${ni}"]`); if(el)el.scrollIntoView({behavior:"smooth",block:"center"})},20); break; }
    case "exunit": { const n=exName(ex), cur=entryUnit(n), nu=cur==="kg"?"lb":"kg"; const m=state.settings.exUnits=state.settings.exUnits||{}; if(nu===U())delete m[n]; else m[n]=nu; Store.saveSettings();
      ex.sets.forEach(x=>{ if(x.w>0&&!(x.pct&&doc!==state.draft)){ const raw=(x.wr!=null&&x.u===cur)?x.wr:(+fmtIn(x.w,cur)); setW(x,raw,nu) } }); persist(); render(); break; }
    case "rmexunit": { delete state.settings.exUnits[t.dataset.n]; Store.saveSettings(); render(); break; }
    case "link": { const prev=doc.exercises[ei-1]; if(ex.group&&prev.group===ex.group){ const g=ex.group; ex.group=null; const after=doc.exercises.slice(ei+1); for(const x of after){ if(x.group===g)x.group=null; else break } if(doc.exercises.filter(x=>x.group===g).length<2)doc.exercises.forEach(x=>{if(x.group===g)x.group=null}) }
      else { if(!prev.group)prev.group=uid(); ex.group=prev.group; } persist(); render(); break; }
    case "askrmex": confirmKey="ex"+ei; render(); break;
    case "rmex": { const g=ex.group; doc.exercises.splice(ei,1); if(g&&doc.exercises.filter(x=>x.group===g).length<2)doc.exercises.forEach(x=>{if(x.group===g)x.group=null}); confirmKey=null; missOpen=null; persist(); render(); break; }
    /* finish */
    case "askdiscard": confirmKey="discard"; render(); break;
    case "discard": state.draft=null; confirmKey=null; missOpen=null; tReset(); Store.saveDraft(); render(); break;
    case "cancel": confirmKey=null; render(); break;
    case "finish": finish(t.dataset.u); break;
    /* history */
    case "toggle": if(ev.target.closest("button"))break; openHistory=openHistory===t.dataset.id?null:t.dataset.id; confirmKey=null; render(); break;
    case "askdel": confirmKey="del"+t.dataset.id; render(); break;
    case "delw": { const id=t.dataset.id; state.workouts=state.workouts.filter(w=>w.id!==id); Store.deleteWorkout(id); syncFeatured(); confirmKey=null; render(); break; }
    case "toplan": confirmKey="toplan"+t.dataset.id; render(); break;
    case "toplango": { const w=state.workouts.find(x=>x.id===t.dataset.id); const p=state.programs.find(x=>x.id===t.dataset.p); if(!w||!p)break;
      p.sessions.push({id:uid(),title:w.title||"",notes:"",exercises:fromWorkout(w)}); Store.saveProgram(p); confirmKey=null; planOpen=p.id; location.hash="plan"; break; }
    /* lifts */
    case "lift": openLift=t.dataset.name; render(); window.scrollTo(0,0); break;
    case "liftback": openLift=null; render(); break;
    /* plan */
    case "goalform": goalForm=!goalForm; render(); if(goalForm)setTimeout(()=>$("#g_lift")&&$("#g_lift").focus(),20); break;
    case "savegoal": { const lift=$("#g_lift").value.trim(), w=parseFloat($("#g_w").value), r=parseInt($("#g_r").value)||1, by=$("#g_by").value;
      if(!lift||!w){$("#gmsg").textContent="Add a lift and a weight.";break} state.goals.push({id:uid(),lift,w:toKg(w),reps:r,by}); Store.saveGoals(); goalForm=false; render(); break; }
    case "askdelgoal": confirmKey="goal"+t.dataset.id; render(); break;
    case "delgoal": state.goals=state.goals.filter(g=>g.id!==t.dataset.id); Store.saveGoals(); confirmKey=null; render(); break;
    case "progform": progForm=!progForm; render(); if(progForm)setTimeout(()=>$("#p_name").focus(),20); break;
    case "saveprog": { const n=$("#p_name").value.trim(); if(!n)break; const p={id:uid(),name:n,notes:"",sessions:[],next:0,created:Date.now()}; state.programs.push(p); Store.saveProgram(p); progForm=false; planOpen=p.id; render(); break; }
    case "openprog": planOpen=t.dataset.id; confirmKey=null; render(); window.scrollTo(0,0); break;
    case "closeprog": planOpen=null; confirmKey=null; render(); break;
    case "newsess": { const p=state.programs.find(x=>x.id===planOpen); planEdit={progId:p.id,index:null,doc:{id:uid(),title:"Day "+(p.sessions.length+1),notes:"",exercises:[]}}; render(); window.scrollTo(0,0); break; }
    case "editsess": { const p=state.programs.find(x=>x.id===planOpen); planEdit={progId:p.id,index:+t.dataset.i,doc:clone(p.sessions[+t.dataset.i])}; render(); window.scrollTo(0,0); break; }
    case "dupsess": { const p=state.programs.find(x=>x.id===planOpen); const s=clone(p.sessions[+t.dataset.i]); s.id=uid(); s.title=(s.title||"")+" (copy)"; p.sessions.splice(+t.dataset.i+1,0,s); Store.saveProgram(p); render(); break; }
    case "upsess": { const p=state.programs.find(x=>x.id===planOpen); const i=+t.dataset.i; [p.sessions[i-1],p.sessions[i]]=[p.sessions[i],p.sessions[i-1]]; Store.saveProgram(p); render(); break; }
    case "setnext": { const p=state.programs.find(x=>x.id===planOpen); p.next=+t.dataset.i; Store.saveProgram(p); render(); break; }
    case "askdelsess": confirmKey="sess"+t.dataset.i; render(); break;
    case "delsess": { const p=state.programs.find(x=>x.id===planOpen); p.sessions.splice(+t.dataset.i,1); if((p.next||0)>=p.sessions.length)p.next=0; Store.saveProgram(p); confirmKey=null; render(); break; }
    case "askdelprog": confirmKey="delprog"; render(); break;
    case "delprog": state.programs=state.programs.filter(x=>x.id!==planOpen); Store.deleteProgram(planOpen); planOpen=null; confirmKey=null; render(); break;
    case "cancelplan": planEdit=null; confirmKey=null; render(); break;
    case "saveplan": { const p=state.programs.find(x=>x.id===planEdit.progId); const d=planEdit.doc;
      d.exercises.forEach(e=>e.sets=e.sets.filter(s=>sum(s.plan)>0||s.w||s.pct)); d.exercises=d.exercises.filter(e=>e.sets.length);
      if(planEdit.index==null)p.sessions.push(d); else p.sessions[planEdit.index]=d; Store.saveProgram(p); planEdit=null; render(); window.scrollTo(0,0); break; }
    /* settings */
    case "unit": state.settings.unit=t.dataset.u; Store.saveSettings(); syncFeatured(); render(); break;
    case "sw": state.settings[t.dataset.k]=!state.settings[t.dataset.k]; Store.saveSettings(); render(); break;
    case "vis": state.settings.visibility=t.dataset.v; Store.saveSettings(); render(); break;
    case "export": { const txt=JSON.stringify({app:"heavy-ledger-log",version:2,exported:new Date().toISOString(),workouts:state.workouts,programs:state.programs,goals:state.goals,settings:state.settings},null,1);
      navigator.clipboard.writeText(txt).then(()=>$("#exmsg").textContent="Copied — paste it anywhere to keep a backup.").catch(()=>{$("#importbox").innerHTML=`<textarea readonly style="min-height:160px;font-family:var(--mono);font-size:12px">${esc(txt)}</textarea>`;$("#exmsg").textContent="Select all and copy."}); break; }
    case "importopen": $("#importbox").innerHTML=`<textarea id="imp" style="min-height:120px;font-family:var(--mono);font-size:12px" placeholder="Paste a backup here"></textarea><div class="row" style="margin-top:8px"><button class="btn primary sm" data-a="import">Restore</button><span id="impmsg" class="small muted"></span></div>`; break;
    case "import": { try{ const d2=JSON.parse($("#imp").value); const have=new Set(state.workouts.map(w=>w.id)); let n=0;
        (d2.workouts||[]).forEach(w0=>{ if(w0&&w0.id&&!have.has(w0.id)&&Array.isArray(w0.exercises)){const [w]=migrate(w0);state.workouts.push(w);Store.saveWorkout(w);n++} });
        const hp=new Set(state.programs.map(p=>p.id)); (d2.programs||[]).forEach(p=>{ if(p&&p.id&&!hp.has(p.id)){state.programs.push(p);Store.saveProgram(p)} });
        if(Array.isArray(d2.goals)&&d2.goals.length){const hg=new Set(state.goals.map(g=>g.id));d2.goals.forEach(g=>{if(!hg.has(g.id))state.goals.push(g)});Store.saveGoals()}
        if(d2.settings){["custom","customMods"].forEach(k=>(d2.settings[k]||[]).forEach(c=>{if(!state.settings[k].includes(c))state.settings[k].push(c)}));Store.saveSettings()}
        $("#impmsg").textContent="Restored "+n+" session"+(n===1?"":"s")+"."; }catch(e){ $("#impmsg").textContent="That doesn't look like a Heavy Ledger backup." } break; }
  }
});

on(document,"input",ev=>{
  const el=ev.target;
  if(el.dataset.tc){ const [k,f2]=el.dataset.tc.split("."); tcfg(k)[f2]=Math.max(0,parseInt(el.value)||0); Store.put("settings",{kind:"settings",s:state.settings},700); if(!timer.running&&tElapsed()===0)loadPreset(k); tick(); return }
  const f=el.dataset.f; if(!f)return;
  if(f==="inc"||f==="incLb"){state.settings[f]=parseFloat(el.value)||0;Store.put("settings",{kind:"settings",s:state.settings},700);return}
  if(f==="pname"||f==="pnotes"){ const p=state.programs.find(x=>x.id===planOpen); if(!p)return; if(f==="pname")p.name=el.value; else p.notes=el.value; clearTimeout(window._pt); window._pt=setTimeout(()=>Store.saveProgram(p),700); return }
  const doc=getDoc(); if(!doc)return;
  const exEl=el.closest("[data-ei]"), rowEl=el.closest("[data-si]");
  if(exEl&&rowEl){ const e=doc.exercises[+exEl.dataset.ei], s=e.sets[+rowEl.dataset.si]; const v=el.value.replace(",",".").trim();
    if(f==="w"){ if(/%$/.test(v)&&doc!==state.draft){s.pct=parseFloat(v)||null;s.w=0} else { const eu=entryUnit(exName(e)); if(v===""){s.w=0;s.wr=null;s.u=eu} else setW(s,parseFloat(v)||0,eu); if(doc!==state.draft)s.pct=null; const cv=el.parentElement.querySelector(".conv"); if(cv)cv.textContent=s.w>0?"≈ "+fmtW(s.w)+" "+U():""; } }
    else if(f==="p"){ const pi=+el.dataset.pi; const wasFull=fullMake(s); s.plan[pi]=Math.max(0,parseInt(v)||0); if(s.made&&wasFull)s.made=s.plan.slice(); el.closest(".cxp")&&el.closest(".cxp").classList.toggle("zero",!s.plan[pi]); }
    else if(f==="rpe")s.rpe=v; }
  else if(f==="title")doc.title=el.value; else if(f==="notes")doc.notes=el.value; else if(f==="date")doc.date=el.value||today();
  persist();
});

function finish(unmarkedChoice){
  const d=state.draft;
  const unmarked=d.exercises.reduce((n,e)=>n+e.sets.filter(s=>!s.made&&sum(s.plan)>0).length,0);
  if(unmarked&&!unmarkedChoice){ confirmKey="unmarked"; render(); return }
  d.exercises.forEach(e=>{ e.sets.forEach(s=>{ if(!s.made&&sum(s.plan)>0&&unmarkedChoice==="made")s.made=s.plan.slice() }); e.sets=e.sets.filter(s=>s.made); });
  d.exercises=d.exercises.filter(e=>e.sets.length);
  // tidy groups that lost members
  const counts={}; d.exercises.forEach(e=>{if(e.group)counts[e.group]=(counts[e.group]||0)+1}); d.exercises.forEach(e=>{if(e.group&&counts[e.group]<2)e.group=null});
  if(!d.exercises.length){ confirmKey=null; render(); alertMsg("Mark at least one set before saving."); return }
  const wasEdit=d.editing; delete d.editing; if(!wasEdit)d.finishedAt=Date.now();
  const w=clone(d); w.v=2;
  state.workouts=state.workouts.filter(x=>x.id!==w.id);
  w.prs=prsIn(w); state.workouts.push(w); Store.saveWorkout(w); syncFeatured();
  if(w.from&&!wasEdit){ const p=state.programs.find(x=>x.id===w.from.p); if(p){ const i=p.sessions.findIndex(s=>s.id===w.from.s); if(i>=0){p.next=(i+1)%p.sessions.length;Store.saveProgram(p)} } }
  lastResult={prs:w.prs,misses:w.exercises.reduce((n,e)=>n+e.sets.filter(isMiss).length,0)};
  state.draft=null; confirmKey=null; missOpen=null; tReset(); Store.saveDraft(); render(); window.scrollTo(0,0);
}
function alertMsg(m){const b=document.createElement("div");b.className="banner";b.textContent=m;$("#app").prepend(b);setTimeout(()=>b.remove(),3500);window.scrollTo(0,0)}

/* ================= Routing ================= */
function route(){ const h=location.hash.slice(1); view=["log","plan","history","lifts","settings"].includes(h)?h:"log"; confirmKey=null; missOpen=null; if(view!=="lifts")openLift=null; render(); }
on(document,"keydown",ev=>{ if(ev.key!=="Enter")return; if(ev.target.id==="authEmail")sendLink(); else if(ev.target.id==="obUser"||ev.target.id==="obName")createProfile(); });
on(window,"hashchange",route);
Store.init().then(afterInit);
if(sb){ const { data: sub }=sb.auth.onAuthStateChange((evt)=>{ if(evt==="SIGNED_IN"&&Store.mode==="auth"){ Store.reset(); Store.init().then(afterInit); } if(evt==="SIGNED_OUT"){ Store.reset(); Store.mode="auth"; render(); } }); cleanups.push(()=>sub.subscription.unsubscribe()); }
return ()=>{ cleanups.forEach(f=>f()); clearInterval(tickTimer); wake(false); };
}
