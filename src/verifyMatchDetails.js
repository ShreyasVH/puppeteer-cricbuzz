'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;
const getPlayer = require('./utils').getPlayer;
const correctTeam = require('./utils').correctTeam;
const getBallsFromOversText = require('./utils').getBallsFromOversText;

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const verifyTotals = details => {
    let errors = [];

    let inningsTotalMap = {};
    for (const total of details.totals) {
        inningsTotalMap[total.innings] = total.runs;
    }
    // console.log(JSON.stringify(inningsTotalMap));

    let inningsTotalMapAggregate = {};
    if (details.battingScores) {
        for (const score of details.battingScores) {
            if (inningsTotalMapAggregate.hasOwnProperty(score.innings)) {
                inningsTotalMapAggregate[score.innings] += score.runs;
            } else {
                inningsTotalMapAggregate[score.innings] = score.runs;
            }
        }
    }

    for (const extras of details.extras) {
        if (inningsTotalMapAggregate.hasOwnProperty(extras.innings)) {
            inningsTotalMapAggregate[extras.innings] += extras.runs;
        } else {
            inningsTotalMapAggregate[extras.innings] = extras.runs;
        }
    }

    // console.log(JSON.stringify(inningsTotalMapAggregate));

    if (JSON.stringify(inningsTotalMap) !== JSON.stringify(inningsTotalMapAggregate)) {
        errors.push({
            message: 'Totals do not tally',
            total: JSON.stringify(inningsTotalMap),
            totalAggregate: JSON.stringify(inningsTotalMapAggregate)
        });
    }

    // console.log(JSON.stringify(errors));

    return errors;
};

const verifyExtras = details => {
    let errors = [];
    let inningsExtrasMap = {};
    for (const extras of details.totalExtras) {
        if (extras.total > 0) {
            inningsExtrasMap[extras.innings] = extras.total;
        }
    }

    let inningsExtrasMapAggregate = {};
    for (const extras of details.extras) {
        const innings = extras.innings;
        if (inningsExtrasMapAggregate.hasOwnProperty(innings)) {
            inningsExtrasMapAggregate[innings] += extras.runs;
        } else {
            inningsExtrasMapAggregate[innings] = extras.runs;
        }
    }

    if (JSON.stringify(inningsExtrasMap) !== JSON.stringify(inningsExtrasMapAggregate)) {
        errors.push({
            message: 'Extras do not tally',
            totalExtras: JSON.stringify(inningsExtrasMap),
            aggregatedExtras: JSON.stringify(inningsExtrasMapAggregate)
        });
    }

    return errors;
};

const verifyBalls = async details => {
    let errors = [];

    let inningsOversMap = {};
    for (const total of details.totals) {
        inningsOversMap[total.innings] = await getBallsFromOversText(total.oversText, details.startTime, details.stadiumURL);
    }
    // console.log(JSON.stringify(inningsOversMap));

    let inningsOversMapAggregate = {};
    if (details.bowlingFigures) {
        for (const figure of details.bowlingFigures) {
            if (inningsOversMapAggregate.hasOwnProperty(figure.innings)) {
                inningsOversMapAggregate[figure.innings] += await getBallsFromOversText(figure.oversText, details.startTime, details.stadiumURL);
            } else {
                inningsOversMapAggregate[figure.innings] = await getBallsFromOversText(figure.oversText, details.startTime, details.stadiumURL);
            }
        }
    }

    // console.log(JSON.stringify(inningsOversMapAggregate));

    if (JSON.stringify(inningsOversMap) !== JSON.stringify(inningsOversMapAggregate)) {
        errors.push({
            message: 'Overs do not tally',
            totalOvers: JSON.stringify(inningsOversMap),
            aggregatedOvers: JSON.stringify(inningsOversMapAggregate)
        });
    }

    // console.log(JSON.stringify(errors));

    return errors;
};

const verifyWickets = (details, playerReplacements, teamReplacements) => {
    let errors = [];

    let inningsWicketMap = {};
    if (details.bowlingFigures) {
        for (const figure of details.bowlingFigures) {
            if (figure.wickets > 0) {
                if (!inningsWicketMap.hasOwnProperty(figure.innings)) {
                    inningsWicketMap[figure.innings] = {};
                }

                const playerId = getPlayerIdFromLink(figure.playerLink);
                // console.log("total" + playerId);
                if (playerId) {
                    inningsWicketMap[figure.innings][playerId] = figure.wickets;
                }
            }
        }
    }

    let inningsWicketMapAggregate = {};
    if (details.battingScores && details.players) {
        for (const score of details.battingScores) {
            const battingTeam = correctTeam(score.team, teamReplacements);
            const bowlingTeam = ((battingTeam === correctTeam(details.team1, teamReplacements)) ? correctTeam(details.team2, teamReplacements) : ((battingTeam === correctTeam(details.team2, teamReplacements)) ? correctTeam(details.team1, teamReplacements) : ''));
            if (score.bowler) {
                const playerResponse = getPlayer(score.bowler, bowlingTeam, details.players, details.bench, playerReplacements, teamReplacements);
                if (playerResponse.link) {
                    let playerId = getPlayerIdFromLink(playerResponse.link);
                    if (playerId) {
                        let totalWickets = 1;
                        if (inningsWicketMapAggregate.hasOwnProperty(score.innings) && inningsWicketMapAggregate[score.innings].hasOwnProperty(playerId)) {
                            totalWickets += inningsWicketMapAggregate[score.innings][playerId];
                        }
                        if (!inningsWicketMapAggregate.hasOwnProperty(score.innings)) {
                            inningsWicketMapAggregate[score.innings] = {};
                        }

                        inningsWicketMapAggregate[score.innings][playerId] = totalWickets;
                    }
                } else {
                    console.log(JSON.stringify(playerResponse));

                }
            }

        }
    }

    // console.log(JSON.stringify(inningsWicketMap));
    // console.log(JSON.stringify(inningsWicketMapAggregate));
    if (JSON.stringify(inningsWicketMap) !== JSON.stringify(inningsWicketMapAggregate)) {
        errors.push({
            message: 'Wickets do not tally',
            totalWickets: JSON.stringify(inningsWicketMap),
            aggregatedWickets: JSON.stringify(inningsWicketMapAggregate)
        });
    }

    return errors;
};

const verifyDismissals = details => {
    let errors = [];

    return errors;
}

const verifyMatchDetails = async (details) => {
    let errors = [];

    const playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));
    const teamReplacements = JSON.parse(fs.readFileSync('data/teamReplacements.json'));

    errors = errors.concat(verifyTotals(details));
    errors = errors.concat(verifyExtras(details));
    errors = errors.concat(await verifyBalls(details));
    errors = errors.concat(verifyWickets(details, playerReplacements, teamReplacements));

    return errors;
};

exports.verifyMatchDetails = verifyMatchDetails;

if (fileName === scriptName) {
    (async() => {
        // const playerId = process.argv[2];
        // const playerDetails = await getPlayerDetails(playerId);
    })();
}