import {NextRequest,NextResponse} from 'next/server';
import {apiError,BookingError,check,database,requireAdmin} from '@/lib/booking/server';
import {validateCalendarSelection} from '@/lib/google/accounts';
export async function PUT(req:NextRequest){
  try{
    const {user}=await requireAdmin(),body=await req.json();
    if(typeof body.calendar_id!=='string' || !Array.isArray(body.busy_calendar_ids))throw new BookingError('Choose an organizer and conflict calendars.');
    const selected=await validateCalendarSelection(user.id,body.calendar_id,body.busy_calendar_ids);
    check(await database().rpc('google_select_calendars',{p_user:user.id,p_calendar:selected.calendar,p_busy:selected.busy}));
    return NextResponse.json({saved:true});
  }catch(error){return apiError(error);}
}
