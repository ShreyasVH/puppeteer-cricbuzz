'use strict';

const fs = require('fs');
const path = require('path');
const getPlayer = require('./utils').getPlayer;
const correctTeam = require('./utils').correctTeam;

const baseDirectory = 'data/matches';

let tours = fs.readdirSync(baseDirectory);

let corrections = {};
let matchesWithMissingPlayers = [];
let unknownPlayers = {};
let ambiguousPlayers = [];
let missedTexts = [];
let dismissals = [];
let dismissalMap = [];
let allDismissalMaps = {};

const playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));
const teamReplacements = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/teamReplacements.json')));

let tourIndex = 1;
for (const tour of tours) {
    if (tourIndex > 1) {
        // break;
        console.log('................................');
    }
    console.log('Processing tour. [' + tourIndex + '/' + tours.length + ']');
    const tourFolder = baseDirectory + '/' + tour;

    const matches = fs.readdirSync(tourFolder);
    let mIndex = 1;
    for (const match of matches) {
        let playersForAmbiguity = {};
        if (mIndex > 1) {
            // break;
            console.log('\t....................................');
        }

        console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');
        let matchDismissalMap = {};

        const matchFile = tourFolder + '/' + match;
        let details = {};

        try {
            details = JSON.parse(fs.readFileSync(matchFile));

            if (details.hasOwnProperty('battingScores') && details.battingScores.length > 0) {
                if (details.hasOwnProperty('players') && details.players.length > 0) {
                    let sIndex = 1;
                    for (const score of details.battingScores) {
                        if (sIndex > 1) {
                            // break;
                        }

                        let battingTeam = correctTeam(score.team, teamReplacements);
                        let bowlingTeam = ((battingTeam === correctTeam(details.team1, teamReplacements)) ? correctTeam(details.team2, teamReplacements) : ((battingTeam === correctTeam(details.team2, teamReplacements)) ? correctTeam(details.team1, teamReplacements) : ''));

                        let detailsForLogging = {
                            matchLink: details.matchLink,
                            dismissalModeText: score.dismissalModeText,
                            year: details.year,
                            tourName: details.tourName,
                            tour,
                            gameType: details.gameType,
                            match,
                            matchName: details.name
                        };

                        if (score.fielders) {
                            let fieldersString = score.fielders;
                            if (fieldersString.match(/sub/)) {
                                // console.log(fieldersString);
                            }

                            let fielders = fieldersString.split(', ');
                            for (let fielder of fielders) {
                                if (fielder.match(/sub \((.*)\)|sub \[(.*)]|\(sub\)/)) {
                                    // console.log(fieldersString);
                                    fielder = 'sub';
                                }

                                if ('sub' !== fielder) {
                                    if (fielder.match(/sub/)) {
                                        missedTexts.push(fieldersString);
                                    }

                                    let playerResponse = getPlayer(fielder, bowlingTeam, details.players, details.bench, playerReplacements, teamReplacements);
                                    let name = playerResponse.name;
                                    if (name) {
                                        corrections[fielder] = name;
                                    } else {
                                        if (playerResponse.options) {
                                            playersForAmbiguity[fielder] = playerResponse.options;
                                        } else {
                                            if (!unknownPlayers.hasOwnProperty(fielder)) {
                                                unknownPlayers[fielder] = detailsForLogging;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (score.bowler) {
                            let playerResponse = getPlayer(score.bowler, bowlingTeam, details.players, details.bench, playerReplacements, teamReplacements);
                            let name = playerResponse.name;
                            if (name) {
                                corrections[score.bowler] = name;
                            } else {
                                if (playerResponse.options) {
                                    playersForAmbiguity[score.bowler] = playerResponse.options;
                                } else {
                                    if (!unknownPlayers.hasOwnProperty(score.bowler)) {
                                        unknownPlayers[score.bowler] = detailsForLogging;
                                    }
                                }
                            }
                        }

                        if ((null === score.dismissalMode) && (!score.dismissalModeText.toLowerCase().match(/not out|absent hurt|absent ill|abs hurt|retd out/))) {
                            dismissals.push({
                                text: score.dismissalModeText,
                                mode: score.dismissalMode,
                                tour,
                                match
                            });
                        }

                        if (null !== score.dismissalMode) {
                            if (matchDismissalMap.hasOwnProperty(score.dismissalMode)) {
                                matchDismissalMap[score.dismissalMode].push(score.dismissalModeText);
                            } else {
                                matchDismissalMap[score.dismissalMode] = [
                                    score.dismissalModeText
                                ];
                            }

                            if (allDismissalMaps.hasOwnProperty(score.dismissalMode)) {
                                allDismissalMaps[score.dismissalMode].push(score.dismissalModeText);
                            } else {
                                allDismissalMaps[score.dismissalMode] = [
                                    score.dismissalModeText
                                ];
                            }
                        }
                        sIndex++;
                    }
                } else {
                    matchesWithMissingPlayers.push({
                        year: details.year,
                        tour,
                        tourName: details.tourName,
                        gameType: details.gameType,
                        match,
                        matchName: details.name
                    });
                }
            }
        } catch (e) {
            console.log("Error while getting match details. Error: " + e);
        }

        console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
        if (Object.keys(playersForAmbiguity).length > 0) {
            ambiguousPlayers.push({
                options: playersForAmbiguity,
                year: details.year,
                tour,
                tourName: details.tourName,
                gameType: details.gameType,
                match,
                matchName: details.name
            });
        }

        if (Object.keys(matchDismissalMap).length > 0) {
            dismissalMap.push({
                tour,
                match,
                dismissalMap: matchDismissalMap
            });
        }

        mIndex++;
    }

    console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
    tourIndex++;
}

fs.writeFile('data/playerCorrections.json', JSON.stringify(corrections, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing corrections data. Error: " + error + "");
    }
});
fs.writeFile('data/unknownPlayers.json', JSON.stringify(unknownPlayers, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing unknown players data. Error: " + error + "");
    }
});

fs.writeFile('data/ambiguousPlayers.json', JSON.stringify(ambiguousPlayers, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing unknown players data. Error: " + error + "");
    }
});

fs.writeFile('data/missedTests.json', JSON.stringify(missedTexts, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing missed texts players data. Error: " + error + "");
    }
});

fs.writeFile('data/matchesWithMissingPlayers.json', JSON.stringify(matchesWithMissingPlayers, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing missing players data. Error: " + error + "");
    }
});

fs.writeFile('data/dismissals.json', JSON.stringify(dismissals, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing missing dismissals data. Error: " + error + "");
    }
});

fs.writeFile('data/dismissalMaps.json', JSON.stringify(dismissalMap, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing dismissal map. Error: " + error + "");
    }
});

fs.writeFile('data/allDismissalMaps.json', JSON.stringify(allDismissalMaps, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing all dismissal maps. Error: " + error + "");
    }
});
