'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const match = require('./getPayloadForMatch.js');

function getSeriesDetails() {
    let details = {};

    try {
        const seriesNameElement = document.querySelector('.cb-nav-hdr.cb-font-24.line-ht30');
        const seriesName = seriesNameElement.innerText;
        details.name = seriesName;

        let matches = [];
        const matchElements = document.querySelectorAll('.cb-col-60.cb-col.cb-srs-mtchs-tm');
        for (const matchElement of matchElements) {
            const matchNameElement = matchElement.querySelector('a');
            const matchNameSpan = matchNameElement.querySelector('span');
            const matchName = matchNameSpan.innerText;
            if (!matchName.match(/Practice|practice/)) {
                let matchLink = matchNameElement.href;
                matchLink = matchLink.replace('cricket-scores', 'live-cricket-scorecard', matchLink);

                matches.push({
                    name: matchName,
                    link: matchLink
                });
            }
        }
        details.matchList = matches;
    } catch(e) {
        console.log(e);
    }

    return details;
}


let series = JSON.parse(fs.readFileSync('data/seriesDetails.json'));

(async() => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const seriesUrl = process.argv[2];

    try {
        const page = await browser.newPage();
        await page.goto(seriesUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        let seriesDetails = await page.evaluate(getSeriesDetails);

        let matches = [];
        let index = 1;
        for (const matchInfo of seriesDetails.matchList) {
            if (index > 1) {
                console.log("\t...................................");
            }

            console.log("\tProcessing match. [" + index + "/" + seriesDetails.matchList.length + "]");
            const matchLink = matchInfo.link;
            const matchPage = await browser.newPage();
            
            await matchPage.goto(matchLink, {
                waitUntil: 'networkidle2',
                timeout: 0
            });

            let matchDetails = await matchPage.evaluate(match.getDetails);
            console.log(matchDetails);
            matches.push(matchDetails);
            await matchPage.close();
            console.log("\tProcessed match. [" + index + "/" + seriesDetails.matchList.length + "]");
            index++;
        }
        seriesDetails.matches = matches;

        console.log(seriesDetails);
        series[seriesDetails.name] = seriesDetails;

        await page.close();

        
    } catch (e) {
        console.log(e);
    }

    await browser.close();

    fs.writeFile('data/seriesDetails.json', JSON.stringify(series, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing card data. Error: " + error + "\n");
        }
    });
})();
