# @passflow/passflow-react-sdk

This is a SDK for react application.

to install just type:

```
pnpm install
pnpm build
```

we are using pnpm. Please ansure you have it in the system.

## UI Testing

We are using playwright to run UI tests.

First, ensure you have all runtime binary enabled:

```
pnpm exec playwright install
```

and then feel free to run the tests:

```
pnpm run test:ui
```

### Writing your own ui tests.

You can find a tests in the `./tests` frolder.

Please create the new files using the current tests as a reference.

To run the playwright in the design mode with ui, run the follwoing command:

```
pnpm playwright test --ui
```
