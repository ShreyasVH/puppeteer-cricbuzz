'use strict';

const fs = require('fs');

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchesWithoutToss = () => {
    let matchesWithoutToss = [];
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

            try {
                const details = JSON.parse(fs.readFileSync(matchFile));
                // console.log(JSON.stringify(details));

                if (!details.tossWinner && ('WASHED_OUT' !== details.result)) {
                    matchesWithoutToss.push(
                        {
                            year: details.year,
                            tourId,
                            gameType: details.gameType,
                            matchId,
                            matchlink: details.matchLink,
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

    return matchesWithoutToss;
};
exports.getMatchesWithoutToss = getMatchesWithoutToss;

if (scriptName === fileName) {
    (() => {
        const matchesWithoutToss = getMatchesWithoutToss();

        fs.writeFile('data/matchesWithoutToss.json', JSON.stringify(matchesWithoutToss, null, ' '), error => {
            if (error) {
                console.log("\t\tError while writing matchesWithoutToss. Error: " + error + "");
            }
        });
    })();
}



