'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getGameType = require('./utils').getGameType;

const getTourDetailsFromHTML = (getGameTypeDef) => {
    const getGameType = new Function(' return (' + getGameTypeDef + ').apply(null, arguments)');

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
            if (matchNameElement) {
                const matchNameSpan = matchNameElement.querySelector('span');
                const matchNameParts = matchNameSpan.innerText.split(', ');
                const teamsText = matchNameParts[0];
                const matchName = (teamsText + ', ' + matchNameParts[1]).toLowerCase();
                if (!matchName.toLowerCase().match(/practice|warm-up/)) {
                    const gameType = getGameType.call(null, matchName, tourName);

                    if (!series.hasOwnProperty(gameType)) {
                        series[gameType] = {
                            matches: [],
                            startTime: null
                        };
                    }

                    const startTimeElement = dateDiv.querySelector('span.schedule-date');
                    let gameStartTime = '';
                    if (null !== startTimeElement) {
                        gameStartTime = parseFloat(startTimeElement.getAttribute('timestamp'));
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
                    matchLink = matchLink.replace('live-cricket-scores', 'live-cricket-scorecard', matchLink);
                    matchLink = matchLink.replace('cricket-scores', 'live-cricket-scorecard', matchLink);

                    series[gameType].matches.push({
                        name: matchName,
                        link: matchLink,
                        startTime: gameStartTime
                    });
                }
            }
        }
        details.startTime = startTime;
        details.series = series;
        details.year = year;
        details.tourLink = location.href;
    } catch (e) {
        details = {};
        console.log(e);
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

        details = await page.evaluate(getTourDetailsFromHTML, getGameType.toString());
        await page.close();

        if (Object.keys(details).length > 0) {
            const baseFolder = 'data/tourDetails';
            const tourId = getTourIdFromLink(details.tourLink);
            if (tourId) {
                const tourDetailsFilePath = baseFolder + '/' + tourId + '.json';
                fs.writeFile(tourDetailsFilePath, JSON.stringify(details, null, '  '), error => {
                    if (error) {
                        console.log("\t\tError while writing tour details data. Error: " + error);
                    }
                });
            }
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

