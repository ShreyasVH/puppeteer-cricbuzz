'use strict';

const fs = require('fs');
const getTourIdFromLink = require('./utils.js').getTourIdFromLink;

let missingTours = [];
let missingTourDetails = [];

const baseDirectory = 'data/matches';

const tourLists = fs.readdirSync('data/tourLists');

let tlIndex = 1;
for (const tourListFile of tourLists) {
    if (tlIndex > 1) {
        console.log('-------------------------------------');
    }

    console.log('Processing tourlist. [' + tlIndex + '/' + tourLists.length + ']');

    const tourListFilePath = 'data/tourLists/' + tourListFile;
    if (fs.existsSync(tourListFilePath)) {
        const tourList = JSON.parse(fs.readFileSync(tourListFilePath));

        let tIndex = 1;
        for (const tour of tourList) {
            if (tIndex > 1) {
                console.log('\t...................................');
            }
            console.log('\tProcessing tour. [' + tIndex + '/'  + tourList.length + ']');

            const tourId = getTourIdFromLink(tour.link);
            if (tourId) {
                if (!fs.existsSync('data/matches/' + tourId)) {
                    missingTours.push(tour);
                }

                if (!fs.existsSync('data/tourDetails/' + tourId + '.json')) {
                    missingTourDetails.push(tour);
                }
            }

            console.log('\tProcessed tour. [' + tIndex + '/'  + tourList.length + ']');


            tIndex++;
        }
    }


    console.log('Processed tourlist. [' + tlIndex + '/' + tourLists.length + ']');

    tlIndex++;
}

fs.writeFile('data/missingTours.json', JSON.stringify(missingTours, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing missing tours data. Error: " + error);
    }
});

fs.writeFile('data/missingTourDetails.json', JSON.stringify(missingTourDetails, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing missing tour detials data. Error: " + error);
    }
});