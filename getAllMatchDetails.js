'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const getSeriesList = require('./getSeriesList.js').getSeriesList;

const getMatchList = require('./getMatchList.js').getMatchList;

const getMatchDetails = require('./getMatchDetails').getMatchDetails;

// let start = 2020;
// let date = new Date();
// let end = date.getFullYear();
let start = 1975;
let end = 1976;


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


