# Passflow React SDK development rules

## Storybook-backed component library

`src/components/ui/**` is the visual source of truth. Storybook is the required catalog for its supported states.

- Flow, form, provider, hook, and route code must not invent or style UI in place. Those layers select a state, map domain data to component props, and handle callbacks.
- Runtime screens must consume exported components and semantic states from `src/components/ui/**`.
- If a needed component or visual state does not exist, extend the owning UI component first, add or update its co-located Storybook story, and only then use it from runtime code.
- Do not add flow-local visual class systems, inline layout styles, raw interactive controls, or direct third-party UI primitives outside `src/components/ui/**`.
- Keep styling in the owning component library and resolve colors, typography, spacing, and surfaces through the existing `--passflow-*` tokens. Do not introduce Tailwind as a parallel styling system.
- Prefer constrained, typed variants or discriminated states over arbitrary `ReactNode`, `className`, or `style` escape hatches.
- Computed geometry and third-party integration details are permitted only inside the primitive that owns them (for example button ripple coordinates or a flag asset size).
- Existing legacy form code is not precedent. When it is touched, move it toward this boundary rather than copying it.
- Write UI behavior, interaction, accessibility, and Storybook state tests in Playwright under `playwright/tests/**`. Use Vitest only for non-visual hooks, controllers, state mapping, and utility logic.

Before finishing UI work, run:

```sh
pnpm lint
pnpm test:unit
pnpm build
pnpm build-storybook
pnpm test
```
