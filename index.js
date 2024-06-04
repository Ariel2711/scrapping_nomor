const { exec } = require('child_process');
const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');

async function main() {
    try {
        const todayLog = moment();
        const currentDatewithtime = todayLog.format('D_M_YYYY HH_mm_ss');
        const keywords = await readKeywordsFromCSV('list_keyword.csv');
        for (const keyword of keywords) {
            console.log(`Running for keyword: ${keyword}`);

            const url = `file:///C:/coding/scrapping_nomor_node/uivision.html?macro=scrapping_nomor&cmd_var1=${keyword}&cmd_var2=${currentDatewithtime}&closeRPA=1&closeBrowser=0&direct=1&storage=xfile`;

            await runCommand(`start chrome "${url}"`);

            await sleep(600);
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
            console.log(`stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => console.error('Error:', error));
