'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const baseDirectory = 'data/yearWiseDetails';

let years = fs.readdirSync(baseDirectory);

years = years.filter(file => file.match(/[0-9]{4}/));

let missingMatches = {};

let index = 1;
for (let year of years) {
    if (index > 1) {
        console.log("\n------------------------------------------------------------\n");

        // if (index > 2) {
        //     break;
        // }
    }

    console.log("\nProcessing Year: " + year + ". [" + index + "/" + years.length + "]\n");

    const yearFolder = baseDirectory + '/' + year;
    if (fs.existsSync(yearFolder + '/tours')) {
        const tours = fs.readdirSync(yearFolder + '/tours');

        let tourIndex = 1;
        for (const tour of tours) {
            if (tourIndex > 1) {
                console.log('\n\t................................\n');
            }
            console.log('\n\tProcessing tour. [' + tourIndex + '/' + tours.length + ']\n');
            const tourFolder = yearFolder + '/tours/' + tour;

            let createdMatches = [];
            if (fs.existsSync(tourFolder + '/series')) {
                const gameTypes = fs.readdirSync(tourFolder + '/series');

                let gIndex = 1;
                for (const gameType of gameTypes) {
                    const gameTypeFolder = tourFolder + '/series/' + gameType;

                    const matches = fs.readdirSync(gameTypeFolder);
                    for (const match of matches) {
                        const matchFile = gameTypeFolder + '/' + match;
                        let details = {};

                        try {
                            details = JSON.parse(fs.readFileSync(matchFile));
                        } catch (e) {
                            console.log("\nError while getting match details. Error: " + e + "\n");
                        }

                        if (details.hasOwnProperty('stadium') && details.stadium.hasOwnProperty('name')) {
                            createdMatches.push(gameType + '_' + match.replace('.json', ''));
                        } else {
                            console.log("\nDid not find complete match details. Name: " + match + "\n");
                        }

                        const previousYearString = String(year - 1);
                        if (missingMatches.hasOwnProperty(previousYearString) && missingMatches[previousYearString].hasOwnProperty(tour) && missingMatches[previousYearString][tour].hasOwnProperty(gameType) && (-1 !== missingMatches[previousYearString][tour][gameType].indexOf(match.replace('.json', '')))) {
                            const index = missingMatches[previousYearString][tour][gameType].indexOf(match.replace('.json', ''));
                            missingMatches[previousYearString][tour][gameType].splice(index, 1);
                        }
                    }

                    gIndex++;
                }

                // console.log(JSON.stringify(missingMatches, null, '  '));
                // fs.writeFile('data/missingMatches.json', JSON.stringify(missingMatches, null, '  '), error => {
                //     if (error) {
                //         console.log("\n\t\tError while writing missing matches data. Error: " + error + "\n");
                //     }
                // });
            } else {
                console.log('\n\t\tSeries folder not found\n');
                console.log('\n\t\t' + tour + '\n');
            }

            if (fs.existsSync(tourFolder + '/details.json')) {
                const tourDetails = JSON.parse(fs.readFileSync(tourFolder + '/details.json'));

                const series = tourDetails.series;
                for (const gameType of Object.keys(series)) {
                    const gameTypeMatches = series[gameType].matches;

                    for(const match of gameTypeMatches) {
                        if (createdMatches.indexOf(gameType + '_' + match.name.toLowerCase()) === -1) {
                            if (!missingMatches.hasOwnProperty(year)) {
                                missingMatches[year] = {};
                            }

                            if (!missingMatches[year].hasOwnProperty(tour)) {
                                missingMatches[year][tour] = {};
                            }

                            if (!missingMatches[year][tour].hasOwnProperty(gameType)) {
                                missingMatches[year][tour][gameType] = [];
                            }

                            missingMatches[year][tour][gameType].push(match.name.toLowerCase());
                        }
                    }
                }
            } else {
                console.log('\n\t\tNo Tour details file\n');
                console.log('\n\t\t' + tour + '\n');
            }

            console.log('\n\tProcessed tour. [' + tourIndex + '/' + tours.length + ']\n');
            tourIndex++;
        }
    } else {
        console.log("\n\tTours folder not found\n");
    }
    console.log("\nProcessed Year: " + year + ". [" + index + "/" + years.length + "]\n");
    index++;
}



// console.log(JSON.stringify(missingMatches, null, '  '));
fs.writeFile('data/missingMatches.json', JSON.stringify(missingMatches, null, '  '), error => {
    if (error) {
        console.log("\n\t\tError while writing missing matches data. Error: " + error + "\n");
    }
});


