# v1 Garage share

## Goal
Know what's available, borrow it easily, and always know who has it.

## Must have
- List an item: name, category, photo, condition, replacement cost, where it lives, what comes with it (free text, e.g. "charger, two batteries, impact bits"), notes
- Browse and search items
- Borrow, return, hand off directly to another member
- Either the borrower or the owner can mark an item returned. The owner can confirm a return. The item is available again as soon as it's marked returned. If the owner says it never came back, that's an issue.
- Owner can pause lending on an item, open-ended or snoozed for 1 week, 1 month, or a custom length. When a snooze ends, the item stays paused and the owner sees a prompt on their next visit ("Lend it again?"). No email.
- Categories from a short fixed list. Stewards can add to it.
- Optional return date when borrowing, shown on the item. No reminders.
- Each item shows who has it now and since when
- Replacement cost shown before borrowing
- Damage or loss filed as an issue linked to the item

## Not in scope
Reservations, waitlists, due-date reminders, QR codes, fines, renewals.

## Guidance for members
- If a part is ever borrowed on its own (a set of impact bits, a ladder extension), list it as its own item. Otherwise put it in "comes with."

## Data model notes
From reading Circulate's schema (docs/comps.md):
- Keep borrows in their own table (`loans`: item, borrower, started_at, due_at nullable, ended_at nullable). A loan with no `ended_at` is the open one. "Who has it now" is derived from that row, not stored on the item.
- A partial unique index (one open loan per item) lets the database refuse two people holding the same item at once.
- A hand-off ends one loan and starts the next in a single transaction, with a link to the previous loan so the chain stays readable.
- Store money as integer cents (`replacement_cost_cents`).
- Items get a status (available, paused, retired) instead of being deleted, so history survives.
- Skip Circulate's borrow policies, fines, holds, and renewals. They serve a staffed library.

## Open
- Final starting category list (draft: tools, ladders & yard, outdoor & camping, kitchen, kids). Books, games, and puzzles come later.
