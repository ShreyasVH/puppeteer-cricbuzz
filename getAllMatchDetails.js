'use strict';

const fs = require('fs');

const getTourList = require('./getTourList.js').getTourList;

const getTourDetails = require('./getTourDetails').getTourDetails;

const getMatchDetails = require('./getMatchDetails').getMatchDetails;

if (process.argv.length >= 4) {
    let start = parseInt(process.argv[2], 10);
    let end = parseInt(process.argv[3], 10);

    if (isNaN(start) || isNaN(end)) {
        console.log("\nPlease provide valid start and end year\n");
    } else {
        (async() => {
            for (let year = start; year <= end; year++) {
                let details = {};
                if (year > start) {
                    console.log("\n.........................................\n");
                }
                console.log("\nProcessing year - " + year + "\n");

                let tourList = await getTourList(year);

                let tourIndex = 1;
                for (const tour of tourList) {
                    if (tourIndex > 1) {
                        break;
                        console.log("\n\t--------------------------------------------\n");
                    }
                    console.log("\n\tProcessing tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]\n");

                    details[tour.name] = {};

                    let tourDetails = await getTourDetails(tour.link);
                    details[tour.name] = {
                        startTime: tourDetails.startTime,
                        endTime: tourDetails.endTime,
                        series: {}
                    };

                    const seriesList = Object.keys(tourDetails.series);
                    let seriesIndex = 1;
                    for (const gameType of seriesList) {
                        if (seriesIndex > 1) {
                            break;
                            console.log("\n\t\t:::::::::::::::::::::::::::::::::::\n");
                        }
                        console.log("\n\t\tProcessing " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
                        const series = tourDetails.series[gameType];
                        details[tour.name].series[gameType] = {
                            startTime: series.startTime,
                            endTime: series.endTime,
                            matches: {}
                        };

                        const matchList = series.matches;
                        let matchIndex = 1;
                        for (const match of matchList) {
                            if (matchIndex > 1) {
                                break;
                                console.log("\n\t\t\t.....................................\n");
                            }
                            console.log("\n\t\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

                            details[tour.name].series[gameType].matches[match.name] = await getMatchDetails(match.link);

                            console.log("\n\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

                            matchIndex++;
                        }

                        console.log("\n\t\tProcessed " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
                        seriesIndex++;
                    }

                    console.log("\n\tProcessed tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]\n");
                    tourIndex++;
                }

                console.log("\nProcessed year - " + year + "\n");
                fs.writeFile('data/yearWiseDetails/' + year + '.json', JSON.stringify(details, null, ' '), error => {
                    if (error) {
                        console.log("\n\t\tError while writing card data. Error: " + error + "\n");
                    }
                });
            }
        })();
    }
} else {
    console.log("\nPlease provide start and end year\n");
}


