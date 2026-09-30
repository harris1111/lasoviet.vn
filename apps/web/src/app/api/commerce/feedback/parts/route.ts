import { submitFeedbackCommand } from "../../../../../features/commerce/feedback-api";
export function POST(request: Request): Promise<Response> { return submitFeedbackCommand(request, "feedback"); }
