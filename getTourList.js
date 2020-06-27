'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];


function getTourListFromHTML() {
    let tourList = [];

    try {
        const internationalDiv = document.querySelector('.cb-col-84.cb-col');
        const tourElements = internationalDiv.querySelectorAll('a');
        for (const tourElement of tourElements) {
            const spanElement = tourElement.querySelector('span');
            const tourText = spanElement.innerText.trim();
            if (!tourText.match(/Postponed|Cancelled/)) {
                const link = tourElement.href;
                tourList.push({
                    name: tourText,
                    link
                });
            }
        }

    } catch(e) {
        console.log(e);
    }

    return tourList;
}

const getTourList = async year => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const url = 'https://www.cricbuzz.com/cricket-scorecard-archives/' + year;

    try {
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        let tourList = await page.evaluate(getTourListFromHTML);
        try {
            const yearFilePath = 'data/yearWiseDetails/' + year;
            if (!fs.existsSync(yearFilePath)) {
                fs.mkdirSync(yearFilePath);
            }

            const tourListFilePath = yearFilePath + '/tourList.json';
            fs.writeFile(tourListFilePath, JSON.stringify(tourList, null, '  '), error => {
                if (error) {
                    console.log("\n\t\tError while writing tour list data. Error: " + error + "\n");
                }
            });
        } catch (e) {
            console.log("\nError while writing files. Error: " + e + "\n");
        }

        await page.close();

        await browser.close();
        return tourList;
    } catch (e) {
        console.log(e);
    }
};
exports.getTourList = getTourList;

if (fileName === scriptName) {
    (async() => {
        const year = process.argv[2];

        const tourList = await getTourList(year);
        console.log(JSON.stringify(tourList, null, ' '));

        fs.writeFile('data/tourList.json', JSON.stringify(tourList, null, ' '), error => {
            if (error) {
                console.log("\n\t\tError while writing tourList data. Error: " + error + "\n");
            }
        });
    })();
}



