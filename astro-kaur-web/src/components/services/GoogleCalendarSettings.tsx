"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import {useEffect,useState} from 'react';
import {
  formatAppointment} from './SlotPicker';
interface Calendar{id:string;summary:string;primary?:boolean;accessRole:string;conferenceProperties?:{allowedConferenceSolutionTypes?:string[]}}
interface State{connection:{account:string;status:string;connected_at:string;last_error:string|null}|null;is_organizer:boolean;selection:{calendar_id:string;busy_calendar_ids:string[]}|null;configuration_error:string|null}
async function readResponse(response:Response){const result=await response.json();if(!response.ok)throw new Error(result.error || 'Google operation failed.');return result;}
async function fetchSettings(){
  let state=await readResponse(await fetch('/api/google/connection',{cache:'no-store'})) as State;
  let calendars:Calendar[]=[],error='';
  if(state.connection?.status==='connected'){
    try{calendars=(await readResponse(await fetch('/api/google/calendars',{cache:'no-store'}))).calendars;}
    catch(err){error=err instanceof Error?err.message:'Could not read calendars.';state=await readResponse(await fetch('/api/google/connection',{cache:'no-store'}));}
  }
  const primary=calendars.find(c=>c.primary)?.id;
  if(state.selection && primary)state={...state,selection:{calendar_id:state.selection.calendar_id==='primary'?primary:state.selection.calendar_id,busy_calendar_ids:state.selection.busy_calendar_ids.map(id=>id==='primary'?primary:id)}};
  return {state,calendars,error};
}
export default function GoogleCalendarSettings({purpose='account',onConnectionChange}:{purpose?:'account'|'organizer';onConnectionChange?:()=>void}){
  const [state,setState]=useState<State|null>(null),[calendars,setCalendars]=useState<Calendar[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[working,setWorking]=useState(false);
  const [selected,setSelected]=useState(''),[busyIds,setBusyIds]=useState<string[]>([]),[busy,setBusy]=useState<Array<{start:string;end:string}>>([]);
  useEffect(()=>{let active=true;fetchSettings().then(result=>{if(!active)return;setState(result.state);setCalendars(result.calendars);setError(result.error);setSelected(result.state.selection?.calendar_id || result.calendars.find(c=>c.primary)?.id || result.calendars[0]?.id || '');setBusyIds(result.state.selection?.busy_calendar_ids || []);
    const query=new URLSearchParams(window.location.search);if(query.get('google')==='connected')setMessage('Google Calendar connected.');else if(query.get('google')==='error')setError(query.get('message')?.slice(0,500) || 'Google connection was not completed.');
  }).catch(err=>{if(active)setError(err.message);});return ()=>{active=false;};},[]);
  async function refresh(){const result=await fetchSettings();setState(result.state);setCalendars(result.calendars);setError(result.error);setSelected(result.state.selection?.calendar_id || result.calendars.find(c=>c.primary)?.id || '');setBusyIds(result.state.selection?.busy_calendar_ids || []);onConnectionChange?.();}
  async function disconnect(){if(!window.confirm('Disconnect this Google account and revoke its app access? Existing Google events remain in Google Calendar. An organizer with upcoming calls or pending holds cannot be disconnected.'))return;setWorking(true);setError('');try{const result=await readResponse(await fetch('/api/google/connection',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmed:true})}));await refresh();setBusy([]);setMessage(result.warning || 'Google Calendar disconnected and access revoked.');}catch(err){setError(err instanceof Error?err.message:'Could not disconnect.');}finally{setWorking(false);}}
  async function save(){setWorking(true);setError('');try{await readResponse(await fetch('/api/google/selection',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({calendar_id:selected,busy_calendar_ids:busyIds})}));await refresh();setMessage('Booking calendars saved. If you changed the organizer calendar, review availability and enable call booking again.');}catch(err){setError(err instanceof Error?err.message:'Could not save calendars.');}finally{setWorking(false);}}
  async function checkBusy(){setWorking(true);setError('');setMessage('');try{const result=await readResponse(await fetch('/api/google/busy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start:new Date().toISOString(),end:new Date(Date.now()+3*86400000).toISOString(),calendar_ids:[selected]})}));const periods=result.calendars.flatMap((c:{busy:Array<{start:string;end:string}>})=>c.busy);setBusy(periods);setMessage(periods.length?`Calendar access works. Found ${periods.length} busy period${periods.length===1?'':'s'} in the next three days.`:'Calendar access works. No busy periods in the next three days.');}catch(err){setBusy([]);setError(err instanceof Error?err.message:'Could not check availability.');}finally{setWorking(false);}}
  const organizer=purpose==='organizer',connected=state?.connection?.status==='connected';
  const chooseable=organizer?calendars.filter(c=>['owner','writer'].includes(c.accessRole) && c.conferenceProperties?.allowedConferenceSolutionTypes?.includes('hangoutsMeet')):calendars;
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <section id="google-calendar-settings" className="scroll-mt-24 space-y-4 rounded-2xl border border-[#E5B842]/30 bg-[#FAF8F5] dark:bg-[#0D1829] p-5 sm:p-6 text-[#0F172A] dark:text-[#FAF8F5]">
    <h3 className="font-serif text-xl">{organizer?'Connect the booking organizer':'Your Google Calendar'}</h3>
    <p className="text-sm">{organizer?'Authorize your administrator account to organize calls and send Meet invitations.':'Connect your own Google Calendar to view your calendars and check availability. This does not change the website’s booking organizer.'}</p>
    {!state && !error && <p className="text-sm">Loading connection…</p>}
    {state?.connection && <p className="text-sm">{state.connection.account} · {state.connection.status.replaceAll('_',' ')}</p>}
    {state?.configuration_error && <p role="alert" className="text-sm">{state.configuration_error}</p>}
    {state?.connection?.last_error && <p role="alert" className="text-sm">{state.connection.last_error}</p>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    <div className="flex flex-wrap items-center gap-4"><a href={`/api/google/connect?purpose=${purpose}`} className={buttonVariants({ size: "lg" })}>{connected?'Reconnect Google':'Connect Google Calendar'}</a>{state?.connection && state.connection.status!=='disconnected' && <Button variant="link" disabled={working} onClick={disconnect}>Disconnect</Button>}{!organizer && <Button variant="link" disabled={working} onClick={()=>refresh().catch(err=>setError(err.message))}>Refresh connection</Button>}</div>
    {!organizer && <p className="text-xs opacity-75">Google’s External Testing mode can require reconnection after seven days.</p>}
    {connected && <>
      {organizer && !state?.is_organizer && <p className="text-sm">This Google account is connected to your login. Use Reconnect Google here to authorize it as the booking organizer.</p>}
      <label className="block text-sm">{organizer?'Meet-capable organizer calendar':'Accessible calendars'}<NativeSelect className="mt-1" value={selected} onChange={e=>{setSelected(e.target.value);setBusy([]);}}><option value="">Select a calendar</option>{chooseable.map(calendar=><option key={calendar.id} value={calendar.id}>{calendar.summary}{calendar.primary?' (primary)':''}</option>)}</NativeSelect></label>
      {organizer && state?.is_organizer && <><fieldset className="space-y-2"><legend className="text-sm mb-2">Calendars that block consultation availability</legend>{calendars.map(calendar=><label className="flex items-start gap-2 text-sm" key={calendar.id}><Checkbox className="mt-1" checked={busyIds.includes(calendar.id) || busyIds.includes('primary') && !!calendar.primary} onCheckedChange={checked=>setBusyIds(current=>checked===true?[...new Set([...current.filter(id=>id!=='primary'),calendar.id])]:current.filter(id=>id!==calendar.id && !(id==='primary' && calendar.primary)))}/>{calendar.summary}</label>)}</fieldset><Button size="lg" disabled={working || !selected} onClick={save}>Save booking calendars</Button></>}
      {!organizer && <Button variant="link" disabled={working || !selected} onClick={checkBusy}>Check next three days</Button>}
      {!!busy.length && <div className="text-sm space-y-2"><p>Busy periods · {zone}</p>{busy.map((range,index)=><p key={index}>{formatAppointment(range.start,zone)} — {formatAppointment(range.end,zone)}</p>)}</div>}
    </>}
  </section>;
}
