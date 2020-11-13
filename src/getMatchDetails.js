'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getMatchIdFromLink = require('./utils').getMatchIdFromLink;
const getGameType = require('./utils').getGameType;


const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchDetailsFromHTML = (teamReplacements, getPlayerIdFromLinkDef, getGameTypeDef) => {
    const getPlayerIdFromLink = new Function(' return (' + getPlayerIdFromLinkDef + ').apply(null, arguments)');

    const getGameType = new Function(' return (' + getGameTypeDef + ').apply(null, arguments)');

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

    const getPlayerName = (link, playerIdMap) => {
        let name = '';

        const playerId = getPlayerIdFromLink.call(null, link);
        if (playerIdMap.hasOwnProperty(playerId)) {
            name = playerIdMap[playerId];
        }

        return name;
    };

    const getInningsDetails = (inning, team1, team2, playerIdMap) => {
        const teamInnings = ((inning <= 2) ? 1 : 2);
        let details = {};

        const inningsDiv = document.querySelector('#innings_' + inning);
        if (inningsDiv) {
            const inningsHeaderDiv = inningsDiv.querySelector('.cb-col.cb-col-100.cb-scrd-hdr-rw');
            const spans = inningsHeaderDiv.querySelectorAll('span');
            const titleSpan = spans[0];
            let titleText = titleSpan.innerText;
            titleText = titleText.replace('1st ', '').replace('2nd ', '');
            const teamMatches = titleText.match(/(.*) Innings/);
            const battingTeam = correctTeam(teamMatches[1]);
            const bowlingTeam = ((battingTeam === correctTeam(team1)) ? correctTeam(team2) : ((battingTeam === correctTeam(team2)) ? correctTeam(team1) : ''));

            const tables = inningsDiv.querySelectorAll('.cb-col.cb-col-100.cb-ltst-wgt-hdr');

            for (const table of tables) {
                if (table.innerText.indexOf('Batsman') !== -1) {
                    const batsmanRows = table.querySelectorAll('.cb-col.cb-col-100.cb-scrd-itms');
                    let battingScores = [];

                    for (const row of batsmanRows) {
                        if (row.innerText.indexOf('Extras') !== -1) {
                            let extras = [];
                            const innerDivs = row.children;

                            const totalExtrasDiv = innerDivs[1];
                            details.totalExtras = {
                                total: parseInt(totalExtrasDiv.innerText.trim(), 10),
                                innings: inning,
                                battingTeam
                            };

                            const extrasDiv = innerDivs[2];
                            if (extrasDiv) {
                                const extrasParts = extrasDiv.innerText.trim().replace('(', '').replace(')', '').split(', ');
                                for (const extrasObject of extrasParts) {
                                    let parts = extrasObject.split(' ');
                                    if (parts.length === 2) {
                                        let type = extrasMapping[parts[0]];
                                        let runs = parseInt(parts[1], 10);

                                        if (runs > 0) {
                                            extras.push({
                                                type,
                                                runs,
                                                innings: inning,
                                                teamInnings,
                                                battingTeam,
                                                bowlingTeam
                                            });
                                        }
                                    }
                                }
                            }
                            details.extras = extras;
                        } else if (row.innerText.indexOf('Total') !== -1) {
                            const innerDivs = row.children;
                            const runsDiv = innerDivs[1];
                            const runs = parseInt(runsDiv.innerText.trim(), 10);

                            const oversDiv = innerDivs[2];
                            const text = oversDiv.innerText.replace('(', '').replace(')', '').trim();
                            const textParts = text.split(', ');
                            const wicketsText = textParts[0].replace(' wkts', '');
                            const wickets = parseInt(wicketsText, 10);
                            const oversText = textParts[1].replace(' Ov', '');
                            const overParts = oversText.split('.');
                            let balls = 0;
                            const overs = parseInt(overParts[0], 10);
                            if (overParts.length === 2) {
                                balls = parseInt(overParts[1],10);
                            }
                            balls += (overs * 6);

                            details.total = {
                                runs,
                                wickets,
                                // balls,
                                oversText,
                                innings: inning
                            };
                        } else if (row.innerText.toLowerCase().match('did not bat|yet to bat')) {

                        } else {
                            let score = {};

                            const children = row.children;

                            const playerDiv = children[0];
                            const anchor = playerDiv.querySelector('a');
                            score.playerLink = anchor.href;
                            score.player = getPlayerName(anchor.href, playerIdMap)

                            const dismissalModeDiv = children[1];
                            const dismissalModeText = dismissalModeDiv.innerText;
                            score.dismissalModeText = dismissalModeText;

                            let dismissalMode = null;
                            let fielders;
                            let bowler;

                            const bowledRegex = /^b (.*)$/;
                            const caughtAndBowledRegex = /(c & b|c and b|c&b) (.*)/;
                            const caughtRegex = /^c (.*) b (.*)$/;
                            const lbwRegex = /^lbw b (.*)$/;
                            const runOutRegex = /^run out(.*)$/;
                            const stumpedRegex = /^st (.*) b (.*)$/;
                            const hitTwiceRegex = /hit twice/;
                            const hitWicketRegex = /^(hit wicket|hit wkt) b (.*)$/;
                            const obstructedRegex = /^obs|obstructing the field$/;
                            const timedOutRegex = /timed out/;
                            const retiredHurtRegex = /retd hurt|retired hurt|retired ill/;
                            const handledRegex = /handled the ball/;

                            if (dismissalModeText.match(/not out/)) {

                            } else if (dismissalModeText.match(lbwRegex)) {
                                dismissalMode = 'LBW';
                                let matches = dismissalModeText.match(lbwRegex);
                                bowler = matches[1];
                            } else if(dismissalModeText.match(runOutRegex)) {
                                dismissalMode = 'Run Out';
                                let matches = dismissalModeText.match(runOutRegex);
                                let fieldersText = matches[1].replace('(', '').replace(')', '');
                                let fielderParts = fieldersText.split('/');
                                fielders = fielderParts.join(', ');
                            } else if(dismissalModeText.match(hitWicketRegex)) {
                                dismissalMode = 'Hit Wicket';
                                let matches = dismissalModeText.match(hitWicketRegex);
                                bowler = matches[2];
                            } else if(dismissalModeText.match(handledRegex)) {
                                dismissalMode = 'Handled the Ball';
                            } else if(dismissalModeText.match(retiredHurtRegex)) {
                                dismissalMode = 'Retired Hurt';
                            } else if(dismissalModeText.match(stumpedRegex)) {
                                dismissalMode = 'Stumped';
                                let matches = dismissalModeText.match(stumpedRegex);
                                fielders = matches[1];
                                bowler = matches[2];
                            } else if(dismissalModeText.match(caughtAndBowledRegex)) {
                                dismissalMode = 'Caught';
                                let matches = dismissalModeText.match(caughtAndBowledRegex);
                                fielders = matches[2];
                                bowler = matches[2];
                            } else if(dismissalModeText.match(caughtRegex)) {
                                dismissalMode = 'Caught';
                                let matches = dismissalModeText.match(caughtRegex);
                                fielders = matches[1];
                                bowler = matches[2];
                            } else if(dismissalModeText.match(bowledRegex)) {
                                dismissalMode = 'Bowled';
                                let matches = dismissalModeText.match(bowledRegex);
                                bowler = matches[1];
                            } else if(dismissalModeText.match(obstructedRegex)) {
                                dismissalMode = 'Obstructing the Field';
                            } else if(dismissalModeText.match(hitTwiceRegex)) {
                                dismissalMode = 'Hit Twice';
                            } else if(dismissalModeText.match(timedOutRegex)) {
                                dismissalMode = 'Timed Out';
                            }

                            score.dismissalMode = dismissalMode;

                            if (dismissalMode) {
                                if (fielders) {
                                    score.fielders = fielders.trim();
                                }

                                if (bowler) {
                                    score.bowler = bowler.trim();
                                }
                            }

                            const runsDiv = children[2];
                            score.runs = parseInt(runsDiv.innerText, 10);

                            const ballsDiv = children[3];
                            score.balls = parseInt(ballsDiv.innerText, 10);

                            const foursDiv = children[4];
                            score.fours = parseInt(foursDiv.innerText, 10);

                            const sixesDiv = children[5];
                            score.sixes = parseInt(sixesDiv.innerText, 10);

                            score.innings = inning;
                            score.teamInnings = teamInnings;
                            score.team = battingTeam;

                            battingScores.push(score);
                        }
                    }

                    details.battingScores = battingScores;
                } else if (table.innerText.indexOf('Bowler') !== -1) {
                    const bowlerRows = table.querySelectorAll('.cb-col.cb-col-100.cb-scrd-itms');

                    let bowlingFigures = [];

                    for (const row of bowlerRows) {
                        let figure = {};
                        const children = row.children;
                        const playerDiv = children[0];
                        const anchor = playerDiv.querySelector('a');
                        figure.playerLink = anchor.href;
                        figure.player = getPlayerName(anchor.href, playerIdMap);

                        const ballsDiv = children[1];
                        figure.oversText = ballsDiv.innerText;

                        const maidensDiv = children[2];
                        figure.maidens = parseInt(maidensDiv.innerText, 10);

                        const runsDiv = children[3];
                        figure.runs = parseInt(runsDiv.innerText, 10);

                        const wicketsDiv = children[4];
                        figure.wickets = parseInt(wicketsDiv.innerText, 10);

                        figure.innings = inning;
                        figure.teamInnings = teamInnings;

                        bowlingFigures.push(figure);
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
            details.tourNameText = tourNameElement.innerText;
            tourName = tourNameElement.innerText.trim().replace(/\//g, '-');
            details.tourLink = tourNameElement.parentElement.href;
        }

        const matchNameElement = document.querySelector('h1[itemprop="name"]');
        if (matchNameElement) {
            details.matchNameText = matchNameElement.innerText;
            let matchFullName = matchNameElement.innerText.replace(' - Live Cricket Score, Commentary', '');
            const matchNameParts = matchFullName.split(', ');
            const teamsText = matchNameParts[0];
            const matches = teamsText.match(/(.*) vs (.*)/);

            team1 = correctTeam(matches[1]);
            team2 = correctTeam(matches[2]);
            matchName = (teamsText + ', ' + matchNameParts[1]).toLowerCase();

            gameType = getGameType.call(null, matchName, tourName);
        }
        details.team1 = team1;
        details.team2 = team2;
        details.name = matchName;
        details.matchLink = location.href;
        details.tourName = tourName;
        details.gameType = gameType;
        details.battingScores = [];
        details.bowlingFigures = [];
        details.extras = [];
        details.totalExtras = [];
        details.totals = [];

        let players = [];
        let bench = [];
        let captains = [];
        let wicketKeepers = [];
        let playerLinks = [];
        let playerIdMap = {};
        let teamsElements = document.querySelectorAll('.cb-minfo-tm-nm');
        if (teamsElements.length === 6) {
            let index = 0;
            for (let teamElement of teamsElements) {
                if ((index === 1) || (index === 4)) {
                    const team = ((index === 1) ? team1 : team2);
                    const divs = teamElement.querySelectorAll('div');
                    const playerDiv = divs[1];
                    const playerElements = playerDiv.querySelectorAll('a');

                    for (const playerElement of playerElements) {
                        const title = playerElement.title;
                        const matches = title.match(/View profile of (.*)/);
                        let name = '';
                        if (matches) {
                            name = matches[1].trim();
                        }

                        const nameText = playerElement.innerText;
                        if (nameText.match(/(.*)\((.*)\)/)) {
                            let isCaptain = false;
                            let isWicketKeeper = false;

                            const matches = nameText.match(/(.*)\((.*)\)/);
                            const matchedText = matches[2].toLowerCase();
                            if (matchedText === 'c & wk') {
                                isCaptain = true;
                                isWicketKeeper = true;
                            } else if (matchedText === 'c') {
                                isCaptain = true;
                            } else if (matchedText === 'wk') {
                                isWicketKeeper = true;
                            }

                            if (isCaptain) {
                                captains.push({
                                    name,
                                    team: team,
                                    link: playerElement.href
                                });
                            }

                            if (isWicketKeeper) {
                                wicketKeepers.push({
                                    name,
                                    team: team,
                                    link: playerElement.href
                                });
                            }
                        }

                        if (playerLinks.indexOf(playerElement.href) === -1) {
                            let player = {
                                player: name,
                                team: team,
                                link: playerElement.href
                            };
                            players.push(player);
                            playerLinks.push(playerElement.href);


                            const playerId = getPlayerIdFromLink.call(null, playerElement.href);
                            playerIdMap[playerId] = name;
                        }

                    }
                }

                index++;
            }

            details.players = players;
            details.bench = bench;
            details.captains = captains;
            details.wicketKeepers = wicketKeepers;
        }

        let matchInfoElements = document.querySelectorAll('.cb-mtch-info-itm');
        for (let matchInfoElement of matchInfoElements) {
            let divs = matchInfoElement.querySelectorAll('div');
            if (divs.length >= 2) {
                const fieldName = divs[0].innerText;
                const fieldValue = divs[1].innerText;

                if (fieldName === 'Toss') {
                    details.tossText = fieldValue;
                    if (fieldValue.indexOf(' won the toss ') !== -1) {
                        const matches = fieldValue.match(/(.*) won the toss and opt to (.*)/);
                        let tossWinner = '';
                        if (matches) {
                            tossWinner = correctTeam(matches[1]);
                            details.tossWinner = tossWinner;

                            const decision = matches[2];
                            let batFirst = tossWinner;
                            if (decision === 'bowl') {
                                if (team1.toLowerCase() === tossWinner.toLowerCase()) {
                                    batFirst = team2;
                                } else {
                                    batFirst = team1;
                                }
                            }
                            details.batFirst = batFirst;
                        }
                    }
                }
            }
        }

        for(let i = 1; i <= 4; i++) {
            let inningsDetails = getInningsDetails(i, team1, team2, playerIdMap);
            if (Object.keys(inningsDetails).length > 0) {
                details.battingScores = details.battingScores.concat(inningsDetails.battingScores);
                details.bowlingFigures = details.bowlingFigures.concat(inningsDetails.bowlingFigures);
                details.extras = details.extras.concat(inningsDetails.extras);
                details.totalExtras.push(inningsDetails.totalExtras);
                details.totals.push(inningsDetails.total);
            }
        }

        const resultElement = document.querySelector('.cb-scrcrd-status');
        let resultText = resultElement.innerText;
        const resultTextParts = resultText.split(' - ');
        resultText = resultTextParts[resultTextParts.length - 1];
        details.resultText = resultText;
        if (resultText.indexOf(' won ') !== -1) {
            if (resultText.match(/super over|Super Over|eliminator/)) {
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
                if (matches) {
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
            details.startTimeString = (new Date(startTime)).toLocaleDateString('en-GB');
            let year = new Date(startTime).getFullYear();
            // console.log(year);
            details.year = year;
        }

        const timeTextElement = document.querySelector('[itemprop="startDate"]');
        if (timeTextElement) {
            details.startTimeText = timeTextElement.innerText;
        }

        const stadiumElement = document.querySelector('a[itemprop="location"]');
        details.stadiumURL = stadiumElement.href;

    } catch(e) {
        details = {};
        console.log("Error: " + e);
    }

    return details;
};

const getPlayersOfMatchDetailsFromHTML = () => {
    let details = {};
    let motm = [];
    let mots = [];
    const motmElements = document.querySelectorAll('.cb-mom-itm.ng-scope');

    for(const motmElement of motmElements) {
        let label = motmElement.querySelector('span').innerText;
        let playerLink = motmElement.querySelector('a');
        let player = playerLink.innerText;
        if (label === 'PLAYER OF THE MATCH') {
            motm.push({
                player,
                link: playerLink.href
            });
        } else if (label === 'PLAYER OF THE SERIES') {
            mots.push({
                player,
                link: playerLink.href
            });
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
    let details = {};
    try {
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

        details = await page.evaluate(getMatchDetailsFromHTML, teamReplacements, getPlayerIdFromLink.toString(), getGameType.toString());
        await page.close();

        if (Object.keys(details).length > 0) {
            let commentaryUrl = matchUrl.replace('live-cricket-scorecard', 'cricket-scores');

            const motmPage = await browser.newPage();
            await motmPage.goto(commentaryUrl, {
                waitUntil: 'networkidle2',
                timeout: 0
            });
            page.on('console', msg => console.log('MOTM PAGE LOG:', msg.text()));
            let motmDetails = await motmPage.evaluate(getPlayersOfMatchDetailsFromHTML);
            details = Object.assign({}, details, motmDetails);

            const baseFolder = 'data/matches';

            const tourId = getTourIdFromLink(details.tourLink);
            if (tourId) {
                const tourFolder = baseFolder + '/' + tourId;
                if (!fs.existsSync(tourFolder)) {
                    fs.mkdirSync(tourFolder);
                }

                const matchId = getMatchIdFromLink(details.matchLink);
                if (matchId) {
                    const matchFilePath = tourFolder + '/' + matchId + '.json';
                    fs.writeFile(matchFilePath, JSON.stringify(details, null, '  '), error => {
                        if (error) {
                            console.log("\t\tError while writing match data. Error: " + error);
                        }
                    });
                }
            }
        }

        await browser.close();
    } catch (e) {
        console.log('Error while getting details for matches. Error: ' + e);
    }


    return details;
};

exports.getMatchDetails = getMatchDetails;

if (fileName === scriptName) {
    (async() => {
        const matchUrl = process.argv[2];
        const matchDetails = await getMatchDetails(matchUrl);
        // console.log(JSON.stringify(matchDetails, null, ' '));
    })();
}




