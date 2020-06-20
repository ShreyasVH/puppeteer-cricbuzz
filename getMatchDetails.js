'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchDetailsFromHTML = () => {
    const extrasMapping = {
        b: 'BYE',
        lb: 'LEG_BYE',
        w: 'WIDE',
        nb: 'NO_BALL',
        p: 'PENALTY'
    };

    // const dismissals

    const getInningsDetails = inning => {
        let details = {};

        let inningsDiv = document.querySelector('#innings_' + inning);
        if (inningsDiv) {
            let divs = inningsDiv.children;
            if (divs.length > 0) {
                let batsmanDiv = divs[0];
                let battingScores = [];
                let extras = [];
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

                                //ignoring header and innings title
                                if (index > 1) {
                                    let scoreDiv = battingScoreDivs[index];
                                    let innerDivs = scoreDiv.children;
                                    if (innerDivs.length > 0) {
                                        let batsmanDiv = innerDivs[0];

                                        let batsmanLink = batsmanDiv.querySelector('a');
                                        let isBattingScoreDiv = false;
                                        if (null != batsmanLink) {
                                            isBattingScoreDiv = true;
                                            const matches = batsmanLink.title.match(/View profile of (.*)/);
                                            battingScoreObject.player = matches[1];
                                        } else {
                                            if (batsmanDiv.innerText === 'Extras') {
                                                const extrasDiv = innerDivs[2];

                                                const extrasParts = extrasDiv.innerText.trim().replace('(', '').replace(')', '').split(', ');
                                                for (const extrasObject of extrasParts) {
                                                    let parts = extrasObject.split(' ');
                                                    let type = extrasMapping[parts[0]];
                                                    let runs = parseInt(parts[1], 10);

                                                    if (runs > 0) {
                                                        extras.push({
                                                            type,
                                                            runs
                                                        });
                                                    }
                                                }
                                            }

                                            details.extras = extras;
                                        }

                                        if (isBattingScoreDiv) {
                                            const dismissalDiv = innerDivs[1];
                                            const dismissalText = dismissalDiv.innerText;
                                            let dismissalMode = null;
                                            let fielders;
                                            let bowler;
                                            if (dismissalText.match(/not out/)) {

                                            } else if (dismissalText.match(/lbw b (.*)/)) {
                                                dismissalMode = 'LBW';
                                                let matches = dismissalText.match(/lbw b (.*)/);
                                                bowler = matches[1];
                                            } else if(dismissalText.match(/run out (.*)/)) {
                                                dismissalMode = 'Run Out';
                                                let matches = dismissalText.match(/run out (.*)/);
                                                let fieldersText = matches[1].replace('(', '').replace(')', '');
                                                let fielderParts = fieldersText.split('/');
                                                fielders = fielderParts.join(', ');
                                            } else if(dismissalText.match(/hit wicket b (.*)/)) {
                                                dismissalMode = 'Hit Wicket';
                                                let matches = dismissalText.match(/hit wicket b (.*)/);
                                                bowler = matches[1];
                                            } else if(dismissalText.match(/handled the ball/)) {
                                                dismissalMode = 'Handled the Ball';
                                            } else if(dismissalText.match(/retd hurt/)) {
                                                dismissalMode = 'Retired Hurt';
                                            } else if(dismissalText.match(/st (.*) b (.*)/)) {
                                                dismissalMode = 'Stumped';
                                                let matches = dismissalText.match(/st (.*) b (.*)/);
                                                fielders = matches[1];
                                                bowler = matches[2];
                                            } else if(dismissalText.match(/(c & b|c and b) (.*)/)) {
                                                dismissalMode = 'Caught';
                                                let matches = dismissalText.match(/(c & b|c and b) (.*)/);
                                                fielders = matches[2];
                                                bowler = matches[2];
                                            } else if(dismissalText.match(/c (.*) b (.*)/)) {
                                                dismissalMode = 'Caught';
                                                let matches = dismissalText.match(/c (.*) b (.*)/);
                                                fielders = matches[1];
                                                bowler = matches[2];
                                            } else if(dismissalText.match(/b (.*)/)) {
                                                dismissalMode = 'Bowled';
                                                let matches = dismissalText.match(/b (.*)/);
                                                bowler = matches[1];
                                            } else if(dismissalText.match(/obs/)) {
                                                dismissalMode = 'Obstructing the Field';
                                            }

                                            if (dismissalMode) {
                                                battingScoreObject.dismissalMode = dismissalMode;

                                                if (fielders) {
                                                    fielders = fielders.replace(/\(sub\)/g, '');
                                                    battingScoreObject.fielders = fielders;
                                                }

                                                if (bowler) {
                                                    battingScoreObject.bowler = bowler;
                                                }
                                            }

                                            let runsDiv = innerDivs[2];
                                            battingScoreObject.runs = parseInt(runsDiv.innerText, 10);

                                            let ballsDiv = innerDivs[3];
                                            battingScoreObject.balls = parseInt(ballsDiv.innerText, 10);

                                            let foursDiv = innerDivs[4];
                                            battingScoreObject.fours = parseInt(foursDiv.innerText, 10);

                                            let sixesDiv = innerDivs[5];
                                            battingScoreObject.sixes = parseInt(sixesDiv.innerText, 10);

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

                let bowlerDiv = divs[3];
                let bowlingFigures = [];

                let bowlingFigureDivs = bowlerDiv.children;

                if (bowlingFigureDivs.length > 0) {
                    for (let index in bowlingFigureDivs) {
                        if (bowlingFigureDivs.hasOwnProperty(index)) {
                            index = parseInt(index, 10);

                            //ignoring header
                            if (index > 0) {
                                let bowlingFigure = {};
                                let mainDiv = bowlingFigureDivs[index];
                                let innerDivs = mainDiv.children;

                                if (innerDivs.length > 0) {
                                    let bowlerDiv = innerDivs[0];

                                    let bowlerLink = bowlerDiv.querySelector('a');
                                    const matches = bowlerLink.title.match(/View profile of (.*)/);
                                    bowlingFigure.player = matches[1];

                                    let ballsDiv = innerDivs[1];
                                    let oversString = ballsDiv.innerText;
                                    let overParts = oversString.split('.');
                                    let balls = 0;
                                    let overs = parseInt(overParts[0], 10);
                                    if (overParts.length === 2) {
                                        balls = parseInt(overParts[1],10);
                                    }
                                    balls += (overs * 6);
                                    bowlingFigure.balls = balls;

                                    let maidensDiv = innerDivs[2];
                                    bowlingFigure.maidens = parseInt(maidensDiv.innerText, 10);

                                    let runsDiv = innerDivs[3];
                                    bowlingFigure.runs = parseInt(runsDiv.innerText, 10);

                                    let wicketsDiv = innerDivs[4];
                                    bowlingFigure.wickets = parseInt(wicketsDiv.innerText, 10);

                                    bowlingFigures.push(bowlingFigure);
                                }
                            }
                        }
                    }
                }

                details.bowlingFigures = bowlingFigures;
            }

        }

        return details;
    };

    let details = {};

    try {
        let team1;
        let team2;
        let players = [];
        let bench = [];
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
                            team: team1,
                            link: playerElement.href
                        };
                        players.push(player);
                    }
                }

                if (index === 2) {
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        const name = matches[1];

                        let player = {
                            player: name,
                            team: team1,
                            link: playerElement.href
                        };
                        bench.push(player);
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
                            team: team2,
                            link: playerElement.href
                        };
                        players.push(player);
                    }
                }

                if (index === 5) {
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        const name = matches[1];

                        let player = {
                            player: name,
                            team: team2,
                            link: playerElement.href
                        };
                        bench.push(player);
                    }
                }
                details.players = players;
                details.bench = bench;
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

                    let team1Innings = 1;
                    let team2Innings = 1;
                    let battingScores = [];
                    let bowlingFigures = [];
                    let extras = [];
                    for (let innings in scorecards) {
                        if (scorecards.hasOwnProperty(innings)) {
                            innings = parseInt(innings, 10);

                            const inningsObject = scorecards[innings];

                            let team = '';
                            let teamInnings = '';
                            let inningsBattingScores = inningsObject.battingScores;
                            for (const battingScore of inningsBattingScores) {
                                team = battingScore.team;
                                teamInnings = ((team1 === team) ? team1Innings : team2Innings);
                                battingScore.teamInnings = teamInnings;
                                battingScores.push(battingScore);
                                battingScore.innings = innings;
                            }

                            let inningsBowlingFigures = inningsObject.bowlingFigures;
                            for (const bowlingFigure of inningsBowlingFigures) {
                                bowlingFigure.teamInnings = teamInnings;
                                bowlingFigure.innings = innings;
                                bowlingFigures.push(bowlingFigure);
                            }

                            let extrasObjects = inningsObject.extras;
                            for (const extrasObject of extrasObjects) {
                                extrasObject.innings = innings;
                                extrasObject.teamInnings = teamInnings;
                                extrasObject.battingTeam = team;
                                extrasObject.bowlingTeam = ((team == team1) ? team2 : team1);
                                extras.push(extrasObject);
                            }

                            if (team1 === team) {
                                team1Innings++;
                            } else if (team2 === team) {
                                team2Innings++;
                            }
                            team = '';
                            teamInnings = '';
                        }
                    }
                    details.battingScores = battingScores;
                    details.bowlingFigures = bowlingFigures;
                    details.extras = extras;
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
                let matches = resultText.match(/(.*) won by([a-zA-Z ]*)([0-9]+) ([a-zA-Z]+)/);
                const winner = matches[1];
                const winMargin = matches[3];
                const winMarginTypeText = matches[4];

                details.winner = winner;
                details.result = 'NORMAL';
                details.winMargin = winMargin;


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

        const timeElement = document.querySelector('.schedule-date');
        if (timeElement) {
            details.startTime = timeElement.getAttribute('timestamp');
        }

        const stadiumElement = document.querySelector('a[itemprop="location"]');
        details.stadiumURL = stadiumElement.href;

    } catch(e) {
        debugger;
        console.log(e);
    }

    return details;
};

const getPlayersOfMatchDetailsFromHTML = () => {
    let details = {};
    let motm = [];
    let mots = [];
    const motmElements = document.querySelectorAll('.cb-mom-itm');

    for(const motmElement of motmElements) {
        let label = motmElement.querySelector('span').innerText;
        let playerLink = motmElement.querySelector('a');
        let player = playerLink.innerText;
        if (label === 'PLAYER OF THE MATCH') {
            motm.push(player);
        } else if (label === 'PLAYER OF THE SERIES') {
            mots.push(player);
        }
    }

    if (motm.length > 0) {
        details.manOfTheMatchList = motm;
    }

    if (mots.length > 0) {
        details.manOfTheSeriesList = mots;
    }

    return details;
};

const getMatchDetails = async (matchUrl) => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();
    await page.goto(matchUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    let details = await page.evaluate(getMatchDetailsFromHTML);
    await page.close();

    let commentaryUrl = matchUrl.replace('live-cricket-scorecard', 'cricket-scores');

    const motmPage = await browser.newPage();
    await motmPage.goto(commentaryUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });
    let motmDetails = await motmPage.evaluate(getPlayersOfMatchDetailsFromHTML);
    details = Object.assign({}, details, motmDetails);

    let stadiumUrl = details.stadiumURL;
    let stadiumPage = await browser.newPage();
    await stadiumPage.goto(stadiumUrl, {
        waitUntil: 'networkidle2',
        timeout: 0
    });
    details.stadium = await stadiumPage.evaluate(getStadiumDetails);

    if (details.players && details.players.length > 0) {
        for (let player of details.players) {
            let playerURL = player.link;
            let playerPage = await browser.newPage();
            await playerPage.goto(playerURL, {
                waitUntil: 'networkidle2',
                timeout: 0
            });
            const playerDetails = await playerPage.evaluate(getPlayerDetailsFromHTML);
            if (playerDetails.country) {
                player.country = playerDetails.country;
            }
        }
    }

    if (details.bench && details.bench.length > 0) {
        for (let player of details.bench) {
            let playerURL = player.link;
            let playerPage = await browser.newPage();
            await playerPage.goto(playerURL, {
                waitUntil: 'networkidle2',
                timeout: 0
            });
            const playerDetails = await playerPage.evaluate(getPlayerDetailsFromHTML);
            if (playerDetails.country) {
                player.country = playerDetails.country;
            }
        }
    }

    await browser.close();
    return details;
};

const getStadiumDetails = () => {
    let details = {};

    let nameElement = document.querySelector('h1');
    details.name = nameElement.innerText;

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

const getPlayerDetailsFromHTML = () => {
    let details = {};

    let countryElement = document.querySelector('.cb-player-name-wrap .text-gray');
    if (null != countryElement) {
        details.country = countryElement.innerText;
    }
    return details;
};

exports.getMatchDetails = getMatchDetails;

if (fileName === scriptName) {
    (async() => {
        const matchUrl = process.argv[2];
        const matchDetails = await getMatchDetails(matchUrl);
        // console.log(JSON.stringify(matchDetails, null, ' '));

        fs.writeFile('data/matchDetails.json', JSON.stringify(matchDetails, null, ' '), error => {
            if (error) {
                console.log("\n\t\tError while writing card data. Error: " + error + "\n");
            }
        });
    })();
}




