// from signal-studio-v6lib/src/views/instrument/stage-geometry.test.mjs:1-43 (2a9e4a7) — the Studio's 24 checks, RETARGETED
// (SIGNAL R1, lane V3) to the contract's stage: C2..C7 = MIDI 36..96 (types.ts STAGE_LO/STAGE_HI), 36 whites, 25 blacks.
// Changed against the source: the range constants (24→36), the counts (43→36 whites, 30→25 blacks), the out-of-range
// probes (23→35), the report line (`stage-geometry: N/N`, the R1 suite law). Added: [stage] the portfolio stage (the
// white/black widths the keybed draws, and the letter window at octave −1..+1 on the stage, docs/signal-map/D §6).
// Run: source ~/.nvm/nvm.sh && node src/signal/view/stage-geometry.test.mjs   (exit 0 = green)
import { STAGE_LO, STAGE_HI, WHITES, BLACKS, WHITE_COUNT, WHITE_W, BLACK_W, isWhite, inStage,
  keyBox, keyCentre, spanOf, midiAtPct } from './stage-geometry.ts';
import { STAGE_LO as CONTRACT_LO, STAGE_HI as CONTRACT_HI } from '../types.ts';
let pass=0,fail=0; const ok=(n,c,x='')=>{if(c){pass++;console.log(`  ✓ ${n}`);}else{fail++;console.log(`  ✗ ${n}  ${x}`);}};

console.log('\n[stage] the range');
ok('C2 … C7 (the contract\'s stage)', STAGE_LO===36 && STAGE_HI===96 && STAGE_LO===CONTRACT_LO && STAGE_HI===CONTRACT_HI);
ok('36 white keys (5 octaves + the top C)', WHITE_COUNT===36, String(WHITE_COUNT));
ok('25 black keys', BLACKS.length===25, String(BLACKS.length));
ok('whites + blacks = every semitone in range', WHITES.length+BLACKS.length===STAGE_HI-STAGE_LO+1);
ok('the first and last keys are C', WHITES[0]===36 && WHITES[WHITE_COUNT-1]===96);
ok('isWhite matches the piano pattern', [0,2,4,5,7,9,11].every(pc=>isWhite(60+pc)) && [1,3,6,8,10].every(pc=>!isWhite(60+pc)));
ok('inStage rejects out-of-range notes', !inStage(35) && !inStage(97) && inStage(36) && inStage(96));

console.log('\n[stage] the layout');
ok('whites TILE the width exactly', Math.abs(WHITE_COUNT*WHITE_W-100)<1e-9);
ok('white boxes are gapless and ascending', WHITES.every((m,i)=>{const b=keyBox(m); return Math.abs(b.left-i*WHITE_W)<1e-9 && !b.black;}));
ok('the last white ends at 100%', Math.abs((keyBox(96).left+keyBox(96).width)-100)<1e-9);
ok('a black key is narrower than a white', keyBox(61).width < keyBox(60).width);
ok('a black key straddles the seam above its lower white', (()=>{
  const seam=keyBox(60).left+keyBox(60).width, b=keyBox(61);
  return Math.abs((b.left+b.width/2)-seam)<1e-9;})(), JSON.stringify(keyBox(61)));
ok('every black key sits between its two white neighbours', BLACKS.every(m=>{
  const b=keyBox(m), lo=keyBox(m-1), hi=keyBox(m+1);
  return b.left>lo.left && b.left+b.width < hi.left+hi.width;}));
ok('out-of-range notes have no box', keyBox(35)===null && keyBox(120)===null);
ok('keyCentre agrees with keyBox', Math.abs(keyCentre(60)-(keyBox(60).left+keyBox(60).width/2))<1e-9);
ok('no two distinct notes share a box', (()=>{
  const seen=new Set(); for(let m=STAGE_LO;m<=STAGE_HI;m++){const b=keyBox(m);const k=b.left.toFixed(6)+':'+b.black; if(seen.has(k))return false; seen.add(k);} return true;})());

console.log('\n[stage] spans + the inverse');
ok('a triad spans from its lowest to its highest key', (()=>{
  const s=spanOf([60,64,67]); return Math.abs(s.left-keyBox(60).left)<1e-9 && Math.abs((s.left+s.width)-(keyBox(67).left+keyBox(67).width))<1e-9;})());
ok('span order does not matter', JSON.stringify(spanOf([67,60,64]))===JSON.stringify(spanOf([60,64,67])));
ok('a span ignores out-of-range notes but keeps the rest', spanOf([12,60,64])!==null && Math.abs(spanOf([12,60,64]).left-keyBox(60).left)<1e-9);
ok('an all-out-of-range span is null', spanOf([12,120])===null);
ok('an empty span is null', spanOf([])===null);
ok('a single note still has width', spanOf([60]).width>0);
ok('midiAtPct round-trips a white key', WHITES.every(m=>midiAtPct(keyCentre(m))===m));
ok('midiAtPct clamps at both ends', midiAtPct(-50)===WHITES[0] && midiAtPct(150)===WHITES[WHITE_COUNT-1]);

console.log('\n[stage] the portfolio stage (added)');
ok('a white is 100/36 % and a black .62 of it', Math.abs(WHITE_W-100/36)<1e-12 && Math.abs(BLACK_W-0.62*100/36)<1e-12);
// the 15 letters' widest reach per octave (D §6, MEASURED over 12 keys × maj/min, colour row included): −1 43..68 · 0 55..80 · +1 67..92
ok('octave −1..+1 keeps every letter on the stage', [[43,68],[55,80],[67,92]].every(([lo,hi])=>inStage(lo)&&inStage(hi)));
ok('octave 0 in C: a..l (C4..D5) spans nine whites from 38.9 %', (()=>{
  const s=spanOf([60,62,64,65,67,69,71,72,74]); return Math.abs(s.left-14*WHITE_W)<1e-9 && Math.abs(s.width-9*WHITE_W)<1e-9;})(), JSON.stringify(spanOf([60,74])));
ok('every C of the stage is a white key (the C-dots, the rail names C1..C6)', [36,48,60,72,84,96].every(m=>isWhite(m)&&keyBox(m)&&!keyBox(m).black));

console.log(`\nstage-geometry: ${pass}/${pass+fail}`);
if(fail)process.exit(1);
