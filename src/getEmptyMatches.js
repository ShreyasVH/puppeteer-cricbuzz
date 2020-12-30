'use strict';

const fs = require('fs');

const baseDirectory = 'data/matches';

let tours = fs.readdirSync(baseDirectory);

let emptyMatches = [];

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
    let tourEmptyMatches = [];
    for (const match of matches) {
        let playersForAmbiguity = {};
        if (mIndex > 1) {
            // break;
            console.log('\t....................................');
        }

        console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

        const matchFile = tourFolder + '/' + match;
        let details = {};

        try {
            details = fs.readFileSync(matchFile);

            if (details.toString().length === 0) {
                tourEmptyMatches.push({
                    match
                });

                fs.unlinkSync(matchFile);
            }
        } catch (e) {
            console.log("Error while getting match details. Error: " + e);
        }

        console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
        mIndex++;
    }
    if (tourEmptyMatches.length > 0) {
        emptyMatches.push({
            tour,
            matches: tourEmptyMatches
        });
    }

    console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
    tourIndex++;
}

fs.writeFile('data/emptyMatches.json', JSON.stringify(emptyMatches, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing corrections data. Error: " + error + "");
    }
});

