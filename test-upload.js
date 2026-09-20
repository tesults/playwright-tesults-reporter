const assert = require('assert');
const tesults = require('tesults');
const TesultsReporter = require('./playwright-tesults-reporter');

const target = process.env.TESULTS_TARGET;

if (target === undefined || target.trim() === '') {
    console.error('TESULTS_TARGET is required to run the upload integration test.');
    process.exitCode = 1;
} else {
    const originalResults = tesults.results;
    let uploadData;
    let uploadResponse;

    tesults.results = (data, callback) => {
        uploadData = JSON.parse(JSON.stringify(data));
        originalResults(data, (err, response) => {
            uploadResponse = response;
            callback(err, response);
        });
    };

    (async () => {
        try {
            const reporter = new TesultsReporter({
                'tesults-target': target
            });
            const testName = `Reporter upload integration test ${new Date().toISOString()}`;
            const suite = {
                title: 'Playwright Tesults Reporter',
                location: { file: 'test-upload.js', line: 1, column: 1 }
            };
            const test = {
                title: testName,
                parent: suite,
                expectedStatus: 'passed',
                timeout: 30000,
                retries: 0,
                location: { file: 'test-upload.js', line: 1, column: 1 },
                annotations: [],
                repeatEachIndex: 0,
                outcome: () => 'expected',
                ok: () => true
            };
            const result = {
                status: 'passed',
                startTime: new Date(),
                duration: 1,
                workerIndex: 0,
                retry: 0,
                attachments: [],
                errors: [],
                stdout: [],
                stderr: [],
                steps: []
            };

            reporter.onBegin({ reporter: [] }, {});
            reporter.onTestEnd(test, result);
            await reporter.onEnd({});

            assert.ok(uploadData, 'The reporter did not create an upload payload.');
            assert.strictEqual(uploadData.results.cases.length, 1);
            assert.strictEqual(uploadData.results.cases[0].name, testName);
            assert.strictEqual(uploadData.results.cases[0].result, 'pass');
            assert.ok(uploadResponse, 'Tesults did not return an upload response.');
            assert.strictEqual(
                uploadResponse.success,
                true,
                uploadResponse.message || 'Tesults rejected the upload.'
            );

            console.log('Tesults upload integration test passed.');
        } finally {
            tesults.results = originalResults;
        }
    })().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}
