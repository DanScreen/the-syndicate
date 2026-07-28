# Multi-leg pick celebrations

Illustrative mocks of the in-product feedback banners (Floodlight palette). **Not live screenshots** — the real UI is a short accent banner above the picker / picks list.

| State | When shown | Copy |
|-------|------------|------|
| Intermediate leg | User submits leg 1…N−1 in a multi-leg round | **Leg added** |
| Final leg | User submits their last required leg | **All legs added** |

**Actual behaviour**
- **Web:** `border-accent/40 bg-accent-muted/40 text-accent` banner with Tailwind `animate-pulse`, ~1.8s then dismissed
- **Mobile:** same copy on accent-bordered banner; fade + scale in, brief hold, fade out
- Both platforms reset competition/fixture/market/selection after each successful new submit
