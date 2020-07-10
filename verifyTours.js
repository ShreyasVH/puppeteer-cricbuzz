'use strict';

const fs = require('fs');

const baseDirectory = 'data/yearWiseDetails';

let years = fs.readdirSync(baseDirectory);

years = years.filter(file => file.match(/[0-9]{4}/));

let missingTours = {};
let index = 1;
for (let year of years) {
    if (index > 1) {
        console.log("\n------------------------------------------------------------\n");
    }

    console.log("\nProcessing Year: " + year + ". [" + index + "/" + years.length + "]\n");

    if (!missingTours.hasOwnProperty(year)) {
        missingTours[year] = [];
    }
    const yearFolder = baseDirectory + '/' + year;
    if (fs.existsSync(yearFolder + '/tourList.json')) {
        const tourList = JSON.parse(fs.readFileSync(yearFolder + '/tourList.json'));

        if (fs.existsSync(yearFolder + '/tours')) {
            const tours = fs.readdirSync(yearFolder + '/tours');

            for (const tour of tourList) {
                if (tours.indexOf(tour.name) === -1) {
                    missingTours[year].push(tour);
                }
            }
        } else {
            console.log("\n\tTours folder not found\n");
        }
    } else {
        console.log("\nTourList file not found\n");
    }
    console.log("\nProcessed Year: " + year + ". [" + index + "/" + years.length + "]\n");
    index++;
}

fs.writeFile('data/missingTours.json', JSON.stringify(missingTours, null, '  '), error => {
    if (error) {
        console.log("\n\t\tError while writing missing tours data. Error: " + error + "\n");
    }
});