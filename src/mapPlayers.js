'use strict';

const fs = require('fs');
const getPlayer = require('./utils').getPlayer;

const baseDirectory = 'data/matches';

let tours = fs.readdirSync(baseDirectory);

let corrections = {};
let matchesWithMissingPlayers = [];
let unknownPlayers = {};
let ambiguousPlayers = [];
let missedTexts = [];

const playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));
const teamReplacements = JSON.parse(fs.readFileSync('data/teamReplacements.json'));

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
    let playersForAmbiguity = {};
    for (const match of matches) {
        if (mIndex > 1) {
            // break;
            console.log('\t....................................');
        }

        console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

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

                        const battingTeam = score.team;
                        const bowlingTeam = ((battingTeam === details.team1) ? details.team2 : ((battingTeam === details.team2) ? details.team1 : ''));

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
                            if (fieldersString.match(/sub \((.*)\)/)) {
                                // console.log(fieldersString);
                                fieldersString = 'sub';
                            }

                            if ('sub' !== fieldersString) {
                                if (fieldersString.match(/sub/)) {
                                    missedTexts.push(fieldersString);
                                }

                                let fielders = fieldersString.split(', ');
                                for (let fielder of fielders) {
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

                            sIndex++;
                        }
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
        mIndex++;
    }

    console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
    tourIndex++;
}

fs.writeFile('data/playerMap.json', JSON.stringify(corrections, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing corrections data. Error: " + error + "");
    }
});


