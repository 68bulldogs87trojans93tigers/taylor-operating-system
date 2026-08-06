'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';

export default function LoginPage(){
 const router=useRouter(); const [mode,setMode]=useState('signin'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 useEffect(()=>{getSupabase().auth.getSession().then(({data})=>{if(data.session) router.replace('/dashboard')})},[router]);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');const supabase=getSupabase();const result=mode==='signup'?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/dashboard'}}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(result.error)setMessage(result.error.message);else if(mode==='signup')setMessage('Account created. Check your email if confirmation is required.');else router.replace('/dashboard');}
 return <div className="loginPage"><form className="loginCard" onSubmit={submit}><div className="brand large"><span className="logo">T</span><div><strong>Taylor Operating System</strong><small>Shared project management</small></div></div><h1>{mode==='signup'?'Create your account':'Welcome back'}</h1><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}</button><button type="button" className="secondary" onClick={()=>setMode(mode==='signup'?'signin':'signup')}>{mode==='signup'?'Already have an account? Sign in':'Create a new account'}</button>{message&&<div className="alert">{message}</div>}</form></div>
}
