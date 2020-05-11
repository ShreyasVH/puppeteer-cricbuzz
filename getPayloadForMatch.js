'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

function getDetails() {
    let details = {

    };

    try {
        let teamsElements = document.querySelectorAll('.cb-minfo-tm-nm');
        debugger;
        if (teamsElements.length === 6) {
            for (let index in teamsElements) {
                index = parseInt(index, 10);
                let teamElement = teamsElements[index];

                if (index === 0) {
                    let text = teamElement.innerText;
                    let team1 = text.replace('Squad', '').trim();
                    details.team1 = team1;
                }

                if (index === 3) {
                    let text = teamElement.innerText;
                    let team2 = text.replace('Squad', '').trim();
                    details.team2 = team2;
                }
            }
        }
    } catch(e) {
        console.log(e);
    }



    // let matchInfoElements = document.querySelectorAll('.cb-mtch-info-itm');
    // for (let matchInfoElement of matchInfoElements) {
    //     let divs = matchInfoElement.querySelectorAll('div');
    //     let fieldName = divs[0].innerText;
    //     let fieldValue = divs[1].innerText;
    //     // console.log(fieldName);
    //     // details[fieldName] = fieldValue;

    //     if (fieldName === 'Toss') {
    //         if (fieldValue.indexOf(' won the toss ') !== -1) {
    //             let matches =
    //         }
    //     }
    // }

    return details;
}


(async() => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const matchUrl = process.argv[2];
    console.log(matchUrl);

    const page = await browser.newPage();
    await page.goto(matchUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    let details = await page.evaluate(getDetails);
    console.log(details);

    // const scores = await page.evaluate(getScores);

    // fs.writeFile('scores.json', JSON.stringify(scores, null, ' '));

    await browser.close();
})();


