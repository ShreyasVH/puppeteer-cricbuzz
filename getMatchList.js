'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getMatchListFromHTML = () => {
    let matchList = [];

    try {
        const seriesNameElement = document.querySelector('.cb-nav-hdr.cb-font-24.line-ht30');

        const matchElements = document.querySelectorAll('.cb-col-60.cb-col.cb-srs-mtchs-tm');
        for (const matchElement of matchElements) {
            const matchNameElement = matchElement.querySelector('a');
            const matchNameSpan = matchNameElement.querySelector('span');
            const matchName = matchNameSpan.innerText;
            if (!matchName.match(/Practice|practice/)) {
                let matchLink = matchNameElement.href;
                matchLink = matchLink.replace('cricket-scores', 'live-cricket-scorecard', matchLink);

                matchList.push({
                    name: matchName,
                    link: matchLink
                });
            }
        }

    } catch(e) {
        console.log(e);
    }

    return matchList;
};

const getMatchList = async (seriesUrl) => {
    let matchList = [];

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
        await page.goto(seriesUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        matchList = await page.evaluate(getMatchListFromHTML);
        await page.close();

        await browser.close();

    } catch (e) {
        console.log(e);
    }
    return matchList;
};
exports.getMatchList = getMatchList;

// (async() => {
//     const seriesUrl = process.argv[2];
//
//     const matchList = await getMatchList(seriesUrl);
//     console.log(JSON.stringify(matchList, null, ' '));
//
//     // fs.writeFile('data/seriesDetails.json', JSON.stringify(series, null, ' '), error => {
//     //     if (error) {
//     //         console.log("\n\t\tError while writing card data. Error: " + error + "\n");
//     //     }
//     // });
// })();
