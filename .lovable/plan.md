

## Plan: Improve alarm cleanup in `useAlertSound.ts`

Three targeted changes to properly track and clean up the pulse interval:

**File:** `src/hooks/useAlertSound.ts`

1. **Line 13** — Add `alarmCleanupRef` after `isPlayingRef`:
   ```ts
   const alarmCleanupRef = useRef<(() => void) | undefined>(undefined);
   ```

2. **Lines 87-88** — In `toggleMute`, add cleanup calls before `stopAlarm()`:
   ```ts
   if (newValue) {
       alarmCleanupRef.current?.();
       alarmCleanupRef.current = undefined;
       stopAlarm();
   }
   ```

3. **Lines 95-106** — Replace the "Handle alert state changes" `useEffect` with the version that stores/clears `alarmCleanupRef`.

