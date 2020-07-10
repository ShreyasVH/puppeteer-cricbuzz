'use strict';

const fs = require('fs');

const getTourDetails = require('./getTourDetails').getTourDetails;

const getMatchDetails = require('./getMatchDetails').getMatchDetails;

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchesForTour = async (tourUrl, year, tourName) => {
    let tourDetails;
    if (year && tourName && fs.existsSync('data/yearWiseDetails/' + year + '/tours/' + tourName + '/details.json')) {
        tourDetails = JSON.parse(fs.readFileSync('data/yearWiseDetails/' + year + '/tours/' + tourName + '/details.json'));
    } else {
        tourDetails = await getTourDetails(tourUrl);
        year = tourDetails.year;
        tourName = tourDetails.name;
    }

    const seriesList = Object.keys(tourDetails.series);
    let seriesIndex = 1;
    for (const gameType of seriesList) {
        if (seriesIndex > 1) {
            // break;
            console.log("\n\t\t:::::::::::::::::::::::::::::::::::\n");
        }
        console.log("\n\t\tProcessing " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
        const series = tourDetails.series[gameType];

        const matchList = series.matches;
        let matchIndex = 1;
        for (const match of matchList) {
            if (matchIndex > 1) {
                // break;
                console.log("\n\t\t\t.....................................\n");
            }
            console.log("\n\t\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

            if (year && tourName && fs.existsSync('data/yearWiseDetails/' + year + '/tours/' + tourName + '/series/' + gameType + '/' + match.name.toLowerCase() + '.json')) {
                //ignore
            } else {
                try {
                    await getMatchDetails(match.link);
                } catch (e) {
                    console.log("\nError while getting match details. Exception: " + e + "\n");
                }
            }

            console.log("\n\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");
            matchIndex++;
        }

        console.log("\n\t\tProcessed " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
        seriesIndex++;
    }
}
exports.getMatchesForTour = getMatchesForTour;

if (fileName === scriptName) {
    (async() => {
        const tourUrl = process.argv[2];
        await getMatchesForTour(tourUrl, null, null);
    })();
}






