import { ZodError } from 'zod';
export function notFound(req,res){res.status(404).json({ok:false,error:{code:'NOT_FOUND',message:'Route not found.'}});}
export function errorHandler(err,req,res,next){
 const status=err.status||(err instanceof ZodError?400:500);
 const code=err.code||(err instanceof ZodError?'VALIDATION_ERROR':'INTERNAL_ERROR');
 const message=status>=500?'An unexpected server error occurred.':err.message;
 if(status>=500) console.error(JSON.stringify({level:'error',requestId:req.id||null,path:req.path,code, message:err.message}));
 res.status(status).json({ok:false,error:{code,message,...(err instanceof ZodError?{details:err.issues.map(i=>({path:i.path,message:i.message}))}:{})}});
}
