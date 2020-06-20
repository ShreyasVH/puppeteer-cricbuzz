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
                let fileName = 'data/yearWiseDetails/' + year + '.json';
                if (fs.existsSync(fileName)) {
                    details = JSON.parse(fs.readFileSync(fileName));
                }
                if (year > start) {
                    console.log("\n.........................................\n");
                }
                console.log("\nProcessing year - " + year + "\n");

                try {
                    let tourList = await getTourList(year);

                    let tourIndex = 1;
                    for (const tour of tourList) {
                        if (tourIndex > 1) {
                            // break;
                            console.log("\n\t--------------------------------------------\n");
                        }
                        console.log("\n\tProcessing tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]\n");

                        try {
                            let tourDetails = await getTourDetails(tour.link);
                            if (!details.hasOwnProperty(tour.name)) {
                                details[tour.name] = {
                                    startTime: tourDetails.startTime,
                                    endTime: tourDetails.endTime,
                                    series: {}
                                };
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
                                if (!details[tour.name].series.hasOwnProperty(gameType)) {
                                    details[tour.name].series[gameType] = {
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

                                    if (!details[tour.name].series[gameType].matches.hasOwnProperty(match.name) || (Object.keys(details[tour.name].series[gameType].matches[match.name]).length === 0)) {
                                        try {
                                            details[tour.name].series[gameType].matches[match.name] = await getMatchDetails(match.link);
                                        } catch (e) {
                                            console.log("\nError while getting match details. Exception: " + e + "\n");
                                            details[tour.name].series[gameType].matches[match.name] = {
                                                error: e
                                            };
                                        }
                                    }

                                    fs.writeFile(fileName, JSON.stringify(details, null, ' '), error => {
                                        if (error) {
                                            console.log("\n\t\tError while writing card data. Error: " + error + "\n");
                                        }
                                    });

                                    console.log("\n\t\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");
                                    matchIndex++;
                                }

                                console.log("\n\t\tProcessed " + gameType + " series [" + seriesIndex + "/" + seriesList.length + "]\n");
                                seriesIndex++;
                            }
                        } catch (e) {
                            console.log("\nError while getting tour details. Exception: " + e + "\n");
                        }

                        console.log("\n\tProcessed tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]\n");
                        tourIndex++;
                    }
                } catch (e) {
                    console.log("\nError while getting tourlist. Exception: " + e + "\n");
                }

                console.log("\nProcessed year - " + year + "\n");
            }
        })();
    }
} else {
    console.log("\nPlease provide start and end year\n");
}


