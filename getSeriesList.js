'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

function getSeriesListFromHTML() {
    let seriesList = [];

    try {
        const internationalDiv = document.querySelector('.cb-col-84.cb-col');
        const seriesElements = internationalDiv.querySelectorAll('a');
        for (const seriesElement of seriesElements) {
            const spanElement = seriesElement.querySelector('span');
            const seriesText = spanElement.innerText.trim();
            const link = seriesElement.href;
            seriesList.push({
                name: seriesText,
                link
            });
        }

    } catch(e) {
        console.log(e);
    }

    return seriesList;
}

const getSeriesList = async year => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const url = 'https://www.cricbuzz.com/cricket-scorecard-archives/' + year;

    try {
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        let seriesList = await page.evaluate(getSeriesListFromHTML);

        await page.close();

        await browser.close();
        return seriesList;
    } catch (e) {
        console.log(e);
    }
};
exports.getSeriesList = getSeriesList;

// (async() => {
//     const year = process.argv[2];
//
//     const seriesList = await getSeriesList(year);
//     console.log(JSON.stringify(seriesList, null, ' '));
//
//     // fs.writeFile('data/seriesList.json', JSON.stringify(series, null, ' '), error => {
//     //     if (error) {
//     //         console.log("\n\t\tError while writing card data. Error: " + error + "\n");
//     //     }
//     // });
// })();


