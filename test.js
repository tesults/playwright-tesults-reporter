const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const tesults = require('tesults');
const TesultsReporter = require('./playwright-tesults-reporter');

const originalResults = tesults.results;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-tesults-reporter-'));
const uploads = [];
const originalOutputFileEnv = process.env.TESULTS_OUTPUT_FILE;

tesults.results = (data, callback) => {
    uploads.push(JSON.parse(JSON.stringify(data)));
    callback(null, {
        success: true,
        message: 'ok',
        warnings: [],
        errors: []
    });
};

const config = (reporter = []) => ({ reporter });

async function finish(reporter) {
    const result = reporter.onEnd({});
    if (result !== undefined) {
        await result;
    }
}

(async () => {
    try {
        const fileOnlyPath = path.join(tempDir, 'file-only', 'tesults-results.json');
        const fileOnly = new TesultsReporter({
            'tesults-output-file': fileOnlyPath
        });
        fileOnly.onBegin(config(), {});
        await finish(fileOnly);

        assert.strictEqual(uploads.length, 0);
        assert.ok(fs.existsSync(fileOnlyPath));
        const fileOnlyData = JSON.parse(fs.readFileSync(fileOnlyPath, 'utf8'));
        assert.strictEqual(fileOnlyData.target, '');
        assert.deepStrictEqual(fileOnlyData.results.cases, []);

        const uploadOnly = new TesultsReporter({
            'tesults-target': 'target-token'
        });
        uploadOnly.onBegin(config(), {});
        await finish(uploadOnly);

        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].target, 'target-token');

        const bothPath = path.join(tempDir, 'both', 'tesults-results.json');
        const both = new TesultsReporter({
            'tesults-target': 'target-token-both',
            'tesults-output-file': bothPath
        });
        both.onBegin(config(), {});
        await finish(both);

        assert.strictEqual(uploads.length, 2);
        assert.strictEqual(uploads[1].target, 'target-token-both');
        const bothData = JSON.parse(fs.readFileSync(bothPath, 'utf8'));
        assert.strictEqual(bothData.target, '');

        const fallbackPath = path.join(tempDir, 'fallback', 'tesults-results.json');
        const fallback = new TesultsReporter();
        fallback.onBegin(config([
            ['playwright-tesults-reporter', {
                'tesults-output-file': fallbackPath
            }]
        ]), {});
        await finish(fallback);

        assert.ok(fs.existsSync(fallbackPath));
        assert.strictEqual(uploads.length, 2);

        const injectedPath = path.join(tempDir, 'injected', 'tesults-results.json');
        const injected = new TesultsReporter({
            'tesults-output-file': injectedPath
        });
        injected.onBegin(config([
            ['playwright-tesults-reporter', {
                'tesults-target': 'existing-configured-target'
            }]
        ]), {});
        await finish(injected);

        assert.ok(fs.existsSync(injectedPath));
        assert.strictEqual(uploads.length, 2);

        const envOnlyPath = path.join(tempDir, 'env-only', 'tesults-results.json');
        process.env.TESULTS_OUTPUT_FILE = envOnlyPath;
        const envOnly = new TesultsReporter();
        envOnly.onBegin(config([
            ['playwright-tesults-reporter']
        ]), {});
        await finish(envOnly);

        assert.ok(fs.existsSync(envOnlyPath));
        assert.strictEqual(uploads.length, 2);

        const envAndTargetPath = path.join(tempDir, 'env-and-target', 'tesults-results.json');
        process.env.TESULTS_OUTPUT_FILE = envAndTargetPath;
        const envAndTarget = new TesultsReporter();
        envAndTarget.onBegin(config([
            ['playwright-tesults-reporter', {
                'tesults-target': 'target-token-env'
            }]
        ]), {});
        await finish(envAndTarget);

        assert.ok(fs.existsSync(envAndTargetPath));
        assert.strictEqual(uploads.length, 3);
        assert.strictEqual(uploads[2].target, 'target-token-env');

        const explicitPath = path.join(tempDir, 'explicit-wins', 'tesults-results.json');
        const ignoredEnvPath = path.join(tempDir, 'explicit-wins', 'ignored-env.json');
        process.env.TESULTS_OUTPUT_FILE = ignoredEnvPath;
        const explicitWins = new TesultsReporter({
            'tesults-output-file': explicitPath
        });
        explicitWins.onBegin(config(), {});
        await finish(explicitWins);

        assert.ok(fs.existsSync(explicitPath));
        assert.ok(!fs.existsSync(ignoredEnvPath));
        assert.strictEqual(uploads.length, 3);

        console.log('All tests passed.');
    } finally {
        tesults.results = originalResults;
        if (originalOutputFileEnv === undefined) {
            delete process.env.TESULTS_OUTPUT_FILE;
        } else {
            process.env.TESULTS_OUTPUT_FILE = originalOutputFileEnv;
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
