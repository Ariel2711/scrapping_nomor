const { exec } = require('child_process');
const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');

async function main() {
    try {
        const todayLog = moment();
        const currentDatewithtime = todayLog.format('D_M_YYYY HH_mm_ss');
        const keywords = await readKeywordsFromCSV('list_keyword.csv');
        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            console.log(`Running for keyword: ${keyword}`);

            await modifyCSV('C:/uivision/datasources/isRunning.csv', 'isRunning', 'false', 'true');

            const url = `file:///C:/coding/scrapping_nomor_node/uivision.html?macro=scrapping_nomor&cmd_var1=${keyword}&cmd_var2=${currentDatewithtime}&cmd_var3=${i}&closeRPA=1&closeBrowser=1&direct=1&storage=xfile`;
            await runCommand(`start chrome "${url}"`);

            let isRunning = true;
            while (isRunning) {
                await sleep(10000);
                isRunning = await checkIsRunning('C:/uivision/datasources/isRunning.csv', 'isRunning', 'true');
            }

            await sleep(5000);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
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
    const rows = [];
    const headers = [];

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
                } else {
                    console.log('CSV file updated successfully.');
                }
            });
        })
        .on('error', (error) => {
            console.error(`Error reading CSV file: ${error.message}`);
        });
}

async function checkIsRunning(filePath, columnName, value) {
    return new Promise((resolve, reject) => {
        let lastValue = value;
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


main().catch(error => console.error('Error:', error));
