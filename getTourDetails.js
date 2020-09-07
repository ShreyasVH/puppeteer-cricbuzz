'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];


const getTourDetailsFromHTML = () => {
    const getGameType = (matchName, tourName) => {
        let gameType = 'ODI';

        let matches = matchName.match(/(.*) vs (.*), (.*)/);
        const matchNameParts = matchName.split(', ');
        const gameTypeText = matchNameParts[1];
        if (tourName.match(/T20|Twenty20/)) {
            gameType = 'T20';
        } else if (gameTypeText.match(/ODI|odi/)) {
            gameType = 'ODI';
        } else if (gameTypeText.match(/Test|test/)) {
            gameType = 'TEST';
        } else if (gameTypeText.match(/T20|t20/)) {
            gameType = 'T20';
        } else if (gameType.match(/match|Match/)) {
            gameType = 'ODI';
        }

        return gameType;
    };

    let details = {};
    let series = {};

    try {
        let startTime = null;
        let tourName = '';
        let year = null;
        const tourNameElement = document.querySelector('.cb-nav-hdr.cb-font-24.line-ht30');
        if (null !== tourNameElement) {
            tourName = tourNameElement.innerText.replace(/\//g, '-');
            details.name = tourName;
        }

        const matchElements = document.querySelectorAll('.cb-col-100.cb-col.cb-series-matches.ng-scope');
        for (const matchElement of matchElements) {
            const children = matchElement.children;
            const detailsDiv = children[2];
            const detailsChildren = detailsDiv.children;
            const matchNameDiv = detailsChildren[0];
            const dateDiv = detailsChildren[1];
            const matchNameElement = matchNameDiv.querySelector('a');
            const matchNameSpan = matchNameElement.querySelector('span');
            const matchNameParts = matchNameSpan.innerText.split(', ');
            const teamsText = matchNameParts[0];
            const matchName = (teamsText + ', ' + matchNameParts[1]).toLowerCase();
            if (!matchName.match(/Practice|practice|warm|Warm/)) {
                const gameType = getGameType(matchName, tourName);

                if (!series.hasOwnProperty(gameType)) {
                    series[gameType] = {
                        matches: [],
                        startTime: null
                    };
                }

                const startTimeElement = dateDiv.querySelector('span.schedule-date');
                if (null !== startTimeElement) {
                    const gameStartTime = parseFloat(startTimeElement.getAttribute('timestamp'));

                    if (null === year) {
                        year = new Date(gameStartTime).getFullYear();
                    }

                    if (null === startTime) {
                        startTime = gameStartTime;
                    }

                    if (null == series[gameType].startTime) {
                        series[gameType].startTime = gameStartTime;
                    }
                }

                let matchLink = matchNameElement.href;
                matchLink = matchLink.replace('cricket-scores', 'live-cricket-scorecard', matchLink);

                series[gameType].matches.push({
                    name: matchName,
                    link: matchLink
                });
            }
        }
        details.startTime = startTime;
        details.series = series;
        details.year = year;
    } catch(e) {
        console.log(e);
        details.error = e;
    }

    return details;
};

const getTourDetails = async (tourUrl) => {
    let details = {};

    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.goto(tourUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        details = await page.evaluate(getTourDetailsFromHTML);
        // console.log(details);
        await page.close();

        try {
            const yearFilePath = 'data/yearWiseDetails/' + details.year;
            if (!fs.existsSync(yearFilePath)) {
                fs.mkdirSync(yearFilePath);
            }

            const toursFolderPath = yearFilePath + '/tours';
            if (!fs.existsSync(toursFolderPath)) {
                fs.mkdirSync(toursFolderPath);
            }

            const tourFilePath = toursFolderPath + '/' + details.name;
            if (!fs.existsSync(tourFilePath)) {
                fs.mkdirSync(tourFilePath);
            }

            const tourDetailsFilePath = tourFilePath + '/details.json';
            fs.writeFile(tourDetailsFilePath, JSON.stringify(details, null, '  '), error => {
                if (error) {
                    console.log("\n\t\tError while writing tour details data. Error: " + error + "\n");
                }
            });
        } catch (e) {
            console.log("\nError while writing files. Error: " + e + "\n");
        }

        await browser.close();

    } catch (e) {
        console.log(e);
    }
    return details;
};
exports.getTourDetails = getTourDetails;

if (fileName === scriptName) {
    (async() => {
        const tourUrl = process.argv[2];

        await getTourDetails(tourUrl);
    })();
}

