import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { PortalRole } from "./localAuth";
import { authenticateLocalSession } from "./localAuth";
import { sdk } from "./sdk";

/**
 * A signed-in identity. `portalRole` / `patientId` describe what the portal
 * shows and which patient record the account may read; they are optional so
 * OAuth users (who only have the schema-level `role`) still get sensible
 * defaults in `verifyPatientAccess`.
 */
export type SessionUser = User & {
  portalRole?: PortalRole;
  patientId?: number;
  demo?: boolean;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SessionUser | null = null;

  // 1. Local password/demo session cookie (works without any external IdP).
  try {
    user = await authenticateLocalSession(opts.req);
  } catch (error) {
    user = null;
  }

  // 2. Fall back to the Manus OAuth session.
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
