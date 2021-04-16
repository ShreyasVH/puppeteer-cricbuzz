'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

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
            let matches;
            if (dobElement.innerText.match(/\(/)) {
                matches = dobElement.innerText.match(/(.*) \((.*)\)/);
            } else {
                matches = dobElement.innerText.match(/(.*)/);
            }
            if (matches) {
                const dateOfBirth = new Date(matches[1]);
                details.birthDate = dateOfBirth.getTime();
                details.birthDateString = dateOfBirth.toLocaleDateString('en-GB', {timeZone: 'Asia/Kolkata'});
            }
        }

        let tables = document.querySelectorAll('table');
        if (tables.length > 0) {
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

                const notoutsDiv = cells[3];
                const notOuts = notoutsDiv.innerText;

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
                    notOuts,
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
        }
    } catch (e) {
        console.log("\nError while fetching stats for player. Error: " + e + "\n");
        details = {};
    }

    return details;
};

const getPlayerDetails = async (playerId) => {
    let details = {};
    try {
        const browser  = await puppeteer.launch({
            headless: true,
            devtools: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const playerUrl = 'https://www.cricbuzz.com/profiles/' + playerId;
        console.log('Fetching player details for : ' + playerId);

        const page = await browser.newPage();
        await page.goto(playerUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        details = await page.evaluate(getPlayerDetailsFromHTML);
        await page.close();

        if (Object.keys(details).length > 0) {
            const playerCacheFilePath = 'data/playerCache.json';

            let playerCache = JSON.parse(fs.readFileSync(playerCacheFilePath));
            details.updated = (new Date()).getTime();
            playerCache[playerId] = details;

            try {
                fs.writeFileSync(playerCacheFilePath, JSON.stringify(playerCache, null, '  '));
            } catch (error) {
                console.log("\n\t\tError while writing player cache. Error: " + error + "\n");
            }
        }

        await browser.close();
    } catch (e) {
        console.log('Error while getting details for player. Error: ' + e);
    }


    return details;
};

exports.getPlayerDetails = getPlayerDetails;

if (fileName === scriptName) {
    (async() => {
        const playerId = process.argv[2];
        const playerDetails = await getPlayerDetails(playerId);
        // console.log(JSON.stringify(playerDetails, null, ' '));
    })();
}