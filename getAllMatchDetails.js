'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getSeriesList = require('./getSeriesList.js').getSeriesList;

const getMatchList = require('./getMatchList.js').getMatchList;

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

                let seriesList = await getSeriesList(year);

                let seriesIndex = 1;
                for (const series of seriesList) {
                    if (seriesIndex > 1) {
                        break;
                        console.log("\n\t--------------------------------------------\n");
                    }
                    details[series.name] = {};
                    console.log("\n\tProcessing series - " + series.name + " [" + seriesIndex + "/" + seriesList.length + "]\n");
                    let matchList = await getMatchList(series.link);

                    let matchIndex = 1;
                    for (const match of matchList) {
                        if (matchIndex > 1) {
                            break;
                            console.log("\n\t\t.....................................\n");
                        }
                        console.log("\n\t\tProcessing match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

                        details[series.name][match.name] = await getMatchDetails(match.link);

                        console.log("\n\t\tProcessed match. " + match.name + " [" + matchIndex + "/" + matchList.length + "]\n");

                        matchIndex++;
                    }

                    console.log("\n\tProcessed series - " + series.name + " [" + seriesIndex + "/" + seriesList.length + "]\n");
                    seriesIndex++;
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


