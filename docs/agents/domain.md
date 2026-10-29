# Domain Docs

This repository uses a single-context domain documentation layout.

## Before exploring

Read these when they exist:

- `GLOSSARY.md` at the repository root
- Relevant ADRs under `docs/adr/`

If these files do not exist, proceed silently. Domain-modeling workflows create them when terminology or architectural decisions need to be recorded.

## File structure

/
├── GLOSSARY.md
├── docs/
│   └── adr/
└── src/

## Use the glossary vocabulary

Use terms as defined in `GLOSSARY.md` in ticket titles, tests, refactor proposals, and documentation.

If a required concept is missing, reconsider whether it belongs to the existing vocabulary or should be captured through domain modeling.

## Flag ADR conflicts

If proposed work conflicts with an existing ADR, identify the conflict explicitly instead of silently overriding the decision.
