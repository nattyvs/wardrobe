// Sample wardrobe shown until Natalia's own catalogue is connected.
// Every piece here is invented for the demo and labelled as a sample in the app.
window.SAMPLE_CLOSET = [
  // outerwear
  {id:'s-coat-camel',   name:'Camel coat',          cat:'outer', shape:'coat',   hex:'#B48A5A', colour:'camel',    composition:'80% wool, 20% cashmere', warmth:5, formality:3, occasions:['office','customer','off']},
  {id:'s-trench',       name:'Stone trench',        cat:'outer', shape:'trench', hex:'#C8B79A', colour:'stone',    composition:'100% cotton gabardine',  warmth:3, formality:3, occasions:['office','customer','off']},
  {id:'s-coat-navy',    name:'Navy wool coat',      cat:'outer', shape:'coat',   hex:'#2B3550', colour:'navy',     composition:'70% wool, 30% polyamide', warmth:5, formality:3, occasions:['office','customer']},
  {id:'s-blazer-black', name:'Black blazer',        cat:'outer', shape:'blazer', hex:'#1C1C1E', colour:'black',    composition:'98% wool, 2% elastane',  warmth:2, formality:3, occasions:['office','customer']},
  {id:'s-blazer-check', name:'Grey check blazer',   cat:'outer', shape:'blazer', hex:'#77736C', colour:'grey',     composition:'100% wool',              warmth:3, formality:3, occasions:['customer'], statement:true},
  // knits and tops
  {id:'s-turtle-black', name:'Black turtleneck',    cat:'top', shape:'knit',   hex:'#1E1E1E', colour:'black',    composition:'100% merino wool',       warmth:4, formality:2, occasions:['office','customer','off']},
  {id:'s-turtle-cream', name:'Ivory turtleneck',    cat:'top', shape:'knit',   hex:'#EDE6D8', colour:'ivory',    composition:'70% wool, 30% cashmere', warmth:4, formality:2, occasions:['office','customer']},
  {id:'s-jumper-grey',  name:'Grey crew jumper',    cat:'top', shape:'jumper', hex:'#9A9894', colour:'grey',     composition:'100% lambswool',         warmth:4, formality:1, occasions:['office','off']},
  {id:'s-jumper-olive', name:'Olive jumper',        cat:'top', shape:'jumper', hex:'#6C7A5A', colour:'olive',    composition:'100% cotton',            warmth:3, formality:1, occasions:['office','off']},
  {id:'s-jumper-rust',  name:'Rust mohair jumper',  cat:'top', shape:'jumper', hex:'#A4502F', colour:'rust',     composition:'60% mohair, 40% silk',   warmth:4, formality:2, occasions:['office','customer','off'], statement:true},
  {id:'s-tee-black-1',  name:'Black T-shirt',       cat:'top', shape:'tee',    hex:'#1A1A1A', colour:'black',    composition:'100% cotton',            warmth:1, formality:1, occasions:['office','off']},
  {id:'s-tee-black-2',  name:'Black T-shirt',       cat:'top', shape:'tee',    hex:'#1A1A1A', colour:'black',    composition:'100% cotton',            warmth:1, formality:1, occasions:['office','off']},
  {id:'s-tee-white',    name:'White T-shirt',       cat:'top', shape:'tee',    hex:'#F2F2EF', colour:'white',    composition:'100% cotton',            warmth:1, formality:1, occasions:['office','off']},
  {id:'s-shirt-white',  name:'White poplin shirt',  cat:'top', shape:'shirt',  hex:'#F4F4F1', colour:'white',    composition:'100% cotton poplin',     warmth:2, formality:3, occasions:['office','customer']},
  {id:'s-shirt-blue',   name:'Blue stripe shirt',   cat:'top', shape:'shirt',  hex:'#9CB3CF', colour:'blue',     composition:'100% cotton',            warmth:2, formality:2, occasions:['office','customer']},
  {id:'s-blouse-silk',  name:'Emerald silk blouse', cat:'top', shape:'shirt',  hex:'#1F6B4F', colour:'emerald',  composition:'100% silk',              warmth:1, formality:3, occasions:['customer'], statement:true},
  // bottoms
  {id:'s-trou-charcoal',name:'Charcoal trousers',   cat:'bottom', shape:'trou',  hex:'#4A4A4E', colour:'charcoal', composition:'100% wool',              warmth:3, formality:3, occasions:['office','customer']},
  {id:'s-trou-black',   name:'Black wide trousers', cat:'bottom', shape:'trou',  hex:'#1B1B1D', colour:'black',    composition:'64% polyester, 34% viscose, 2% elastane', warmth:2, formality:3, occasions:['office','customer']},
  {id:'s-trou-cream',   name:'Cream trousers',      cat:'bottom', shape:'trou',  hex:'#E4DCCB', colour:'cream',    composition:'55% linen, 45% cotton',  warmth:1, formality:2, occasions:['office','off']},
  {id:'s-jeans-indigo', name:'Indigo jeans',        cat:'bottom', shape:'jeans', hex:'#2F3D5C', colour:'indigo',   composition:'99% cotton, 1% elastane', warmth:2, formality:1, occasions:['office','off']},
  {id:'s-jeans-black',  name:'Black jeans',         cat:'bottom', shape:'jeans', hex:'#232325', colour:'black',    composition:'98% cotton, 2% elastane', warmth:2, formality:1, occasions:['office','off']},
  {id:'s-skirt-pleat',  name:'Camel pleated skirt', cat:'bottom', shape:'skirt', hex:'#B99368', colour:'camel',    composition:'100% polyester',         warmth:2, formality:2, occasions:['office','customer']},
  // dresses
  {id:'s-dress-navy',   name:'Navy knit dress',     cat:'dress', shape:'dress', hex:'#26304A', colour:'navy',     composition:'50% wool, 50% acrylic',  warmth:3, formality:2, occasions:['office','customer']},
  {id:'s-dress-print',  name:'Printed midi dress',  cat:'dress', shape:'dress', hex:'#7A2433', colour:'burgundy', composition:'100% viscose',           warmth:1, formality:2, occasions:['office','off'], statement:true},
  // shoes
  {id:'s-flats-black',  name:'Black ballet flats',  cat:'shoes', shape:'flat',    hex:'#151515', colour:'black', composition:'Leather',  warmth:1, formality:2, occasions:['office','customer','off']},
  {id:'s-flats-red',    name:'Red ballet flats',    cat:'shoes', shape:'flat',    hex:'#A5212C', colour:'red',   composition:'Leather',  warmth:1, formality:2, occasions:['office','customer','off'], statement:true},
  {id:'s-loafers',      name:'Brown loafers',       cat:'shoes', shape:'loafer',  hex:'#5A3A26', colour:'brown', composition:'Leather',  warmth:2, formality:3, occasions:['office','customer']},
  {id:'s-trainers',     name:'White trainers',      cat:'shoes', shape:'trainer', hex:'#EEEDEA', colour:'white', composition:'Leather',  warmth:1, formality:1, occasions:['office','off']},
  {id:'s-boots-black',  name:'Black ankle boots',   cat:'shoes', shape:'boot',    hex:'#18181A', colour:'black', composition:'Suede',    warmth:3, formality:2, occasions:['office','customer','off']},
  // accessories
  {id:'s-scarf-silk',   name:'Ochre silk scarf',    cat:'accessory', shape:'scarf', hex:'#C2913E', colour:'ochre',  composition:'100% silk',      warmth:1, formality:3, occasions:['office','customer'], statement:true},
  {id:'s-scarf-check',  name:'Check wool scarf',    cat:'accessory', shape:'scarf', hex:'#8C7A66', colour:'brown', composition:'100% wool',      warmth:3, formality:2, occasions:['office','customer','off']},
  {id:'s-bag-tan',      name:'Tan tote',            cat:'accessory', shape:'bag',   hex:'#A87A4E', colour:'tan',   composition:'Leather',        warmth:1, formality:2, occasions:['office','customer','off']}
];

// A believable wear history for the sample: some pieces on repeat, some never touched.
window.sampleWearLog = function(todayISO){
  const heavy = ['s-tee-black-1','s-jeans-indigo','s-trainers','s-jumper-grey','s-trou-black','s-flats-black','s-coat-navy','s-tee-black-2','s-jeans-black','s-turtle-black','s-boots-black','s-bag-tan'];
  const light = ['s-shirt-white','s-trou-charcoal','s-loafers','s-trench','s-blazer-black','s-dress-navy'];
  const rare  = {'s-scarf-silk':96, 's-blazer-check':130, 's-blouse-silk':70, 's-skirt-pleat':112};
  const out = [];
  const t = new Date(todayISO+'T12:00:00');
  for(let i=56;i>=1;i--){
    const d = new Date(t); d.setDate(t.getDate()-i);
    const dow = d.getDay(); if(dow===0) continue;
    const pick = (arr,n,seed)=>{ const r=[]; for(let k=0;k<n;k++) r.push(arr[(seed*7+k*5)%arr.length]); return r; };
    const items = new Set(pick(heavy,3,i));
    if(i%4===0) pick(light,1,i).forEach(x=>items.add(x));
    out.push({date:d.toISOString().slice(0,10), items:[...items], source:'sample'});
  }
  Object.entries(rare).forEach(([id,ago])=>{ const d=new Date(t); d.setDate(t.getDate()-ago); out.push({date:d.toISOString().slice(0,10), items:[id], source:'sample'}); });
  return out.sort((a,b)=>a.date.localeCompare(b.date));
};
