

## Plan: Replace `useAlertSound.ts` content

Replace the entire content of `src/hooks/useAlertSound.ts` with the user-provided code. The key changes are:

1. Add `alarmCleanupRef` to properly track and clean up the pulse interval
2. Fix `startAlarm` to return `undefined` explicitly when not starting
3. Store cleanup function from `startAlarm` in `alarmCleanupRef` 
4. Call cleanup in `toggleMute`, effect cleanup, and unmount
5. Minor: wrap `oscillatorRef.current.stop()` error catch without variable

**Files to modify:**
- `src/hooks/useAlertSound.ts` — full replacement with provided code

