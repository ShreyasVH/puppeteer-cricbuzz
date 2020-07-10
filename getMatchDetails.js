'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchDetailsFromHTML = (teamReplacements) => {
    const getGameType = (matchName, tourName) => {
        let gameType = 'ODI';

        let matches = matchName.match(/(.*) vs (.*), (.*)/);
        const matchNameParts = matchName.split(', ');
        const gameTypeText = matchNameParts[1];
        if (tourName.match(/T20|Twenty20/)) {
            gameType = 'T20';
        } else if (gameTypeText.match('ODI')) {
            gameType = 'ODI';
        } else if (gameTypeText.match(/Test|test/)) {
            gameType = 'TEST';
        } else if (gameTypeText.match(/T20|t20/)) {
            gameType = 'T20';
        }

        return gameType;
    };

    const extrasMapping = {
        b: 'BYE',
        lb: 'LEG_BYE',
        w: 'WIDE',
        nb: 'NO_BALL',
        p: 'PENALTY'
    };

    const correctTeam = (team) => {
        let output = team;

        if (teamReplacements.hasOwnProperty(team.toLowerCase())) {
            output = teamReplacements[team.toLowerCase()];
        }

        return output;
    };

    const getInningsDetails = inning => {
        let details = {};

        let inningsDiv = document.querySelector('#innings_' + inning);
        if (inningsDiv) {
            let divs = inningsDiv.children;
            if (divs.length > 0) {
                let batsmanDiv;
                let bowlerDiv;

                for (const div of divs) {
                    if (div.innerText.indexOf('Batsman') !== -1) {
                        batsmanDiv = div;
                    }

                    if (div.innerText.indexOf('Bowler') !== -1) {
                        bowlerDiv = div;
                    }
                }

                if (batsmanDiv) {
                    let battingScores = [];
                    let extras = [];

                    let battingScoreDivs = batsmanDiv.children;
                    if (battingScoreDivs.length > 0) {
                        let team;
                        for (const battingScoreDiv of battingScoreDivs) {
                            if (battingScoreDiv.innerText.indexOf('Innings') !== -1) {
                                const inningsHeaderDiv = battingScoreDiv;
                                const inningsHeaderSpans = inningsHeaderDiv.querySelectorAll('span');
                                for (const inningsHeaderSpan of inningsHeaderSpans) {
                                    if (inningsHeaderSpan.innerText.indexOf('Innings') !== -1) {
                                        let inningsTextSpan = inningsHeaderSpan;
                                        let inningsText = inningsTextSpan.innerText;
                                        let matches = inningsText.match(/(.*) Innings/);
                                        team = matches[1];

                                        if (team.match(/1st/)) {
                                            team = team.replace(' 1st', '');
                                        } else if (team.match(/2nd/)) {
                                            team = team.replace(' 2nd', '');
                                        }
                                        team = correctTeam(team);
                                    }
                                }
                            } else if (battingScoreDiv.innerText.indexOf('Batsman') !== -1) {
                                // header div
                            } else if (battingScoreDiv.innerText.indexOf('Extras') !== -1) {
                                // extras div

                                const innerDivs = battingScoreDiv.children;
                                const extrasDiv = innerDivs[2];
                                if (extrasDiv) {
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
                            } else if (battingScoreDiv.innerText.indexOf('Total') !== -1) {
                                // total div
                            } else if (battingScoreDiv.innerText.match(/Did not Bat|Yet to Bat/)) {
                                // remaining batsman div
                            } else {
                                let battingScoreObject = {};
                                let scoreDiv = battingScoreDiv;
                                let innerDivs = scoreDiv.children;
                                if (innerDivs.length > 0) {
                                    let batsmanDiv = innerDivs[0];
                                    let batsmanLink = batsmanDiv.querySelector('a');
                                    if (batsmanLink) {
                                        const matches = batsmanLink.title.match(/View profile of (.*)/);
                                        battingScoreObject.player = matches[1].trim();
                                    }

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
                                        let fieldersText = matches[1].replace(/\(sub\)/g, '').replace('(', '').replace(')', '');
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
                                            battingScoreObject.fielders = fielders.trim();
                                        }

                                        if (bowler) {
                                            battingScoreObject.bowler = bowler.trim();
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

                                if (Object.keys(battingScoreObject).length > 0) {
                                    battingScores.push(battingScoreObject);
                                }
                            }
                        }
                    }

                    details.battingScores = battingScores;
                }

                if (bowlerDiv) {
                    let bowlingFigures = [];

                    let bowlingFigureDivs = bowlerDiv.children;
                    if (bowlingFigureDivs.length > 0) {
                        for (const bowlingFigureDiv of bowlingFigureDivs) {

                            if (bowlingFigureDiv.innerText.indexOf('Bowler') !== -1) {
                                // header div
                            } else {
                                let bowlingFigure = {};
                                let mainDiv = bowlingFigureDiv;
                                let innerDivs = mainDiv.children;

                                if (innerDivs.length > 0) {
                                    let bowlerDiv = innerDivs[0];

                                    let bowlerLink = bowlerDiv.querySelector('a');
                                    const matches = bowlerLink.title.match(/View profile of (.*)/);
                                    bowlingFigure.player = matches[1].trim();

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

                    details.bowlingFigures = bowlingFigures;
                }
            }
        }

        return details;
    };

    let details = {};

    try {
        let team1;
        let team2;
        let matchName;
        let tourName;
        let gameType;

        const tourNameElement = document.querySelector('.cb-nav-subhdr a span');
        if (tourNameElement) {
            tourName = tourNameElement.innerText.replace(/\//g, '-');
        }

        const matchNameElement = document.querySelector('h1[itemprop="name"]');
        if (matchNameElement) {
            let matchFullName = matchNameElement.innerText.replace(' - Live Cricket Score, Commentary', '');
            const matchNameParts = matchFullName.split(', ');
            const teamsText = matchNameParts[0];
            const matches = teamsText.match(/(.*) vs (.*)/);

            team1 = correctTeam(matches[1]);
            team2 = correctTeam(matches[2]);
            matchName = teamsText + ', ' + matchNameParts[1];

            gameType = getGameType(matchName, tourName);
        }
        details.team1 = team1;
        details.team2 = team2;
        details.name = matchName;
        details.tourName = tourName;
        details.gameType = gameType;

        let players = [];
        let bench = [];
        let teamsElements = document.querySelectorAll('.cb-minfo-tm-nm');
        if (teamsElements.length === 6) {
            for (let index in teamsElements) {
                index = parseInt(index, 10);
                let teamElement = teamsElements[index];

                if (index === 1) {
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        const name = matches[1];

                        let player = {
                            player: name.trim(),
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
                            player: name.trim(),
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
                            player: name.trim(),
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
                            player: name.trim(),
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
                    let tossWinner = correctTeam(matches[1]);
                    let decision = matches[2];
                    details.tossWinner = tossWinner;
                    let batFirst = tossWinner;
                    if (decision === 'bowl') {
                        if (team1.toLowerCase() === tossWinner.toLowerCase()) {
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
                                teamInnings = ((team1.toLowerCase() === team.toLowerCase()) ? team1Innings : team2Innings);
                                battingScore.teamInnings = teamInnings;
                                battingScore.innings = innings;
                                battingScores.push(battingScore);
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
                                extrasObject.bowlingTeam = ((team.toLowerCase() === team1.toLowerCase()) ? team2 : team1);
                                extras.push(extrasObject);
                            }

                            if (team1.toLowerCase() === team.toLowerCase()) {
                                team1Innings++;
                            } else if (team2.toLowerCase() === team.toLowerCase()) {
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
        let resultText = resultElement.innerText;
        const resultTextParts = resultText.split(' - ');
        resultText = resultTextParts[resultTextParts.length - 1];
        if (resultText.indexOf(' won ') !== -1) {
            if (resultText.match(/super|Super|eliminator/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = correctTeam(matches[1]);
                details.winner = winner;
                details.result = 'SUPER_OVER';
            } else if (resultText.match(/bowl|Bowl/)) {
                let matches = resultText.match(/\((.*) won (.*)/);
                let winner = correctTeam(matches[1]);
                details.winner = winner;
                details.result = 'BOWL_OUT';
            } else {
                let matches = resultText.match(/(.*) won by([a-zA-Z ]*)([0-9]+) ([a-zA-Z]+)/);
                const winner = correctTeam(matches[1]);
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
            let startTime = parseFloat(timeElement.getAttribute('timestamp'));
            details.startTime = startTime;
            details.year = new Date(startTime).getFullYear();
        }

        const stadiumElement = document.querySelector('a[itemprop="location"]');
        details.stadiumURL = stadiumElement.href;

    } catch(e) {
        console.log("Error: " + e);
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
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    let teamReplacements = {};
    const teamReplacementsFilePath = 'data/teamReplacements.json';
    if (fs.existsSync(teamReplacementsFilePath)) {
        teamReplacements = JSON.parse(fs.readFileSync(teamReplacementsFilePath));
    }

    let details = await page.evaluate(getMatchDetailsFromHTML, teamReplacements);
    await page.close();

    try {
        let commentaryUrl = matchUrl.replace('live-cricket-scorecard', 'cricket-scores');

        const motmPage = await browser.newPage();
        await motmPage.goto(commentaryUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        let motmDetails = await motmPage.evaluate(getPlayersOfMatchDetailsFromHTML);
        details = Object.assign({}, details, motmDetails);
    } catch (e) {
        console.log("\nError while getting MOTM details. Exception: " + e + "\n");
    }

    let stadiumCache = {};
    const stadiumCacheFilePath = 'data/yearWiseDetails/stadiumCache.json';
    if (fs.existsSync(stadiumCacheFilePath)) {
        stadiumCache = JSON.parse(fs.readFileSync(stadiumCacheFilePath));
    }

    let stadiumUrl = details.stadiumURL;
    let stadiumDetails = {};
    if (stadiumUrl) {
        if (stadiumCache.hasOwnProperty(stadiumUrl)) {
            stadiumDetails = stadiumCache[stadiumUrl];
        } else {
            try {

                let stadiumPage = await browser.newPage();
                await stadiumPage.goto(stadiumUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 0
                });
                stadiumDetails = await stadiumPage.evaluate(getStadiumDetails);
                stadiumCache[stadiumUrl] = stadiumDetails;
            } catch (e) {
                console.log("\nError while getting stadium details. Exception: " + e + "\n");
            }
        }
        details.stadium = stadiumDetails;
        fs.writeFile(stadiumCacheFilePath, JSON.stringify(stadiumCache, null, ' '), error => {
            if (error) {
                console.log("\n\t\tError while writing stadium cache. Error: " + error + "\n");
            }
        });
    }

    let players = [];

    if (details.players && details.players.length > 0) {
        players = players.concat(details.players);
    }

    if (details.bench && details.bench.length > 0) {
      players = players.concat(details.bench);
    }

    let playerCache = {};
    const playerCacheFilePath = 'data/yearWiseDetails/playerCache.json';
    if (fs.existsSync(playerCacheFilePath)) {
        playerCache = JSON.parse(fs.readFileSync(playerCacheFilePath));
    }

    for (let player of players) {
        let playerDetails;
        if (playerCache.hasOwnProperty(player.link)) {
            playerDetails = {
                country: playerCache[player.link]
            };
        } else {
            console.log("\n\t\t\t\tFetching details for player: " + player.player);
            try {
                let playerURL = player.link;
                let playerPage = await browser.newPage();
                await playerPage.goto(playerURL, {
                    waitUntil: 'networkidle2',
                    timeout: 0
                });
                playerDetails = await playerPage.evaluate(getPlayerDetailsFromHTML);
            } catch (e) {
                console.log("\nError while getting player details. Player: " + player.name + ". Error: " + e + "\n");
            }
        }

        if (playerDetails.country) {
            player.country = playerDetails.country;
            playerCache[player.link] = playerDetails.country;
        }
    }

    try {
        fs.writeFile(playerCacheFilePath, JSON.stringify(playerCache, null, ' '), error => {
            if (error) {
                console.log("\n\t\tError while writing player cache. Error: " + error + "\n");
            }
        });

        const yearFilePath = 'data/yearWiseDetails/' + details.year;
        if (!fs.existsSync(yearFilePath)) {
            fs.mkdirSync(yearFilePath);
        }

        const toursFolderPath = yearFilePath + '/tours';
        if (!fs.existsSync(toursFolderPath)) {
            fs.mkdirSync(toursFolderPath);
        }

        const tourFilePath = toursFolderPath + '/' + details.tourName;
        if (!fs.existsSync(tourFilePath)) {
            fs.mkdirSync(tourFilePath);
        }

        const seriesFolderPath = tourFilePath + '/series';
        if (!fs.existsSync(seriesFolderPath)) {
            fs.mkdirSync(seriesFolderPath);
        }

        const gameTypeFilePath = seriesFolderPath + '/' + details.gameType;
        if (!fs.existsSync(gameTypeFilePath)) {
            fs.mkdirSync(gameTypeFilePath);
        }

        const matchFilePath = gameTypeFilePath + '/' + details.name.toLowerCase() + '.json';
        fs.writeFile(matchFilePath, JSON.stringify(details, null, '  '), error => {
            if (error) {
                console.log("\n\t\tError while writing match data. Error: " + error + "\n");
            }
        });
    } catch (e) {
        console.log("\nError while writing files. Error: " + e + "\n");
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

        fs.writeFile('data/matchDetails.json', JSON.stringify(matchDetails, null, '  '), error => {
            if (error) {
                console.log("\n\t\tError while writing card data. Error: " + error + "\n");
            }
        });
    })();
}




