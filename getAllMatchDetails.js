'use strict';

const fs = require('fs');

const getTourList = require('./getTourList.js').getTourList;

const getMatchesForTour = require('./getAllMatchDetailsForTour.js').getMatchesForTour;

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

                        if (!details.hasOwnProperty(tour.name)) {
                            details[tour.name] = {
                                series: {}
                            };
                        }

                        try {
                            let tourDetails = await getMatchesForTour(tour.link, details[tour.name]);
                            details[tour.name] = tourDetails;
                        } catch (e) {
                            console.log("\nError while getting tour details. Exception: " + e + "\n");
                        }

                        fs.writeFile(fileName, JSON.stringify(details, null, ' '), error => {
                            if (error) {
                                console.log("\n\t\tError while writing card data. Error: " + error + "\n");
                            }
                        });

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


