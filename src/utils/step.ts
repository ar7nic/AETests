import { test } from '@playwright/test';

/**
 * Step title: either a ready string, or a resolver that builds the title from
 * the method's runtime arguments.
 *
 * The resolver args are typed `any[]` on purpose: `Args` is inferred on the
 * inner decorator (from the method), but `name` is declared here in the
 * factory where `Args` is not yet known. With `unknown[]` a typed lambda such
 * as `(name: string) => ...` would not be assignable (rest-param
 * contravariance), so `any[]` is used to accept any method signature. You
 * still annotate the resolver params yourself, so they are typed at the call
 * site.
 */
type StepTitle =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  string | ((...args: any[]) => string);

/**
 * Method decorator that wraps an async method call in a named `test.step`.
 *
 * This gives assistants (and any orchestration layer) a **hierarchy** in the
 * report: the element-level actions a method performs nest *underneath* its
 * step instead of appearing as a flat list. The `Element` layer keeps
 * auto-stepping the individual actions — this just adds the parent.
 *
 * @param name Step title. Omit to default to the method name, pass a string
 *   for a static title, or pass a resolver to build it from the call args.
 *
 * @example
 *   `@step('Sign up with name and email')`
 *   async startSignup(user: RegistrationUser) { ... }
 *
 * @example
 *   `@step((searchName: string) => `Filter users by name "${searchName}"`)`
 *   async filterByName(searchName: string) { ... }
 */
export function step(name?: StepTitle) {
  return function <This, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ): (this: This, ...args: Args) => Promise<Return> {
    return function (this: This, ...args: Args): Promise<Return> {
      const title = typeof name === 'function' ? name(...args) : (name ?? String(context.name));
      return test.step(title, () => target.call(this, ...args));
    };
  };
}
