# 6.5 Stabilization Summary

## Current Safe State

Version 6.5 is stabilized locally and ready for preview testing before a local
commit checkpoint. No push, deploy, Supabase SQL execution, or 7.0 work has been
performed.

The temporary local preview server used during validation has been stopped.
There is no active local preview server assumed for this checkpoint.

## Stabilized Systems

- Theme crossfade now uses a lightweight fixed overlay, preserving interaction
  while improving the visual transition.
- Site guide and long sheet glass backgrounds were expanded and visually
  refined.
- Topic selectors for public messages, questions, and polls are wired into
  submission instead of remaining decorative.
- Topic metadata is stored as a lightweight text prefix and stripped from user
  display surfaces.
- Polls are isolated behind `window.BOTTLE_ENABLE_POLLS === true` until the
  database migration is approved and applied.
- Poll option count is aligned across frontend and pending SQL at 2 to 4
  options.

## Postponed Systems

- Poll chart and pie visualization are postponed.
- Poll chart local state, labels, handlers, and 2 to 6 option UI were removed
  from 6.5 stabilization.
- Any richer poll analytics or alternate result visualizations should wait for a
  later planned version.

## Pending SQL Requirement

Poll backend support still requires manual review and execution of
`supabase-v6-polls.sql` in Supabase SQL Editor.

Do not run this automatically. Production SQL remains approval-gated.

## Future Upgrade Candidates

- Revisit poll result visualizations after the first stable poll migration is
  approved and tested.
- Consider a first-class topic column in a future database migration instead of
  the current text-prefix compatibility layer.
- Add dedicated local preview artifacts after 6.5 is committed.
- Plan 7.0 only after 6.5 has been previewed, committed locally, pushed later
  with approval, and SQL has been reviewed separately.

