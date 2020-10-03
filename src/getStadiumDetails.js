'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getStadiumDetailsFromHTML = () => {
    let details = {};

    let nameElement = document.querySelector('h1');
    details.name = nameElement.innerText;
    details.link = location.href;

    let detailsElement = document.querySelector('table');
    let rows = detailsElement.querySelectorAll('tr');
    for (const row of rows) {
        let cells = row.children;
        const key = cells[0].innerText;
        const value = cells[1].innerText;

        if (key === 'Location') {
            const locationParts = value.split(', ');
            details.city = locationParts[0];
            details.country = locationParts[locationParts.length - 1];
        }
    }

    return details;
};

const getStadiumDetails = async (stadiumId) => {
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

        const stadiumUrl = 'https://www.cricbuzz.com/cricket-series/2069/india-in-australia-test-series-2011-12/venues/' + stadiumId + '/melbourne-cricket-ground';

        const page = await browser.newPage();
        await page.goto(stadiumUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        details = await page.evaluate(getStadiumDetailsFromHTML);
        await page.close();

        if (Object.keys(details).length > 0) {
            const stadiumCacheFilePath = 'data/stadiumCache.json';

            let stadiumCache = JSON.parse(fs.readFileSync(stadiumCacheFilePath));
            stadiumCache[stadiumId] = details;

            fs.writeFile(stadiumCacheFilePath, JSON.stringify(stadiumCache, null, '  '), error => {
                if (error) {
                    console.log("\n\t\tError while writing player cache. Error: " + error + "\n");
                }
            });
        }

        await browser.close();
    } catch (e) {
        console.log('Error while getting details for stadium. Error: ' + e);
    }

    return details;
};

exports.getStadiumDetails = getStadiumDetails;

if (fileName === scriptName) {
    (async() => {
        const stadiumId = process.argv[2];
        const stadiumDetails = await getStadiumDetails(stadiumId);
    })();
}