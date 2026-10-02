import { membershipProxy } from "../../../../../api/membership-proxy";
export const POST = (request: Request) => membershipProxy(request, "purchase");
