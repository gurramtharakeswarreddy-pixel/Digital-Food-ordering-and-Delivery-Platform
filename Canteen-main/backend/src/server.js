import app from './app.js';
import { env } from './config/env.js';
app.listen(env.PORT,'0.0.0.0',()=>console.log(JSON.stringify({level:'info',message:'Panesh Kitchen API listening',port:env.PORT,env:env.NODE_ENV})));
