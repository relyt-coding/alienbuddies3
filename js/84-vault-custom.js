// ══════════════════════════════════════════════
//  HAND-PICKED VAULT (v0.2.194)
//  The Knowledge Vault no longer fills itself from the built-in lessons, words, tips and skill-tree facts. It shows ONLY the
//  entries in /vault/entries.json, which the creator writes with the editor at alienbuddies.space/vault (vault/index.html).
//  Each entry: {id, name, tab (a VAULT_TABS id), text, price (internal units: 1 = 0.1 mJ)}. Buying one still gives ×1.05.
//  Tabs keep their skill-tree locks (VAULT_TABS req). The old content stays in js/68 / js/73 / js/74 (the editor's LIBRARY is a
//  copy of it in vault/library.json) but nothing reads it any more.
//  Preview: the editor can switch on "preview on this device" (localStorage ab2_vaultPreview = 1); the game then uses the
//  editor's draft (ab2_vaultDraft) instead of the published file, on that browser only.
// ══════════════════════════════════════════════
let VAULT_CUSTOM=[];
(function(){
  function apply(list){
    VAULT_CUSTOM=(Array.isArray(list)?list:[]).filter(e=>e&&e.id&&e.name&&VAULT_TABS.some(t=>t.id===e.tab)).map(e=>({id:String(e.id),name:String(e.name),tab:e.tab,text:String(e.text||''),price:Math.max(1,+e.price||1)}));
    try{if(typeof renderVault==='function'&&document.getElementById('vaultBody'))renderVault();}catch(e){}
    try{if(typeof updateVaultBtn==='function')updateVaultBtn();}catch(e){}
  }
  let draft=null;
  try{if(localStorage.getItem('ab2_vaultPreview')==='1')draft=JSON.parse(localStorage.getItem('ab2_vaultDraft')||'null');}catch(e){}
  if(draft&&Array.isArray(draft.entries))apply(draft.entries);
  else{try{fetch('/vault/entries.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>apply(d&&d.entries)).catch(()=>{});}catch(e){}}
  window.vaultReloadCustom=apply;
})();
window.vaultEntries=function(tab){
  return VAULT_CUSTOM.filter(e=>e.tab===tab).map(e=>({kind:tab==='words'?'word':'learn',id:'c_'+e.id,title:e.name,text:e.text,on:()=>true,price:e.price}));
};
window.vaultTipsIn=function(){return [];};
window.vaultEntryCost=function(e){return e&&e.price>0?e.price:(typeof VAULT_PRICE_FIRST!=='undefined'?VAULT_PRICE_FIRST:50);};
window.vaultCounts=function(){
  const open=VAULT_CUSTOM.filter(e=>vaultTabOpen(e.tab));
  return{have:open.filter(e=>vaultOwned.includes('c_'+e.id)).length,all:open.length};
};
