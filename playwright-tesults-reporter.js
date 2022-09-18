// playwright-tesults-reporter.js
// @ts-nocheck

const fs = require('fs');
const path = require('path');
const tesults = require('tesults');

/** @implements {import('@playwright/test/reporter').Reporter} */
class tesultsReporter {

    onBegin(config, suite) {
        this.disabled = true

        this.data = {
            target: 'token',
            results: {
                cases: []
            }
        };

        this.testIndices = {}

        this.caseFiles = (suite, name) => {
            let files = [];
            if (this.args['tesults-files'] !== undefined) {
                try {
                    const filesPath = path.join(this.args['tesults-files'], suite, name);
                    fs.readdirSync(filesPath).forEach(function (file) {
                        if (file !== ".DS_Store") { // Exclude os files
                            files.push(path.join(filesPath, file));
                        }
                    });
                } catch (err) { 
                    if (err.code === 'ENOENT') {
                        // Normal scenario where no files present: console.log('Tesults error reading case files, check supplied tesults-files arg path is correct.');
                    } else {
                        console.log('Tesults error reading case files.')
                    }
                }
            }
            return files;
        }
          
        this.startTimes = {};
        
        this.args = {};
        this.disabled = false;
        
        this.targetKey = "tesults-target";
        this.filesKey = "tesults-files";
        this.configKey = "tesults-config";
        this.buildNameKey = "tesults-build-name";
        this.buildDescKey = "tesults-build-description";
        this.buildResultKey = "tesults-build-result";
        this.buildReasonKey = "tesults-build-reason";

        if (config !== undefined && config !== null) {
            if (config.reporter !== undefined && config.reporter !== null) {
                if (Array.isArray(config.reporter)) {
                    for (let i = 0; i < config.reporter.length; i++) {
                        let reporter = config.reporter[i]
                        if (Array.isArray(reporter)) {
                            if (reporter.length > 0) {
                                let reporterName = reporter[0]
                                if (reporterName.indexOf("playwright-tesults-reporter") > -1) {
                                    if (reporter.length > 1) {
                                        let reportArgs = reporter[1];
                                        if (reportArgs !== undefined && reportArgs !== null) {
                                            this.args[this.targetKey]  = reportArgs[this.targetKey]
                                            this.args[this.filesKey]  = reportArgs[this.filesKey]
                                            this.args[this.buildNameKey]  = reportArgs[this.buildNameKey]
                                            this.args[this.buildDescKey]  = reportArgs[this.buildDescKey]
                                            this.args[this.buildResultKey]  = reportArgs[this.buildResultKey]
                                            this.args[this.buildReasonKey]  = reportArgs[this.buildReasonKey]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        /* Reserved for future use
        process.argv.forEach((val, index) => {
            if (val.indexOf(this.targetKey) === 0) {
                this.args[this.targetKey] = val.substr(this.targetKey.length + 1);
            }
            if (val.indexOf(this.filesKey) === 0) {
                this.args[this.filesKey] = val.substr(this.filesKey.length + 1);
            }
            if (val.indexOf(this.configKey) === 0) {
                this.args[this.configKey] = val.substr(this.configKey.length + 1);
            }
            if (val.indexOf(this.buildNameKey) === 0) {
                this.args[this.buildNameKey] = val.substr(this.buildNameKey.length + 1);
            }
            if (val.indexOf(this.buildDescKey) === 0) {
                this.args[this.buildDescKey] = val.substr(this.buildDescKey.length + 1);
            }
            if (val.indexOf(this.buildResultKey) === 0) {
                this.args[this.buildResultKey] = val.substr(this.buildResultKey.length + 1);
            }
            if (val.indexOf(this.buildReasonKey) === 0) {
                this.args[this.buildReasonKey] = val.substr(this.buildReasonKey.length + 1);
            }
        });
        */

        if (this.args[this.targetKey] === undefined) {
            console.log(this.targetKey + " not provided. Tesults disabled.");
            this.disabled = true;
        }
    }
  
    onTestBegin(test, result) {
        // Not used
    }

    onStepBegin (test, result, step) {
        // Not used
    }

    onStepEnd (test, result, step) {
        // Not used
    }
  
    onTestEnd(test, result) {
        if (this.disabled === true) {
            return;
        }
        let testCase = {};
        testCase.name = test.title;
        const consolidatedSuite = (entity, suite) => {
            if (entity.parent !== undefined && entity.parent !== null) {
                if (suite === "") {
                    if (entity.parent.title !== "") {
                        suite += entity.parent.title;
                    }
                } else {
                    if (entity.parent.title !== "") {
                        suite += " - " + entity.parent.title;
                    }
                }
                return consolidatedSuite(entity.parent, suite);
            } else {
                return suite;
            }
        }
        testCase.suite = consolidatedSuite(test, "");
        try {
            testCase["_Suite location"] = JSON.stringify(test.parent.location);
        } catch (err) {
            // Unable to handle suite location
        }
        testCase.rawResult = result.status;
        testCase.result = "unknown";
        if (result.status === "passed") {
            testCase.result = "pass";
        }
        if (result.status === "failed") {
            testCase.result = "fail";
        }
        try {
            if (test.annotations !== undefined && test.annotations !== null) {
                if (Array.isArray(test.annotations)) {
                    Object.keys(test.annotations).forEach((key) => {
                        testCase["_Annotation " + key] = test.annotations[key]
                    });
                }
            }
        } catch (err) {
            // Unable to capture annotations
        }
        testCase["_Timeout"] = test.timeout;
        testCase["_Retries"] = test.retries;
        testCase["_Expected Status"] = test.expectedStatus;
        try {
            testCase["_Location"] = JSON.stringify(test.location);
        } catch (err) {
            // Unable to handle location
        }
        testCase["_Outcome"] = test.outcome();
        testCase["_Ok"] = test.ok();
        try {
            testCase["_Test path"] = JSON.stringify(testCase.titlePath())
        } catch (err) {
            // Unable to capture test path
        }
        try {
            testCase["_Repeat each index"] = test.repeatEachIndex;
        } catch (err) {
            // Unable to capture repeat each index
        }
        try {
            testCase.start = result.startTime.getTime();
        } catch (err) {
            // Unable to capture start time
        }
        testCase.duration = result.duration;
        if (testCase.start !== undefined) {
            testCase.end = testCase.start + testCase.duration;
        }
        testCase["_Worker index"] = result.workerIndex;
        testCase.files = [];
        
        try {
            if (result.attachments !== undefined  && result.attachments !== null) {
                if (Array.isArray(result.attachments)) {
                    for (let i = 0; i < result.attachments.length; i++) {
                        let attachment = result.attachments[i];
                        if (attachment.path !== undefined && attachment.path !== null) {
                            testCase.files.push(attachment.path);
                        }
                    }
                }
            }
        } catch (err) {
            // Unable to handle attachments
        }

        if (result.error !== undefined && result.error !== null) {
            try {
                testCase.reason = JSON.stringify(result.error);
            } catch (err) {
                // Unable to handle error
            }
        }
        
        if (result.errors !== undefined && result.errors !== null) {
            if (Array.isArray(result.errors)) {
                try {
                    testCase["_Errors"] = JSON.stringify(result.errors);
                } catch (err) {
                    // Unable to handle errors
                }
            }
        }

        if (result.stdout !== undefined && result.stdout !== null) {
            if (Array.isArray(result.stdout)) {
                try {
                    testCase["_Standard output"] = JSON.stringify(result.stdout);
                } catch (err) {
                    // Unable to handle stdout
                }
            }
        }

        if (result.stderr !== undefined && result.stderr !== null) {
            if (Array.isArray(result.stderr)) {
                try {
                    testCase["_Standard error"] = JSON.stringify(result.stderr);
                } catch (err) {
                    // Unable to handle stderr
                }
            }
        }

        if (result.steps !== undefined && result.steps !== null) {
            testCase.steps = [];
            if (Array.isArray(result.steps)) {
                for (let i = 0; i < result.steps.length; i++) {
                    let step = result.steps[i];
                    let stepObj = {};
                    stepObj.name = step.title;
                    try {
                        stepObj.start = step.startTime.getTime();
                    } catch (err) {
                        // Unable to handle start
                    }
                    stepObj.duration = step.duration;
                    if (stepObj.start !== undefined) {
                        stepObj.end = stepObj.start + stepObj.duration;
                    }
                    try {
                        stepObj["_Location"] = JSON.stringify(step.location);
                    } catch (err) {
                        // Unable to handle location
                    }
                    stepObj.result = "pass";
                    if (step.error !== undefined && step.error !=null) {
                        stepObj.result = "fail";
                        try {
                            stepObj.reason = JSON.stringify(step.error);
                        } catch (err) {
                            // Unable to handle reason
                        }
                    }
                    if (step.titlePath() !== undefined && step.titlePath() !=null) {
                        if (Array.isArray(step.titlePath()))
                        try {
                            stepObj["_Path"] = JSON.stringify(step.titlePath());
                        } catch (err) {
                            // Unable to handle path
                        }
                    }
                    if (step.category !== undefined && step.category !== null) {
                        stepObj["_Category"] = step.category;
                    }
                    if (step.steps !== undefined && step.steps !== null) {
                        if (Array.isArray(step.steps)) {
                            try {
                                stepObj["_Steps"] = JSON.stringify(step.steps);
                            } catch (err) {
                                // Unable to handle steps
                            }
                        }
                    }

                    testCase.steps.push(stepObj);
                }
            }
        }

        if (result.retry !== undefined && result.retry !== null) {
            testCase["_Retry"] = result.retry;
        }

        let additionalFiles = this.caseFiles(testCase.suite, testCase.name);
        if (additionalFiles.length > 0) {
            for (let i = 0; i < additionalFiles.length; i++) {
                testCase.files.push(additionalFiles[i]);
            }
        }

        let replace = false;
        if (this.testIndices[testCase.suite + " " + testCase.name] !== undefined) {
            let index = this.testIndices[testCase.suite + " " + testCase.name];
            if (index < this.data.results.cases.length) {
                let t = this.data.results.cases[index];
                if (t["_Retry"] !== testCase["_Retry"]) {
                    replace = true;
                    this.data.results.cases[index] = testCase;
                }
            }
        } else {
            this.testIndices[testCase.suite + " " + testCase.name] = this.data.results.cases.length
        }
        
        if (replace === false) {
            this.data.results.cases.push(testCase);
        }
    }
  
    onEnd (result) {
        if (this.disabled === true) {
            return;
        }
        // build case
        if (this.args[this.buildNameKey] !== undefined) {
            let buildCase = {suite: "[build]"};
            buildCase.name = this.args[this.buildNameKey];
            if (buildCase.name === "") {
                buildCase.name = "-";
            }
            if (this.args[this.buildDescKey] !== undefined) {
                buildCase.desc = this.args[this.buildDescKey];
            }
            if (this.args[this.buildReasonKey] !== undefined) {
                buildCase.reason = this.args[this.buildReasonKey];
            }
            if (this.args[this.buildResultKey] !== undefined) {
                buildCase.result = this.args[this.buildResultKey].toLowerCase();
            if (buildCase.result !== "pass" && buildCase.result !== "fail") {
                buildCase.result = "unknown";
            }
            } else {
                buildCase.result = "unknown";
            }
            let files = this.caseFiles(buildCase.suite, buildCase.name);
            if (files.length > 0) {
                buildCase.files = files;
            }
            this.data.results.cases.push(buildCase);
        }
    
        // Tesults upload
        this.data.target = this.args[this.targetKey];
        console.log('Tesults results upload...');
        return new Promise((resolve, reject) => {
            tesults.results(this.data, function (err, response) {
                if (err) {
                    console.log('Tesults library error, failed to upload.');
                    return reject('Tesults library error, failed to upload.');
                } else {
                    console.log('Success: ' + response.success);
                    console.log('Message: ' + response.message);
                    console.log('Warnings: ' + response.warnings.length);
                    console.log('Errors: ' + response.errors.length);
                    resolve();
                }
            });
        });
    }
  }
  
  module.exports = tesultsReporter