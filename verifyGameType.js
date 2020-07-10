'use strict';

const fs = require('fs');

const baseDirectory = 'data/yearWiseDetails';

let years = fs.readdirSync(baseDirectory);

years = years.filter(file => file.match(/[0-9]{4}/));

let stats = {};
let index = 1;
for (let year of years) {
    if (index > 1) {
        console.log("\n------------------------------------------------------------\n");
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

            if (fs.existsSync(tourFolder + '/series')) {
                const gameTypes = fs.readdirSync(tourFolder + '/series');

                let gIndex = 1;
                for (const gameType of gameTypes) {
                    if ('ODI' === gameType) {
                        const gameTypeFolder = tourFolder + '/series/' + gameType;

                        const matches = fs.readdirSync(gameTypeFolder);
                        for (const match of matches) {
                            const matchFile = gameTypeFolder + '/' + match;
                            const details = JSON.parse(fs.readFileSync(matchFile));
                            if (details.name.indexOf('ODI') === -1) {

                                if (!stats.hasOwnProperty(year)) {
                                    stats[year] = {};
                                }

                                if (!stats[year].hasOwnProperty(tour)) {
                                    stats[year][tour] = [];
                                }

                                stats[year][tour].push(details.name);
                            }
                        }
                    }

                    gIndex++;
                }
            } else {
                console.log('\n\tSeries folder not found\n');
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

fs.writeFile('data/gameTypeStats.json', JSON.stringify(stats, null, '  '), error => {
    if (error) {
        console.log("\n\t\tError while writing missing gametype data. Error: " + error + "\n");
    }
});