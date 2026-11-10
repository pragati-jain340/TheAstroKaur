import {NextRequest,NextResponse} from 'next/server';
import {apiError,BookingError,check,database,requireUser} from '@/lib/booking/server';
import {disconnectGoogle,publicConnection,userConnection} from '@/lib/google/accounts';
import {oauthConfig} from '@/lib/google/oauth';
export async function GET(){
  try{
    const {user}=await requireUser(),connection=await userConnection(user.id);
    const organizer=check(await database().from('google_calendar_connections').select('auth_user_id,calendar_id,busy_calendar_ids').eq('id',true).maybeSingle());
    const owned=organizer?.auth_user_id===user.id;
    let configurationError:string|null=null;try{oauthConfig();}catch(error){configurationError=error instanceof BookingError?error.message:'Google configuration is incomplete.';}
    return NextResponse.json({connection:publicConnection(connection),configuration_error:configurationError,is_organizer:owned,selection:owned?{calendar_id:organizer.calendar_id,busy_calendar_ids:organizer.busy_calendar_ids}:null},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
export async function DELETE(req:NextRequest){
  try{
    const {user}=await requireUser(),body=await req.json();
    if(body.confirmed!==true)throw new BookingError('Confirm disconnection before continuing.');
    return NextResponse.json(await disconnectGoogle(user.id));
  }catch(error){return apiError(error);}
}
