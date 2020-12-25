'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];


function getTourListFromHTML() {
    let tourList = [];

    const internationalDiv = document.querySelector('.cb-col-84.cb-col');
    if (internationalDiv) {
        const tourElements = internationalDiv.querySelectorAll('a');
        for (const tourElement of tourElements) {
            const spanElement = tourElement.querySelector('span');
            const tourText = spanElement.innerText.trim();
            if (!tourText.match(/Postponed|Cancelled|practice|Practice/)) {
                const link = tourElement.href;
                const name = tourText.replace(/\//g, '-');
                tourList.push({
                    name,
                    link
                });
            }
        }
    }

    return tourList;
}

const getTourList = async year => {
    let tourList = [];
    try {
        const browser  = await puppeteer.launch({
            headless: true,
            devtools: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const url = 'https://www.cricbuzz.com/cricket-scorecard-archives/' + year;

        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        tourList = await page.evaluate(getTourListFromHTML);
        const tourListFilePath = 'data/tourLists/' + year + '.json';
        fs.writeFile(tourListFilePath, JSON.stringify(tourList, null, '  '), error => {
            if (error) {
                console.log("\t\tError while writing tour list data. Error: " + error);
            }
        });

        await page.close();

        await browser.close();
    } catch (e) {
        console.log('Error wile getting tourlist: ' + e);
    }

    return tourList;
};
exports.getTourList = getTourList;

if (fileName === scriptName) {
    (async() => {
        const year = process.argv[2];

        const tourList = await getTourList(year);
        // console.log(JSON.stringify(tourList, null, ' '));
    })();
}