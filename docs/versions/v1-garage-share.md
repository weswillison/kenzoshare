# v1 Garage share

## Goal
Know what's available, borrow it easily, and always know who has it.

## Must have
- List an item: name, category, photo, condition, replacement cost, where it lives, notes
- Browse and search items
- Borrow, return, hand off directly to another member
- Optional return date when borrowing, shown on the item. No reminders.
- Each item shows who has it now and since when
- Replacement cost shown before borrowing
- Damage or loss filed as an issue linked to the item

## Not in scope
Reservations, waitlists, due-date reminders, QR codes, fines, renewals.

## Data model notes
From reading Circulate's schema (docs/comps.md):
- Keep borrows in their own table (`loans`: item, borrower, started_at, due_at nullable, ended_at nullable). A loan with no `ended_at` is the open one. "Who has it now" is derived from that row, not stored on the item.
- A partial unique index (one open loan per item) lets the database refuse two people holding the same item at once.
- A hand-off ends one loan and starts the next in a single transaction, with a link to the previous loan so the chain stays readable.
- Store money as integer cents (`replacement_cost_cents`).
- Items get a status (available, paused, retired) instead of being deleted, so history survives.
- Skip Circulate's borrow policies, fines, holds, and renewals. They serve a staffed library.

## Open
- Can an owner pause an item (out for repair, using it themselves) without retiring it?
- Should items list what comes with them (charger, bits, case) so returns are complete?
- When an item comes back, does the owner confirm the return or does the borrower's word count?
- Categories after garage stuff: books, games, puzzles.
