'use strict';

const fs = require('fs');

const getTourDetails = require('./getTourDetails').getTourDetails;
const getMatchDetails = require('./getMatchDetails').getMatchDetails;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getMatchIdFromLink = require('./utils').getMatchIdFromLink;
const isGameCompleted = require('./utils').isGameCompleted;

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

                    if (isGameCompleted(match.startTime, gameType)) {
                        const matchId = getMatchIdFromLink(match.link);
                        if (matchId) {
                            const matchFilePath = 'data/matches/' + tourId + '/' + matchId + '.json';
                            let fetchMatchRequired = !fs.existsSync(matchFilePath);

                            if (fs.existsSync(matchFilePath)) {
                                try {
                                    const details = JSON.parse(fs.readFileSync(matchFilePath));
                                    fetchMatchRequired = ((details.resultText === 'There is no scorecard available for this match.') || (details.resultText === 'The scorecard will appear once the match starts.'));
                                    console.log(details.resultText);
                                } catch (e) {
                                    fetchMatchRequired = true;
                                }
                            }

                            if (fetchMatchRequired) {
                                await getMatchDetails(match.link);
                            }
                        }
                    } else {
                        console.log("\t\t\t\tMatch not yet completed");
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






