import {Router} from 'express';
import {supabaseAdmin} from '../config/supabase.js';
import {asyncRoute,ok,HttpError} from '../utils/http.js';
export const menuRouter=Router();
menuRouter.get('/',asyncRoute(async(req,res)=>{
 let q=supabaseAdmin.from('menu_items').select('id,category_id,name,description,price,image_url,is_vegetarian,is_available,stock_quantity,created_at,categories(name)').eq('is_available',true).order('name');
 if(req.query.category) q=q.eq('category_id',req.query.category);
 if(req.query.search) q=q.ilike('name',`%${String(req.query.search).slice(0,80).replace(/[,%()]/g,'')}%`);
 const {data,error}=await q;
 if(error) throw new HttpError(503,'Menu is temporarily unavailable.');
 ok(res,data||[]);
}));
menuRouter.get('/categories',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('categories').select('id,name,description,sort_order').eq('is_active',true).order('sort_order');
 if(error) throw new HttpError(503,'Categories are temporarily unavailable.');
 ok(res,data||[]);
}));
menuRouter.get('/:id',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('menu_items').select('*,categories(name)').eq('id',req.params.id).eq('is_available',true).maybeSingle();
 if(error) throw new HttpError(503,'Menu item lookup failed.');
 if(!data) throw new HttpError(404,'Menu item not found.');
 ok(res,data);
}));
