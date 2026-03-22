

## Plan: Rename shadowed variables in `useSalesStatus.ts`

Two targeted renames in `fetchHourlyData` to eliminate variable shadowing:

1. **Line 78**: Rename `current` (already named `current` in the forEach — actually need to verify current name is `data`) → confirm it's `data`, rename to `current`
2. **Lines 93-94**: Rename `data` to `entry` in the array conversion block

**File:** `src/hooks/useSalesStatus.ts`
- Lines ~76-85: In the forEach, rename the inner `data` variable to `current`
- Lines ~93-94: Rename `data` to `entry` in the hourly array conversion loop

No other changes.

