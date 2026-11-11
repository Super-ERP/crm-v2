import "server-only"
import { AsyncLocalStorage } from "node:async_hooks"
const mutationContext = new AsyncLocalStorage<boolean>()
export function inBusinessMutation() { return mutationContext.getStore() === true }
export function withBusinessMutation<T>(fn:()=>Promise<T>) { return mutationContext.run(true,fn) }
