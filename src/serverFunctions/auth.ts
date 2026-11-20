import { createMiddleware } from "@tanstack/react-start";
import { isAdmin } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { rememberUser } from "@/server/users";

/** The signed-in member, recorded on first sight, with `admin` from the Gateway. */
export const memberMiddleware = createMiddleware({ type: "function" })
  .middleware([ensureUserMiddleware])
  .server(async ({ next, context }) => {
    await rememberUser(context.user);
    return next({
      context: {
        member: { id: context.user.id, admin: isAdmin(context.user) },
      },
    });
  });

/** Refuses anyone but an owner or admin of the organization. */
export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([memberMiddleware])
  .server(({ next, context }) => {
    if (!context.member.admin) {
      throw new Error("Only admins can change the network.");
    }
    return next();
  });
