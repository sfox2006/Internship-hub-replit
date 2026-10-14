---
name: Clerk proxy fallthrough
description: Distinguish Clerk Frontend API errors from published requests that fall through to the app's authentication middleware.
---

For this hub, a published `/api/__clerk/...` response containing the app's `{"error":"Sign-in required"}` is evidence that the proxy handler did not take the request; it is not a Clerk browser-script response. Check proxy activation conditions and mount ordering before changing client auth or user permissions. The published Replit host can be used as a production signal when `NODE_ENV` is absent, and missing proxy configuration should fail explicitly rather than fall into the signed-in API gate.

**Why:** On 14 October 2026, the live script endpoint returned the hub's auth 401 while a local production-mode proxy request successfully reached Clerk's script endpoint.

**How to apply:** When debugging Clerk loading, inspect the public script URL's status and body first, then verify same-origin proxy activation, upstream path, and proxy headers. Keep development hosts on Clerk's direct Frontend API path.
