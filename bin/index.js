#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const prettier = require("prettier");

const argv = yargs
    .version("1.0.0")
    .usage("Usage: $0 [options]")
    .option("dir", {
        describe: "The root directory to search for i18n folders", demandOption: true, type: "string",
    })
    .option("output", {
        describe: "The output directory to save the translations", demandOption: true, type: "string",
    })
    .help("h")
    .alias("h", "help").argv;

if (!argv.dir) {
    console.error("Please specify the root directory to search for i18n folders using --dir");
    return;
}

if (!argv.output) {
    console.error("Please specify the output directory to copy all trnaslations to it using --dir");
    return;
}


function createTranslations() {
    const translations = {};

    function readDirectories(dirPath) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (file === "i18n") {
                    const files = fs.readdirSync(filePath);
                    if (files.length !== 2) return;

                    files.forEach((file) => {
                        const filePath2 = path.join(filePath, file);
                        const fileContent = fs.readFileSync(filePath2, 'utf8');
                        const regex = /data:\s*{([\s\S]*?)},/;
                        const match = fileContent.match(regex);
                        if (match) {
                            let result = "";
                            eval("result = {" + match[1] + "}");
                            const module = path.basename(path.dirname(filePath));
                            const language = path.parse(filePath2).name;
                            if (!translations[module]) translations[module] = {};
                            if (!translations[module][language]) translations[module][language] = {};
                            translations[module][language] = result;
                        }
                    });
                }
                readDirectories(filePath);
            }
        });
    }


    function createTranslationFolders(translationsDir) {
        // Create a `translations` directory if it doesn't already exist
        if (!fs.existsSync(translationsDir)) {
            fs.mkdirSync(translationsDir);
        }

        // Loop through each key in `translations`
        for (const key in translations) {
            // Create a subdirectory for each key
            const keyDir = path.join(translationsDir, key);
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir);
            }

            // Loop through each subkey in the current key
            for (const subkey in translations[key]) {
                const translationsFile = path.join(keyDir, `${subkey}.json`);
                const translationsJson = JSON.stringify(translations[key][subkey], null, 2);
                const formattedJson = prettier.format(translationsJson, {semi: false, parser: "json"});
                fs.writeFileSync(translationsFile, formattedJson);
            }
        }
    }

    readDirectories(argv.dir);

    if (!Object.keys(translations).length) {
        console.error('No keys found');
        return;
    }

    createTranslationFolders(argv.output);

    console.log("Translations created successfully!");
}

createTranslations();
