'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];


const getTourDetailsFromHTML = () => {
    const getGameType = (matchName, tourName) => {
        let gameType = '';

        let matches = matchName.match(/(.*) vs (.*), (.*)/);
        const gameTypeText = matches[3];
        if (tourName.match('T20')) {
            gameType = 'T20';
        } else if (gameTypeText.match('ODI')) {
            gameType = 'ODI';
        } else if (gameTypeText.match('Test')) {
            gameType = 'TEST';
        } else if (gameTypeText.match('T20')) {
            gameType = 'T20';
        } else if (gameType.match(/match|Match/)) {
            gameType = 'ODI';
        }

        return gameType;
    };

    const getEndTime = (startTime, gameType) => {
        let endTime = startTime;

        switch (gameType) {
            case 'T20':
                endTime += (3 * 3600 * 1000);
                break;
            case 'ODI':
                endTime += (7 * 3600 * 1000);
                break;
            case 'TEST':
                endTime += (4 * 24 * 3600 * 1000 + 6 * 3600 * 1000);
                break;
        }

        return endTime;
    };


    let details = {};
    let series = {};

    try {
        let startTime = null;
        let endTime = null;
        let tourName = '';
        const tourNameElement = document.querySelector('.cb-nav-hdr.cb-font-24.line-ht30');
        if (null !== tourNameElement) {
            tourName = tourNameElement.innerText;
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
            const matchName = matchNameSpan.innerText;
            if (!matchName.match(/Practice|practice/)) {
                const gameType = getGameType(matchName, tourName);

                if (!series.hasOwnProperty(gameType)) {
                    series[gameType] = {
                        matches: [],
                        startTime: null,
                        endTime: null
                    };
                }

                const startTimeElement = dateDiv.querySelector('span.schedule-date');
                if (null !== startTimeElement) {
                    const gameStartTime = parseFloat(startTimeElement.getAttribute('timestamp'));

                    if (null === startTime) {
                        startTime = gameStartTime;
                    }

                    if (null == series[gameType].startTime) {
                        series[gameType].startTime = gameStartTime;
                    }

                    const gameEndTime = getEndTime(gameStartTime, gameType);
                    endTime = gameEndTime;
                    series[gameType].endTime = gameEndTime;
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
        details.endTime = endTime;
        details.series = series;
    } catch(e) {
        // console.log(e);
        details.error = e;
    }

    return details;
};

const getTourDetails = async (tourUrl) => {
    let tourDetails = [];

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

        tourDetails = await page.evaluate(getTourDetailsFromHTML);
        await page.close();

        await browser.close();

    } catch (e) {
        console.log(e);
    }
    return tourDetails;
};
exports.getTourDetails = getTourDetails;

if (fileName === scriptName) {
    (async() => {
        const tourUrl = process.argv[2];

        const tourDetails = await getTourDetails(tourUrl);
        console.log(JSON.stringify(tourDetails, null, ' '));

        fs.writeFile('data/tourDetails.json', JSON.stringify(tourDetails, null, ' '), error => {
            if (error) {
                console.log("\n\t\tError while writing card data. Error: " + error + "\n");
            }
        });
    })();
}
