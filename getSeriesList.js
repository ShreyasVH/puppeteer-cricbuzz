'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

function getSeriesList() {
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


let series = JSON.parse(fs.readFileSync('data/seriesList.json'));

(async() => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const year = process.argv[2];
    const url = 'https://www.cricbuzz.com/cricket-scorecard-archives/' + year;

    try {
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        let seriesList = await page.evaluate(getSeriesList);
        console.log(seriesList);
        series[year] = seriesList;

        await page.close();

        
    } catch (e) {
        console.log(e);
    }

    await browser.close();

    fs.writeFile('data/seriesList.json', JSON.stringify(series, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing card data. Error: " + error + "\n");
        }
    });
})();


