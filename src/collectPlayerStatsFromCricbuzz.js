'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getPlayerDetailsFromHTML = () => {
    let details = {};
    try {
        let nameElement = document.querySelector('h1');
        if (null !== nameElement) {
            details.name = nameElement.innerText;
        }

        let countryElement = document.querySelector('.cb-player-name-wrap .text-gray');
        if (null !== countryElement) {
            details.country = countryElement.innerText;
        }

        let dobElement = document.querySelector('.cb-col.cb-col-60.cb-lst-itm-sm');
        if (null !== dobElement) {
            let matches = dobElement.innerText.match(/(.*) \((.*)\)/);
            if (matches) {
                const dateOfBirth = new Date(matches[1]);
                details.birthDate = dateOfBirth.getTime();
                details.birthDateString = dateOfBirth.toLocaleDateString('en-GB');
            }
        }

        let tables = document.querySelectorAll('table');

        let battingStats = {};
        let bowlingStats = {};

        let batsmanTable = tables[0];
        let batsmanRows = batsmanTable.querySelectorAll('tbody tr');
        for (const row of batsmanRows) {
            const cells = row.querySelectorAll('td');

            const gameTypeDiv = cells[0];
            const gameType = gameTypeDiv.innerText;

            const matchesDiv = cells[1];
            const matches = matchesDiv.innerText;

            const inningsDiv = cells[2];
            const innings = inningsDiv.innerText;

            const runsDiv = cells[4];
            const runs = runsDiv.innerText;

            const highestDiv = cells[5];
            const highest = highestDiv.innerText;

            const ballsDiv = cells[7];
            const balls = ballsDiv.innerText;

            const foursDiv = cells[12];
            const fours = foursDiv.innerText;

            const sixesDiv = cells[13];
            const sixes = sixesDiv.innerText;

            battingStats[gameType] = {
                matches,
                innings,
                runs,
                balls,
                highest,
                fours,
                sixes
            };
        }
        details.battingStats = battingStats;

        let bowlerTable = tables[1];
        let bowlerRows = bowlerTable.querySelectorAll('tbody tr');
        for (const row of bowlerRows) {
            const cells = row.querySelectorAll('td');

            const gameTypeDiv = cells[0];
            const gameType = gameTypeDiv.innerText;

            const matchesDiv = cells[1];
            const matches = matchesDiv.innerText;

            const inningsDiv = cells[2];
            const innings = inningsDiv.innerText;

            const ballsDiv = cells[3];
            const balls = ballsDiv.innerText;

            const runsDiv = cells[4];
            const runs = runsDiv.innerText;

            const wicketsDiv = cells[5];
            const wickets = wicketsDiv.innerText;

            const fifersDiv = cells[11];
            const fifers = fifersDiv.innerText;

            const tenWicketsDiv = cells[12];
            const tenWickets = tenWicketsDiv.innerText;

            bowlingStats[gameType] = {
                matches,
                innings,
                balls,
                runs,
                wickets,
                fifers,
                tenWickets
            };
        }
        details.bowlingStats = bowlingStats;
    } catch (e) {
        console.log("\nError while fetching stats for player. Error: " + e + "\n");
        details = {};
    }



    return details;
};

(async() => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    let playerStats = {};
    if (fs.existsSync('data/playerStatsCricbuzz.json')) {
        playerStats = JSON.parse(fs.readFileSync('data/playerStatsCricbuzz.json'));
    }

    let playerCache = {};
    if (fs.existsSync('data/playerCache.json')) {
        playerCache = JSON.parse(fs.readFileSync('data/playerCache.json'));
    }

    let index = 1;
    for (const playerLink of Object.keys(playerCache)) {
        // if (index > 5) {
        //     break;
        // }

        if (index > 1) {
            console.log("\n------------------------------------------------------\n");
        }

        console.log("\nProcessing players. [" + index + "/" + Object.keys(playerCache).length + "]\n");

        if (isFetchingRequired(playerStats, playerLink)) {
            try {
                let playerPage = await browser.newPage();
                await playerPage.goto(playerLink, {
                    waitUntil: 'networkidle2',
                    timeout: 0
                });
                const details = await playerPage.evaluate(getPlayerDetailsFromHTML);
                if (Object.keys(details).length > 0) {
                    playerStats[playerLink] = details;
                }
                await fs.writeFile('data/playerStatsCricbuzz.json', JSON.stringify(playerStats, null, '  '), error => {
                    if (error) {
                        console.log("\n\t\tError while writing player stats. Error: " + error + "\n");
                    }
                });
                await playerPage.close();
            } catch (e) {
                playerStats[playerLink] = {};
                console.log("\nError while getting player details. Player: " + playerLink + ". Error: " + e + "\n");
            }
        }

        console.log("\nProcessing players. [" + index + "/" + Object.keys(playerCache).length + "]\n");
        index++;
    }

    await browser.close();
})();



