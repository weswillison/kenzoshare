# Decisions

## Decided
- Open source under AGPL-3.0. Copies and hosted versions must stay open, so nobody can turn it into a closed paid service.
- Build our own, after reviewing comps (`comps.md`).
- Pilot is invite-only on one block. Grow only as feasible.
- Phase 1 is Garage Share, phase 2 is Grocery Share. Other sections come after.
- Every item stores a replacement cost, visible to borrowers.
- No payments through the site.
- No numeric trust score. Record history and issues, not ratings.
- No personal info about neighbors in the repo.
- Any member can invite a new member during the pilot. The inviter is recorded as the new member's voucher.
- Losses beyond replacement cost are at the owner's own risk during the pilot. Borrower and owner settle it together, starting from the listed replacement cost. No loss fund or join fee for now. Revisit at the check-in.
- Owners can pause lending on an item, open-ended or with a snooze (1 week, 1 month, custom). When a snooze ends, the item stays paused and the owner is prompted on their next visit. When pausing, the owner can opt in to one check-in email on a date they choose (decided 2026-10-31, after the v1 walkthrough). The item stays paused until the household lends it again.
- Items have a free-text "comes with" field. Parts that get borrowed separately are listed as their own items.
- Either the borrower or the owner can mark an item returned. The owner can confirm. The item is available again right away. Disputes become issues.
- Garage Share starts with three categories: Tools (ladders included), Gardening, Outdoors & sports. Stewards can add more.
- Grocery runner fee is $3 per household per run, on top of groceries and tax. Trial amount, revisit at the check-in.
- Teen runners are deferred. Adult runners only during the pilot. Revisit at the check-in.
- Pilot cap is 12 households. Stewards watch the number (the app doesn't block invites). Going past it takes a check-in conversation.
- Garage Share return dates are optional. The borrower can set one, and it's shown on the item. No reminders.
- New members choose their household on first login: start a new one, or ask to join an existing one. Any current member of that household approves or declines. Until then they're a full member without a household. The inviter doesn't choose.
- Any of the reporter, the person an issue is about, or a steward can resolve an issue.
- Membership is active or left. No "paused" status: membership is free, and pausing items covers being away. Someone who left can still see their own record, and can still return or hand off a loan they hold (decided 2026-10-31). They can't request, lend, or do anything else.
- Usage is tracked through the activity log, per person and for the group. Per-person counts are never shown as a score, never shown in lists, and people are never ranked or sorted by activity. Profiles show plain facts from a person's history. A group usage view (totals, no names) comes later, around the check-in.
- v0 is tested by Wes and Preston only. Neighbors see the site once v1 (Garage Share) is done.
- First stewards: Wes and Preston.
- Garage Share items belong to a household. Anyone in the household can manage them.
- Borrowing is a request. The owner's household confirms when the item changes hands. If an item is out, a request joins a waitlist, first come first served.
- A borrower can hand an item straight to the next person on the waitlist. The owner's household sees it. Reaffirmed in the v1 walkthrough: keep hand-offs first come, first served during the pilot; enforce the order in the database as well as the UI.
- Only the owner's household sees an item's full borrow history. Borrowers see their own loans. Everyone sees who has an item right now.
- Three emails: the owner's household gets one when someone requests an item, the next person on the waitlist gets one when the item comes back, and an owner who opted in gets one pause check-in. No other notifications.
- Photos of an item when it's handed over or returned are optional.
- Item condition is free text.
- Profiles show plain facts: what a household lends, how many times someone has borrowed. Rates (on-time returns, problems) are never shown publicly. The data stays in the activity log for stewards.
- Browse rows show only "Out" or "Paused". The repeated "Available" label is omitted (decided 2026-10-31).
- Pending invites expire after a set time; the length is chosen when this is built. Re-inviting an address replaces its pending invite, so a neighbor can just send it again when the email didn't arrive. No steward cancel button (decided 2026-10-31).
- Someone who signs in with no pending invite is not blocked. They have no voucher until a steward vouches for them, which records the steward as their inviter (decided 2026-10-31).
- The GitHub repository is public (made public 2026-10-31).
- Hand-over and return photos are evidence between the people on a loan: visible to the borrower, the owning household, and stewards. Listing photos are visible to every member (decided 2026-10-31).
- Leaving cancels a person's pending requests, so nobody is asked to hand an item to a former member. A former member can't attach a photo when returning or handing off, and sees a problem they're part of without the name of who it's about (decided 2026-10-31).

## Open questions

- How to stay open while staying safe once the group outgrows the pilot cap.
- Long term: free software with paid setup/consulting for other neighborhoods? First, make something people want.
- Streaming logins: worth trying at all?
- Car share: insurance answer.
- Childcare: PA licensing check before any regular shared care.
