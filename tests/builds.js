global.window = {}; require(require('path').join(__dirname, '..', 'rigs', 'ssr2.js')); const R = window.RIG;
const b = (o) => Object.assign(R.blank(), o);
const B = {
 tusk: b({ name:'Tusk', meta:'ork', attr:{body:0,coord:1,mental:0,social:0}, skills:{guns:9,soak:6,sneak:3,athletics:4,network:2},
   cyber:{wired:2,dermal:1,smartlink:1,spurs:1,skillwires:1}, wire:'melee', gear:{knife:1,ak97:1,vest:1}, circles:{'Gang / Street':'contact','Fence / Fixer':'contact'}, life:'normal' }),
 clutch: b({ name:'Clutch', meta:'human', human:['drive','artillery'], attr:{body:0,coord:2,mental:1,social:0}, skills:{drive:6,artillery:6,tools:3},
   cyber:{vcr:2,datajack:1,radio:1,skillwires:1}, wire:'computer', gear:{knife:1,hk227:1,vest:1,respirator:1}, veh:{civic:1,bigbeatle:1}, deck:'sony', chips:{kanopener:1,prowrite:1,joystick:1},
   circles:{'Rigger / Engineer':'contact','Hacker':'contact'}, life:'normal' }),
 ember: b({ name:'Ember', meta:'ork', attr:{body:0,coord:0,mental:1,social:0}, skills:{magic:6,melee:6,soak:3,sneak:3,athletics:4,unarmed:4},
   trad:'adept', spells:['speed','tough','buff','fly','heal'], gear:{knife:1,sword:1,vest:1,respirator:1}, circles:{'Tribal':'contact','Magical':'contact'}, life:'poor' }),
 quill: b({ name:'Quill', meta:'human', human:['magic'], attr:{body:0,coord:0,mental:2,social:0}, skills:{magic:6,guns:6,soak:3,sneak:3,etiquette:3,tools:2,network:3},
   trad:'hermetic', spells:['forcebolt','fireball','invisibility','heal','wardworking','telepathy'], gear:{knife:1,armclothing:1,predator:1,respirator:1},
   circles:{'Academic / Medical':'contact','Magical':'contact'}, life:'normal' }),
};
for (const [k,c] of Object.entries(B)) { const s = R.compute(c); console.log(k, 'pts', s.pts, 'ess', s.essence, 'act', s.actions, 'rig', s.rig, 'armor', s.armor, 'hp', s.health, 'cash', s.cash,
  'attr', JSON.stringify(s.attr), 'top', Object.entries(s.skill).filter(([,v])=>v>1).map(([a,v])=>a+v+'/TN'+s.tn(a)).join(' '), 'warn', JSON.stringify(s.warn)); }
const r = R.roll(9, 4); console.log(r.verdict, r.succ, r.dice.length); console.log(R.roll(3, 8).verdict);
console.log(JSON.stringify(B));
