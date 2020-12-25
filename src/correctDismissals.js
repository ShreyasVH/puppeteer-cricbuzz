'use strict';

const fs = require('fs');

const baseDirectory = 'data/matches';

let tours = fs.readdirSync(baseDirectory);


const playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));

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
            let changesPresent = false;
            let subsPresent = false;

            if (details.hasOwnProperty('battingScores') && details.battingScores.length > 0) {
                if (details.hasOwnProperty('players') && details.players.length > 0) {
                    let sIndex = 1;
                    for (const score of details.battingScores) {
                        if (sIndex > 1) {
                            // break;
                        }

                        const battingTeam = score.team;
                        const bowlingTeam = ((battingTeam === details.team1) ? details.team2 : ((battingTeam === details.team2) ? details.team1 : ''));

                        if ('run out' === score.dismissalModeText) {
                            score.dismissalMode = 'Run Out';
                            score.fielders = 'sub';
                            changesPresent = true;
                        }

                        if (['retired hurt', 'retired ill'].indexOf(score.dismissalModeText) !== -1) {
                            score.dismissalMode = 'Retired Hurt';
                            changesPresent = true;
                        }

                        if ('obstructing the field' === score.dismissalModeText) {
                            score.dismissalMode = 'Obstructing the Field';
                            changesPresent = true;
                        }

                        if (score.fielders) {
                            let fieldersString = score.fielders;
                            if (fieldersString.match(/sub/)) {
                                // console.log(fieldersString);
                            }

                            let fielders = fieldersString.split(', ');
                            let updatedFielders = [];
                            for (let fielder of fielders) {
                                if (fielder.match(/sub \((.*)\)|sub \[(.*)]|\(sub\)/)) {
                                    // console.log(fieldersString);
                                    fielder = 'sub';
                                    changesPresent = true;
                                }

                                if ('sub' === fielder) {
                                    subsPresent = true;
                                    changesPresent = true;
                                }
                                updatedFielders.push(fielder);
                            }
                            score.fielders = updatedFielders.join(', ');
                            sIndex++;
                        }
                    }
                }
            }
            if (subsPresent) {
                details.bench = [{
                    "player": "sub",
                    "team": "India",
                    "link": "https://www.cricbuzz.com/profiles/1/sub",
                    "country": "India"
                }];
            }

            if (changesPresent) {
                fs.writeFile(matchFile, JSON.stringify(details, null, '  '), error => {
                    if (error) {
                        console.log("\t\tError while writing match details. Error: " + error + "");
                    }
                });
            }
        } catch (e) {
            console.log("Error while getting match details. Error: " + e);
        }

        console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
        mIndex++;
    }

    console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
    tourIndex++;
}
