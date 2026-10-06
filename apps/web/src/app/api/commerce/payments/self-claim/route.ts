import { topupProxy } from "../../../../../api/topup-proxy";
export async function POST(request: Request): Promise<Response> { return topupProxy(request, "self-claim"); }
