import { isInternalJobAuthorized } from "../../lib/internal-job-auth";
import { processDueMessageBatches } from "../../services/messaging/batch-processor";
export default async (request: Request) => {
  if (!isInternalJobAuthorized(request))
    return new Response("Forbidden", { status: 403 });
  // Bounded work: each generation has a timeout; a later tick handles remaining work.
  await processDueMessageBatches({ limit: 3 });
  return new Response(null, { status: 204 });
};
