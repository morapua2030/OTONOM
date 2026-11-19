/**
 * A partial process.env for unit tests. Next's types declare NODE_ENV as required, so a plain object literal is not a
 * NodeJS.ProcessEnv. This keeps that one cast here instead of in every test, and adds nothing to the values.
 */
export function testEnv(vars: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return vars as unknown as NodeJS.ProcessEnv;
}
