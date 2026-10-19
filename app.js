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
const settings = Object.assign({token:'', repo:'nattyvs/wardrobe-private', city:'London', sample:true, bagsOffice:false}, LS.get('wd.settings', {}));
const ON_REPEAT_DAYS = 28; // how long an "on repeat" tap lasts before it fades. One number to change.
const cache = LS.get('wd.cache', {});
const S = {
  closet: cache.closet || null,
  log: cache.log || null,
  plan: cache.plan || null,
  state: Object.assign({dayOcc:{}, swaps:{}, edits:{}, onRepeat:{}, ruleOff:{}}, cache.state || {}),
  trips: cache.trips || [],
  palette: cache.palette || null,
  tripwx: LS.get('wd.tripwx', {}),
  weather: LS.get('wd.weather', null),
  sha: cache.sha || {},
  synced: cache.synced || null,
  photos: {},
  ui: {memo:{}, rules:null}
};
function persist(){ S.ui.memo = {}; S.ui.rules = null; LS.set('wd.cache', {closet:S.closet, log:S.log, plan:S.plan, state:S.state, trips:S.trips, palette:S.palette, sha:S.sha, synced:S.synced}); }
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
const shortDate = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`; };
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

/* ---------------- trips: spans and lookups ---------------- */
const TRIP_ACTS = [['work','Work'],['family','Family'],['beach','Beach'],['evenings','Evenings out'],['sightseeing','Sightseeing']];
function tripSpan(t){
  const st = (t.stops||[]).filter(s=>s.from && s.to);
  if(!st.length) return null;
  return {from: st.map(s=>s.from).sort()[0], to: st.map(s=>s.to).sort().slice(-1)[0]};
}
function tripDays(t){
  const sp = tripSpan(t), out = [];
  if(!sp) return out;
  for(let d = sp.from; d <= sp.to && out.length < 60; d = addDays(d,1)) out.push(d);
  return out;
}
function stopIndexFor(t, date){
  const stops = t.stops||[];
  let hit = stops.findIndex(s=>s.from && s.from<=date && date<=s.to);
  if(hit>=0) return hit;
  let best = -1; stops.forEach((s,i)=>{ if(s.from && s.from<=date && (best<0 || s.from>=stops[best].from)) best = i; });
  return best>=0 ? best : 0;
}
// The trip whose dates cover this day. Date based, so next week's trip days already show the trip's weather and packed pieces.
const liveTrips = () => S.trips.filter(t=>!t.deleted);
const tripById = id => liveTrips().find(t=>t.id===id);
function activeTrip(date){ return liveTrips().find(t=>{ const sp = tripSpan(t); return sp && sp.from<=date && date<=sp.to; }) || null; }
function upcomingTrips(){ return liveTrips().filter(t=>{ const sp = tripSpan(t); return sp && sp.to>=TODAY; }).sort((a,b)=>tripSpan(a).from.localeCompare(tripSpan(b).from)); }
const shortPlace = s => String(s||'').split(',')[0].trim();
function tripName(t){ return t.name || (t.stops&&t.stops[0]&&t.stops[0].place ? `Trip to ${shortPlace(t.stops[0].place)}` : 'Trip'); }
function tripDates(t){ const sp = tripSpan(t); return sp ? (sp.from===sp.to ? nice(sp.from) : `${nice(sp.from)} to ${nice(sp.to)}`) : 'No dates yet'; }

/* ---------------- occasions ---------------- */
const OCC = {office:'Office day', customer:'Customer day', off:'Day off'};
function occasionFor(date){
  const o = S.state.dayOcc[date];
  if(o && o.occ) return o;
  const dow = parse(date).getDay();
  const trip = activeTrip(date);
  // On a trip the days are days off unless the trip includes work, and then weekdays are office days.
  if(trip) return {occ: (trip.activities||[]).includes('work') && dow>0 && dow<6 ? 'office' : 'off', note:''};
  const pd = S.plan && S.plan.days && S.plan.days.find(d=>d.date===date);
  if(pd && pd.occasion) return {occ:pd.occasion, note:pd.occasionNote||''};
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
// A trip day uses the stop's weather (or nothing, if none is out yet). Every other day uses the home city.
function wx(date){
  const t = activeTrip(date);
  if(t){ const c = S.tripwx[t.id]; return (c && c.days && c.days[date]) || null; }
  return (S.weather && S.weather.days[date]) || null;
}
function band(t){ return t>=20?1 : t>=15?2 : t>=10?3 : t>=5?4 : 5; }
function forecastLine(w, date){
  if(!w) return activeTrip(date||TODAY) ? 'Forecast not out yet' : 'No forecast yet';
  const range = `${w.min}–${w.max}°`;
  if(w.src==='typical') return w.rainChance>=50 ? `Typical · often wet · ${range}` : `Typical · ${range}`;
  if(w.rainFrom!=null){ const h = w.rainFrom; const t = h===12 ? 'midday' : h<12 ? `${h}am` : `${h-12}pm`; return h<=9 ? 'Rain all day' : `Rain after ${t}`; }
  if(w.rainChance>=60) return `Rain likely · ${range}`;
  return `Dry · ${range}`;
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

/* ---------------- piece state: status, on repeat, reactions, rules ---------------- */
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
const STATUS = {available:'Available', wash:'In the wash', drycleaner:'At the dry cleaner', repair:'Being repaired', donate:'Going to donate', trip:'Away on a trip'};
const STATUS_TAP = {available:'Available', wash:'Wash', drycleaner:'Dry cleaner', repair:'Repair', donate:'Donate', trip:'Away'};
const statusOf = p => STATUS[p.status] ? p.status : 'available';
// At home only available pieces are suggested. On a trip, pieces marked "away" are the ones in the suitcase, so they count too.
const usable = (p, away) => !p.dontWear && (statusOf(p)==='available' || (away && statusOf(p)==='trip'));
const slotOf = p => p.cat==='accessory' ? (p.shape==='belt' ? 'belt' : 'accessory') : p.cat;
function onRepeatSince(id, date){
  const d = S.state.onRepeat[id]; if(!d) return null;
  const n = daysBetween(d, date || TODAY);
  return n>=0 && n<ON_REPEAT_DAYS ? d : null;
}
const REACT = {'loved':'Loved it', 'too-cold':'Too cold', 'too-warm':'Too warm', 'uncomfortable':'Uncomfortable', 'colours-dead':'Colours looked dead', 'off-palette':'Felt off-palette'};
const RKIND = {'loved':'loved', 'too-cold':'cold', 'too-warm':'warm', 'uncomfortable':'uncomfy', 'off-palette':'off'};

/* Two of the same reaction become a rule. Rules are worked out from the log each time, so nothing extra is stored,
   and "Undo" only has to remember how many reports it was set aside at (state.ruleOff). */
function rules(){
  if(S.ui.rules) return S.ui.rules;
  const found = {}, seen = new Set();
  const hit = (key, meta, once) => { if(seen.has(once)) return; seen.add(once); (found[key] = found[key] || Object.assign({key, n:0}, meta)).n++; };
  log().filter(e=>e.source!=='sample' && e.reactions && e.reactions.length).forEach(e=>{
    const items = (e.items||[]).map(piece).filter(Boolean);
    const clothes = items.filter(p=>['outer','top','dress','bottom','accessory'].includes(slotOf(p)));
    const warmest = items.find(p=>p.cat==='outer') || items.find(p=>p.cat==='top') || items.find(p=>p.cat==='dress');
    const face = items.find(p=>p.cat==='top' || p.cat==='dress');
    e.reactions.forEach(r=>{
      const one = r.item ? items.filter(p=>p.id===r.item) : null;
      if(r.tag==='colours-dead'){
        (one || clothes).forEach(x=>clothes.forEach(y=>{
          if(x.id===y.id) return;
          const [a,b] = x.id<y.id ? [x,y] : [y,x];
          hit('pair:'+a.id+'|'+b.id, {kind:'pair', a:a.id, b:b.id}, e.date+'|pair|'+a.id+'|'+b.id);
        }));
        return;
      }
      const kind = RKIND[r.tag]; if(!kind) return;
      const targets = one || (kind==='loved' ? items : kind==='off' ? [face] : kind==='uncomfy' ? [] : [warmest]);
      targets.filter(Boolean).forEach(p=>hit(kind+':'+p.id, {kind, id:p.id}, e.date+'|'+kind+'|'+p.id));
    });
  });
  const R = {warm:{}, avoid:{}, off:{}, loved:{}, pairs:new Set(), list:[]};
  Object.values(found).forEach(r=>{
    const floor = S.state.ruleOff[r.key] || 0;
    if(r.n < 2 || r.n < floor + 2) return;
    R.list.push(r);
    if(r.kind==='cold') R.warm[r.id] = (R.warm[r.id]||0) - Math.min(2, Math.floor(r.n/2));
    else if(r.kind==='warm') R.warm[r.id] = (R.warm[r.id]||0) + Math.min(2, Math.floor(r.n/2));
    else if(r.kind==='uncomfy') R.avoid[r.id] = true;
    else if(r.kind==='off') R.off[r.id] = true;
    else if(r.kind==='loved') R.loved[r.id] = true;
    else if(r.kind==='pair') R.pairs.add(r.a+'|'+r.b);
  });
  return S.ui.rules = R;
}
const warmthOf = p => clamp((p.warmth||2) + (rules().warm[p.id]||0), 1, 5);
const pairAvoid = (a,b) => rules().pairs.has(a<b ? a+'|'+b : b+'|'+a);
function ruleText(r){
  const name = id => { const p = piece(id); return p ? p.name.toLowerCase() : 'another piece'; };
  const k = Math.min(2, Math.floor(r.n/2)), steps = k>1 ? 'two steps' : 'one step';
  return {
    cold: `Counts as ${steps} lighter after ${r.n} "Too cold" reports.`,
    warm: `Counts as ${steps} warmer after ${r.n} "Too warm" reports.`,
    uncomfy: `Shown less often after ${r.n} "Uncomfortable" reports.`,
    off: `Counts as off your palette near the face after ${r.n} "Felt off-palette" reports.`,
    loved: `Shown a little more often after ${r.n} "Loved it" reports.`
  }[r.kind] || '';
}

/* ---------------- colour at the face ----------------
   The palette lives in the private repo (data/palette.json), never in this code. No file, no feature. */
function colourClass(colour){
  const P = S.palette; if(!P) return null;
  const c = String(colour||'').toLowerCase();
  if((P.best||[]).includes(c)) return 'best';
  if((P.cool||[]).includes(c)) return 'cool';
  if((P.neutralOk||[]).includes(c)) return 'neutral-ok';
  return null;
}
const faceClass = p => rules().off[p.id] ? 'cool' : colourClass(p.colour);
const isDark = p => /^(black|navy)$/i.test(p.colour||'');
function faceBonus(p, slot){
  if(!S.palette) return 0;
  if(!(slot==='top' || slot==='dress' || (slot==='accessory' && p.shape==='scarf'))) return 0;
  const c = faceClass(p); return c==='best' ? 1.2 : c==='cool' ? -1.2 : 0;
}
const isWarmAccent = x => !!x && (x.shape==='belt' ? /gold/i.test(x.name||'') : faceClass(x)==='best');
function faceNote(o){
  if(!S.palette) return '';
  const face = o.slots.top || o.slots.dress; if(!face) return '';
  const cls = faceClass(face);
  if(cls!=='cool' && !isDark(face)) return '';
  const warm = [o.slots.accessory, o.slots.belt].filter(isWarmAccent)[0];
  const lead = `${cap1((face.colour||'').toLowerCase())} at the face`;
  if(warm) return `${lead}: the ${warm.shape==='belt' ? 'gold-buckle belt' : warm.name.toLowerCase()} warms it.`;
  return cls==='cool' ? `${lead}. Nothing warm in the look to balance it.` : '';
}

/* ---------------- belts, scarves and bags ---------------- */
const hasLoops = p => !!p && (p.shape==='jeans' || p.shape==='trou') && !/pull-on|drawstring/i.test(p.name||'');
const WARM = /camel|brown|tan|rust|orange|khaki|cream|ecru|oatmeal|taupe|beige|mustard|terracotta|red|burgundy|wine|oxblood|berry|raspberry|olive|green/;
function beltWant(b, need){
  const c = (b.colour||'').toLowerCase();
  if(b.shape==='jeans' || /denim|chambray|indigo/.test(c)) return 'tan';
  if(/^(black|charcoal|grey|gray|slate)$/.test(c) || c==='black and white') return 'black';
  if(/navy/.test(c)) return 'white';
  if(WARM.test(c)) return 'tan';
  return need<=1 ? 'white' : 'tan';
}
function beltFrom(belts, want){ return belts.find(x=>(x.colour||'').toLowerCase()===want) || belts[0] || null; }
const PATTERN = /print|floral|stripe|check|leopard|paisley|brush|graphic|dot|polka|gingham|animal|tweed/i;
const patterned = p => /\band\b/.test(p.colour||'') || PATTERN.test(p.name||'');
function compatible(a,b){
  if(patterned(a) && patterned(b)) return false;
  const an = NEUTRAL.test(a.colour||''), bn = NEUTRAL.test(b.colour||'');
  return an || bn || (a.colour||'')===(b.colour||'');
}

/* ---------------- outfit engine ---------------- */
const NEUTRAL = /black|white|ivory|cream|grey|gray|charcoal|navy|camel|stone|beige|brown|tan|indigo|denim|taupe|sand/;
const targetWarmth = need => ({outer: need>=4?5 : need===3?3 : 2, top: need>=4?4 : need===3?3 : need===2?2 : 1, bottom: need>=3?3 : 2, dress: need>=3?3:1, shoes: need>=4?3 : need===3?2 : 1, accessory: need>=4?3 : 1});
// opts.scope: a Set of ids to draw from (the suitcase). opts.planned: {id: date} of looks already planned, so rewears are spaced out.
function buildOutfit(date, opts){
  opts = opts || {};
  const scope = opts.scope !== undefined ? opts.scope : tripScope(date);
  const o = occasionFor(date).occ, w = wx(date), t = w ? w.feel : 12, need = band(t);
  const st = stats(date), R = rules();
  const pool = closet().filter(p=>usable(p, !!scope) && (scope ? scope.has(p.id) : (!p.occasions || !p.occasions.length || p.occasions.includes(o))));
  const recentDays = id => {
    if(onRepeatSince(id, date)) return 2; // on repeat counts as worn in the last few days
    let l = st[id] && st[id].last; const pl = opts.planned && opts.planned[id];
    if(pl && (!l || pl > l)) l = pl;
    return l ? daysBetween(l, date) : 999;
  };
  const formal = o==='customer' ? 2.5 : o==='office' ? 1.6 : 1;
  const target = targetWarmth(need);
  function score(p, slot){
    let s = 0;
    if(target[slot]!=null) s -= Math.abs(warmthOf(p) - target[slot]) * 1.1;
    // Trainers are fine on customer days; shoes get a lighter formality pull than clothes.
    s -= Math.max(0, formal - (p.formality||2)) * (slot==='shoes' ? 0.5 : 1.6);
    if(o==='off') s -= Math.max(0, (p.formality||2) - 2) * 0.6;
    if(o==='customer' && p.statement) s += 0.8;
    const ago = recentDays(p.id);
    s += ago===999 ? 2.6 : Math.min(ago, 120)/40;
    if(ago < 3) s -= 4;
    if(slot==='shoes' && need>=4 && p.shape==='boot') s += 1.2;
    if(slot==='shoes' && w && w.rainChance>=60 && /suede/i.test(p.composition||'')) s -= 3;
    if(R.avoid[p.id]) s -= 3.5;
    if(R.loved[p.id]) s += 0.8;
    s += faceBonus(p, slot);
    s += hash(date+p.id)*0.35;
    return s;
  }
  const by = k => pool.filter(p=>slotOf(p)===k);
  const pick = (k, slot, chosen, filt) => {
    const list = by(k).filter(p=>!filt || filt(p)).map(p=>{
      let s = score(p, slot);
      const stmt = chosen.filter(c=>c.statement).length;
      if(p.statement && stmt) s -= 2.5;
      const accent = chosen.find(c=>!NEUTRAL.test(c.colour||''));
      if(accent && !NEUTRAL.test(p.colour||'')) s -= 2;
      if(chosen.some(c=>pairAvoid(c.id, p.id))) s -= 50;
      return {p, s};
    }).sort((a,b)=>b.s-a.s);
    return list[0] ? list[0].p : null;
  };
  // The hero: the most neglected piece that suits today.
  const suitable = pool.filter(p=>['outer','top','dress','bottom','shoes','accessory'].includes(slotOf(p)) && (p.cat!=='outer' || need>=2)).map(p=>({p, s: score(p, slotOf(p)) + (recentDays(p.id)===999?1:Math.min(recentDays(p.id),120)/30)})).sort((a,b)=>b.s-a.s);
  const hero = hasHistory() && suitable[0] && recentDays(suitable[0].p.id) >= 45 ? suitable[0].p : null;
  const chosen = hero ? [hero] : [];
  const slots = {};
  if(hero) slots[slotOf(hero)] = hero;
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
  if(!has('accessory') && (o==='customer' || need>=4)){ const x = pick('accessory','accessory',chosen); if(x && (o==='customer' || warmthOf(x)>=3)){slots.accessory=x;chosen.push(x);} }
  // A belt when the bottom has loops. Without loops, a long scarf takes the accent slot.
  const loops = hasLoops(slots.bottom);
  if(loops && !slots.belt){ const b = beltFrom(by('belt'), beltWant(slots.bottom, need)); if(b){ slots.belt = b; chosen.push(b); } }
  const longScarf = p => p.shape==='scarf' && !/headband/i.test(p.name||'');
  if(slots.bottom && !loops && !slots.accessory && need>=2){ const x = pick('accessory','accessory',chosen,longScarf); if(x){ slots.accessory = x; chosen.push(x); } }
  // Black or navy at the face: bring in something warm, unless it is too hot for a scarf.
  const face = slots.top || slots.dress;
  if(S.palette && face && isDark(face) && !isWarmAccent(slots.accessory) && !isWarmAccent(slots.belt) && need>=2){
    const x = pick('accessory','accessory',chosen,p=>longScarf(p) && faceClass(p)==='best');
    if(x){ slots.accessory = x; chosen.push(x); }
  }
  // Bags: day-off looks by default, office days if the setting is on, and always in a suitcase.
  if(!slots.bag && (o==='off' || settings.bagsOffice || scope)){ const x = pick('bag','bag',chosen); if(x){ slots.bag = x; chosen.push(x); } }
  return {slots, hero, temp:t, need, occ:o, scope:!!scope};
}
const SLOT_ORDER = ['outer','top','dress','bottom','belt','shoes','accessory','bag'];
function applySwaps(res, date){
  const sw = S.state.swaps[date] || {};
  Object.entries(sw).forEach(([k,id])=>{ if(id===null) delete res.slots[k]; else { const p = piece(id); if(p) res.slots[k] = p; } });
  res.list = SLOT_ORDER.filter(k=>res.slots[k]).map(k=>({slot:k, p:res.slots[k]}));
  return res;
}
function tripScope(date){ const t = activeTrip(date); return t && t.packed && t.packed.length ? new Set(t.packed) : null; }
function outfitFor(date){
  let res, adjusted = null, fromPlan = false;
  const trip = activeTrip(date);
  const pd = !trip && S.plan && S.plan.days && S.plan.days.find(d=>d.date===date);
  const worn = log().find(e=>e.date===date && e.source!=='sample');
  if(worn && worn.items && worn.items.length){
    const slots = {}; worn.items.map(piece).filter(Boolean).forEach(p=>{ slots[slotOf(p)] = p; });
    const w = wx(date), t = w ? w.feel : 12, st = stats(date);
    const hero = Object.values(slots).filter(p=>{ const l = st[p.id] && st[p.id].last; return !l || daysBetween(l,date)>=45; })[0] || null;
    res = {slots, hero, temp:t, need:band(t), occ:occasionFor(date).occ, why: worn.why};
    res.list = SLOT_ORDER.filter(k=>res.slots[k]).map(k=>({slot:k, p:res.slots[k]}));
    res.logged = true; res.fromPlan = false; res.adjusted = null;
    return res;
  }
  if(trip && trip.packed && trip.packed.length && tripLooks(trip)[date]){
    const m = tripLooks(trip)[date];
    res = Object.assign({}, m, {slots:Object.assign({}, m.slots)});
  } else if(pd && pd.outfit && pd.outfit.length){
    fromPlan = true;
    const slots = {};
    pd.outfit.map(piece).filter(Boolean).forEach(p=>{ slots[slotOf(p)] = p; });
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
  applySwaps(res, date);
  res.adjusted = adjusted; res.fromPlan = fromPlan;
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
  if(o.slots.accessory && o.slots.bottom && !o.slots.belt && !hasLoops(o.slots.bottom) && o.slots.accessory.shape==='scarf') bits.push('No belt loops, so the scarf is the accent.');
  return bits.join(' ');
}

/* ---------------- trips: weather per stop ---------------- */
const feelOf = (amax, amin) => Math.round(amax*0.6 + amin*0.4);
function shiftYear(s, k){ const [y,m,d] = s.split('-').map(Number); return iso(new Date(y-k, m-1, d, 12)); }
// The forecast reaches 16 days. After that, the same dates in the last three years, labelled "typical" and never passed off as a forecast.
async function fetchStopWeather(s){
  const out = {}, want = [];
  for(let d = s.from; d <= s.to && want.length < 60; d = addDays(d,1)) want.push(d);
  try{
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max&timezone=auto&forecast_days=16`, {cache:'no-store'});
    if(r.ok){
      const j = await r.json();
      j.daily.time.forEach((d,i)=>{ if(want.includes(d)) out[d] = {max:Math.round(j.daily.temperature_2m_max[i]), min:Math.round(j.daily.temperature_2m_min[i]), feel:feelOf(j.daily.apparent_temperature_max[i], j.daily.apparent_temperature_min[i]), rainFrom:null, rainChance:j.daily.precipitation_probability_max[i], src:'forecast'}; });
    }
  }catch(e){}
  const missing = want.filter(d=>!out[d]);
  if(missing.length){
    try{
      const years = {};
      await Promise.all([1,2,3].map(async k=>{
        const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${s.lat}&longitude=${s.lon}&start_date=${shiftYear(missing[0],k)}&end_date=${shiftYear(missing[missing.length-1],k)}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=auto`);
        if(!r.ok) return;
        const j = await r.json(), m = {};
        j.daily.time.forEach((d,i)=>{ m[d] = {max:j.daily.temperature_2m_max[i], min:j.daily.temperature_2m_min[i], amax:j.daily.apparent_temperature_max[i], amin:j.daily.apparent_temperature_min[i], mm:j.daily.precipitation_sum[i]}; });
        years[k] = m;
      }));
      missing.forEach(d=>{
        const xs = Object.entries(years).map(([k,m])=>m[shiftYear(d,+k)]).filter(x=>x && [x.max,x.min,x.amax,x.amin].every(v=>typeof v==='number'));
        if(!xs.length) return;
        const avg = f => xs.reduce((a,x)=>a+f(x),0)/xs.length;
        out[d] = {max:Math.round(avg(x=>x.max)), min:Math.round(avg(x=>x.min)), feel:feelOf(avg(x=>x.amax), avg(x=>x.amin)), rainFrom:null, rainChance:Math.round(100*xs.filter(x=>x.mm>=1).length/xs.length), src:'typical'};
      });
    }catch(e){}
  }
  return out;
}
async function loadTripWeather(t, force){
  const sig = JSON.stringify((t.stops||[]).map(s=>[s.lat,s.lon,s.from,s.to]));
  const c = S.tripwx[t.id];
  if(!force && c && c.sig===sig && c.fetched && Date.now()-c.fetched < 3*3600e3) return false;
  const days = {};
  for(const s of (t.stops||[])){ if(s.lat==null || s.lon==null || !s.from || !s.to) continue; Object.assign(days, await fetchStopWeather(s)); }
  S.tripwx[t.id] = {sig, fetched: Object.keys(days).length ? Date.now() : Date.now() - 3*3600e3 + 5*60e3, days}; // nothing back: try again in five minutes
  LS.set('wd.tripwx', S.tripwx); S.ui.memo = {}; S.ui.rules = null;
  return true;
}
async function geocode(name){
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
  if(!r.ok) throw new Error("Couldn't search for that place.");
  const j = await r.json();
  return (j.results||[]).map(x=>({label:[x.name, x.admin1, x.country].filter((v,i,a)=>v && a.indexOf(v)===i).join(', '), lat:+x.latitude.toFixed(3), lon:+x.longitude.toFixed(3)}));
}

/* ---------------- trips: looks, packing and gaps ---------------- */
function tripContext(t){
  return tripDays(t).map(date=>{
    const w = wx(date);
    return {date, occ:occasionFor(date).occ, w, t: w ? w.feel : null, tmin: w ? w.min : null, rain: !!w && (w.rainFrom!=null || (w.rainChance||0)>=60)};
  });
}
// One look per trip day from the suitcase, in date order, so each piece is rested between wears. Rewears are on purpose.
function planLooks(t, ids){
  const scope = new Set(ids), planned = {}, looks = {};
  tripDays(t).forEach(date=>{
    const logged = log().find(e=>e.date===date && e.source!=='sample' && e.items && e.items.length);
    if(logged){ logged.items.forEach(id=>planned[id] = date); return; }
    const res = applySwaps(buildOutfit(date, {scope, planned}), date);
    res.list.forEach(({p})=>planned[p.id] = date);
    looks[date] = res;
  });
  return looks;
}
function tripLooks(t){
  const key = t.id+'|'+(t.packed||[]).join(',')+'|'+(t.updated||0);
  return S.ui.memo[key] || (S.ui.memo[key] = planLooks(t, t.packed||[]));
}
function usageCount(looks){
  const use = {};
  Object.values(looks).forEach(r=>r.list.forEach(({p})=>use[p.id] = (use[p.id]||0)+1));
  return use;
}
function packTrip(t){
  const ctx = tripContext(t), D = ctx.length;
  if(!D) return [];
  const acts = new Set(t.activities||[]), carryOn = !!t.carryOn;
  const known = ctx.filter(c=>c.t!=null);
  const needOf = c => c.t!=null ? band(c.t) : 3; // days without weather are planned as mild; the screen says so
  const R = rules(), st = stats();
  const pool = closet().filter(p=>usable(p, true));
  const FORMAL = {customer:2.5, office:1.6, off:1};
  const days = ctx.map(c=>({c, need:needOf(c), formal:FORMAL[c.occ]}));
  if(acts.has('evenings')){ for(let i=0;i<Math.max(1,Math.round(D/3));i++){ const c = ctx[Math.min(D-1, i*3+2)]; days.push({c, need:needOf(c), formal:2.4}); } }
  const ago = p => { const l = st[p.id] && st[p.id].last; return l ? daysBetween(l, TODAY) : 999; };
  const base = (p, slot) => (ago(p)===999 ? 1 : Math.min(ago(p),120)/120) + (R.avoid[p.id] ? -3 : 0) + (R.loved[p.id] ? .6 : 0) + faceBonus(p, slot)*0.8;
  const dayScore = (p, slot, d) => {
    const tg = targetWarmth(d.need)[slot];
    let s = 3 - (tg!=null ? Math.abs(warmthOf(p) - tg) * 1.1 : 0);
    s -= Math.max(0, d.formal - (p.formality||2)) * (slot==='shoes' ? .5 : 1.4);
    if(d.c.occ==='off') s -= Math.max(0,(p.formality||2)-2)*.6;
    if(slot==='shoes' && d.c.rain && /suede/i.test(p.composition||p.name||'')) s -= 2.5;
    if(slot==='shoes' && acts.has('sightseeing') && p.shape==='trainer') s += .8;
    return s;
  };
  // Greedy cover: each pick is the piece that does most for the days nothing yet serves well.
  function choose(slot, count, filt, extra, dl){
    dl = dl && dl.length ? dl : days;
    const list = pool.filter(p=>slotOf(p)===slot && (!filt || filt(p)));
    const best = dl.map(()=>0), out = [];
    for(let k=0;k<count && k<list.length;k++){
      let top = null, topV = -1e9;
      list.forEach(p=>{
        if(out.includes(p)) return;
        let gain = 0; dl.forEach((d,i)=>{ gain += Math.max(0, dayScore(p,slot,d) - best[i]); });
        let v = gain/dl.length + base(p,slot);
        if(out.some(q=>q.shape===p.shape && q.colour===p.colour)) v -= 1.2;
        if(extra) v += extra(p, out);
        if(v > topV){ top = p; topV = v; }
      });
      if(!top) break;
      out.push(top); dl.forEach((d,i)=>{ best[i] = Math.max(best[i], dayScore(top,slot,d)); });
    }
    return out;
  }
  const nDress = days.some(d=>d.need<=3) ? clamp(Math.round(D/4), 0, 3) : 0;
  const sep = Math.max(1, D - nDress);
  const bottoms = choose('bottom', clamp(Math.floor(sep/2), 1, 4), null, p=>NEUTRAL.test(p.colour||'') && !patterned(p) ? 1 : 0);
  const tops = choose('top', clamp(Math.ceil(sep/2), 1, 6), null, p=>bottoms.length ? (bottoms.filter(b=>compatible(p,b)).length/bottoms.length)*2 - 1.2 : 0);
  const dresses = nDress ? choose('dress', nDress) : [];
  const minT = known.length ? Math.min(...known.map(c=>c.tmin!=null ? c.tmin : c.t)) : null;
  const eveNeed = minT!=null ? band(minT) : Math.max(...days.map(d=>d.need));
  let outers = [];
  const keep = new Set();
  if(eveNeed>=2){
    const outerDays = days.filter(d=>d.need>=2 || d.formal>=2.4);
    const spread = Math.max(...days.map(d=>d.need)) - Math.min(...days.map(d=>d.need));
    const nOuter = (!carryOn && spread>=2 && D>=5) ? 2 : 1;
    outers = choose('outer', nOuter, null, null, outerDays);
    const want = targetWarmth(eveNeed).outer;
    if(!outers.some(x=>warmthOf(x) >= want-1)){
      const x = pool.filter(p=>slotOf(p)==='outer').sort((a,b)=>Math.abs(warmthOf(a)-want)-Math.abs(warmthOf(b)-want))[0];
      if(x) outers = [x].concat(outers.filter(y=>y!==x)).slice(0,nOuter);
    }
    const layer = outers.slice().sort((a,b)=>Math.abs(warmthOf(a)-want)-Math.abs(warmthOf(b)-want))[0];
    if(layer) keep.add(layer.id);
  }
  const shoes = choose('shoes', D<=2 ? 1 : (carryOn || D<8 ? 2 : 3));
  const scarf = eveNeed>=3 ? choose('accessory', 1, p=>p.shape==='scarf' && !/headband/i.test(p.name||'')) : [];
  const belts = pool.filter(p=>slotOf(p)==='belt'), beltsIn = [];
  const medianNeed = days.map(d=>d.need).sort((a,b)=>a-b)[Math.floor(days.length/2)];
  bottoms.filter(hasLoops).forEach(b=>{ const x = beltFrom(belts, beltWant(b, medianNeed)); if(x && !beltsIn.includes(x)) beltsIn.push(x); });
  const bag = choose('bag', 1);
  let ids = [].concat(bottoms, tops, dresses, outers, shoes, scarf, beltsIn, bag).map(p=>p.id);
  // Rest the pieces no look wore, and any bottom worn only once when there are others to share the days.
  for(let pass=0; pass<8; pass++){
    const use = usageCount(planLooks(t, ids));
    let next = ids.filter(id=>(use[id]||0)>0 || keep.has(id));
    if(D>=4){
      const bs = next.map(piece).filter(p=>p && p.cat==='bottom').sort((a,b)=>(use[a.id]||0)-(use[b.id]||0));
      if(bs.length>1 && (use[bs[0].id]||0)<2) next = next.filter(id=>id!==bs[0].id);
    }
    if(D>=6 && next.length===ids.length){
      const tp = next.map(piece).filter(p=>p && (p.cat==='top' || p.cat==='dress')).sort((a,b)=>(use[a.id]||0)-(use[b.id]||0));
      if(tp.length>2 && (use[tp[0].id]||0)<2) next = next.filter(id=>id!==tp[0].id);
    }
    if(next.length===ids.length) break;
    ids = next;
  }
  return ids;
}
function tripReasons(t){
  const looks = tripLooks(t), use = usageCount(looks), n = Object.keys(looks).length;
  const ctx = tripContext(t), known = ctx.filter(c=>c.t!=null);
  const minT = known.length ? Math.min(...known.map(c=>c.tmin!=null ? c.tmin : c.t)) : null;
  const packed = (t.packed||[]).map(piece).filter(Boolean);
  const outers = packed.filter(p=>p.cat==='outer');
  const layer = minT!=null && band(minT)>=2 && outers.length ? outers.slice().sort((a,b)=>warmthOf(b)-warmthOf(a))[0] : null;
  const out = {};
  packed.forEach(p=>{
    const k = use[p.id]||0, bits = [];
    if(layer && layer.id===p.id) bits.push(`Your layer for the coolest evening, ${minT}°`);
    bits.push(n ? (k ? `works in ${k} of ${n} looks` : 'not in any look yet') : '');
    out[p.id] = cap1(bits.filter(Boolean).join('. ')).replace(/^$/, '');
  });
  return out;
}
function tripGaps(t){
  const ctx = tripContext(t), D = ctx.length, ids = t.packed||[], packed = ids.map(piece).filter(Boolean);
  const acts = new Set(t.activities||[]), gaps = [], notes = [];
  if(!D) return {gaps, notes};
  const when = ds => ds.length===1 ? nice(ds[0]) : ds.length<=3 ? ds.map(d=>`${dayShort(d)} ${parse(d).getDate()}`).join(', ') : `${ds.length} days`;
  const unk = ctx.filter(c=>c.t==null).map(c=>c.date), typ = ctx.filter(c=>c.w && c.w.src==='typical').map(c=>c.date);
  if(unk.length) notes.push(`No forecast yet for ${when(unk)}. The capsule assumes mild weather. Check again nearer the time.`);
  if(typ.length) notes.push(`${when(typ)} show typical weather from the last three years, not a forecast.`);
  if(!ids.length) return {gaps, notes};
  const looks = tripLooks(t);
  const incomplete = ctx.filter(c=>{ const r = looks[c.date]; return r && !(r.slots.dress || (r.slots.top && r.slots.bottom)); }).map(c=>c.date);
  if(incomplete.length) gaps.push(`Nothing complete to wear on ${when(incomplete)}.`);
  const outerMax = Math.max(0, ...packed.filter(p=>p.cat==='outer').map(warmthOf));
  const cold = ctx.filter(c=>c.t!=null && band(c.t)>=4);
  if(cold.length && outerMax<4) gaps.push(`Cold on ${when(cold.map(c=>c.date))}, about ${Math.min(...cold.map(c=>c.t))}°, and nothing warm enough is packed.`);
  const hot = ctx.filter(c=>c.t!=null && band(c.t)===1);
  const lightest = Math.min(9, ...packed.filter(p=>p.cat==='top'||p.cat==='dress').map(warmthOf));
  if(hot.length && lightest>=3) gaps.push(`Hot on ${when(hot.map(c=>c.date))}, about ${Math.max(...hot.map(c=>c.t))}°, and the lightest top packed is still warm.`);
  const rainy = ctx.filter(c=>c.rain);
  const coping = packed.some(p=>/trench|gabardine|waterproof|rain|parka|padded|puffer|quilted/i.test([p.shape,p.name,p.composition].join(' ')));
  if(rainy.length && !coping) gaps.push(`Rain on ${when(rainy.map(c=>c.date))} and nothing packed will cope.`);
  if(acts.has('evenings')){
    if(!packed.some(p=>(p.cat==='dress' || p.cat==='top') && (p.formality||2)>=2)) gaps.push('Nothing dressy enough for an evening out.');
    else if(!packed.some(p=>p.cat==='shoes' && (p.formality||1)>=2)) gaps.push('No smarter shoes for the evenings.');
  }
  if(acts.has('work') && !packed.some(p=>(p.cat==='bottom' || p.cat==='dress') && (p.formality||2)>=2)) gaps.push('Nothing smart enough for the work days.');
  const nShoes = packed.filter(p=>p.cat==='shoes').length;
  if(nShoes===0) gaps.push('No shoes packed.');
  else if(nShoes===1 && D>=3) gaps.push('A single pair of shoes. Add a second for variety and the evenings.');
  return {gaps, notes};
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
  const files = {closet:'data/closet.json', log:'data/wearlog.json', plan:'data/plan.json', state:'data/state.json', trips:'data/trips.json', palette:'data/palette.json'};
  const out = {};
  for(const [k,p] of Object.entries(files)){ const r = await ghGet(p); S.sha[p] = r.sha; out[k] = r.data; }
  if(out.closet && out.closet.pieces) S.closet = out.closet.pieces.map(p=>Object.assign({}, p, S.state.edits[p.id]||{}));
  if(out.log && out.log.entries){
    const byDate = {}; out.log.entries.forEach(e=>byDate[e.date]=e);
    (S.log||[]).forEach(e=>{ if(e.source!=='sample' && (!byDate[e.date] || (e.updated||0) > (byDate[e.date].updated||0))) byDate[e.date]=e; });
    S.log = Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
  }
  if(out.plan) S.plan = out.plan;
  if(out.state){
    S.state.dayOcc = Object.assign({}, out.state.dayOcc||{}, S.state.dayOcc); S.state.swaps = Object.assign({}, out.state.swaps||{}, S.state.swaps);
    // A tap that was undone is kept as null, so an old copy on GitHub can't bring it back.
    S.state.onRepeat = Object.assign({}, out.state.onRepeat||{}, S.state.onRepeat); S.state.ruleOff = Object.assign({}, out.state.ruleOff||{}, S.state.ruleOff);
  }
  if(out.trips && out.trips.trips){
    const byId = {}; out.trips.trips.forEach(t=>byId[t.id]=t);
    (S.trips||[]).forEach(t=>{ if(!byId[t.id] || (t.updated||0) > (byId[t.id].updated||0)) byId[t.id]=t; });
    S.trips = Object.values(byId).filter(t=>!t.deleted);
  }
  if(out.palette && out.palette.best) S.palette = out.palette;
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
      if(w.state) await ghPut('data/state.json', {dayOcc:S.state.dayOcc, swaps:S.state.swaps, onRepeat:S.state.onRepeat, ruleOff:S.state.ruleOff}, 'Update day settings');
      if(w.closet) await ghPut('data/closet.json', {pieces:S.closet}, 'Update closet');
      if(w.trips) await ghPut('data/trips.json', {trips:S.trips}, 'Update trips');
      S.synced = Date.now(); persist();
    }catch(e){ toast(e.message || 'Saved here. Will sync later.'); }
  }, 900);
}

/* ---------------- router ---------------- */
function route(){
  const h = (location.hash||'#today').slice(1).split('/');
  return {name: h[0]||'today', arg: h[1]||null, sub: h[2]||null};
}
const isTripForm = r => r.name==='trip' && (r.arg==='new' || r.sub==='edit');
function render(opts){
  const r = route(), app = $('#app');
  const tab = r.name==='day' ? (r.arg===TODAY ? 'today' : 'week') : (r.name==='trip' || r.name==='trips') ? 'week' : r.name;
  if(isTripForm(r)){ const key = r.arg+'/'+(r.sub||''); if(!S.ui.draft || S.ui.draftKey!==key){ S.ui.draft = newDraft(r.arg==='new' ? null : tripById(r.arg)); S.ui.draftKey = key; } }
  document.querySelectorAll('.tabs a').forEach(a=>a.setAttribute('aria-current', a.dataset.tab===tab ? 'page' : 'false'));
  if(r.name==='week') app.innerHTML = viewWeek();
  else if(r.name==='trips') app.innerHTML = viewTrips();
  else if(r.name==='trip') { app.innerHTML = viewTrip(r.arg, r.sub); const t = tripById(r.arg); if(t && !isTripForm(r)) ensureTripWeather(t); }
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
  outer:{x:31,y:29,w:50,z:1}, bottom:{x:47,y:49,w:30,z:2}, top:{x:11,y:41,w:36,z:3}, dress:{x:13,y:37,w:33,z:3}, shoes:{x:22,y:83,w:27,z:4}, accessory:{x:40,y:33,w:9,z:5},
  belt:{x:62,y:49,w:15,z:4}, bag:{x:72,y:66,w:22,z:4}
};
const LAYOUT_NO_OUTER = {top:{x:20,y:30,w:44,z:3}, dress:{x:24,y:27,w:38,z:3}, bottom:{x:50,y:46,w:32,z:2}, shoes:{x:10,y:85,w:28,z:4}, accessory:{x:68,y:28,w:11,z:5},
  belt:{x:66,y:46,w:15,z:4}, bag:{x:68,y:64,w:24,z:4}};
const REPEAT_ICON = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="square" aria-hidden="true"><path d="M3.5 8.5V7a2.5 2.5 0 0 1 2.5-2.5h10"/><path d="M13.5 2.2 16.2 4.5 13.5 6.8"/><path d="M16.5 11.5V13a2.5 2.5 0 0 1-2.5 2.5H4"/><path d="M6.5 13.2 3.8 15.5 6.5 17.8"/></svg>';
function repeatBtn(id){
  const on = !!onRepeatSince(id);
  return `<button type="button" class="rep" data-repeat="${esc(id)}" aria-pressed="${on}" aria-label="${on?'On repeat. Tap to clear.':'Mark as on repeat'}">${REPEAT_ICON}</button>`;
}
function viewDay(date, settle){
  const o = outfitFor(date), w = wx(date), occ = occasionFor(date), st = stats(date);
  const isToday = date===TODAY, worn = log().find(e=>e.date===date && e.source!=='sample');
  const L = o.slots.outer ? LAYOUT : LAYOUT_NO_OUTER;
  const trip = activeTrip(date);
  let n = 0;
  const pieces = o.list.map(({slot,p})=>{
    const pos = L[slot] || LAYOUT[slot]; n++;
    const fresh = o.hero && o.hero.id===p.id;
    return `<button type="button" class="piece slot-${slot}${fresh?' fresh':''}" data-piece="${esc(p.id)}" style="left:${pos.x}%;top:${pos.y}%;width:${pos.w}%;z-index:${pos.z||1}" aria-label="${esc(p.name)}"><span class="no">${pad(n)}</span>${art(p)}</button>`;
  }).join('');
  const nums = {}; o.list.forEach((x,i)=>nums[x.p.id]=pad(i+1));
  const notes = o.list.map(({p})=>{
    const fresh = o.hero && o.hero.id===p.id, f = fabricOf(p), s = st[p.id];
    const sub = fresh ? sinceWords(s && s.last) : [p.brand, p.composition || f.name].filter(Boolean).join(' · ');
    return `<li class="${fresh?'fresh':''}"><span class="n">${nums[p.id]}</span><span class="fl">${art(p)}</span><button type="button" data-piece="${esc(p.id)}"><span class="t">${esc(p.name)}</span><span class="s">${esc(sub)}</span></button>${repeatBtn(p.id)}</li>`;
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
  const place = trip ? shortPlace((trip.stops[stopIndexFor(trip, date)]||{}).place) : '';
  const tripLine = trip ? `<p class="triptag"><a href="#trip/${esc(trip.id)}"><span class="label">${esc(place || 'On a trip')}</span></a> <span class="caption">Day ${daysBetween(tripSpan(trip).from, date)+1} of ${tripDays(trip).length}${o.scope ? ', dressed from the suitcase' : ', nothing packed yet'}</span></p>` : '';
  const fnote = faceNote(o);
  return `${masthead()}
  <section class="hero${settle?' settle':''}" aria-label="${dayName(date)}'s outfit">
    <div class="day" aria-hidden="true">${dayShort(date)}</div>
    <div class="date">${esc(nice(date))}${isToday?'':' · planned'}</div>
    <div class="temp"><div class="deg">${w?w.feel+'°':'–'}</div><span class="fc">${esc(forecastLine(w, date))}</span></div>
    ${pieces || `<p class="empty" style="position:absolute;left:var(--gutter);top:45%">Nothing in the closet fits this day yet.</p>`}
  </section>
  <div class="credits">
    ${tripLine}
    <div class="occ"><button type="button" class="tag ${tagCls}" data-act="occ" data-date="${date}" aria-label="Occasion: ${OCC[occ.occ]}. Tap to change.">${OCC[occ.occ]}</button>${occ.note?`<span class="label">${esc(occ.note)}</span>`:''}</div>
    <p class="credit-line">${o.list.map(({p},i)=>`<span><b>${pad(i+1)}</b> <button type="button" data-piece="${esc(p.id)}">${esc(p.name)}</button>${fabricOf(p).name?`, ${esc(fabricOf(p).name.toLowerCase())}`:''}</span>`).join(' ')}</p>
    <p class="why">${esc(whyLine(o, date))}</p>
    ${fnote?`<p class="caption facenote">${esc(fnote)}</p>`:''}
    ${o.adjusted?`<p class="adjusted">${esc(o.adjusted)}</p>`:''}
  </div>
  <div class="acts">${actions}</div>
  <nav class="strip" aria-label="This week">${strip}</nav>
  <section class="panel"><span class="cap">The look</span><ol class="notes">${notes}</ol></section>
  <section class="panel"><span class="cap">Colour and fabric</span><ul class="palette">${cf.join('')}</ul></section>`;
}

function dayRowHTML(d, place){
  const o = outfitFor(d), w = wx(d), oc = occasionFor(d);
  const thumbs = o.list.map(({p})=>`<span>${art(p)}</span>`).join('');
  const names = o.list.map(({p})=>p.name).join(', ');
  return `<li class="${d===TODAY?'today':''}"><a href="#day/${d}"><span class="dn">${dayShort(d)}</span><span class="meta"><span class="top"><span class="tag ${oc.occ==='customer'?'customer':oc.occ==='off'?'off':''}">${OCC[oc.occ]}</span><span class="t">${w?w.feel+'°':''}</span></span><span class="thumbs">${thumbs}</span><span class="names">${esc(nice(d))}${place?` · ${esc(place)}`:''}. ${esc(names)}</span></span></a></li>`;
}
function tripStripHTML(){
  const t = upcomingTrips()[0]; if(!t) return '';
  const n = (t.packed||[]).length, g = n ? tripGaps(t).gaps.length : 0;
  const line = n ? `${n} pieces packed` : 'Nothing packed yet';
  return `<a class="tripstrip" href="#trip/${esc(t.id)}"><span class="label">${tripSpan(t).from<=TODAY?'On a trip':'Coming up'}</span><span class="t">${esc(tripName(t))}</span><span class="s">${esc(tripDates(t))} · ${line}</span>${g?`<span class="g">${g} thing${g>1?'s':''} to fix before you go</span>`:''}</a>`;
}
function viewWeek(){
  const days = weekOf(TODAY);
  const note = S.plan && S.plan.week && S.plan.note && monday(S.plan.weekStart||TODAY)===days[0] ? S.plan.note : null;
  const rows = days.map(d=>{ const t = activeTrip(d); return dayRowHTML(d, t ? shortPlace((t.stops[stopIndexFor(t,d)]||{}).place) : ''); }).join('');
  return `${masthead()}
  <header class="pagehead"><h1 class="page">This week</h1><p class="cap">Week ${isoWeek(TODAY)} · ${esc(nice(days[0]))} to ${esc(nice(days[6]))}</p></header>
  ${tripStripHTML()}
  ${note?`<div class="plan-note"><span class="label">From Claude</span>${esc(note)}</div>`:''}
  <hr class="rule">
  <ul class="days">${rows}</ul>
  <div class="acts"><a class="btn ghost" href="#trips">${upcomingTrips().length?'Trips':'Plan a trip'}</a></div>`;
}

function doubles(){
  const g = {}; closet().forEach(p=>{ const k = [p.cat,p.shape,(p.colour||'').toLowerCase(),(p.name||'').toLowerCase()].join('|'); (g[k]=g[k]||[]).push(p); });
  return Object.values(g).filter(a=>a.length>1);
}
function viewCloset(filter){
  const st = stats(), all = closet();
  const live = p => !p.dontWear && statusOf(p)!=='donate';
  const neglected = p => { const l = st[p.id].last; return live(p) && l && daysBetween(l, TODAY) >= 60 && !onRepeatSince(p.id); };
  const never = p => live(p) && !st[p.id].last && !onRepeatSince(p.id);
  const dbl = doubles(), dblIds = new Set(dbl.flat().map(p=>p.id));
  const F = {all:{l:'All', f:p=>true}, rare:{l:'Rarely worn', f:neglected}, never:{l:'Never worn', f:never}, repeat:{l:'On repeat', f:p=>!!onRepeatSince(p.id)}, doubles:{l:'Doubles', f:p=>dblIds.has(p.id)}, away:{l:'Not available', f:p=>!p.dontWear && statusOf(p)!=='available' && statusOf(p)!=='donate'}, donate:{l:'Donate', f:p=>statusOf(p)==='donate'}, aside:{l:'Set aside', f:p=>p.dontWear}};
  if(!F[filter]) filter = 'all';
  const counts = {}; Object.keys(F).forEach(k=>counts[k]=all.filter(F[k].f).length);
  const filters = Object.entries(F).map(([k,v])=>`<button type="button" class="label" data-filter="${k}" aria-pressed="${k===filter}">${v.l}<span class="n">${counts[k]}</span></button>`).join('');
  // the editorial read of the wardrobe
  const col = {}; all.forEach(p=>{ const c=(p.colour||'other').toLowerCase(); col[c]=(col[c]||0)+1; });
  const top = Object.entries(col).sort((a,b)=>b[1]-a[1])[0];
  const share = top ? top[1]/all.length : 0;
  const frac = share>=.45?'nearly half' : share>=.3?'a third' : share>=.22?'a quarter' : share>=.15?'a fifth' : null;
  const rareN = counts.rare + counts.never;
  const lede = `${all.length} pieces.${top&&frac?` ${cap1(top[0])} does ${frac} of the work.`:''}${!hasHistory() ? ' Your wear history starts with the first log.' : rareN?` <em>${rareN} haven't been worn in two months.</em>`:''}`;
  const item = p => { const s = st[p.id], rep = onRepeatSince(p.id), sx = statusOf(p);
    const fresh = hasHistory() && live(p) && sx==='available' && !rep && (!s.last || daysBetween(s.last, TODAY)>=60);
    const line = p.dontWear ? 'Set aside' : sx!=='available' ? STATUS[sx] : rep ? `On repeat since ${shortDate(rep)}` : s.count ? `${sinceWords(s.last)} · ${s.count} wear${s.count>1?'s':''}` : sinceWords(null);
    return `<div class="tile"><button type="button" class="item${p.dontWear||sx!=='available'?' aside':''}" data-piece="${esc(p.id)}"><span class="img">${art(p)}</span><span class="nm">${esc(p.name).replace(/(\S+-\S+)/g,'<span class="nb">$1</span>')}</span><span class="st${fresh?' fresh':''}">${esc(line)}</span></button>${repeatBtn(p.id)}</div>`; };
  let body = '';
  const list = all.filter(F[filter].f);
  if(filter==='doubles'){
    body = dbl.length ? dbl.map(g=>`<section class="group"><h2 class="sec">${esc(g[0].name)} × ${g.length}</h2><p class="caption" style="margin:8px 0 0">Same piece, ${g.length} times. Worn ${g.map(p=>st[p.id].count).join(' and ')} times. Keep one in rotation and decide on the other.</p><div class="grid">${g.map(item).join('')}</div></section>`).join('') : `<div class="group"><p class="empty">No doubles. Every piece is one of a kind.</p></div>`;
  } else if(filter==='all'){
    const CATS = [['outer','Outerwear'],['top','Tops and knits'],['bottom','Trousers and skirts'],['dress','Dresses'],['shoes','Shoes'],['accessory','Scarves and belts'],['bag','Bags']];
    body = CATS.map(([c,l])=>{ const xs = list.filter(p=>p.cat===c); return xs.length ? `<section class="group"><h2 class="sec">${l}</h2><div class="grid">${xs.map(item).join('')}</div></section>` : ''; }).join('');
  } else {
    const empty = {aside:'Nothing set aside. Open a piece and switch on "I don\'t wear this" to park it here.', repeat:'Nothing on repeat. Tap the arrows on a piece you keep reaching for.', away:'Everything is available. Mark a piece as in the wash, at the dry cleaner or being repaired from its sheet.', donate:'Nothing earmarked for donating. Open a piece and choose Donate to park it here.'}[filter] || 'Nothing here. Everything is in rotation.';
    body = `<div class="group">${list.length ? `<div class="grid">${list.map(item).join('')}</div>` : `<p class="empty">${empty}</p>`}</div>`;
  }
  return `${masthead()}
  <header class="pagehead"><h1 class="page">Closet</h1><p class="lede">${lede}</p></header>
  <div class="filters" role="toolbar" aria-label="Filter the closet">${filters}</div>
  ${body}`;
}

function reactionsHTML(date){
  const entry = log().find(e=>e.date===date && e.source!=='sample'); if(!entry) return '';
  const rs = entry.reactions || [];
  const line = id => rs.filter(r=>(r.item||null)===id).map(r=>REACT[r.tag]).filter(Boolean).join(' · ');
  const row = (id, name, thumb) => { const l = line(id); return `<li><button type="button" data-react="${esc(id||'')}" data-date="${date}"><span class="th">${thumb}</span><span><span class="nm">${esc(name)}</span><span class="sub${l?' on':''}">${esc(l || 'Tap to react')}</span></span></button></li>`; };
  const items = (entry.items||[]).map(piece).filter(Boolean);
  return `<ul class="reacts">${row(null, 'The whole look', '')}${items.map(p=>row(p.id, p.name, art(p))).join('')}</ul>`;
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
  const cats = [['top','Tops'],['bottom','Bottoms'],['dress','Dresses'],['outer','Outer'],['shoes','Shoes'],['accessory','Extras'],['bag','Bags']];
  const feel = entry && entry.feel;
  const hist = log().filter(e=>e.source!=='sample').slice(-14).reverse().map(e=>`<li><span class="dt">${esc(dayShort(e.date))} ${parse(e.date).getDate()}<small>${e.feel?esc(FEEL[e.feel]):'Logged'}</small></span><span class="thumbs">${(e.items||[]).map(piece).filter(Boolean).map(p=>`<span>${art(p)}</span>`).join('')}</span></li>`).join('');
  const wash = closet().filter(p=>statusOf(p)==='wash').length;
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
  ${entry?`<section class="panel"><span class="cap">How did it go?</span><p class="caption pad">React to the look or to a single piece. Two of the same reaction become a rule the app follows.</p><div id="reactions">${reactionsHTML(date)}</div></section>`:''}
  ${hist?`<section class="panel"><span class="cap">Recent days</span><ul class="history">${hist}</ul></section>`:''}
  <section class="panel"><span class="cap">Laundry</span><div class="field"><p class="caption" style="margin:0">${wash?`${wash} piece${wash>1?'s':''} in the wash.`:'Nothing in the wash. Mark pieces from their sheet.'}</p></div><div class="acts"><button type="button" class="btn ghost" data-act="laundry" ${wash?'':'disabled'}>I did my laundry</button></div></section>
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
    <div class="toggles"><label class="toggle"><span>Sample wardrobe<small>Show the demo pieces instead of yours.</small></span><input type="checkbox" class="switch" id="sample" ${settings.sample?'checked':''}></label>
    <label class="toggle"><span>Bags on office days<small>Day-off looks always get a bag, once you have added bags.</small></span><input type="checkbox" class="switch" id="bagsoffice" ${settings.bagsOffice?'checked':''}></label></div>
    <div class="field"><a class="linkish" href="#trips">Trips and packing</a></div>
    <div class="acts" style="padding-top:0"><button type="button" class="btn" data-act="savesettings">Save and sync</button><a class="btn ghost" href="#log">Back</a></div>
    <div class="field"><span class="hint">Last synced: ${esc(when)}. Forecast from Open-Meteo for ${esc(settings.city)}.</span></div>
  </div>`;
}

/* ---------------- trips: screens ---------------- */
function newDraft(t){
  if(t) return JSON.parse(JSON.stringify(Object.assign({activities:[], packed:[], carryOn:false}, t)));
  return {id:'trip-'+Date.now().toString(36), name:'', stops:[{place:'', from:'', to:'', lat:null, lon:null}], activities:[], packed:[], carryOn:false, isNew:true};
}
function viewTrips(){
  const ts = liveTrips().slice().sort((a,b)=>((tripSpan(b)||{}).from||'').localeCompare((tripSpan(a)||{}).from||''));
  const row = t => { const n = (t.packed||[]).length; return `<li><a href="#trip/${esc(t.id)}"><span class="dn">${tripSpan(t)?parse(tripSpan(t).from).getDate():''}</span><span class="meta"><span class="t d">${esc(tripName(t))}</span><span class="names">${esc(tripDates(t))}${n?` · ${n} pieces packed`:' · nothing packed yet'}</span></span></a></li>`; };
  return `${masthead()}
  <header class="pagehead"><h1 class="page">Trips</h1><p class="lede">${ts.length?'Pack from what you own.':'No trips yet. Add one and the app packs from your closet.'}</p></header>
  <hr class="rule">
  ${ts.length?`<ul class="days trips">${ts.map(row).join('')}</ul>`:''}
  <div class="acts"><a class="btn" href="#trip/new">Plan a trip</a><a class="btn ghost" href="#week">Back</a></div>`;
}
function viewTripForm(d){
  const isNew = !!d.isNew;
  const stop = (s,i) => `<div class="stop"><div class="stophead"><span class="cap">Stop ${i+1}</span>${d.stops.length>1?`<button type="button" class="linkish" data-act="rmstop" data-i="${i}">Remove</button>`:''}</div>
    <div class="field"><label class="cap" for="pl${i}">Place</label><div class="inrow"><input id="pl${i}" data-draft="place" data-i="${i}" value="${esc(s.place)}" placeholder="A city" autocomplete="off" spellcheck="false"><button type="button" class="linkish" data-act="findplace" data-i="${i}">Find</button></div>
    ${s.results ? (s.results.length ? `<ul class="finds">${s.results.map((r,k)=>`<li><button type="button" data-act="pickplace" data-i="${i}" data-r="${k}">${esc(r.label)}</button></li>`).join('')}</ul>` : '<span class="hint">No match. Try a nearby city.</span>') : (s.lat!=null ? '<span class="hint">Place matched. The forecast will use it.</span>' : '<span class="hint">Tap Find to match the place, or Save and the app will match it.</span>')}</div>
    <div class="two"><div class="field"><label class="cap" for="fr${i}">From</label><input type="date" id="fr${i}" data-draft="from" data-i="${i}" value="${esc(s.from)}"></div><div class="field"><label class="cap" for="to${i}">To</label><input type="date" id="to${i}" data-draft="to" data-i="${i}" value="${esc(s.to)}"></div></div></div>`;
  return `${masthead()}
  <header class="pagehead"><h1 class="page">${isNew?'New trip':'Edit trip'}</h1><p class="lede">Where, when and what the days involve.</p></header>
  <div class="stack">
    <div class="field"><label class="cap" for="tname">Name</label><input id="tname" data-draft="name" value="${esc(d.name)}" placeholder="Something you will recognise" autocomplete="off"></div>
    ${d.stops.map(stop).join('')}
    <div class="field"><button type="button" class="linkish" data-act="addstop" style="justify-self:start">Add another stop</button></div>
    <div class="field"><span class="cap">What the days involve</span></div>
    <div class="toggles">${TRIP_ACTS.map(([k,l])=>`<label class="toggle"><span>${l}</span><input type="checkbox" class="switch" data-tact="${k}" ${d.activities.includes(k)?'checked':''}></label>`).join('')}
    <label class="toggle"><span>Carry-on only<small>Keeps shoes and layers to a minimum.</small></span><input type="checkbox" class="switch" id="tcarry" ${d.carryOn?'checked':''}></label></div>
    <div class="acts" style="padding-top:0"><button type="button" class="btn" data-act="savetrip">Save trip</button><a class="btn ghost" href="${isNew?'#trips':'#trip/'+esc(d.id)}">Cancel</a></div>
    ${!isNew?`<div class="field"><button type="button" class="linkish" data-act="deltrip" data-id="${esc(d.id)}" style="justify-self:start">Delete this trip</button></div>`:''}
  </div>`;
}
const PACK_CATS = [['outer','Outerwear'],['top','Tops and knits'],['bottom','Trousers and skirts'],['dress','Dresses'],['shoes','Shoes'],['accessory','Scarves and belts'],['bag','Bags']];
function viewTrip(id, sub){
  if(id==='new' || sub==='edit') return viewTripForm(S.ui.draft);
  const t = tripById(id);
  if(!t) return `${masthead()}<header class="pagehead"><h1 class="page">Trips</h1><p class="lede">That trip isn't here.</p></header><div class="acts"><a class="btn ghost" href="#trips">All trips</a></div>`;
  const ctx = tripContext(t), D = ctx.length, packed = (t.packed||[]).map(piece).filter(Boolean);
  const gp = tripGaps(t), why = tripReasons(t), looks = tripLooks(t);
  const stops = (t.stops||[]).map(s=>`${esc(s.place||'Somewhere')}${s.from?` (${esc(shortDate(s.from))} to ${esc(shortDate(s.to||s.from))})`:''}`).join('; ');
  const unmatched = (t.stops||[]).some(s=>s.lat==null);
  const cells = ctx.map(c=>`<a href="#day/${c.date}" aria-label="${dayName(c.date)} ${nice(c.date)}"><span class="label">${dayShort(c.date)}</span><b>${c.w?(c.w.src==='typical'?'~':'')+c.w.feel+'°':'·'}</b><span class="dd">${parse(c.date).getDate()}</span></a>`).join('');
  const groups = PACK_CATS.map(([c,l])=>{ const xs = packed.filter(p=>p.cat===c); return xs.length ? `<section class="group"><h2 class="sec">${l}</h2><ul class="picklist packlist">${xs.map(p=>`<li><label><span class="th">${art(p)}</span><span><span class="nm">${esc(p.name)}</span><span class="sub">${esc(why[p.id]||'')}</span></span><input type="checkbox" class="check" data-pack="${esc(p.id)}" data-trip="${esc(t.id)}" checked aria-label="Packed: ${esc(p.name)}"></label></li>`).join('')}</ul></section>` : ''; }).join('');
  const lookRows = ctx.map(c=>{ const st = t.stops[stopIndexFor(t,c.date)]||{}; return dayRowHTML(c.date, shortPlace(st.place)); }).join('');
  return `${masthead()}
  <header class="pagehead"><h1 class="page">${esc(tripName(t))}</h1><p class="lede">${esc(tripDates(t))}${D?`, ${D} day${D>1?'s':''}`:''}.</p><p class="caption">${stops}</p>
  <div class="acts" style="padding:4px 0 0"><a class="linkish" href="#trip/${esc(t.id)}/edit">Edit</a></div></header>
  <hr class="rule">
  ${unmatched?`<p class="caption pad">A place isn't matched yet, so there is no forecast for it. Edit the trip and tap Find.</p>`:''}
  <section class="tweather"><span class="cap">The weather</span><nav class="tstrip" aria-label="Weather on the trip">${cells||'<p class="caption">Add dates to see the weather.</p>'}</nav>
  ${gp.notes.map(n=>`<p class="caption">${esc(n)}</p>`).join('')}</section>
  ${gp.gaps.length?`<section class="gaps"><span class="label">Before you fly</span><ul>${gp.gaps.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></section>`:''}
  <section class="packing"><span class="cap">In the suitcase${packed.length?` · ${packed.length}`:''}</span>
  <div class="toggles"><label class="toggle"><span>Carry-on only<small>Two pairs of shoes at most, and one warm layer.</small></span><input type="checkbox" class="switch" id="tcarry-live" data-trip="${esc(t.id)}" ${t.carryOn?'checked':''}></label></div>
  <div class="acts"><button type="button" class="btn${packed.length?' ghost':''}" data-act="suggest" data-id="${esc(t.id)}">${packed.length?'Suggest again':'Suggest a capsule'}</button><button type="button" class="btn ghost" data-act="packadd" data-id="${esc(t.id)}">Add from the closet</button></div>
  ${packed.length?groups:`<p class="empty pad">Nothing packed yet. Suggest a capsule and tick or untick from there.</p>`}</section>
  ${packed.length&&D?`<section class="looks"><span class="cap">The looks</span><ul class="days">${lookRows}</ul></section>`:''}
  <div class="acts"><a class="btn ghost" href="#trips">All trips</a></div>`;
}

/* ---------------- sheets ---------------- */
function openSheet(html){ const s=$('#sheet'); s.innerHTML=html; s.classList.add('open'); $('#scrim').classList.add('open'); setTimeout(()=>{ const f=s.querySelector('[data-close]'); f&&f.focus(); }, 50); }
function closeSheet(){ $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); }
function ruleLine(r, id){
  if(r.kind==='pair'){ const other = piece(r.a===id ? r.b : r.a); return `Not paired with the ${other ? other.name.toLowerCase() : 'other piece'} after ${r.n} "Colours looked dead" reports.`; }
  return ruleText(r);
}
function sheetPiece(id){
  const p = piece(id); if(!p) return;
  const s = stats()[id], f = fabricOf(p), rep = onRepeatSince(id), sx = statusOf(p);
  const warmW = ['','Light','Mid-weight','Warm','Very warm','Heaviest'][warmthOf(p)];
  const mine = rules().list.filter(r=>r.id===id || r.a===id || r.b===id);
  const learned = mine.length ? `<div class="field"><span class="cap">What the app has learned</span>${mine.map(r=>`<p class="rule-row">${esc(ruleLine(r,id))} <button type="button" class="linkish" data-act="undorule" data-key="${esc(r.key)}" data-n="${r.n}" data-id="${esc(id)}">Undo</button></p>`).join('')}</div>` : '';
  const cls = faceClass(p);
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">${esc(p.cat==='accessory'?'Accessory':cap1(p.cat==='outer'?'Outerwear':p.cat))}</span><button type="button" class="linkish" data-close>Close</button></div>
    <div class="big">${art(p)}</div>
    <h2 class="sec">${esc(p.name)}</h2>
    <dl class="facts">
      <dt>Worn</dt><dd>${s.count?`${s.count} time${s.count>1?'s':''} · ${esc(sinceWords(s.last).toLowerCase())}`:esc(sinceWords(null))}</dd>
      <dt>Fabric</dt><dd>${esc([f.name, f.note].filter(Boolean).join('. '))}</dd>
      <dt>Warmth</dt><dd>${warmW}${rules().warm[id]?' (adjusted by your reports)':''}</dd>
    </dl>
    <div class="stack">
      <div class="field"><span class="cap">Status</span></div>
      <div class="segs wrap" role="group" aria-label="Status">${Object.keys(STATUS).map(k=>`<button type="button" class="label" data-status="${k}" data-id="${esc(id)}" aria-pressed="${sx===k}">${STATUS_TAP[k]}</button>`).join('')}</div>
      <div class="toggles"><label class="toggle"><span>On repeat<small id="repnote">${rep?`Since ${esc(shortDate(rep))}. Fades after ${ON_REPEAT_DAYS} days.`:'Wearing this a lot lately. No need to log each day.'}</small></span><input type="checkbox" class="switch" id="prepeat" data-id="${esc(id)}" ${rep?'checked':''}></label></div>
      ${learned}
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
  const o = outfitFor(date), scope = tripScope(date);
  const slots = o.list.map(x=>x.slot);
  if(!S.ui.swapSlot || !slots.includes(S.ui.swapSlot)) S.ui.swapSlot = slots[0];
  const slot = S.ui.swapSlot, cur = o.slots[slot];
  const st = stats();
  const opts = closet().filter(p=>slotOf(p)===slot && usable(p, !!scope) && (!scope || scope.has(p.id))).sort((a,b)=>(st[a.id].last||'').localeCompare(st[b.id].last||''));
  const label = {outer:'Outer',top:'Top',dress:'Dress',bottom:'Bottom',belt:'Belt',shoes:'Shoes',accessory:'Extra',bag:'Bag'};
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">Swap a piece</span><button type="button" class="linkish" data-close>Done</button></div>
    <div class="segs" role="tablist">${slots.map(k=>`<button type="button" class="label" role="tab" data-swapslot="${k}" aria-pressed="${k===slot}">${label[k]}</button>`).join('')}</div>
    <ul class="swaps">${opts.map(p=>`<li class="${cur&&cur.id===p.id?'cur':''}"><button type="button" data-swapto="${esc(p.id)}" data-slot="${slot}" data-date="${date}"><span class="th">${art(p)}</span><span><span class="nm">${esc(p.name)}</span><span class="sub">${esc(sinceWords(st[p.id].last))} · ${esc(fabricOf(p).name)}</span></span></button></li>`).join('')}
    ${['accessory','outer','belt','bag'].includes(slot)?`<li><button type="button" data-swapto="" data-slot="${slot}" data-date="${date}"><span class="th"></span><span><span class="nm">Without</span><span class="sub">Leave the ${slot==='outer'?'coat':slot==='belt'?'belt':slot==='bag'?'bag':'extra'} off</span></span></button></li>`:''}</ul>`);
}
function sheetReact(date, id){
  const entry = log().find(e=>e.date===date && e.source!=='sample'); if(!entry) return;
  const rs = entry.reactions || [];
  const title = id ? (piece(id)||{}).name : 'The whole look';
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">${esc(title||'')}</span><button type="button" class="linkish" data-close>Done</button></div>
    <p class="caption pad" style="margin:12px 0 0">Two of the same reaction become a rule the app follows. You can undo a rule from the piece.</p>
    <div class="toggles">${Object.entries(REACT).map(([k,l])=>`<label class="toggle"><span>${l}</span><input type="checkbox" class="switch" data-rtag="${k}" data-date="${date}" data-item="${esc(id||'')}" ${rs.some(r=>(r.item||null)===(id||null) && r.tag===k)?'checked':''}></label>`).join('')}</div>`);
}
function sheetPackAdd(tid){
  const t = tripById(tid); if(!t) return;
  const have = new Set(t.packed||[]);
  const groups = PACK_CATS.map(([c,l])=>{ const xs = closet().filter(p=>p.cat===c && usable(p, true)); return xs.length ? `<section class="group"><h2 class="sec">${l}</h2><ul class="picklist packlist">${xs.map(p=>`<li><label><span class="th">${art(p)}</span><span><span class="nm">${esc(p.name)}</span><span class="sub">${esc(p.colour||'')}</span></span><input type="checkbox" class="check" data-pack="${esc(p.id)}" data-trip="${esc(tid)}" ${have.has(p.id)?'checked':''} aria-label="${esc(p.name)}"></label></li>`).join('')}</ul></section>` : ''; }).join('');
  openSheet(`<div class="bar"><span class="cap" id="sheetTitle">Add from the closet</span><button type="button" class="linkish" data-close>Done</button></div>${groups}`);
}

/* ---------------- actions ---------------- */
function toggleRepeat(id){
  const on = !!onRepeatSince(id);
  S.state.onRepeat[id] = on ? null : TODAY;
  queuePush({state:true}); render();
  toast(on ? 'Back in the mix' : `On repeat since ${shortDate(TODAY)}`);
}
function setStatus(id, status){
  const p = piece(id); if(!p) return;
  p.status = status; S.state.edits[id] = Object.assign({}, S.state.edits[id], {status});
  queuePush({closet:true});
  document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.status===status ? 'true' : 'false'));
  render(); toast(STATUS[status]);
}
function toggleReaction(date, id, tag, on){
  const entry = log().find(e=>e.date===date && e.source!=='sample'); if(!entry) return;
  const rs = (entry.reactions||[]).filter(r=>!((r.item||null)===(id||null) && r.tag===tag));
  if(on) rs.push({item:id||null, tag});
  upsertLog(date, {reactions:rs}); queuePush({log:true});
  const box = $('#reactions'); if(box) box.innerHTML = reactionsHTML(date);
  const made = rules().list.length; if(on && made !== toggleReaction.made){ toggleReaction.made = made; toast('That is now a rule'); }
}
toggleReaction.made = 0;
function togglePack(tid, id, on){
  const t = tripById(tid); if(!t) return;
  const set = new Set(t.packed||[]); on ? set.add(id) : set.delete(id);
  t.packed = [...set]; t.updated = Date.now();
  queuePush({trips:true}); render();
}
const twBusy = {};
function ensureTripWeather(t){
  if(twBusy[t.id]) return; twBusy[t.id] = 1;
  loadTripWeather(t).then(changed=>{ if(changed && ['trip','today','day','week'].includes(route().name) && !isTripForm(route())) render(); }).catch(()=>{}).then(()=>{ delete twBusy[t.id]; });
}
async function saveTrip(){
  const d = S.ui.draft; if(!d) return;
  d.stops = d.stops.filter(s=>s.place.trim() || s.from || s.to);
  if(!d.stops.length || d.stops.some(s=>!s.place.trim())){ toast('Add a place'); return; }
  if(d.stops.some(s=>!s.from || !s.to)){ toast('Add dates for every stop'); return; }
  if(d.stops.some(s=>s.to < s.from)){ toast('A stop ends before it starts'); return; }
  toast('Matching places…');
  try{ for(const s of d.stops){ if(s.lat==null){ const r = await geocode(s.place); if(r[0]){ s.place = r[0].label; s.lat = r[0].lat; s.lon = r[0].lon; } } } }catch(e){ /* the trip still saves; the forecast waits for a match */ }
  const t = Object.assign({}, d, {name:d.name.trim(), updated:Date.now(), stops:d.stops.map(s=>({place:s.place.trim(), from:s.from, to:s.to, lat:s.lat==null?null:s.lat, lon:s.lon==null?null:s.lon}))});
  delete t.isNew;
  const i = S.trips.findIndex(x=>x.id===t.id); if(i>=0) S.trips[i] = t; else S.trips.push(t);
  queuePush({trips:true});
  S.ui.draft = null; S.ui.draftKey = null;
  location.hash = '#trip/'+t.id;
  loadTripWeather(t, true).then(()=>{ if(route().name==='trip' && !isTripForm(route())) render(); }).catch(()=>{});
}

/* ---------------- events ---------------- */
document.addEventListener('click', async e=>{
  const t = e.target.closest('button, a'); if(!t) return;
  if(t.dataset.close!==undefined){ closeSheet(); return; }
  if(t.dataset.repeat){ toggleRepeat(t.dataset.repeat); return; }
  if(t.dataset.status){ setStatus(t.dataset.id, t.dataset.status); return; }
  if(t.dataset.react!==undefined){ sheetReact(t.dataset.date, t.dataset.react || null); return; }
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
  else if(act==='laundry'){
    const ws = closet().filter(p=>statusOf(p)==='wash');
    ws.forEach(p=>{ p.status = 'available'; S.state.edits[p.id] = Object.assign({}, S.state.edits[p.id], {status:'available'}); });
    queuePush({closet:true}); render(); toast(`${ws.length} back in the wardrobe`);
  }
  else if(act==='undorule'){
    S.state.ruleOff[t.dataset.key] = +t.dataset.n; queuePush({state:true}); sheetPiece(t.dataset.id); render(); toast('Rule undone');
  }
  else if(act==='suggest'){
    const tr = tripById(t.dataset.id); if(!tr) return;
    toast('Packing…');
    try{ await loadTripWeather(tr); }catch(err){}
    tr.packed = packTrip(tr); tr.updated = Date.now();
    queuePush({trips:true}); render(); toast(tr.packed.length ? `${tr.packed.length} pieces packed` : 'Nothing to pack from yet');
  }
  else if(act==='packadd'){ sheetPackAdd(t.dataset.id); }
  else if(act==='addstop'){ const d = S.ui.draft, last = d.stops[d.stops.length-1]; d.stops.push({place:'', from:last&&last.to||'', to:'', lat:null, lon:null}); render(); }
  else if(act==='rmstop'){ S.ui.draft.stops.splice(+t.dataset.i, 1); render(); }
  else if(act==='findplace'){
    const s = S.ui.draft.stops[+t.dataset.i]; if(!s.place.trim()){ toast('Type a place first'); return; }
    toast('Searching…');
    try{ s.results = await geocode(s.place.trim()); render(); }catch(err){ toast(err.message); }
  }
  else if(act==='pickplace'){
    const s = S.ui.draft.stops[+t.dataset.i], r = s.results[+t.dataset.r];
    s.place = r.label; s.lat = r.lat; s.lon = r.lon; s.results = null; render();
  }
  else if(act==='savetrip'){ await saveTrip(); }
  else if(act==='deltrip'){
    if(S.ui.confirmDel!==t.dataset.id){ S.ui.confirmDel = t.dataset.id; t.textContent = 'Tap again to delete'; return; }
    const tr = tripById(t.dataset.id); if(tr){ tr.deleted = true; tr.updated = Date.now(); queuePush({trips:true}); }
    S.ui.confirmDel = null; S.ui.draft = null; S.ui.draftKey = null; location.hash = '#trips'; toast('Trip deleted');
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
document.addEventListener('input', e=>{
  const el = e.target, d = S.ui.draft; if(!d || !el.dataset.draft) return;
  if(el.dataset.draft==='name') d.name = el.value;
  else { const s = d.stops[+el.dataset.i]; if(!s) return; s[el.dataset.draft] = el.value; if(el.dataset.draft==='place'){ s.lat = null; s.lon = null; s.results = null; } }
});
document.addEventListener('change', async e=>{
  const el = e.target;
  if(el.dataset.pack){ togglePack(el.dataset.trip, el.dataset.pack, el.checked); return; }
  if(el.dataset.rtag){ toggleReaction(el.dataset.date, el.dataset.item || null, el.dataset.rtag, el.checked); return; }
  if(el.dataset.tact && S.ui.draft){ const a = S.ui.draft.activities, k = el.dataset.tact; S.ui.draft.activities = el.checked ? [...new Set([...a, k])] : a.filter(x=>x!==k); return; }
  if(el.id==='tcarry' && S.ui.draft){ S.ui.draft.carryOn = el.checked; return; }
  if(el.id==='tcarry-live'){ const tr = tripById(el.dataset.trip); if(tr){ tr.carryOn = el.checked; tr.updated = Date.now(); queuePush({trips:true}); render(); toast(el.checked ? 'Carry-on only. Suggest again to apply it.' : 'Checked bag. Suggest again to apply it.'); } return; }
  if(el.id==='bagsoffice'){ settings.bagsOffice = el.checked; saveSettings(); S.ui.memo = {}; toast(el.checked ? 'Bags on office days' : 'Bags on days off only'); return; }
  if(el.id==='prepeat'){ toggleRepeat(el.dataset.id); const n = $('#repnote'), rep = onRepeatSince(el.dataset.id); if(n) n.textContent = rep ? `Since ${shortDate(rep)}. Fades after ${ON_REPEAT_DAYS} days.` : 'Wearing this a lot lately. No need to log each day.'; return; }
  if(el.id==='photo' && el.files[0]){
    const f = el.files[0];
    const img = await createImageBitmap(f).catch(()=>null); if(!img){ toast("That photo couldn't be read."); return; }
    const k = Math.min(1, 1400/Math.max(img.width, img.height)), cv = document.createElement('canvas');
    cv.width = Math.round(img.width*k); cv.height = Math.round(img.height*k); cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    const url = cv.toDataURL('image/jpeg', .82);
    const small = document.createElement('canvas'); const k2 = 160/Math.max(cv.width,cv.height); small.width=Math.round(cv.width*k2); small.height=Math.round(cv.height*k2); small.getContext('2d').drawImage(cv,0,0,small.width,small.height);
    S.ui.photo = {b64:url.split(',')[1], preview: small.toDataURL('image/jpeg', .7)};
    const wrap = el.closest('.photo-in'); let im = wrap.querySelector('img'); if(!im){ im = document.createElement('img'); im.alt='Mirror photo'; wrap.prepend(im); } im.src = S.ui.photo.preview;
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
window.addEventListener('hashchange', ()=>{ closeSheet(); if(!isTripForm(route())){ S.ui.draft = null; S.ui.draftKey = null; S.ui.confirmDel = null; } render({settle: route().name==='today' || route().name==='day'}); window.scrollTo(0,0); });
async function boot(){
  ensureSample();
  if(!S.weather || S.weather.city!==settings.city) S.weather = sampleWeather();
  render({settle:true});
  await loadWeather();
  if(ghReady()){ try{ await pull(); }catch(e){ toast(e.message); } }
  persist();
  render();
  upcomingTrips().forEach(ensureTripWeather);
}
if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();
})();
