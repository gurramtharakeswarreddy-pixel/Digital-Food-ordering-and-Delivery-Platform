(() => {
 const cfg=window.PANESH_CONFIG||{};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function run(){
  await wait(0);
  const supabase=window.supabase?.createClient?.(cfg.SUPABASE_URL||'',cfg.SUPABASE_PUBLISHABLE_KEY||'');
  if(!supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('YOUR_PROJECT')){location.href='admin.html';return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){location.href='admin.html';return;}
  const headers={Authorization:`Bearer ${session.access_token}`};
  const base=String(cfg.API_BASE_URL||'').replace(/\/$/,'');
  try{
   const r=await fetch(`${base}/admin/dashboard`,{headers});const j=await r.json();
   if(r.status===401||r.status===403){await supabase.auth.signOut();location.href='admin.html';return;}
   if(!r.ok||!j.ok)throw new Error(j.error?.message||'Dashboard unavailable');
   const x=j.data,grid=document.getElementById('statsGrid');
   if(grid)grid.innerHTML=[
    ['Total Orders',x.totalOrders,'🛒'],['Pending Orders',x.pendingOrders,'⏳'],['Preparing Orders',x.preparingOrders,'👨‍🍳'],['Verified Payments','₹'+Number(x.verifiedPaidAmount).toFixed(2),'💳'],['Low Stock Items',x.lowStockItems,'📦'],['Pending Counter','₹'+Number(x.pendingCounterAmount).toFixed(2),'🧾']
   ].map(([label,value,icon])=>`<div class="stat-card"><div class="stat-icon">${icon}</div><div class="stat-label">${label}</div><div class="stat-value">${String(value)}</div><div class="stat-sub">Live database metric</div></div>`).join('');
   window.PaneshAdmin={token:session.access_token,api:(path,options={})=>fetch(`${base}${path}`,{...options,headers:{...headers,...options.headers}}).then(async r=>{const v=await r.json();if(!r.ok||!v.ok)throw new Error(v.error?.message||'Request failed');return v.data;})};
  }catch(e){console.error('Dashboard API error',e);const grid=document.getElementById('statsGrid');if(grid)grid.innerHTML=`<p role="alert">Live dashboard unavailable: ${String(e.message).replace(/[<>]/g,'')}</p>`;}
 }
 run();
})();
