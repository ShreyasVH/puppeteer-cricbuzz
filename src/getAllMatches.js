'use strict';

const fs = require('fs');

const getTourList = require('./getTourList.js').getTourList;
const getMatchesForTour = require('./getTourMatches.js').getMatchesForTour;

if (process.argv.length >= 4) {
    let start = parseInt(process.argv[2], 10);
    let end = parseInt(process.argv[3], 10);

    if (isNaN(start) || isNaN(end)) {
        console.log("Please provide valid start and end year");
    } else {
        (async() => {
            for (let year = start; year <= end; year++) {
                let details = {};
                if (year > start) {
                    console.log(".........................................");
                }
                console.log("Processing year - " + year);

                try {
                    let tourList = [];
                    const tourListFilePath = 'data/tourLists/' + year + '.json';
                    if (fs.existsSync(tourListFilePath)) {
                        tourList = JSON.parse(fs.readFileSync(tourListFilePath));
                    } else {
                        tourList = await getTourList(year);
                    }

                    let tourIndex = 1;
                    for (const tour of tourList) {
                        if (tourIndex > 1) {
                            // break;
                            console.log("\t--------------------------------------------");
                        }
                        console.log("\tProcessing tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]");

                        try {
                            await getMatchesForTour(tour.link);
                        } catch (e) {
                            console.log("Error while getting tour details. Exception: " + e + "");
                        }

                        console.log("\tProcessed tour - " + tour.name + " [" + tourIndex + "/" + tourList.length + "]");
                        tourIndex++;
                    }
                } catch (e) {
                    console.log("Error while getting tourlist. Exception: " + e);
                }

                console.log("Processed year - " + year);
            }
        })();
    }
} else {
    console.log("Please provide start and end year");
}


