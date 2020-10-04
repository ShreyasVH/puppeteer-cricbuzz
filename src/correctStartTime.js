'use strict';

const fs = require('fs');

const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;
const gePlayerDetails = require('./getPlayerDetailsFromCricbuzz').gePlayerDetails;
const getBallsFromOversText = require('./utils').getBallsFromOversText;
const getPlayer = require('./utils').getPlayer;
const write = require('./sheets').write;

(async() => {
    const sheetId = '1vJ9HQOrXTfgD-1c4TdTXv8QTpIhJk5MwIXFkKJEmWRw';
    const baseDirectory = 'data/matches';

    const playerCacheFilePath = 'data/playerCache.json';
    let playerCache = JSON.parse(fs.readFileSync(playerCacheFilePath));

    let playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));

    let stats = {};

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
                    matchStartTimeMap[gameType][match.name] = match.startTime;
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
                const name = details.name;
                const gameType = details.gameType;
                if (matchStartTimeMap.hasOwnProperty(gameType) && matchStartTimeMap[gameType].hasOwnProperty(name)) {
                    if (details.startTime !== matchStartTimeMap[gameType][name]) {
                        const startTime = matchStartTimeMap[gameType][name];
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


