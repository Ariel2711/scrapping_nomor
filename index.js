const { exec } = require('child_process');
const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');
const readline = require('readline');

async function main() {
    try {
        const todayLog = moment();
        const currentDatewithtime = todayLog.format('D_M_YYYY HH_mm_ss');
        const keywords = await readKeywordsFromCSV('list_keyword.csv');
        const timeoutDuration = 20 * 60 * 1000;

        var allNumber = "";

        var previousCategory = "";

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            var index = i;
            const [part1, part2, part3] = keyword.split(',');
            if (part3 !== previousCategory) { index = 0; }
            previousCategory = part3;
            const finalKeyword = `${keyword},${index}`;
            console.log(`Running for keyword: ${part1}`);

            const taskStartTime = Date.now();

            try {
                await modifyCSV('G:/My Drive/uivision/datasources/isRunning.csv', 'isRunning', 'false', 'true');
            } catch (error) {
                console.error(`Error modifying CSV: ${error.message}`);
                continue;
            }

            const url = `file:///C:/scrapping_nomor/uivision.html?macro=scrapping_nomor&cmd_var1=${finalKeyword}&cmd_var2=${currentDatewithtime}&cmd_var3=${allNumber}&closeRPA=1&closeBrowser=1&direct=1&storage=xfile`;
            await runCommand(`start chrome "${url}"`);

            let isRunning = true;
            while (isRunning) {
                await sleep(10000);
                if (Date.now() - taskStartTime > timeoutDuration) {
                    isRunning = false;
                    console.log(`Timeout reached for keyword: ${part1}`);
                    await closeChromeAndUIVision();
                    break;
                }

                try {
                    isRunning = await checkIsRunning('G:/My Drive/uivision/datasources/isRunning.csv', 'isRunning', 'true');
                } catch (error) {
                    console.error(`Error checking if running: ${error.message}`);
                    continue;
                }
            }

            await sleep(2500);

            try {
                await rewriteCSVWithoutQuotes(`G:/My Drive/uivision/datasources/(qontaq) scrapping nomor ${part3} ${currentDatewithtime}.csv`);
                await rewriteCSVWithoutQuotes(`G:/My Drive/uivision/datasources/(dewa) scrapping nomor ${part3} ${currentDatewithtime}.csv`);
            } catch (error) {
                console.error(`Error rewriting numbers from CSV: ${error.message}`);
                // continue;
            }

            try {
                const newNumber = await readNumbersFromCSV(`G:/My Drive/uivision/datasources/(qontaq) scrapping nomor ${part3} ${currentDatewithtime}.csv`);
                allNumber = newNumber;
            } catch (error) {
                console.error(`Error reading numbers from CSV: ${error.message}`);
                // continue;
            }

            await sleep(2500);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

function readNumbersFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        let numbers = '';
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const columns = Object.values(row);
                if (columns.length >= 1) {
                    const cleanedColumn = columns[0].replace(/"/g, '');
                    const [part1, part2, part3, part4] = cleanedColumn.split(',');
                    const number = `${part1}!!!`;
                    numbers += number;
                } else {
                    console.error('Row does not have enough columns:', row);
                }
            })
            .on('end', () => {
                resolve(numbers);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

function rewriteCSVWithoutQuotes(filePath) {
    return new Promise((resolve, reject) => {
        let existingData = '';

        const readStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            existingData += line + '\n';
        });

        rl.on('close', () => {
            const cleanedData = existingData.replace(/"/g, '');

            fs.writeFile(filePath, cleanedData, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        rl.on('error', (err) => {
            reject(err);
        });
    });
}

function readKeywordsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const keywords = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const columns = Object.values(row);
                if (columns.length >= 3) {
                    const keyword = `${columns[0]},${columns[1]},${columns[2]}`;
                    keywords.push(keyword);
                } else {
                    console.error('Row does not have enough columns:', row);
                }
            })
            .on('end', () => {
                resolve(keywords);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                reject(new Error(stderr));
                return;
            }
            resolve(stdout);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function modifyCSV(filePath, columnName, oldValue, newValue) {
    return new Promise((resolve, reject) => {
        const rows = [];
        const headers = [];

        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headerList) => {
                headers.push(...headerList);
            })
            .on('data', (row) => {
                if (row[columnName] === oldValue) {
                    row[columnName] = newValue;
                }
                rows.push(row);
            })
            .on('end', () => {
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => headers.map(header => row[header]).join(','))
                ].join('\n');

                fs.writeFile(filePath, csvContent, (err) => {
                    if (err) {
                        console.error(`Error writing to CSV file: ${err.message}`);
                        reject(err);
                    } else {
                        console.log('CSV file updated successfully.');
                        resolve();
                    }
                });
            })
            .on('error', (error) => {
                console.error(`Error reading CSV file: ${error.message}`);
                reject(error);
            });
    });
}

async function checkIsRunning(filePath, columnName, value) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        let lastValue = false;
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row[columnName] === value) {
                    lastValue = true;
                } else {
                    lastValue = false;
                }
            })
            .on('end', () => {
                resolve(lastValue);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

async function closeChromeAndUIVision() {
    try {
        await runCommand('taskkill /IM chrome.exe /F');
        console.log('Closed Chrome and UIVision RPA.');
    } catch (error) {
        console.error('Error closing Chrome and UIVision RPA:', error.message);
    }
}

main().catch(error => console.error('Error:', error));
