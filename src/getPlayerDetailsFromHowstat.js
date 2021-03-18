'use strict';
const fs = require('fs');
const puppeteer = require('puppeteer');
const getDate = require('./utils').getDate;
const path = require('path');

const getPlayerDetailsFromHTML = (getDateDef) => {
    const getDate = new Function(' return (' + getDateDef + ').apply(null, arguments)');

    const allowedKeys = {
        'Full Name': {},
        'Born': {},
        'Innings': {
            type: 'battingStats',
            formattedKey: 'innings'
        },
        'Aggregate': {
            type: 'battingStats',
            formattedKey: 'runs'
        },
        '4s': {
            type: 'battingStats',
            formattedKey: 'fours'
        },
        '6s': {
            type: 'battingStats',
            formattedKey: 'sixes'
        },
        'Runs Conceded': {
            type: 'bowlingStats',
            formattedKey: 'runs'
        },
        'Wickets': {
            type: 'bowlingStats',
            formattedKey: 'wickets'
        },
        'Overs': {
            type: 'bowlingStats',
            formattedKey: 'oversText'
        },
        '5 Wickets in Innings': {
            type: 'bowlingStats',
            formattedKey: 'fifers'
        }
    };
    let details = {};
    try {
        details = {
            updated: (new Date()).getTime()
        };

        let stats = {};

        const tables = document.querySelectorAll('table');
        let gameTypes = [];
        for (const table of tables) {
            const classList = table.classList;

            for (const className of classList) {
                if ('BorderedBoxTest' === className) {
                    gameTypes.push('TEST');
                } else if ('BorderedBoxOverall' === className) {
                    gameTypes.push('Overall');
                } else if ('BorderedBoxODI' === className) {
                    gameTypes.push('ODI');
                } else if ('BorderedBoxT20' === className) {
                    gameTypes.push('T20');
                } else if ('BorderedBoxIPL' === className) {
                    gameTypes.push('IPL');
                }
            }
        }
        // console.log(JSON.stringify(gameTypes, null, ' '));

        const valueElements = document.querySelectorAll('td.FieldValue');
        for (const valueElement of valueElements) {
            const parent = valueElement.closest('tr');
            const nameElement = parent.querySelector('td');
            if (nameElement) {
                const key = nameElement.innerText.replace(':', '').trim();
                const value = valueElement.innerText;

                if (allowedKeys.hasOwnProperty(key)) {
                    // console.log(key, value);
                    if (!stats.hasOwnProperty(key)) {
                        stats[key] = [];
                    }
                    stats[key].push(value);
                }
            }
        }
        // console.log(JSON.stringify(stats['Highest Score'], null, ' '));

        const nameElements = document.querySelectorAll('td.FieldName');
        for (const nameElement of nameElements) {
            const parent = nameElement.closest('tr');
            const elements = parent.querySelectorAll('td');
            if (elements && elements.length > 1) {
                // console.log(nameElement.innerText, elements[1].innerText);
                const key = nameElement.innerText.replace(':', '').trim();
                const value = elements[1].innerText;

                if (allowedKeys.hasOwnProperty(key)) {
                    // console.log(key, value);
                    details[key] = value;
                }
            }
        }

        let matchesStats = [];
        const matchStatElements = document.querySelectorAll('.TextBlack10');
        let mIndex = 0;
        for (const matchStatsElement of matchStatElements) {
            const matchText = matchStatsElement.innerText;
            const matches = matchText.toLowerCase().match(/\((.*) matches/);
            matchesStats.push(parseInt(matches[1], 10));
            mIndex++;
        }

        details.battingStats = {};
        details.bowlingStats = {};

        let index = 0;
        for (const gameType of gameTypes) {
            if (gameType === 'Overall') {
                continue;
            }
            details.battingStats[gameType] = {
                matches: matchesStats[index]
            };
            details.bowlingStats[gameType] = {
                matches: matchesStats[index]
            };
            for (const key of Object.keys(allowedKeys)) {
                if (stats.hasOwnProperty(key)) {
                    const typeKey = allowedKeys[key].type;
                    // console.log(typeKey);
                    const formattedKey = allowedKeys[key].formattedKey;
                    details[typeKey][gameType][formattedKey] = parseInt(stats[key][index], 10);
                    // console.log(key, stats[key][index]);
                }
            }

            index++;
        }

        const countryText = document.querySelector('.TextGreenBold12').innerText;
        details.country = countryText.match(/(.*)\((.*)\)/)[2];

        details.name = details['Full Name'].trim();
        delete details['Full Name'];

        const dateOfBirthString = details['Born'].split('/').reverse().join('/');
        details.birthDateString = dateOfBirthString;
        details.birthDate = getDate.call(null, new Date(dateOfBirthString)).getTime();
        delete details['Born'];

    } catch (e) {
        console.log(e);
        details = {};
    }


    return details;
};

const getPlayerDetailsFromHowstat = async (playerId) => {
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

        const playerUrl = 'http://www.howstat.com/cricket/Statistics/Players/PlayerOverviewSummary.asp?PlayerID=' + playerId;
        console.log('Fetching player details for : ' + playerId);

        const page = await browser.newPage();
        await page.goto(playerUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        details = await page.evaluate(getPlayerDetailsFromHTML, getDate.toString());
        await page.close();

        if (Object.keys(details).length > 0) {
            const playerCacheFilePath = path.resolve(__dirname, '../data/playerCacheHowstat.json');

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
}

(async () => {
    const playerId = process.argv[2];
    // console.log(playerId);
    const details = await getPlayerDetailsFromHowstat(playerId);
    console.log(JSON.stringify(details, null, ' '));
})();