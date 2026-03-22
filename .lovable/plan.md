

## Plan: Replace for...of with Promise.all in `fetchUserTenants`

**File:** `src/pages/Admin.tsx`  
**Lines 321-334:** Replace the sequential `for...of` loop with parallel `Promise.all` + `.map()`.

- Remove `const enrichedData: UserTenant[] = [];` and the `for...of` block
- Replace with `const enrichedData: UserTenant[] = await Promise.all(...)` using async map
- Keep `setUserTenants` and `setLoadingUserTenants` calls unchanged

This parallelizes the `get_user_email` RPC calls for better performance.

