(() => {
 const cfg=window.PANESH_CONFIG||{},form=document.getElementById('admin-login-form'),error=document.getElementById('admin-error');
 const supabase=window.supabase?.createClient?.(cfg.SUPABASE_URL||'',cfg.SUPABASE_PUBLISHABLE_KEY||'');
 form?.addEventListener('submit',async e=>{e.preventDefault();if(!supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('YOUR_PROJECT')){error.textContent='Configure Supabase in app-config.js first.';return;}
 const button=form.querySelector('[type=submit]');button.disabled=true;error.textContent='';
 try{const {data,error:loginError}=await supabase.auth.signInWithPassword({email:document.getElementById('admin-username').value.trim(),password:document.getElementById('admin-password').value});if(loginError)throw loginError;
 const response=await fetch(`${cfg.API_BASE_URL.replace(/\/$/,'')}/admin/dashboard`,{headers:{Authorization:`Bearer ${data.session.access_token}`}});
 if(response.status===403){await supabase.auth.signOut();throw new Error('This account does not have staff or administrator permissions.');}
 if(!response.ok){await supabase.auth.signOut();throw new Error('Unable to verify administrator access. Check that the backend is running.');}
 location.href='dashboard.html';
 }catch(err){error.textContent=err.message||'Admin login failed.';button.disabled=false;}});
})();
