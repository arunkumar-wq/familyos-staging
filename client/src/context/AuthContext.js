import React,{createContext,useContext,useState,useEffect}from'react';
import api from '../utils/api';
const AuthContext=createContext();
export function AuthProvider({children}){
  const [user,setUser]=useState(null);
  const [family,setFamily]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{const token=localStorage.getItem('fos_token');if(token){api.get('/auth/me').then(r=>{setUser(r.data.user);setFamily(r.data.family);}).catch(()=>{localStorage.removeItem('fos_token');}).finally(()=>setLoading(false));}else{setLoading(false);}},[]);
  const login=async(email,password)=>{const res=await api.post('/auth/login',{email,password});localStorage.setItem('fos_token',res.data.token);setUser(res.data.user);return res.data;};
  const register=async(data)=>{const res=await api.post('/auth/register',data);localStorage.setItem('fos_token',res.data.token);setUser(res.data.user);return res.data;};
  const logout=()=>{localStorage.removeItem('fos_token');setUser(null);setFamily(null);};
  const updateMe=async(data)=>{await api.put('/auth/me',data);setUser(p=>({...p,...data}));};
  return(<AuthContext.Provider value={{user,family,loading,login,register,logout,updateMe}}>{children}</AuthContext.Provider>);}
export const useAuth=()=>useContext(AuthContext);
