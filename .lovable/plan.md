

## Plan: Add Push Notification Button to Monitor

### 1. Update imports (line 3)

Add `Bell, BellOff` to the existing lucide-react import. Add new import for `usePushNotifications`.

### 2. Add hook call (after line 33)

```ts
const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
```

### 3. Normal mode — add push button after the sound button (after line 329, before the fullscreen button)

The push notification toggle button with `Bell`/`BellOff` icons, matching the existing button style.

### 4. Fullscreen mode — add push button after the sound button (after line 198, before the minimize button)

A ghost icon button matching the existing fullscreen header style, toggling `Bell`/`BellOff`.

