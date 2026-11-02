# OTONOM — Next actions

Stage S2: remaining D6 engineering. Everything stays local on `codex/d6-products-smarthome-20261102`; no push or deploy until S4.

## Next three engineering steps

1. **Mobile comparison and package contents comparison.** Make `/products/compare` readable at 390 px. Add a side-by-side comparison of package contents that reads only from the `smart-home-packages` registry, with no new facts.
2. **Language switch keeps package state.** Switching AR ↔ EN on the packages page, the selector and the Project Builder keeps the selected package and its `#package-…` anchor. Nothing is stored (no cookies or storage).
3. **Selector → business links, and an audit for purchase claims.** When needs exceed what a single package covers, link to the developer, contractor and partner paths. Then audit public copy for purchase, checkout, warranty or availability wording.

## In parallel, from the owner

- Verified specs table for 4R, 6R and 16R (DR-097).
- Package inclusions and exclusions (open approval 4).
- A manual Edge test of the `#package-…` anchor links from the selector.
