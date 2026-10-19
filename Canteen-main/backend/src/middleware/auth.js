import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../utils/http.js';
export async function requireAuth(req,res,next){
 try{
  const h=req.headers.authorization||'';
  if(!h.startsWith('Bearer ')) throw new HttpError(401,'Sign in to continue.','AUTH_REQUIRED');
  const token=h.slice(7);
  const {data,error}=await supabaseAdmin.auth.getUser(token);
  if(error||!data?.user) throw new HttpError(401,'Your session is invalid or expired.','INVALID_SESSION');
  const {data:profile,error:profileError}=await supabaseAdmin.from('profiles').select('id,role,full_name').eq('id',data.user.id).maybeSingle();
  if(profileError) throw new HttpError(503,'Unable to verify account permissions.','PROFILE_LOOKUP_FAILED');
  req.user=data.user; req.profile=profile||{id:data.user.id,role:'customer'}; req.accessToken=token;
  next();
 }catch(e){next(e);}
}
export const requireAdmin=(req,res,next)=>{
 if(!req.user) return next(new HttpError(401,'Sign in to continue.'));
 if(!['owner','admin','staff'].includes(req.profile?.role)) return next(new HttpError(403,'Administrator access required.','FORBIDDEN'));
 next();
};
export const requireOwner=(req,res,next)=>{
 if(req.profile?.role!=='owner') return next(new HttpError(403,'Owner access required.','FORBIDDEN'));
 next();
};
