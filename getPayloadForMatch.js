'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

exports.getDetails = () => {
    let details = {};

    try {
        let team1;
        let team2;
        let players = [];
        let teamsElements = document.querySelectorAll('.cb-minfo-tm-nm');
        if (teamsElements.length === 6) {
            for (let index in teamsElements) {
                index = parseInt(index, 10);
                let teamElement = teamsElements[index];

                if (index === 0) {
                    let text = teamElement.innerText;
                    team1 = text.replace('Squad', '').trim();
                    details.team1 = team1;
                }

                if (index === 3) {
                    let text = teamElement.innerText;
                    team2 = text.replace('Squad', '').trim();
                    details.team2 = team2;
                }

                if (index === 1) {
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        const name = matches[1];

                        let player = {
                            player: name,
                            team: team1
                        }
                        players.push(player);
                    }
                }

                if (index === 4) {
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        const name = matches[1];

                        let player = {
                            player: name,
                            team: team2
                        }
                        players.push(player);
                    }
                }
                details.players = players;
            }
        }

        let matchInfoElements = document.querySelectorAll('.cb-mtch-info-itm');
        for (let matchInfoElement of matchInfoElements) {
            let divs = matchInfoElement.querySelectorAll('div');
            let fieldName = divs[0].innerText;
            let fieldValue = divs[1].innerText;

            if (fieldName === 'Toss') {
                if (fieldValue.indexOf(' won the toss ') !== -1) {
                    let matches = fieldValue.match(/(.*) won the toss and opt to (.*)/);
                    let tossWinner = matches[1];
                    let decision = matches[2];
                    details.tossWinner = tossWinner;
                    let batFirst = tossWinner;
                    if (decision === 'bowl') {
                        if (team1 === tossWinner) {
                            batFirst = team2;
                        } else {
                            batFirst = team1;
                        }
                    }
                    details.batFirst = batFirst;

                }
            }
        }

        const resultElement = document.querySelector('.cb-scrcrd-status');
        const resultText = resultElement.innerText;
        if (resultText.indexOf(' won ') !== -1) {
            if (resultText.indexOf('(') === -1) {
                let matches = resultText.match(/(.*) won by ([0-9]+) ([a-zA-Z]+)/);
                let winner = matches[1];
                const winMargin = matches[2];
                details.winner = winner;
                details.result = 'NORMAL';
                details.winMargin = winMargin;

                const winMarginTypeText = matches[3];
                let winMarginType;
                if (winMarginTypeText.match(/wkt/)) {
                    winMarginType = 'WICKET';
                } else if (winMarginTypeText.match(/run/)) {
                    winMarginType = 'RUN';
                }
                details.winMarginType = winMarginType;
            } else if (resultText.match(/super|Super/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = matches[1];
                details.winner = winner;
                details.result = 'SUPER_OVER';
            } else if (resultText.match(/bowl|Bowl/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = matches[1];
                details.winner = winner;
                details.result = 'BOWL_OUT';
            }
        } else if (resultText.match('tie')) {
            details.result = 'TIE';
        } else if (resultText.indexOf(' drawn') !== -1) {
            details.result = 'DRAW';
        } else {
            details.result = 'WASHED_OUT';
        }

    } catch(e) {
        console.log(e);
    }

    return details;
}


(async() => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const matchUrl = process.argv[2];

    const page = await browser.newPage();
    await page.goto(matchUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    let details = await page.evaluate(exports.getDetails);
    console.log(details);

    // const scores = await page.evaluate(getScores);

    // fs.writeFile('scores.json', JSON.stringify(scores, null, ' '));
    await page.close();

    await browser.close();
})();


