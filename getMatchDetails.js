'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getMatchDetailsFromHTML = () => {
    const getInningsDetails = inning => {
        let details = {};

        let inningsDiv = document.querySelector('#innings_' + inning);
        if (inningsDiv) {
            let divs = inningsDiv.children;
            if (divs.length > 0) {
                let batsmanDiv = divs[0];
                let battingScores = [];
                let battingScoreDivs = batsmanDiv.children;

                if (battingScoreDivs.length > 0) {
                    const inningsHeader = battingScoreDivs[0];
                    const inningsHeaderChildren = inningsHeader.children;
                    if (inningsHeaderChildren.length > 0) {
                        let inningsTextSpan = inningsHeaderChildren[0];
                        let inningsText = inningsTextSpan.innerText;
                        let matches = inningsText.match(/(.*) Innings/);
                        let team = matches[1];
                        if (team.match(/1st/)) {
                            team = team.replace(' 1st', '');
                        } else if (team.match(/2nd/)) {
                            team = team.replace(' 2nd', '');
                        }

                        for (let index in battingScoreDivs) {
                            let battingScoreObject = {};
                            if (battingScoreDivs.hasOwnProperty(index)) {
                                index = parseInt(index, 10);

                                if (index > 1) {
                                    let scoreDiv = battingScoreDivs[index];
                                    let innerDivs = scoreDiv.children;
                                    if (innerDivs.length > 0) {
                                        let batsmanDiv = innerDivs[0];

                                        let batsmanLink = batsmanDiv.querySelector('a');
                                        let isBattingScoreDiv = false;
                                        if (null != batsmanLink) {
                                            isBattingScoreDiv = true;
                                            let batsman = batsmanLink.innerText.trim();
                                            battingScoreObject.player = batsman;
                                        }

                                        let dismissalDiv = innerDivs[1];

                                        if (isBattingScoreDiv) {
                                            let runsDiv = innerDivs[2];
                                            battingScoreObject.runs = parseInt(runsDiv.innerText, 10);

                                            let ballsDiv = innerDivs[3];
                                            battingScoreObject.balls = parseInt(ballsDiv.innerText, 10);

                                            let foursDiv = innerDivs[4];
                                            battingScoreObject.fours = parseInt(foursDiv.innerText, 10);

                                            let sixesDiv = innerDivs[5];
                                            battingScoreObject.sixes = parseInt(sixesDiv.innerText, 10);

                                            battingScoreObject.innings = inning;
                                            battingScoreObject.team = team;
                                        }

                                    }

                                    if (Object.keys(battingScoreObject).length > 0) {
                                        battingScores.push(battingScoreObject);
                                    }
                                }
                            }
                        }
                    }
                }

                details.battingScores = battingScores;
            }

        }

        return details;
    };



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
                        };
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
                        };
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

                    let scorecards = {};

                    for(let i = 1; i <= 4; i++) {
                        let inningsDetails = getInningsDetails(i);
                        if (Object.keys(inningsDetails).length > 0) {
                            scorecards[i] = inningsDetails;
                        }
                    }
                    // details.scorecards = scorecards;
                    let team1Innings = 1;
                    let team2Innings = 1;
                    let battingScores = [];
                    for (let innings in scorecards) {
                        if (scorecards.hasOwnProperty(innings)) {
                            innings = parseInt(innings, 10);

                            const inningsObject = scorecards[innings];

                            let team = '';

                            let inningsBattingScores = inningsObject.battingScores;
                            for (const battingScore of inningsBattingScores) {
                                battingScore.teamInnings = ((team1 === battingScore.team) ? team1Innings : team2Innings);
                                battingScores.push(battingScore);
                                team = battingScore.team;
                            }

                            // debugger;
                            if (team1 === team) {
                                team1Innings++;
                            } else if (team2 === team) {
                                team2Innings++;
                            }
                            team = '';
                        }
                    }
                    details.battingScores = battingScores;

                }
            }
        }

        const resultElement = document.querySelector('.cb-scrcrd-status');
        const resultText = resultElement.innerText;
        if (resultText.indexOf(' won ') !== -1) {
            if (resultText.match(/super|Super/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = matches[1];
                details.winner = winner;
                details.result = 'SUPER_OVER';
            } else if (resultText.match(/bowl|Bowl/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = matches[1];
                details.winner = winner;
                details.result = 'BOWL_OUT';
            } else {
                let matches = resultText.match(/(.*) won by ([0-9]+) ([a-zA-Z]+)/);
                let winner = matches[1];
                const winMargin = matches[2];
                details.winner = winner;
                details.result = 'NORMAL';
                details.winMargin = winMargin;

                const winMarginTypeText = matches[3];
                let winMarginType;
                if (winMarginTypeText.match(/wkt|wicket/)) {
                    winMarginType = 'WICKET';
                } else if (winMarginTypeText.match(/run/)) {
                    winMarginType = 'RUN';
                }
                details.winMarginType = winMarginType;
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
};

const getMatchDetails = async (matchUrl) => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const page = await browser.newPage();
    await page.goto(matchUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    let details = await page.evaluate(getMatchDetailsFromHTML);
    await page.close();

    await browser.close();
    return details;
};

exports.getMatchDetails = getMatchDetails;

// (async() => {
//     const matchUrl = process.argv[2];
//     const matchDetails = await getMatchDetails(matchUrl);
//     console.log(JSON.stringify(matchDetails, null, ' '));
// })();


