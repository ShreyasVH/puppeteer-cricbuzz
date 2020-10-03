'use strict';

const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchesWithMissingBattingScores = () => {
    let matchesWithoutBattingScores = [];
    const baseDirectory = 'data/matches';

    const tours = fs.readdirSync(baseDirectory);

    let tourIndex = 1;
    for (const tourId of tours) {
        // if (tourIndex > 1) {
        //     break;
        // }

        if (tourIndex > 1) {
            console.log('................................');
        }
        console.log('Processing tour. [' + tourIndex + '/' + tours.length + ']');
        const tourFolder = baseDirectory + '/' + tourId;

        const matches = fs.readdirSync(tourFolder);
        let mIndex = 1;
        for (const match of matches) {
            const matchId = match.replace('.json', '');
            // if (mIndex > 2) {
            //     break;
            // }
            if (mIndex > 1) {
                console.log('\t....................................................');
            }

            console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

            const matchFile = tourFolder + '/' + match;
            let details = {};

            try {
                details = JSON.parse(fs.readFileSync(matchFile));

                if (details.players && (details.players.length > 0) && (!details.battingScores || (details.battingScores.length === 0))) {
                    matchesWithoutBattingScores.push(
                        {
                            year: details.year,
                            tourId,
                            gameType: details.gameType,
                            matchId,
                            matchName: details.name,
                            result: details.result
                        }
                    );
                }
            } catch (e) {
                console.log("Error while getting match details. Error: " + e + "");
            }

            console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
            mIndex++;
        }

        console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
        tourIndex++;
    }

    return matchesWithoutBattingScores;
};
exports.getMatchesWithMissingBattingScores = getMatchesWithMissingBattingScores;

if (scriptName === fileName) {
    (() => {
        const matchesWithoutBattingScores = getMatchesWithMissingBattingScores();

        fs.writeFile('data/matchesWithoutBattingScores.json', JSON.stringify(matchesWithoutBattingScores, null, ' '), error => {
            if (error) {
                console.log("\t\tError while writing stats. Error: " + error + "");
            }
        });
    })();
}



