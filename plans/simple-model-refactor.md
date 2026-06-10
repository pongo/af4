# Simple Model Refactor Plan

## Context

`src/app/model/simple.ts` still looks closer to the older AF4 implementation style. It has several issues that were already addressed in `af4.ts`:

- Debug `console.log` calls in domain code.
- A capitalized helper name: `CheckPostponedTasks`.
- Cleanup, task factories, and postponed revival are nested inside `makeSimple`.
- There is no explicit reducer environment type.
- There is no immutable reducer wrapper.
- Behavior overlaps with AF4 helpers but is implemented separately.

The simple model should be cleaned up carefully, preserving existing behavior and tests.

## Goals

- Make `simple.ts` easy to read and test.
- Keep the public `makeSimple(env)(tasklist, action)` contract.
- Mirror only the useful AF4 structure, without forcing AF4-specific concepts into simple mode.
- Remove debug logging from model code.

## Non-goals

- Do not implement `Next` for simple mode unless there is a separate product decision.
- Do not add `open-new` staging to simple mode.
- Do not merge simple and AF4 models into one abstraction yet.

## Candidate Changes

1. Remove debug logging

Delete:

- `console.log("action", action)`
- `console.log(newTasks)`

2. Rename and extract cleanup helpers

Rename:

- `CheckPostponedTasks` -> `reviveDuePostponedTasks`

Extract:

- `cleanup(env, tasklist, now)`
- `reviveDuePostponedTasks(env, tasklist, now)`
- `revivePostponedTask(env, task, revivedAt)`

3. Introduce explicit simple environment

Add:

```ts
interface SimpleEnv {
  generateId: () => string;
  now: () => Date;
}
```

Then keep:

```ts
export function makeSimple(env: SimpleEnv) {
  return (tasklist, action) => reduceSimpleInPlace(tasklist, action, env);
}
```

4. Split mutating and immutable reducers

Add:

- `reduceSimpleInPlace(tasklist, action, env): void`
- `reduceSimple(tasklist, action, env): TaskList`

Use `klona` for the immutable wrapper, matching AF4.

5. Make action timestamps explicit

Use one `actionAt = env.now()` per task action and pass it to:

- `createNewTask`
- `createPostponedTask`
- `completeTask`
- `markDeleteTask`

6. Consider shared helpers later

After `simple.ts` is cleaned up, compare it with AF4 for safe shared helpers. Do not extract shared abstractions before both files have clear local structure.

## Suggested Order

1. Remove logs and rename `CheckPostponedTasks`.
2. Introduce `SimpleEnv`, `reduceSimpleInPlace`, and `reduceSimple`.
3. Extract task factories.
4. Extract cleanup/postponed revival helpers.
5. Make timestamps explicit per action.
6. Add immutable reducer tests.

## Implementation Plan

- Refactor `simple.ts` in small behavior-preserving slices.
- Keep `makeSimple` as the app-facing mutating API.
- Add direct reducer tests for mutating and immutable reducers.
- Run `npm run typecheck`, `npm run agent:test`, `npm run agent:lint`.

Commit message: `Document simple model refactor plan`
