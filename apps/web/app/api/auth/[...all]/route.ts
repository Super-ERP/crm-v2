import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"
import { guardRouteWrite } from "@/lib/write-access"
import { createAuthPostHandler } from "./post-handler"

type AuthPostHandler = (request: Request, ...rest: unknown[]) => Promise<Response>

const handlers = toNextJsHandler(auth.handler)

export const GET = handlers.GET
export const POST = createAuthPostHandler({
  handler: handlers.POST as AuthPostHandler,
  guardWrite: guardRouteWrite,
})
