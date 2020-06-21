'use strict';

const fs = require('fs');

const getTourDetails = require('./getTourDetails').getTourDetails;

const getMatchDetails = require('./getMatchDetails').getMatchDetails;

const path = require('path');
const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getMatchesForTour = async (tourUrl) => {
    let details = {
        series: {}
    };
    let tourDetails = await getTourDetails(tourUrl);
    details.startTime = tourDetails.startTime;
    details.endTime = tourDetails.endTime;

    const seriesList = Object.keys(tourDetails.series);
    let seriesIndex = 1;
    for (const gameType of seriesList) {
        if (seriesIndex > 1) {
            // break;
            console.log("\n\t\t:::::::::::::::::::::::::::::::::::\n");
        }
        console.log("\n\t\tProcessing " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
        const series = tourDetails.series[gameType];
        if (!details.series.hasOwnProperty(gameType)) {
            details.series[gameType] = {
                startTime: series.startTime,
                endTime: series.endTime,
                matches: {}
            };
        }

        const matchList = series.matches;
        let matchIndex = 1;
        for (const match of matchList) {
            if (matchIndex > 1) {
                // break;
                console.log("\n\t\t\t.....................................\n");
            }
            console.log("\n\t\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

            try {
                details.series[gameType].matches[match.name] = await getMatchDetails(match.link);
            } catch (e) {
                console.log("\nError while getting match details. Exception: " + e + "\n");
                details.series[gameType].matches[match.name] = {
                    error: e,
                    match
                };
            }

            console.log("\n\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");
            matchIndex++;
        }

        console.log("\n\t\tProcessed " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
        seriesIndex++;
    }

    return details;
}
exports.getMatchesForTour = getMatchesForTour;

if (fileName === scriptName) {
    (async() => {
        const tourUrl = process.argv[2];
        const tourMatches = await getMatchesForTour(tourUrl);

        fs.writeFile('data/tourDetails.json', JSON.stringify(tourMatches, null, '  '), error => {
            if (error) {
                console.log("\n\t\tError while writing card data. Error: " + error + "\n");
            }
        });
    })();
}






