'use strict';
const fs = require('fs');
const getTourIdFromLink = require('./utils').getTourIdFromLink;

const getTourIdsForYear = (year) => {
    let tourIds = [];
    const tourListFilePath = 'data/tourLists/' + year + '.json';
    if (fs.existsSync(tourListFilePath)) {
        const tourLists = JSON.parse(fs.readFileSync(tourListFilePath));
        for (const tour of tourLists) {
            tourIds.push(getTourIdFromLink(tour.link));
        }

        tourIds = tourIds.sort();
    }
    return tourIds;
};
exports.getTourIdsForYear = getTourIdsForYear;

(async() => {
    const year = process.argv[2];
    const tourIds = getTourIdsForYear(year);

    fs.writeFile('data/tourIds.csv', tourIds.join("\n"), error => {
        if (error) {
            console.log("\t\tError while writing match data. Error: " + error);
        }
    });
})();