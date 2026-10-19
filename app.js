/* Wardrobe: plans the week from clothes Natalia owns, adjusts each morning for the weather,
   and keeps a log of what she actually wore. Data lives in a private GitHub repo. */
(function(){
'use strict';

/* ---------------- storage ---------------- */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const CITIES = {London:{lat:51.5072,lon:-0.1276,tz:'Europe/London'}, Paris:{lat:48.8566,lon:2.3522,tz:'Europe/Paris'}};
const settings = Object.assign({token:'', repo:'nattyvs/wardrobe-private', city:'London', sample:true}, LS.get('wd.settings', {}));
const cache = LS.get('wd.cache', {});
const S = {
  closet: cache.closet || null,
  log: cache.log || null,
  plan: cache.plan || null,
  state: Object.assign({dayOcc:{}, swaps:{}, edits:{}}, cache.state || {}),
  weather: LS.get('wd.weather', null),
  sha: cache.sha || {},
  synced: cache.synced || null,
  photos: {}
};
function persist(){ LS.set('wd.cache', {closet:S.closet, log:S.log, plan:S.plan, state:S.state, sha:S.sha, synced:S.synced}); }
function saveSettings(){ LS.set('wd.settings', settings); }

/* ---------------- dates ---------------- */
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => new Date(s+'T12:00:00');
const TODAY = iso(new Date());
const addDays = (s,n) => { const d = parse(s); d.setDate(d.getDate()+n); return iso(d); };
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DSHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayName = s => DAYS[parse(s).getDay()];
const dayShort = s => DSHORT[parse(s).getDay()];
const nice = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const monday = s => { const d = parse(s); const k = (d.getDay()+6)%7; d.setDate(d.getDate()-k); return iso(d); };
const weekOf = s => { const m = monday(s); return Array.from({length:7}, (_,i)=>addDays(m,i)); };
const isoWeek = s => { const d = parse(s); d.setDate(d.getDate()+3-((d.getDay()+6)%7)); const w1 = new Date(d.getFullYear(),0,4); return 1+Math.round(((d-w1)/864e5-3+((w1.getDay()+6)%7))/7); };
const daysBetween = (a,b) => Math.round((parse(b)-parse(a))/864e5);
function hasHistory(){ return (S.log||[]).some(e=>e.source!=='sample') || settings.sample; }
function sinceWords(s){
  if(!s) return hasHistory() ? 'Never worn' : 'No wears logged yet';
  const n = daysBetween(s, TODAY);
  if(n<=0) return 'Worn today';
  if(n===1) return 'Worn yesterday';
  if(n<14) return `Worn ${n} days ago`;
  if(n<60) return `Worn ${Math.round(n/7)} weeks ago`;
  return `Not worn since ${MONTHS[parse(s).getMonth()]}`;
}

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap1 = s => s ? s[0].toUpperCase()+s.slice(1) : s;
function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/4294967295; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2200); }

/* ---------------- data access ---------------- */
function closet(){ return S.closet || []; }
function log(){ return S.log || []; }
function piece(id){ return closet().find(p=>p.id===id); }
function stats(before){
  const m = {};
  closet().forEach(p=>m[p.id]={count:0,last:null});
  log().filter(e=>!before || e.date < before).forEach(e=>(e.items||[]).forEach(id=>{ const x=m[id]; if(!x) return; x.count++; if(!x.last||e.date>x.last) x.last=e.date; }));
  return m;
}
function ensureSample(){
  if(!settings.sample) return;
  if(!S.closet || !S.closet.length || !S.closet[0].id.startsWith('s-')) S.closet = JSON.parse(JSON.stringify(window.SAMPLE_CLOSET));
  if(!S.log || !S.log.length || S.log.every(e=>e.source==='sample')) S.log = window.sampleWearLog(TODAY);
  // Sample week: customer meetings on Tuesday and Wednesday.
  const wk = weekOf(TODAY);
  if(!S.state.sampleSeeded || S.state.sampleSeeded !== wk[0]){
    S.state.dayOcc = Object.assign({}, S.state.dayOcc, {[wk[1]]:{occ:'customer', note:'Meeting 10:00'}, [wk[2]]:{occ:'customer', note:'Meeting 14:00'}});
    S.state.sampleSeeded = wk[0];
  }
}

/* ---------------- occasions ---------------- */
const OCC = {office:'Office day', customer:'Customer day', off:'Day off'};
function occasionFor(date){
  const o = S.state.dayOcc[date];
  if(o && o.occ) return o;
  const pd = S.plan && S.plan.days && S.plan.days.find(d=>d.date===date);
  if(pd && pd.occasion) return {occ:pd.occasion, note:pd.occasionNote||''};
  const dow = parse(date).getDay();
  return {occ: (dow===0||dow===6) ? 'off' : 'office', note:''};
}

/* ---------------- weather ---------------- */
function sampleWeather(){
  const base = [12,11,9,8,10,11,13], wk = weekOf(TODAY), days = {};
  for(let i=0;i<14;i++){ const d = addDays(wk[0], i); const t = base[i%7]; days[d] = {max:t+3, min:t-3, feel:t, rainFrom: i%7===2 ? 16 : (i%7===4 ? 9 : null), rainChance: i%7===2 ? 70 : (i%7===4 ? 60 : 10)}; }
  return {city:settings.city, sample:true, fetched:Date.now(), days};
}
async function loadWeather(force){
  const w = S.weather;
  const fresh = w && !w.sample && w.city===settings.city && (Date.now()-w.fetched) < 3*3600e3 && w.days[TODAY];
  if(fresh && !force) return;
  const c = CITIES[settings.city] || CITIES.London;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max&hourly=precipitation_probability&timezone=${encodeURIComponent(c.tz)}&forecast_days=7`;
  try{
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('weather '+r.status);
    const j = await r.json();
    const days = {};
    j.daily.time.forEach((d,i)=>{
      const amax = j.daily.apparent_temperature_max[i], amin = j.daily.apparent_temperature_min[i];
      let rainFrom = null;
      j.hourly.time.forEach((h,k)=>{ if(rainFrom===null && h.startsWith(d)){ const hr = +h.slice(11,13); if(hr>=7 && hr<=21 && j.hourly.precipitation_probability[k]>=50) rainFrom = hr; } });
      days[d] = {max:Math.round(j.daily.temperature_2m_max[i]), min:Math.round(j.daily.temperature_2m_min[i]), feel:Math.round(amax*0.6+amin*0.4), rainFrom, rainChance:j.daily.precipitation_probability_max[i]};
    });
    S.weather = {city:settings.city, sample:false, fetched:Date.now(), days};
  }catch(e){
    if(!S.weather || S.weather.city!==settings.city) S.weather = sampleWeather();
  }
  LS.set('wd.weather', S.weather);
}
function wx(date){ return (S.weather && S.weather.days[date]) || null; }
function band(t){ return t>=20?1 : t>=15?2 : t>=10?3 : t>=5?4 : 5; }
function forecastLine(w){
  if(!w) return 'No forecast yet';
  if(w.rainFrom!=null){ const h = w.rainFrom; const t = h===12 ? 'midday' : h<12 ? `${h}am` : `${h-12}pm`; return h<=9 ? 'Rain all day' : `Rain after ${t}`; }
  return `Dry · ${w.min}–${w.max}°`;
}

/* ---------------- fabric ---------------- */
function fabricOf(p){
  const c = ((p.composition||'')+' '+(p.name||'')).toLowerCase(), sh = p.shape;
  if(/suede/.test(c)) return {name:'Suede', tex:'grain', note:'Soft nap. Keep it out of the rain.'};
  if(/leather/.test(c)) return {name:'Leather', tex:'grain', note:'Structured and hard-wearing.'};
  if(/mohair/.test(c)) return {name:'Mohair knit', tex:'ribs', note:'Light for its warmth, with a soft halo.'};
  if(/silk/.test(c)) return {name:'Silk', tex:'sheen', note:'Light and smooth. Dresses a look up.'};
  if(/denim/.test(c) || sh==='jeans') return {name:'Denim', tex:'twill', note:'Sturdy twill. Casual by nature.'};
  if(/linen/.test(c)) return {name:'Linen', tex:'slub', note:'Cool and breathable. Creases easily.'};
  if(/gabardine/.test(c)) return {name:'Gabardine', tex:'twill', note:'Tight weave that shrugs off showers.'};
  if(/poplin/.test(c)) return {name:'Cotton poplin', tex:'weave', note:'Crisp and breathable.'};
  if(sh==='knit'||sh==='jumper'||/knit/i.test(p.name||'')){
    if(/merino/.test(c)) return {name:'Merino knit', tex:'ribs', note:'Fine and warm without bulk.'};
    if(/cashmere/.test(c)) return {name:'Cashmere knit', tex:'ribs', note:'Very warm, very soft.'};
    if(/lambswool|wool/.test(c)) return {name:'Wool knit', tex:'ribs', note:'Traps warmth. A cold-day layer.'};
    return {name:'Cotton knit', tex:'ribs', note:'Easy layer for mild days.'};
  }
  if(/cashmere/.test(c) && /wool/.test(c)) return {name:'Wool cashmere', tex:'felt', note:'Dense, warm and soft to the touch.'};
  if(/wool/.test(c) && (sh==='coat'||sh==='trench')) return {name:'Wool', tex:'felt', note:'Dense and warm.'};
  if(/wool/.test(c)) return {name:'Wool twill', tex:'twill', note:'Holds its shape and a crease.'};
  if(/viscose|polyester|acrylic|polyamide/.test(c)) return {name:'Crepe', tex:'sheen', note:'Drapes well, little warmth.'};
  if(/cotton/.test(c)) return sh==='tee' ? {name:'Cotton jersey', tex:'fine', note:'Soft and light. A base layer.'} : {name:'Cotton', tex:'weave', note:'Breathable everyday cloth.'};
  if(/tweed/.test(c)) return {name:'Tweed', tex:'felt', note:'Dense and warm, with texture.'};
  if(/jersey/.test(c)) return {name:'Jersey', tex:'fine', note:'Soft, easy and forgiving.'};
  if(/satin/.test(c)) return {name:'Satin', tex:'sheen', note:'Smooth with a soft shine.'};
  if(/puffer|down|quilted/.test(c)) return {name:'Padded', tex:'fine', note:'Warm and light. Casual by nature.'};
  if(/broderie/.test(c)) return {name:'Cotton broderie', tex:'weave', note:'Light, with cut-work detail.'};
  return {name: p.composition ? cap1(p.composition) : '', tex:'fine', note: p.composition ? '' : 'Composition not added yet.'};
}
/* ---------------- drawing a piece ---------------- */
function art(p){
  if(!p) return '';
  if(p.photo && S.photos[p.photo]) return `<img src="${S.photos[p.photo]}" alt="${esc(p.name)}">`;
  if(p.photo && settings.token && !settings.sample) loadPhoto(p.photo);
  return window.garmentSVG(p.shape||'tee', p.hex||'#999', p.name);
}

/* ---------------- outfit engine ---------------- */
const NEUTRAL = /black|white|ivory|cream|grey|gray|charcoal|navy|camel|stone|beige|brown|tan|indigo|denim|taupe|sand/;
function buildOutfit(date){
  const o = occasionFor(date).occ, w = wx(date), t = w ? w.feel : 12, need = band(t);
  const st = stats(date);
  const pool = closet().filter(p=>!p.dontWear && (!p.occasions || !p.occasions.length || p.occasions.includes(o)));
  const recentDays = id => { const l = st[id] && st[id].last; return l ? daysBetween(l, date) : 999; };
  const formal = o==='customer' ? 2.5 : o==='office' ? 1.6 : 1;
  const target = {outer: need>=4?5 : need===3?3 : 2, top: need>=4?4 : need===3?3 : need===2?2 : 1, bottom: need>=3?3 : 2, dress: need>=3?3:1, shoes: need>=4?3 : need===3?2 : 1, accessory: need>=4?3 : 1};
  function score(p, slot){
    let s = 0;
    s -= Math.abs((p.warmth||2) - target[slot]) * 1.1;
    // Trainers are fine on customer days; shoes get a lighter formality pull than clothes.
    s -= Math.max(0, formal - (p.formality||2)) * (slot==='shoes' ? 0.5 : 1.6);
    if(o==='off') s -= Math.max(0, (p.formality||2) - 2) * 0.6;
    if(o==='customer' && p.statement) s += 0.8;
    const ago = recentDays(p.id);
    s += ago===999 ? 2.6 : Math.min(ago, 120)/40;
    if(ago < 3) s -= 4;
    if(slot==='shoes' && need>=4 && p.shape==='boot') s += 1.2;
    if(slot==='shoes' && w && w.rainChance>=60 && /suede/i.test(p.composition||'')) s -= 3;
    s += hash(date+p.id)*0.35;
    return s;
  }
  const by = cat => pool.filter(p=>p.cat===cat);
  const pick = (cat, slot, chosen) => {
    const list = by(cat).map(p=>{
      let s = score(p, slot);
      const stmt = chosen.filter(c=>c.statement).length;
      if(p.statement && stmt) s -= 2.5;
      const accent = chosen.find(c=>!NEUTRAL.test(c.colour||''));
      if(accent && !NEUTRAL.test(p.colour||'')) s -= 2;
      return {p, s};
    }).sort((a,b)=>b.s-a.s);
    return list[0] ? list[0].p : null;
  };
  // The hero: the most neglected piece that suits today.
  const suitable = pool.filter(p=>p.cat!=='outer' || need>=2).map(p=>({p, s: score(p, p.cat==='outer'?'outer':p.cat) + (recentDays(p.id)===999?1:Math.min(recentDays(p.id),120)/30)})).sort((a,b)=>b.s-a.s);
  const hero = hasHistory() && suitable[0] && recentDays(suitable[0].p.id) >= 45 ? suitable[0].p : null;
  const chosen = hero ? [hero] : [];
  const slots = {};
  if(hero) slots[hero.cat==='dress'?'dress':hero.cat] = hero;
  const has = k => slots[k];
  if(!has('dress') && !has('top') && !has('bottom')){
    const d = pick('dress','dress',chosen), tp = pick('top','top',chosen), bt = pick('bottom','bottom',chosen);
    const ds = d ? score(d,'dress') : -99, ss = tp && bt ? (score(tp,'top')+score(bt,'bottom'))/2 : -99;
    if(ds > ss + .4){ slots.dress = d; chosen.push(d); } else { if(tp){slots.top=tp;chosen.push(tp);} if(bt){slots.bottom=bt;chosen.push(bt);} }
  } else if(!has('dress')){
    if(!has('top')){ const x = pick('top','top',chosen); if(x){slots.top=x;chosen.push(x);} }
    if(!has('bottom')){ const x = pick('bottom','bottom',chosen); if(x){slots.bottom=x;chosen.push(x);} }
  }
  if(!has('outer') && (t < 17 || o==='customer')){ const x = pick('outer','outer',chosen); if(x){slots.outer=x;chosen.push(x);} }
  if(!has('shoes')){ const x = pick('shoes','shoes',chosen); if(x){slots.shoes=x;chosen.push(x);} }
  if(!has('accessory') && (o==='customer' || need>=4)){ const x = pick('accessory','accessory',chosen); if(x && (o==='customer' || x.warmth>=3)){slots.accessory=x;chosen.push(x);} }
  return {slots, hero, temp:t, need, occ:o};
}
const SLOT_ORDER = ['outer','top','dress','bottom','shoes','accessory'];
function outfitFor(date){
  let res, adjusted = null, fromPlan = false;
  const pd = S.plan && S.plan.days && S.plan.days.find(d=>d.date===date);
  const worn = log().find(e=>e.date===date && e.source!=='sample');
  if(worn && worn.items && worn.items.length){
    const slots = {}; worn.items.map(piece).filter(Boolean).forEach(p=>{ slots[p.cat==='dress'?'dress':p.cat] = p; });
    const w = wx(date), t = w ? w.feel : 12, st = stats(date);
    const hero = Object.values(slots).filter(p=>{ const l = st[p.id] && st[p.id].last; return !l || daysBetween(l,date)>=45; })[0] || null;
    res = {slots, hero, temp:t, need:band(t), occ:occasionFor(date).occ, why: worn.why};
    res.list = SLOT_ORDER.filter(k=>res.slots[k]).map(k=>({slot:k, p:res.slots[k]}));
    res.logged = true; res.fromPlan = false; res.adjusted = null;
    return res;
  }
  if(pd && pd.outfit && pd.outfit.length){
    fromPlan = true;
    const slots = {};
    pd.outfit.map(piece).filter(Boolean).forEach(p=>{ slots[p.cat==='dress'?'dress':p.cat] = p; });
    const w = wx(date), t = w ? w.feel : (pd.tempAssumed ?? 12);
    res = {slots, hero: pd.hero ? piece(pd.hero) : null, temp:t, need:band(t), occ:occasionFor(date).occ, why: pd.why};
    if(pd.tempAssumed!=null && w && band(t) !== band(pd.tempAssumed)){
      const colder = band(t) > band(pd.tempAssumed);
      const alt = buildOutfit(date);
      ['outer','accessory'].forEach(k=>{
        const was = slots[k], now = alt.slots[k];
        if((was&&was.id)!==(now&&now.id)){
          if(now) slots[k]=now; else delete slots[k];
          if(!adjusted) adjusted = colder ? (now ? `Colder than planned, so the ${now.name.toLowerCase()} comes in${was?` for the ${was.name.toLowerCase()}`:''}.` : 'Colder than planned.') : (was && !now ? `Milder than planned, so the ${was.name.toLowerCase()} can stay home.` : now ? `Milder than planned, so the ${now.name.toLowerCase()} instead.` : 'Milder than planned.');
        }
      });
    }
  } else res = buildOutfit(date);
  const sw = S.state.swaps[date] || {};
  Object.entries(sw).forEach(([k,id])=>{ if(id===null) delete res.slots[k]; else { const p = piece(id); if(p) res.slots[k] = p; } });
  res.adjusted = adjusted; res.fromPlan = fromPlan;
  res.list = SLOT_ORDER.filter(k=>res.slots[k]).map(k=>({slot:k, p:res.slots[k]}));
  return res;
}
function whyLine(o, date){
  if(o.why) return o.why;
  const st = stats(date), bits = [];
  if(o.hero && hasHistory()){ const l = st[o.hero.id] && st[o.hero.id].last; bits.push(l ? `The ${o.hero.name.toLowerCase()} hasn't been out since ${MONTHS[parse(l).getMonth()]}.` : `The ${o.hero.name.toLowerCase()} gets its first outing.`); }
  const warm = o.slots.outer || o.slots.top;
  if(warm && o.need>=3 && fabricOf(warm).name) bits.push(`${fabricOf(warm).name} for ${Math.round(o.temp)}°.`);
  else if(warm && o.need>=3) bits.push(`The ${warm.name.toLowerCase()} for ${Math.round(o.temp)}°.`);
  else if(o.need<=2) bits.push(`Light layers for ${Math.round(o.temp)}°.`);
  if(o.occ==='customer') bits.push('Dressed up a notch for the meeting.');
  return bits.join(' ');
}

/* ---------------- GitHub sync ---------------- */
function b64enc(str){ const bytes = new TextEncoder().encode(str); let bin=''; for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000)); return btoa(bin); }
function b64dec(b64){ const bin = atob(b64.replace(/\s/g,'')); const bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
const ghReady = () => !!(settings.token && settings.repo && !settings.sample);
function ghURL(path){ const [o,r] = settings.repo.split('/'); return `https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/contents/${path}`; }
const ghHeaders = extra => Object.assign({Authorization:'Bearer '+settings.token, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'}, extra||{});
async function ghGet(path){
  const r = await fetch(ghURL(path), {cache:'no-store', headers:ghHeaders()});
  if(r.status===404) return {sha:null, data:null};
  if(!r.ok) throw new Error(r.status===401 ? 'The token was refused. Check it in Settings.' : `GitHub said ${r.status} for ${path}.`);
  const j = await r.json(); return {sha:j.sha, data:JSON.parse(b64dec(j.content||'')||'null')};
}
async function ghPut(path, data, message){
  const body = {message, content: b64enc(JSON.stringify(data,null,2)+'\n')};
  if(S.sha[path]) body.sha = S.sha[path];
  let r = await fetch(ghURL(path), {method:'PUT', headers:ghHeaders({'Content-Type':'application/json'}), body:JSON.stringify(body)});
  if(r.status===409 || r.status===422){ const cur = await ghGet(path); body.sha = cur.sha; r = await fetch(ghURL(path), {method:'PUT', headers:ghHeaders({'Content-Type':'application/json'}), body:JSON.stringify(body)}); }
  if(!r.ok) throw new Error(`Couldn't save ${path} (${r.status}).`);
  const j = await r.json(); S.sha[path] = j.content.sha;
}
async function ghPutRaw(path, b64, message){
  const r = await fetch(ghURL(path), {method:'PUT', headers:ghHeaders({'Content-Type':'application/json'}), body:JSON.stringify({message, content:b64})});
  if(!r.ok) throw new Error(`Couldn't upload the photo (${r.status}).`);
}
async function loadPhoto(path){
  if(S.photos[path] || loadPhoto.busy[path]) return; loadPhoto.busy[path] = true;
  try{
    const r = await fetch(ghURL(path), {headers:ghHeaders({Accept:'application/vnd.github.raw'})});
    if(!r.ok) throw 0;
    S.photos[path] = URL.createObjectURL(await r.blob());
    render();
  }catch(e){} finally{ delete loadPhoto.busy[path]; }
}
loadPhoto.busy = {};
async function pull(){
  if(!ghReady()) return;
  const files = {closet:'data/closet.json', log:'data/wearlog.json', plan:'data/plan.json', state:'data/state.json'};
  const out = {};
  for(const [k,p] of Object.entries(files)){ const r = await ghGet(p); S.sha[p] = r.sha; out[k] = r.data; }
  if(out.closet && out.closet.pieces) S.closet = out.closet.pieces.map(p=>Object.assign({}, p, S.state.edits[p.id]||{}));
  if(out.log && out.log.entries){
    const byDate = {}; out.log.entries.forEach(e=>byDate[e.date]=e);
    (S.log||[]).forEach(e=>{ if(e.source!=='sample' && (!byDate[e.date] || (e.updated||0) > (byDate[e.date].updated||0))) byDate[e.date]=e; });
    S.log = Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
  }
  if(out.plan) S.plan = out.plan;
  if(out.state){ S.state.dayOcc = Object.assign({}, out.state.dayOcc||{}, S.state.dayOcc); S.state.swaps = Object.assign({}, out.state.swaps||{}, S.state.swaps); }
  S.synced = Date.now(); persist();
}
let pushTimer = null;
function queuePush(what){
  persist();
  if(!ghReady()) return;
  queuePush.what = Object.assign(queuePush.what||{}, what);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async ()=>{
    const w = queuePush.what; queuePush.what = {};
    try{
      if(w.log) await ghPut('data/wearlog.json', {entries:S.log.filter(e=>e.source!=='sample')}, 'Log what I wore');
      if(w.state) await ghPut('data/state.json', {dayOcc:S.state.dayOcc, swaps:S.state.swaps}, 'Update day settings');
      if(w.closet) await ghPut('data/closet.json', {pieces:S.closet}, 'Update closet');
      S.synced = Date.now(); persist();
    }catch(e){ toast(e.message || 'Saved here. Will sync later.'); }
  }, 900);
}

/* ---------------- router ---------------- */
function route(){
  const h = (location.hash||'#today').slice(1).split('/');
  return {name: h[0]||'today', arg: h[1]||null};
}
function render(opts){
  const r = route(), app = $('#app');
  const tab = r.name==='day' ? (r.arg===TODAY ? 'today' : 'week') : r.name;
  document.querySelectorAll('.tabs a').forEach(a=>a.setAttribute('aria-current', a.dataset.tab===tab ? 'page' : 'false'));
  if(r.name==='week') app.innerHTML = viewWeek();
  else if(r.name==='closet') app.innerHTML = viewCloset(r.arg||'all');
  else if(r.name==='log') app.innerHTML = viewLog(r.arg||TODAY);
  else app.innerHTML = viewDay(r.name==='day' && r.arg ? r.arg : TODAY, opts && opts.settle);
  document.title = 'Wardrobe';
}

/* ---------------- views ---------------- */
function masthead(){
  return `<header class="mast"><span class="word">Wardrobe</span><button type="button" data-act="city" aria-label="Switch city, now ${esc(settings.city)}"><span class="label">${esc(settings.city)}</span></button></header>
  ${settings.sample || (S.weather&&S.weather.sample) ? `<p class="sample-note">${settings.sample?'Sample wardrobe':'Your wardrobe'}${S.weather&&S.weather.sample?' and sample forecast':''}.${settings.sample?` <a href="#log/settings">Connect yours</a>`:''}</p>` : ''}`;
}
// where each kind of piece sits on the spread, in % of the hero
const LAYOUT = {
  outer:{x:31,y:29,w:50,z:1}, bottom:{x:47,y:49,w:30,z:2}, top:{x:11,y:41,w:36,z:3}, dress:{x:13,y:37,w:33,z:3}, shoes:{x:22,y:83,w:27,z:4}, accessory:{x:40,y:33,w:9,z:5}
};
const LAYOUT_NO_OUTER = {top:{x:20,y:30,w:44,z:3}, dress:{x:24,y:27,w:38,z:3}, bottom:{x:50,y:46,w:32,z:2}, shoes:{x:10,y:85,w:28,z:4}, accessory:{x:68,y:28,w:11,z:5}};
function viewDay(date, settle){
  const o = outfitFor(date), w = wx(date), occ = occasionFor(date), st = stats(date);
  const isToday = date===TODAY, worn = log().find(e=>e.date===date && e.source!=='sample');
  const L = o.slots.outer ? LAYOUT : LAYOUT_NO_OUTER;
  let n = 0;
  const pieces = o.list.map(({slot,p})=>{
    const pos = L[slot] || LAYOUT[slot]; n++;
    const fresh = o.hero && o.hero.id===p.id;
    const r = window.garmentRatio(p.shape||'tee');
    return `<button type="button" class="piece slot-${slot}${fresh?' fresh':''}" data-piece="${esc(p.id)}" style="left:${pos.x}%;top:${pos.y}%;width:${pos.w}%;z-index:${pos.z||1}" aria-label="${esc(p.name)}"><span class="no">${pad(n)}</span>${art(p)}</button>`;
  }).join('');
  const nums = {}; o.list.forEach((x,i)=>nums[x.p.id]=pad(i+1));
  const notes = o.list.map(({p})=>{
    const fresh = o.hero && o.hero.id===p.id, f = fabricOf(p), s = st[p.id];
    const sub = fresh ? sinceWords(s && s.last) : [p.brand, p.composition || f.name].filter(Boolean).join(' · ');
    return `<li class="${fresh?'fresh':''}"><span class="n">${nums[p.id]}</span><span class="fl">${art(p)}</span><button type="button" data-piece="${esc(p.id)}"><span class="t">${esc(p.name)}</span><span class="s">${esc(sub)}</span></button></li>`;
  }).join('');
  const cf = []; const cseen = {};
  o.list.forEach(({p})=>{ const f = fabricOf(p); const k = (p.colour||'')+'|'+f.name; if(cseen[k]) return; cseen[k]=1;
    const sw = p.swatch && S.photos[p.swatch] ? `background-image:url(${S.photos[p.swatch]})` : `background-color:${esc(p.hex||'#999')}`;
    if(p.swatch && !S.photos[p.swatch] && ghReady()) loadPhoto(p.swatch);
    cf.push(`<li><i style="${sw}" role="img" aria-label="${esc((p.colour||'')+' '+f.name)}"></i><span><span class="t">${esc(p.colour||'')}${f.name?` · ${esc(f.name)}`:''}</span><span class="s">${esc(f.note)}</span></span></li>`); });
  const strip = weekOf(date).map(d=>{ const ww = wx(d), oc = occasionFor(d).occ; return `<a href="#day/${d}" class="${d===date?'on':''}" aria-label="${dayName(d)} ${nice(d)}"><span class="label">${dayShort(d)}</span><b>${ww?ww.feel+'°':'·'}</b><i class="${oc==='customer'?'':'no'}"></i></a>`; }).join('');
  const tagCls = occ.occ==='customer' ? 'customer' : occ.occ==='off' ? 'off' : '';
  const actions = isToday
    ? (worn ? `<button type="button" class="btn" disabled>Worn today</button><a class="btn ghost" href="#log">Edit the log</a>` : `<button type="button" class="btn" data-act="wear" data-date="${date}">Wear this</button><button type="button" class="btn ghost" data-act="swap" data-date="${date}">Swap a piece</button>`)
    : `<button type="button" class="btn ghost" data-act="swap" data-date="${date}">Swap a piece</button>${date<TODAY?`<a class="btn ghost" href="#log/${date}">Log this day</a>`:''}`;
  return `${masthead()}
  <section class="hero${settle?' settle':''}" aria-label="${dayName(date)}'s outfit">
    <div class="day" aria-hidden="true">${dayShort(date)}</div>
    <div class="date">${esc(nice(date))}${isToday?'':' · planned'}</div>
    <div class="temp"><div class="deg">${w?w.feel+'°':'–'}</div><span class="fc">${esc(forecastLine(w))}</span></div>
    ${pieces || `<p class="empty" style="position:absolute;left:var(--gutter);top:45%">Nothing in the closet fits this day yet.</p>`}
  </section>
  <div class="credits">
    <div class="occ"><button type="button" class="tag ${tagCls}" data-act="occ" data-date="${date}" aria-label="Occasion: ${OCC[occ.occ]}. Tap to change.">${OCC[occ.occ]}</button>${occ.note?`<span class="label">${esc(occ.note)}</span>`:''}</div>
    <p class="credit-line">${o.list.map(({p},i)=>`<span><b>${pad(i+1)}</b> <button type="button" data-piece="${esc(p.id)}">${esc(p.name)}</button>${fabricOf(p).name?`, ${esc(fabricOf(p).name.toLowerCase())}`:''}</span>`).join(' ')}</p>
    <p class="why">${esc(whyLine(o, date))}</p>
    ${o.adjusted?`<p class="adjusted">${esc(o.adjusted)}</p>`:''}
  </div>
  <div class="acts">${actions}</div>
  <nav class="strip" aria-label="This week">${strip}</nav>
  <section class="panel"><span class="cap">The look</span><ol class="notes">${notes}</ol></section>
  <section class="panel"><span class="cap">Colour and fabric</span><ul class="palette">${cf.join('')}</ul></section>`;
}

function viewWeek(){
  const days = weekOf(TODAY), st = stats();
  const note = S.plan && S.plan.week && S.plan.note && monday(S.plan.weekStart||TODAY)===days[0] ? S.plan.note : null;
  const rows = days.map(d=>{
    const o = outfitFor(d), w = wx(d), oc = occasionFor(d);
    const thumbs = o.list.map(({p})=>`<span>${art(p)}</span>`).join('');
    const names = o.list.map(({p})=>p.name).join(', ');
    return `<li class="${d===TODAY?'today':''}"><a href="#day/${d}"><span class="dn">${dayShort(d)}</span><span class="meta"><span class="top"><span class="tag ${oc.occ==='customer'?'customer':oc.occ==='off'?'off':''}">${OCC[oc.occ]}</span><span class="t">${w?w.feel+'°':''}</span></span><span class="thumbs">${thumbs}</span><span class="names">${esc(nice(d))}. ${esc(names)}</span></span></a></li>`;
  }).join('');
  return `${masthead()}
  <header class="pagehead"><h1 class="page">This week</h1><p class="cap">Week ${isoWeek(TODAY)} · ${esc(nice(days[0]))} to ${esc(nice(days[6]))}</p></header>
  ${note?`<div class="plan-note"><span class="label">From Claude</span>${esc(note)}</div>`:''}
  <hr class="rule">
  <ul class="days">${rows}</ul>`;
}

function doubles(){
  const g = {}; closet().forEach(p=>{ const k = [p.cat,p.shape,(p.colour||'').toLowerCase(),(p.name||'').toLowerCase()].join('|'); (g[k]=g[k]||[]).push(p); });
  return Object.values(g).filter(a=>a.length>1);
}
function viewCloset(filter){
  const st = stats(), all = closet();
  const neglected = p => { const l = st[p.id].last; return !p.dontWear && l && daysBetween(l, TODAY) >= 60; };
  const never = p => !p.dontWear && !st[p.id].last;
  const dbl = doubles(), dblIds = new Set(dbl.flat().map(p=>p.id));
  const F = {all:{l:'All', f:p=>true}, rare:{l:'Rarely worn', f:neglected}, never:{l:'Never worn', f:never}, doubles:{l:'Doubles', f:p=>dblIds.has(p.id)}, aside:{l:'Set aside', f:p=>p.dontWear}};
  const counts = {}; Object.keys(F).forEach(k=>counts[k]=all.filter(F[k].f).length);
  const filters = Object.entries(F).map(([k,v])=>`<button type="button" class="label" data-filter="${k}" aria-pressed="${k===filter}">${v.l}<span class="n">${counts[k]}</span></button>`).join('');
  // the editorial read of the wardrobe
  const col = {}; all.forEach(p=>{ const c=(p.colour||'other').toLowerCase(); col[c]=(col[c]||0)+1; });
  const top = Object.entries(col).sort((a,b)=>b[1]-a[1])[0];
  const share = top ? top[1]/all.length : 0;
  const frac = share>=.45?'nearly half' : share>=.3?'a third' : share>=.22?'a quarter' : share>=.15?'a fifth' : null;
  const rareN = counts.rare + counts.never;
  const lede = `${all.length} pieces.${top&&frac?` ${cap1(top[0])} does ${frac} of the work.`:''}${!hasHistory() ? ' Your wear history starts with the first log.' : rareN?` <em>${rareN} haven't been worn in two months.</em>`:''}`;
  const item = p => { const s = st[p.id]; const fresh = hasHistory() && !p.dontWear && (!s.last || daysBetween(s.last, TODAY)>=60);
    const line = p.dontWear ? 'Set aside' : s.count ? `${sinceWords(s.last)} · ${s.count} wear${s.count>1?'s':''}` : sinceWords(null);
    return `<button type="button" class="item${p.dontWear?' aside':''}" data-piece="${esc(p.id)}"><span class="img">${art(p)}</span><span class="nm">${esc(p.name).replace(/(\S+-\S+)/g,'<span class="nb">$1</span>')}</span><span class="st${fresh?' fresh':''}">${esc(line)}</span></button>`; };
  let body = '';
  const list = all.filter(F[filter].f);
  if(filter==='doubles'){
    body = dbl.length ? dbl.map(g=>`<section class="group"><h2 class="sec">${esc(g[0].name)} × ${g.length}</h2><p class="caption" style="margin:8px 0 0">Same piece, ${g.length} times. Worn ${g.map(p=>st[p.id].count).join(' and ')} times. Keep one in rotation and decide on the other.</p><div class="grid">${g.map(item).join('')}</div></section>`).join('') : `<div class="group"><p class="empty">No doubles. Every piece is one of a kind.</p></div>`;
  } else if(filter==='all'){
    const CATS = [['outer','Outerwear'],['top','Tops and knits'],['bottom','Trousers and skirts'],['dress','Dresses'],['shoes','Shoes'],['accessory','Accessories']];
    body = CATS.map(([c,l])=>{ const xs = list.filter(p=>p.cat===c); return xs.length ? `<section class="group"><h2 class="sec">${l}</h2><div class="grid">${xs.map(item).join('')}</div></section>` : ''; }).join('');
  } else {
    body = `<div class="group">${list.length ? `<div class="grid">${list.map(item).join('')}</div>` : `<p class="empty">${filter==='aside'?'Nothing set aside. Open a piece and switch on "I don\'t wear this" to park it here.':'Nothing here. Everything is in rotation.'}</p>`}</div>`;
  }
  return `${masthead()}
  <header class="pagehead"><h1 class="page">Closet</h1><p class="lede">${lede}</p></header>
  <div class="filters" role="toolbar" aria-label="Filter the closet">${filters}</div>
  ${body}`;
}

function viewLog(arg){
  if(arg==='settings') return viewSettings();
  const date = arg, entry = log().find(e=>e.date===date && e.source!=='sample');
  const o = outfitFor(date);
  const sel = new Set(entry ? entry.items : o.list.map(x=>x.p.id));
  const extra = S.state.logExtra || '';
  const planned = o.list.map(x=>x.p);
  const others = closet().filter(p=>!planned.includes(p) && (sel.has(p.id) || (extra && p.cat===extra)));
  const row = p => `<li><label><span class="th">${art(p)}</span><span><span class="nm">${esc(p.name)}</span><span class="sub">${esc(sinceWords(stats()[p.id].last))}</span></span><input type="checkbox" class="check" data-pick="${esc(p.id)}" ${sel.has(p.id)?'checked':''} aria-label="${esc(p.name)}"></label></li>`;
  const cats = [['top','Tops'],['bottom','Bottoms'],['dress','Dresses'],['outer','Outer'],['shoes','Shoes'],['accessory','Extras']];
  const feel = entry && entry.feel;
  const hist = log().filter(e=>e.source!=='sample').slice(-14).reverse().map(e=>`<li><span class="dt">${esc(dayShort(e.date))} ${parse(e.date).getDate()}<small>${e.feel?esc(FEEL[e.feel]):'Logged'}</small></span><span class="thumbs">${(e.items||[]).map(piece).filter(Boolean).map(p=>`<span>${art(p)}</span>`).join('')}</span></li>`).join('');
  return `${masthead()}
  <header class="pagehead"><h1 class="page">${date===TODAY?'Tonight':dayName(date)}</h1><p class="lede">What did you wear${date===TODAY?' today':` on ${esc(nice(date))}`}?</p></header>
  <hr class="rule">
  <ul class="picklist">${planned.map(row).join('')}${others.map(row).join('')}</ul>
  <div class="segs" role="toolbar" aria-label="Add something else"><span class="label" style="color:var(--ink-2);padding-top:2px">Add</span>${cats.map(([k,l])=>`<button type="button" class="label" data-extra="${k}" aria-pressed="${extra===k}">${l}</button>`).join('')}</div>
  <div class="stack">
    <div class="field"><span class="cap">How did it feel?</span></div>
    <div class="feel" role="group" aria-label="How did it feel">${Object.entries(FEEL).map(([k,l])=>`<button type="button" data-feel="${k}" aria-pressed="${feel===k}">${l}</button>`).join('')}</div>
    <div class="field"><label class="cap" for="lognote">A note for next time</label><textarea id="lognote" rows="2" placeholder="Too warm by lunch. Scarf worked.">${esc(entry&&entry.note||'')}</textarea></div>
    <div class="field"><span class="cap">Mirror photo</span><div class="photo-in">${entry&&entry.photoPreview?`<img src="${entry.photoPreview}" alt="Mirror photo">`:''}<label class="linkish" for="photo">${entry&&entry.photoPreview?'Replace photo':'Add a photo'}</label><input type="file" id="photo" accept="image/*" class="sr"></div><span class="hint">Optional. Claude can match it to your pieces.</span></div>
    <div class="acts" style="padding-top:0"><button type="button" class="btn" data-act="savelog" data-date="${date}">Save the log</button></div>
  </div>
  ${hist?`<section class="panel"><span class="cap">Recent days</span><ul class="history">${hist}</ul></section>`:''}
  <section class="panel"><span class="cap">Settings</span><div class="field"><a class="linkish" href="#log/settings">Wardrobe data and sync</a></div></section>`;
}
const FEEL = {me:'Felt like me', fine:'Fine', notme:'Not me'};

function viewSettings(){
  const when = S.synced ? new Date(S.synced).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'never';
  return `${masthead()}
  <header class="pagehead"><h1 class="page">Settings</h1><p class="lede">Your closet, log and Claude's weekly plan live in a private GitHub repo.</p></header>
  <div class="stack">
    <div class="field"><label class="cap" for="repo">Data repo</label><input id="repo" value="${esc(settings.repo)}" autocomplete="off" spellcheck="false"><span class="hint">Owner and name, like nattyvs/wardrobe-private.</span></div>
    <div class="field"><label class="cap" for="token">GitHub token</label><input id="token" type="password" value="${esc(settings.token)}" autocomplete="off" spellcheck="false" placeholder="github_pat_…"><span class="hint">A fine-grained token with read and write access to that repo's contents. It stays on this phone.</span></div>
    <div class="toggles"><label class="toggle"><span>Sample wardrobe<small>Show the demo pieces instead of yours.</small></span><input type="checkbox" class="switch" id="sample" ${settings.sample?'checked':''}></label></div>
    <div class="acts" style="padding-top:0"><button type="button" class="btn" data-act="savesettings">Save and sync</button><a class="btn ghost" href="#log">Back</a></div>
    <div class="field"><span class="hint">Last synced: ${esc(when)}. Forecast from Open-Meteo for ${esc(settings.city)}.</span></div>
  </div>`;
}

/* ---------------- sheets ---------------- */
function openSheet(html){ const s=$('#sheet'); s.innerHTML=html; s.classList.add('open'); $('#scrim').classList.add('open'); setTimeout(()=>{ const f=s.querySelector('[data-close]'); f&&f.focus(); }, 50); }
function closeSheet(){ $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); }
function sheetPiece(id){
  const p = piece(id); if(!p) return;
  const s = stats()[id], f = fabricOf(p);
  const warmW = ['','Light','Mid-weight','Warm','Very warm','Heaviest'][p.warmth||2];
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">${esc(p.cat==='accessory'?'Accessory':cap1(p.cat==='outer'?'Outerwear':p.cat))}</span><button type="button" class="linkish" data-close>Close</button></div>
    <div class="big">${art(p)}</div>
    <h2 class="sec">${esc(p.name)}</h2>
    <dl class="facts">
      <dt>Worn</dt><dd>${s.count?`${s.count} time${s.count>1?'s':''} · ${esc(sinceWords(s.last).toLowerCase())}`:esc(sinceWords(null))}</dd>
      <dt>Fabric</dt><dd>${esc(f.name)}${f.note?`. ${esc(f.note)}`:''}</dd>
      <dt>Warmth</dt><dd>${warmW}</dd>
    </dl>
    <div class="stack">
      <div class="field"><label class="cap" for="pbrand">Brand</label><input id="pbrand" value="${esc(p.brand||'')}" placeholder="From the label"></div>
      <div class="field"><label class="cap" for="pcomp">Composition</label><input id="pcomp" value="${esc(p.composition||'')}" placeholder="80% wool, 20% cashmere"></div>
      <div class="toggles">
        <label class="toggle"><span>Office days</span><input type="checkbox" class="switch" data-occ-toggle="office" ${(p.occasions||[]).includes('office')?'checked':''}></label>
        <label class="toggle"><span>Customer days<small>Smart enough for an important meeting.</small></span><input type="checkbox" class="switch" data-occ-toggle="customer" ${(p.occasions||[]).includes('customer')?'checked':''}></label>
        <label class="toggle"><span>Statement piece<small>Leads the look. One per outfit.</small></span><input type="checkbox" class="switch" id="pstmt" ${p.statement?'checked':''}></label>
        <label class="toggle"><span>I don't wear this<small>Keeps it out of suggestions.</small></span><input type="checkbox" class="switch" id="paside" ${p.dontWear?'checked':''}></label>
      </div>
      <div class="acts" style="padding-top:0"><button type="button" class="btn" data-act="savepiece" data-id="${esc(id)}">Save</button></div>
    </div>`);
}
function sheetSwap(date){
  const o = outfitFor(date);
  const slots = o.list.map(x=>x.slot);
  if(!S.ui.swapSlot || !slots.includes(S.ui.swapSlot)) S.ui.swapSlot = slots[0];
  const slot = S.ui.swapSlot, cur = o.slots[slot];
  const cat = slot==='dress' ? 'dress' : slot;
  const st = stats();
  const opts = closet().filter(p=>p.cat===cat && !p.dontWear).sort((a,b)=>(st[a.id].last||'').localeCompare(st[b.id].last||''));
  const label = {outer:'Outer',top:'Top',dress:'Dress',bottom:'Bottom',shoes:'Shoes',accessory:'Extra'};
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">Swap a piece</span><button type="button" class="linkish" data-close>Done</button></div>
    <div class="segs" role="tablist">${slots.map(k=>`<button type="button" class="label" role="tab" data-swapslot="${k}" aria-pressed="${k===slot}">${label[k]}</button>`).join('')}</div>
    <ul class="swaps">${opts.map(p=>`<li class="${cur&&cur.id===p.id?'cur':''}"><button type="button" data-swapto="${esc(p.id)}" data-slot="${slot}" data-date="${date}"><span class="th">${art(p)}</span><span><span class="nm">${esc(p.name)}</span><span class="sub">${esc(sinceWords(st[p.id].last))} · ${esc(fabricOf(p).name)}</span></span></button></li>`).join('')}
    ${slot==='accessory'||slot==='outer'?`<li><button type="button" data-swapto="" data-slot="${slot}" data-date="${date}"><span class="th"></span><span><span class="nm">Without</span><span class="sub">Leave the ${slot==='outer'?'coat':'extra'} off</span></span></button></li>`:''}</ul>`);
}

/* ---------------- events ---------------- */
S.ui = {};
document.addEventListener('click', async e=>{
  const t = e.target.closest('button, a'); if(!t) return;
  if(t.dataset.close!==undefined){ closeSheet(); return; }
  if(t.dataset.piece){ sheetPiece(t.dataset.piece); return; }
  if(t.dataset.filter){ location.hash = '#closet/'+t.dataset.filter; return; }
  if(t.dataset.extra){ S.ui.keepPicks = currentPicks(); S.state.logExtra = S.state.logExtra===t.dataset.extra ? '' : t.dataset.extra; render(); restorePicks(); return; }
  if(t.dataset.feel){ document.querySelectorAll('[data-feel]').forEach(b=>b.setAttribute('aria-pressed', b===t ? 'true':'false')); return; }
  if(t.dataset.swapslot){ S.ui.swapSlot = t.dataset.swapslot; sheetSwap(route().arg||TODAY); return; }
  if(t.dataset.swapto!==undefined){
    const d = t.dataset.date; S.state.swaps[d] = Object.assign({}, S.state.swaps[d], {[t.dataset.slot]: t.dataset.swapto || null});
    queuePush({state:true}); closeSheet(); render(); toast('Swapped'); return;
  }
  const act = t.dataset.act; if(!act) return;
  if(act==='city'){ settings.city = settings.city==='London' ? 'Paris' : 'London'; saveSettings(); await loadWeather(true); render(); toast(`Forecast for ${settings.city}`); }
  else if(act==='occ'){
    const d = t.dataset.date, cur = occasionFor(d).occ, nx = {office:'customer', customer:'off', off:'office'}[cur];
    S.state.dayOcc[d] = {occ:nx, note: nx==='customer' ? (occasionFor(d).note||'') : ''};
    queuePush({state:true}); render(); toast(OCC[nx]);
  }
  else if(act==='wear'){
    const d = t.dataset.date, o = outfitFor(d);
    upsertLog(d, {items:o.list.map(x=>x.p.id), source:'plan'});
    queuePush({log:true}); render(); toast('Logged as worn');
  }
  else if(act==='swap'){ S.ui.swapSlot = null; sheetSwap(t.dataset.date); }
  else if(act==='savelog'){
    const d = t.dataset.date, items = currentPicks();
    const fb = document.querySelector('[data-feel][aria-pressed="true"]');
    const patch = {items, source:'tick', feel: fb ? fb.dataset.feel : null, note: ($('#lognote')||{}).value || ''};
    if(S.ui.photo){ patch.photoPreview = S.ui.photo.preview; if(ghReady()){ const path = `data/inbox/mirror-${d}-${Date.now()}.jpg`; try{ await ghPutRaw(path, S.ui.photo.b64, `Mirror photo ${d}`); patch.photo = path; }catch(err){ toast(err.message); } } S.ui.photo = null; }
    upsertLog(d, patch); S.state.logExtra = ''; queuePush({log:true}); render(); toast('Saved');
  }
  else if(act==='savepiece'){
    const p = piece(t.dataset.id); if(!p) return;
    const occs = [...document.querySelectorAll('[data-occ-toggle]')].filter(x=>x.checked).map(x=>x.dataset.occToggle);
    if(p.occasions && p.occasions.includes('off')) occs.push('off');
    const patch = {brand: $('#pbrand').value.trim(), composition: $('#pcomp').value.trim(), occasions: occs, statement: $('#pstmt').checked, dontWear: $('#paside').checked};
    Object.assign(p, patch); S.state.edits[p.id] = Object.assign({}, S.state.edits[p.id], patch);
    queuePush({closet:true}); closeSheet(); render(); toast('Saved');
  }
  else if(act==='savesettings'){
    settings.repo = $('#repo').value.trim(); settings.token = $('#token').value.trim(); const wasSample = settings.sample; settings.sample = $('#sample').checked; saveSettings();
    if(!settings.sample && wasSample){ S.closet = []; S.log = (S.log||[]).filter(e=>e.source!=='sample'); S.state.dayOcc = {}; S.state.sampleSeeded = null; }
    if(settings.sample){ ensureSample(); persist(); render(); toast('Showing the sample'); return; }
    if(!settings.token){ toast('Add a token to sync'); return; }
    toast('Syncing…');
    try{ await pull(); render(); toast(closet().length ? `Synced ${closet().length} pieces` : 'Connected. The closet is empty so far.'); }catch(err){ toast(err.message); }
  }
});
document.addEventListener('change', async e=>{
  if(e.target.id==='photo' && e.target.files[0]){
    const f = e.target.files[0];
    const img = await createImageBitmap(f).catch(()=>null); if(!img){ toast("That photo couldn't be read."); return; }
    const k = Math.min(1, 1400/Math.max(img.width, img.height)), cv = document.createElement('canvas');
    cv.width = Math.round(img.width*k); cv.height = Math.round(img.height*k); cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    const url = cv.toDataURL('image/jpeg', .82);
    const small = document.createElement('canvas'); const k2 = 160/Math.max(cv.width,cv.height); small.width=Math.round(cv.width*k2); small.height=Math.round(cv.height*k2); small.getContext('2d').drawImage(cv,0,0,small.width,small.height);
    S.ui.photo = {b64:url.split(',')[1], preview: small.toDataURL('image/jpeg', .7)};
    const wrap = e.target.closest('.photo-in'); let im = wrap.querySelector('img'); if(!im){ im = document.createElement('img'); im.alt='Mirror photo'; wrap.prepend(im); } im.src = S.ui.photo.preview;
    toast('Photo added. Save the log to keep it.');
  }
});
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });
function currentPicks(){ return [...document.querySelectorAll('[data-pick]')].filter(x=>x.checked).map(x=>x.dataset.pick); }
function restorePicks(){ const keep = S.ui.keepPicks; if(!keep) return; document.querySelectorAll('[data-pick]').forEach(x=>x.checked = keep.includes(x.dataset.pick)); S.ui.keepPicks = null; }
function upsertLog(date, patch){
  S.log = (S.log||[]).filter(e=>!(e.date===date && e.source==='sample'));
  const i = S.log.findIndex(e=>e.date===date);
  const entry = Object.assign({date}, i>=0 ? S.log[i] : {}, patch, {updated:Date.now()});
  if(i>=0) S.log[i] = entry; else S.log.push(entry);
  S.log.sort((a,b)=>a.date.localeCompare(b.date));
}

/* ---------------- boot ---------------- */
window.addEventListener('hashchange', ()=>{ closeSheet(); render({settle: route().name==='today' || route().name==='day'}); window.scrollTo(0,0); });
async function boot(){
  ensureSample();
  if(!S.weather || S.weather.city!==settings.city) S.weather = sampleWeather();
  render({settle:true});
  await loadWeather();
  if(ghReady()){ try{ await pull(); }catch(e){ toast(e.message); } }
  persist();
  render();
}
if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();
})();
