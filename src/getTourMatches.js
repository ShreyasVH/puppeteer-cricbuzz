'use strict';

const fs = require('fs');

const getTourDetails = require('./getTourDetails').getTourDetails;
const getMatchDetails = require('./getMatchDetails').getMatchDetails;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getMatchIdFromLink = require('./utils').getMatchIdFromLink;

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchesForTour = async (tourUrl) => {
    try {
        const tourId = getTourIdFromLink(tourUrl);
        if (tourId) {
            let tourDetails;
            const tourDetailsFilePath = 'data/tourDetails/' + tourId + '.json';
            if (fs.existsSync(tourDetailsFilePath)) {
                tourDetails = JSON.parse(fs.readFileSync(tourDetailsFilePath));
            } else {
                tourDetails = await getTourDetails(tourUrl);
            }

            const seriesList = Object.keys(tourDetails.series);
            let seriesIndex = 1;
            for (const gameType of seriesList) {
                if (seriesIndex > 1) {
                    // break;
                    console.log("\t\t:::::::::::::::::::::::::::::::::::");
                }
                console.log("\t\tProcessing " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]");
                const series = tourDetails.series[gameType];

                const matchList = series.matches;
                let matchIndex = 1;
                for (const match of matchList) {
                    if (matchIndex > 1) {
                        // break;
                        console.log("\t\t\t.....................................");
                    }
                    console.log("\t\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]");

                    const matchId = getMatchIdFromLink(match.link);
                    if (matchId) {
                        const matchFilePath = 'data/matches/' + tourId + '/' + matchId + '.json';
                        if (!fs.existsSync(matchFilePath)) {
                            await getMatchDetails(match.link);
                        }
                    }

                    console.log("\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]");
                    matchIndex++;

                }

                console.log("\t\tProcessed " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]");
                seriesIndex++;
            }
        }
    } catch (e) {
        console.log(e);
    }
};

exports.getMatchesForTour = getMatchesForTour;

if (fileName === scriptName) {
    (async() => {
        const tourUrl = process.argv[2];
        await getMatchesForTour(tourUrl);
    })();
}






