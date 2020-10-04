'use strict';

const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getScores = (name, requiredGameType) => {
    const baseDirectory = 'data/yearWiseDetails';

    let years = fs.readdirSync(baseDirectory);

    years = years.filter(file => file.match(/[0-9]{4}/));

    let scores = [];

    let index = 1;
    for (let year of years) {
        // if (index > 1) {
        //     break;
        // }

        if (index > 1) {
            console.log("\n------------------------------------------------------------\n");
        }

        console.log("\nProcessing Year: " + year + ". [" + index + "/" + years.length + "]\n");

        const yearFolder = baseDirectory + '/' + year;
        if (fs.existsSync(yearFolder + '/tours')) {
            const tours = fs.readdirSync(yearFolder + '/tours');

            let tourIndex = 1;
            for (const tour of tours) {
                // if (tourIndex > 1) {
                //     break;
                // }

                if (tourIndex > 1) {
                    console.log('\n\t................................\n');
                }
                console.log('\n\tProcessing tour. [' + tourIndex + '/' + tours.length + ']\n');
                const tourFolder = yearFolder + '/tours/' + tour;

                if (fs.existsSync(tourFolder + '/series')) {
                    const gameTypes = fs.readdirSync(tourFolder + '/series');

                    let gIndex = 1;
                    for (const gameType of gameTypes) {
                        if (gameType !== requiredGameType) {
                            continue;
                        }

                        // if (gIndex > 1) {
                        //     break;
                        // }
                        if (gIndex > 1) {
                            console.log('\n\t\t-------------------------------------------\n');
                        }

                        console.log('\n\t\tProcessing gametype. [' + gIndex + '/' + gameTypes.length + ']\n');
                        const gameTypeFolder = tourFolder + '/series/' + gameType;

                        const matches = fs.readdirSync(gameTypeFolder);
                        let mIndex = 1;
                        for (const match of matches) {
                            const matchName = match.replace('.json', '');
                            // if (mIndex > 2) {
                            //     break;
                            // }
                            if (mIndex > 1) {
                                console.log('\n\t\t\t....................................................\n');
                            }

                            console.log('\n\t\t\tProcessing match. [' + mIndex + '/' + matches.length + ']\n');

                            const matchFile = gameTypeFolder + '/' + match;
                            let details = {};

                            try {
                                details = JSON.parse(fs.readFileSync(matchFile));
                            } catch (e) {
                                console.log("\nError while getting match details. Error: " + e + "\n");
                            }

                            if (details.players && (details.players.length > 0) && details.battingScores) {
                                for (const score of details.battingScores) {
                                    if (name === score.player) {
                                        scores.push({
                                            runs: score.runs,
                                            startTime: details.startTime
                                        });
                                    }
                                }
                            }

                            console.log('\n\t\t\tProcessed match. [' + mIndex + '/' + matches.length + ']\n');
                            mIndex++;
                        }

                        console.log('\n\t\tProcessed gametype. [' + gIndex + '/' + gameTypes.length + ']\n');

                        gIndex++;
                    }
                } else {
                    console.log('\n\t\tSeries folder not found\n');
                    console.log('\n\t\t' + tour + '\n');
                }

                console.log('\n\tProcessed tour. [' + tourIndex + '/' + tours.length + ']\n');
                tourIndex++;
            }
        } else {
            console.log("\n\tTours folder not found\n");
        }
        console.log("\nProcessed Year: " + year + ". [" + index + "/" + years.length + "]\n");
        index++;
    }
    scores.sort((a, b) => {
        return (a.startTime - b.startTime);
    });

    return scores;
};
exports.getScores = getScores;

if (scriptName === fileName) {
    (() => {

        const playerName = process.argv[2];
        const gameType = process.argv[3];

        const scores = getScores(playerName, gameType);

        let finalScores = [];
        for (const score of scores) {

            console.log();

            finalScores.push([
                score.runs,
                new Date(score.startTime).toLocaleDateString('en-GB')
            ].join(', '));
        }

        fs.writeFile('data/scores/' + gameType + '/' + playerName + '.csv', finalScores.join('\n'), error => {
            if (error) {
                console.log("\n\t\tError while writing stats. Error: " + error + "\n");
            }
        });
    })();
}



