# ADR-018: Remove the 24h device-location dedup cache

**Date:** 2026-08-17

**Status:** Accepted — amends [ADR-009](009-wifi-geolocation-for-sensors.md)

## Context

ADR-009 specified a 24-hour deduplication cache on `POST /server/device-location`: if a device already had `latitude` and its `updated_at` was less than 24 hours old, the endpoint returned the stored location and never queried the Cloudflare Worker.

Two reasons were given for it:

1. **Stable on-chain location hashes.** RSSI-weighted centroids vary slightly between scans at the same physical spot, so recomputing on every boot would produce hash churn that does not represent real movement.
2. **Reboot-loop protection.** A device power-cycling repeatedly would not hammer the worker or Nominatim.

Both were written when the assumed deployment was a fixed sensor — a greenhouse, a lab, a water treatment plant — flashed once and left in place.

That assumption does not hold for the nodes actually in use. Both ESP nodes are development boards that get carried between the lab, the office, and demo venues, and they are re-flashed several times a day. The cache key is `nft_address`, which does not change when the device moves. So the endpoint kept returning the previous venue's address, and the dashboard showed a location the device had not been at for days. The staleness was invisible: the response is `{"success": true, "cached": true}`, indistinguishable from a fresh lookup unless you read the flag.

The cache also masked a second problem. During firmware debugging the wrong location is a misleading signal — it reads as a broken WiFi scan or a broken worker, when in fact the scan never ran.

### Options evaluated

| Option | Stale locations | Worker load per boot | Effort |
|---|---|---|---|
| 1. Keep 24h cache | Yes, up to 24h | 0 | None |
| 2. Remove cache | No | 1 | None |
| 3. Shorten to ~1h | Yes, up to 1h | ≤1 | Trivial |
| 4. BSSID fingerprint comparison | No | 1 (cheap path) | ~40 lines + column |

Option 4 is the correct end state: store the BSSID set from the last successful lookup, compare it to the incoming scan, and only re-query when the set has meaningfully changed. That distinguishes "same place, rebooted" from "moved", which is what the cache was trying to approximate with time. It needs a new column and a set-similarity threshold, so it is not in this change.

Option 3 keeps the failure mode and only shrinks the window. A device moved and rebooted within the hour still reports the wrong place, and the hour is arbitrary.

## Decision

Remove the 24h dedup cache from `POST /server/device-location`. Every call resolves the location from the WiFi scan.

The two original concerns are accepted as costs for now:

- **Hash churn** is not currently realised. Location is not part of the ADR-010 reading envelope and is not included in the Merkle leaves anchored by [ADR-017](017-solana-memo-anchoring.md) — it lives only in the `devices` table. Centroid jitter changes a database row, not an on-chain hash. The concern becomes real only if device location is ever committed on-chain, and this ADR must be revisited then.
- **Worker and Nominatim load** is one request per device boot. The scan runs once in `setup()`, not in `loop()` (ADR-009). With two nodes and manual re-flashing, this is far below the Cloudflare free tier's 100K/day and below Nominatim's 1 req/s — the worker only geocodes the single triangulated position.

A comment at the removal site names BSSID fingerprint comparison as the precondition for re-introducing any cache, so the next reader does not restore the time-based one.

## Consequences

### Positive

- The dashboard shows where the device is, not where it was.
- Firmware debugging gets an honest signal: a wrong location now means the scan or the worker is wrong.
- Deletes a branch whose `cached: true` response was indistinguishable from a fresh lookup to every caller.

### Negative

- A device in a reboot loop issues one worker request per boot. Nothing rate-limits this at the endpoint.
- Centroid jitter now writes to `devices.latitude`/`longitude` on every boot, so `updated_at` churns even when the device has not moved.
- Removes the protection ADR-009 wanted for on-chain hash stability. Safe only while location stays off-chain.

### Follow-up

- Add a `location_bssids` column and gate the worker call on fingerprint change (option 4). That restores reboot-loop protection without the staleness.
- If device location is ever added to the anchored envelope, this decision must be reversed or paired with a stability rule before that ships.

## References

- [ADR-009](009-wifi-geolocation-for-sensors.md) — WiFi-based geolocation, where the cache was specified
- [ADR-017](017-solana-memo-anchoring.md) — what is actually anchored on-chain today
- `supabase/functions/server/index.ts` — `POST /server/device-location`
