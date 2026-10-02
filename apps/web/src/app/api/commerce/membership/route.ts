import { membershipProxy } from "../../../../api/membership-proxy";
export const GET = (request: Request) => membershipProxy(request);
