# @passflow/passflow-react-sdk

This is a SDK for react application.

to install just type:

```
pnpm install
pnpm build
```

## Test writing

## Environment Setup

For local development and UI testing, you need to set up the Passflow environment:

1. Set the `PASSFLOW_URL` environment variable to point to your Passflow instance.
1. Set the `PASSFLOW_APP_ID` environment variable
1. Run `pnpm dev` anmd all should works

Refer `.env.example` for more details.


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


