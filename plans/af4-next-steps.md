# Possible AF4 Model Follow-ups

## Context

`src/app/model/af4.ts` already has a clearer reducer structure:

- `makeAf4` keeps the existing app dispatch contract.
- `reduceAf4InPlace` is the mutating reducer.
- `reduceAf4` is the immutable reducer wrapper.
- Task actions, list transitions, cleanup, task factories, and current-list flag derivation are separated.

The next changes should be selective. Avoid continuing to split helpers unless it removes real complexity or improves tests.

## Goals

- Keep AF4 behavior stable.
- Make future changes easier to test directly through `reduceAf4`.
- Reduce legacy naming and test noise after the current refactor has settled.

## Non-goals

- Do not rewrite AF4 from scratch.
- Do not change `makeAf4` usage in app dispatch unless there is a concrete reason.
- Do not remove `open-new`; it is now a real domain concept for next open-pass staging.

## Candidate Changes

1. Extract AF4 test helpers

Move repeated helpers from `af4.test.ts` into a local test helper module:

- `createTaskList`
- `createTask`
- `runAction`
- `tasksCountByLists`
- `tasksCountByStatuses`

This would make domain scenarios easier to scan and reduce friction when adding reducer tests.

2. Rename legacy `ListType` usage

`types.ts` now has:

- `TaskListType`
- `CurrentListType`
- `ListType = TaskListType`

The alias can stay for compatibility, but a later cleanup can replace AF4 usage of `ListType` with `TaskListType` where the value belongs to a task. This should be a mechanical rename with typecheck coverage.

3. Add focused reducer tests for edge cases

Good candidates:

- `reduceAf4` keeps input immutable for `Next`.
- `reduceAf4` keeps input immutable for `Cleanup`.
- `open-new` is not a valid `current.list`.
- Due postponed `open-new` tasks stay hidden until entering open.

4. Clarify time semantics

Task actions now use one `actionAt` timestamp. List transitions still call `env.now()` where needed. If this matters, add tests that use a changing `now()` provider to lock the intended semantics.

5. Investigate repeated lint EPERM

Several `npm run agent:lint` runs intermittently failed on Windows with:

`EPERM: operation not permitted, open '...src\app\model\af4.ts'`

The retry succeeded. This is likely a file lock around ESLint cache/editor/Windows IO. It is not blocking, but worth investigating if it keeps happening.

## Suggested Order

1. Extract AF4 test helpers.
2. Add reducer immutability tests for `Next` and `Cleanup`.
3. Mechanically replace AF4 `ListType` usage with `TaskListType`.
4. Add time-semantics tests only if changing `env.now()` behavior becomes likely.
5. Investigate lint `EPERM` if it keeps disrupting work.

## Implementation Plan

- Create a local AF4 test helper module.
- Move repeated test setup helpers without changing assertions.
- Add 2-3 reducer-focused tests for immutability and `open-new`.
- Run `npm run typecheck`, `npm run agent:test`, `npm run agent:lint`.

Commit message: `Document AF4 model follow-up refactors`
