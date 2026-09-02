import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";

import type { CurrentActor as ResolvedCurrentActor } from "@lasoviet/contracts";

type RequestWithActor = {
  currentActor?: ResolvedCurrentActor;
};

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ResolvedCurrentActor => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithActor>();
    if (request.currentActor === undefined) {
      throw new UnauthorizedException({ code: "ACTOR_TOKEN_INVALID" });
    }
    return request.currentActor;
  },
);
