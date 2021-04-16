'use strict';
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getPlayerDetailsFromHTML = (url, gameType) => {
    if (url !== window.location.href) {
        console.log(url, window.location.href);
        return {};
    }

    const allowedKeys = {
        'Full Name': {},
        'Born': {},
        'Matches': {},
        'Innings': {
            type: 'battingStats',
            formattedKey: 'innings'
        },
        'Aggregate': {
            type: 'battingStats',
            formattedKey: 'runs'
        },
        'Balls Faced': {
            type: 'battingStats',
            formattedKey: 'balls'
        },
        'Not Outs': {
            type: 'battingStats',
            formattedKey: 'notOuts'
        },
        '4s': {
            type: 'battingStats',
            formattedKey: 'fours'
        },
        '6s': {
            type: 'battingStats',
            formattedKey: 'sixes'
        },
        'Highest Score': {
            type: 'battingStats',
            formattedKey: 'highest'
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

        const nameElementsForStats = document.querySelectorAll('span.FieldName');
        for (const nameElement of nameElementsForStats) {
            const parent = nameElement.closest('tr');
            const valueElement = parent.querySelectorAll('td')[1];
            if (valueElement) {
                const key = nameElement.innerText.replace(':', '').trim();
                const value = valueElement.innerText;

                if (allowedKeys.hasOwnProperty(key)) {
                    // console.log(key, value);
                        stats[key] = value;
                }
            }
        }

        // console.log(JSON.stringify(stats, null, ' '));

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

        details.battingStats = {};
        details.bowlingStats = {};

        const matches = parseInt(details.Matches, 10);
        details.battingStats[gameType] = {
            matches
        };
        details.bowlingStats[gameType] = {
            matches
        };

        for (const key of Object.keys(allowedKeys)) {
            if (stats.hasOwnProperty(key)) {
                const typeKey = allowedKeys[key].type;
                // console.log(typeKey);
                const formattedKey = allowedKeys[key].formattedKey;
                details[typeKey][gameType][formattedKey] = stats[key];
                // console.log(key, stats[key][index]);
            }
        }

        const countryText = document.querySelector('.TextGreenBold12').innerText;
        const countryTextMatches = countryText.match(/(.*)\((.*)\)/);
        if (countryTextMatches) {
            details.country = countryTextMatches[2];
        }

        details.name = details['Full Name'].trim();
        delete details['Full Name'];

        const dateOfBirthString = details['Born'].split('/').reverse().join('/');
        details.birthDateString = dateOfBirthString;
        details.birthDate = (new Date(dateOfBirthString)).getTime();
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

        const urls = [
            {
                url: 'http://www.howstat.com/cricket/Statistics/Players/PlayerOverview.asp?PlayerID=' + playerId,
                gameType: 'TEST'
            },
            {
                url: 'http://www.howstat.com/cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=' + playerId,
                gameType: 'ODI'
            },
            {
                url: 'http://www.howstat.com/cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=' + playerId,
                gameType: 'T20'
            },
            {
                url: 'http://www.howstat.com/cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=' + playerId,
                gameType: 'IPL'
            }
        ];

        console.log('Fetching player details for : ' + playerId);

        for (const urlObject of urls) {
            try {
                const playerUrl = urlObject.url;
                console.log(playerUrl);
                const page = await browser.newPage();
                await page.goto(playerUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 0
                });
                page.on('console', msg => console.log('PAGE LOG:', msg.text()));

                const batchDetails = await page.evaluate(getPlayerDetailsFromHTML, playerUrl, urlObject.gameType);
                // console.log(JSON.stringify(batchDetails, null, ' '));


                details.name = batchDetails.name;
                if (batchDetails.hasOwnProperty('country')) {
                    details.country = batchDetails.country;
                }
                details.birthDate = batchDetails.birthDate;
                details.birthDateString = batchDetails.birthDateString;

                let previousBattingStats = ((details.hasOwnProperty('battingStats')) ? details.battingStats : {});
                let previousBowlingStats = ((details.hasOwnProperty('bowlingStats')) ? details.bowlingStats : {});
                details.battingStats = Object.assign(previousBattingStats, batchDetails.battingStats);
                details.bowlingStats = Object.assign(previousBowlingStats, batchDetails.bowlingStats);

                await page.close();
            } catch (e) {
                console.log(e);
            }
        }

        await browser.close();
    } catch (e) {
        console.log('Error while getting details for player. Error: ' + e);
    }

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

    return details;
}

exports.getPlayerDetailsFromHowstat = getPlayerDetailsFromHowstat;

if (fileName === scriptName) {
    (async () => {
        const playerId = process.argv[2];
        // console.log(playerId);
        const details = await getPlayerDetailsFromHowstat(playerId);
        console.log(JSON.stringify(details, null, ' '));
    })();
}