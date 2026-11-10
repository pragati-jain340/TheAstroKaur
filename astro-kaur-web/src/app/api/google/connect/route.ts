import { cookies } from "next/headers";
import { NextRequest,NextResponse } from "next/server";
import { apiError,BookingError, requireUser } from "@/lib/booking/server";
import { oauthConfig,newOAuthState,GOOGLE_SCOPES } from "@/lib/google/oauth";
export async function GET(req:NextRequest) {
  try {
    const { user,isAdmin } = await requireUser(), config=oauthConfig();
    const purpose=req.nextUrl.searchParams.get('purpose') || 'account';
    if(!['account','organizer'].includes(purpose))throw new BookingError('Invalid Google connection purpose.');
    if(purpose==='organizer' && !isAdmin)throw new BookingError('Administrator access is required to connect the booking organizer.',403);
    const {state,cookie}=newOAuthState(user.id,purpose as 'account'|'organizer');
    const jar = await cookies();
    jar.set("google_booking_oauth", cookie, {
      httpOnly: true,
      secure: config.redirect_uri.startsWith("https:"),
      sameSite: "lax",
      path: "/api/google",
      maxAge: 600,
    });
    const query = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(' '),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
    );
  } catch (error) {
    return apiError(error);
  }
}
