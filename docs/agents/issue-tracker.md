# Issue tracker: Local Markdown

Issues and specs for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues use one file per ticket:
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Ticket numbers begin at `01` and follow dependency order.
- Blocking relationships are recorded in each ticket's `Blocked by:` field.
- Ticket state is recorded in a `Status:` field near the top of the file.
- Comments and conversation history are appended under `## Comments`.

## Publishing tickets

When a skill says to publish to the issue tracker, create the feature directory and one file per ticket under its `issues/` directory.

Do not create a single combined tickets file.

## Fetching tickets

Read the referenced Markdown file. The user will normally provide its path or ticket number.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/<NN>-<slug>.md`
- Blocking: `Blocked by: NN, NN`
- Frontier: open tickets whose blockers are resolved and which are not claimed
- Claim: set `Status: claimed` before starting work
- Resolve: append the result under `## Answer` and set `Status: resolved`
