'use strict';

const fs = require('fs');

const getMatchIdFromLink = require('./utils').getMatchIdFromLink;

(async() => {
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

        let tourDetails = {};
        let matchStartTimeMap = {};
        if (fs.existsSync('data/tourDetails/' + tourId + '.json')) {
            tourDetails = JSON.parse(fs.readFileSync('data/tourDetails/' + tourId + '.json'));

            for (const [gameType, matchList] of Object.entries(tourDetails.series)) {
                matchStartTimeMap[gameType] = {};

                for (const match of matchList.matches) {
                    matchStartTimeMap[gameType][getMatchIdFromLink(match.link)] = match.startTime;
                }
            }
        }
        // console.log(JSON.stringify(matchStartTimeMap, null, ' '));

        const matches = fs.readdirSync(tourFolder);
        let mIndex = 1;
        for (const matchFile of matches) {
            // if (mIndex > 1) {
            //     break;
            // }
            const matchId = matchFile.replace('.json', '');

            if (mIndex > 1) {
                console.log('\t------------------------------');
            }

            console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

            const matchFilePath = tourFolder + '/' + matchFile;

            try {
                let details = JSON.parse(fs.readFileSync(matchFilePath));
                const gameType = details.gameType;
                const mId = getMatchIdFromLink(details.matchLink);
                if (matchStartTimeMap.hasOwnProperty(gameType) && matchStartTimeMap[gameType].hasOwnProperty(mId)) {
                    if (details.startTime !== matchStartTimeMap[gameType][mId]) {
                        const startTime = matchStartTimeMap[gameType][mId];
                        details.startTimeOriginal = details.startTime;
                        details.startTime = startTime;
                        details.startTimeString = (new Date(startTime)).toLocaleDateString('en-GB');
                        details.year = new Date(startTime).getFullYear();

                        fs.writeFile('data/matches/' + tourId + '/' + matchId + '.json', JSON.stringify(details, null, '  '), error => {
                            if (error) {
                                console.log("\t\tError while writing match data. Error: " + error + "");
                            }
                        });
                    }
                }
            } catch (e) {
                console.log("\t\tError while getting match details. Error: " + e + "");
            }

            console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
            mIndex++;
        }

        console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
        tourIndex++;
    }
})();


