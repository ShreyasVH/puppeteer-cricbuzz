'use strict';

const fs = require('fs');
const path = require('path');
const getTourList = require('./getTourList').getTourList;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getMatchIdFromLink = require('./utils').getMatchIdFromLink;
const getPlayersForMatch = require('./getPlayersForMatch').getPlayersForMatch;

(async () => {
    let playerIds = [];

    const today = new Date();
    let tourList = await getTourList(today.getFullYear());

    if (today.getMonth() === 0) {
        tourList = await tourList.concat(getTourList(today.getFullYear() - 1));
    }

    for (const tour of tourList) {
        const tourId = getTourIdFromLink(tour.link);

        const tourDetailsFilePath = path.resolve(__dirname, '../data/tourDetails/' + tourId + '.json');

        if (fs.existsSync(tourDetailsFilePath)) {
            const tourDetails = JSON.parse(fs.readFileSync(tourDetailsFilePath));
            const seriesList = Object.keys(tourDetails.series);
            let seriesIndex = 1;
            for (const gameType of seriesList) {
                if (seriesIndex > 1) {
                    // break;
                    // console.log("\n\t\t:::::::::::::::::::::::::::::::::::\n");
                }
                // console.log("\n\t\tProcessing " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
                const series = tourDetails.series[gameType];

                const matchList = series.matches;
                let matchIndex = 1;
                for (const match of matchList) {
                    if (matchIndex > 1) {
                        // break;
                        // console.log("\n\t\t\t.....................................\n");
                    }
                    // console.log("\n\t\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

                    const matchId = getMatchIdFromLink(match.link);
                    if (match.startTime >= (today.getTime() - (30 * 24 * 3600 * 1000))) {
                        playerIds = playerIds.concat(getPlayersForMatch(tourId, matchId));
                    }

                    // console.log("\n\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");
                    matchIndex++;
                }

                seriesIndex++;
            }
        }
    }

    fs.writeFileSync(path.resolve(__dirname, '../data/activePlayerIds.csv'), playerIds.join("\n"));
})();