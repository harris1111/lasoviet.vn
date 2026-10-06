import {NextResponse} from "next/server";
import {RecoveryReceiptCommandV1Schema,RecoveryReceiptViewV1Schema} from "@lasoviet/contracts";
import {authorizeCanonicalMutation} from "../../../../../api/authorize-canonical-mutation";
import {privateApiClient,PrivateApiClientError} from "../../../../../api/private-api-client";
import {resolveVerifiedAccountActor,VerifiedAccountResolutionError} from "../../../../../auth/resolve-current-actor";
const headers={"cache-control":"no-store","x-robots-tag":"noindex, nofollow"};
export async function POST(request:Request) {
  if(!authorizeCanonicalMutation(request))return new NextResponse(null,{status:403,headers});
  if(new URL(request.url).searchParams.size)return new NextResponse(null,{status:400,headers});
  try {
    const actor=await resolveVerifiedAccountActor();
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return new NextResponse(null,{status:400,headers});
    const text=await request.text();if(text.length>4096)return new NextResponse(null,{status:400,headers});
    let command;try {command=RecoveryReceiptCommandV1Schema.parse(JSON.parse(text));}catch{return new NextResponse(null,{status:400,headers});}
    const response=await privateApiClient(actor,actor.requestId).request<{ok:boolean;value?:unknown}>("/commerce/recovery/receipt",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(command)});
    const parsed=RecoveryReceiptViewV1Schema.safeParse(response?.ok?response.value:null);
    if(!parsed.success||parsed.data.orderId!==command.orderId)return new NextResponse(null,{status:502,headers});
    return NextResponse.json(parsed.data,{headers});
  }catch(error){
    if(error instanceof VerifiedAccountResolutionError)return new NextResponse(null,{status:401,headers});
    if(error instanceof PrivateApiClientError)return new NextResponse(null,{status:[404,503].includes(error.status??0)?error.status:502,headers});
    throw error;
  }
}
