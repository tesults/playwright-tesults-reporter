# Playwright Tesults Reporter

Tesults is a test results reporting application. https://www.tesults.com

Playwright Tesults Reporter is a library for reporting Playwright test results to Tesults or to a local Tesults JSON file.

## Installation

`npm install playwright-tesults-reporter --save`

## Local output

The reporter can write the standard Tesults JSON data payload to a local file without uploading it:

```js
reporter: [
  ['playwright-tesults-reporter', {
    'tesults-output-file': './tesults-results.json'
  }]
]
```

`tesults-target` and `tesults-output-file` can be used independently or together. Local output uses an empty `target` value in the JSON payload.

The output file can also be supplied through the `TESULTS_OUTPUT_FILE` environment variable. This is useful for CI integrations such as the Tesults GitHub Action, which can provide the output destination without hard-coding a CI-specific path in Playwright configuration. When set, `TESULTS_OUTPUT_FILE` overrides the `tesults-output-file` reporter option for that run.

## Testing

Run the local test suite without uploading results:

```sh
npm test
```

Run the opt-in upload integration test with a Tesults target token:

```sh
TESULTS_TARGET='your-target-token' npm run test:upload
```

The target token is read from the environment and must not be committed to the repository. The integration test uploads one passing test case to Tesults.

## Documentation

Documentation is available at https://www.tesults.com/docs.

Playwright specific documentation: https://www.tesults.com/docs/playwright.

## Support

help@tesults.com
