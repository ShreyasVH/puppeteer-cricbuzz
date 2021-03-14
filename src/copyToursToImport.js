'use strict';

const fs = require('fs');
const path = require('path');
const getTourIdsForYear = require('./getTourIdsForYear').getTourIdsForYear;


(async () => {
    const today = new Date();
    const year = today.toLocaleString('en-GB', {timeZone: 'Asia/Kolkata', year: 'numeric'});

    const tourIds = getTourIdsForYear(year);

    const baseDir = path.resolve(__dirname, '../data');
    for (const tourId of tourIds) {
        const sourceDir = baseDir + '/matches/' + tourId;
        const destinationDir = baseDir + '/inputMatches/' + tourId;

        if (fs.existsSync(sourceDir)) {
            const matches = fs.readdirSync(sourceDir);

            if (!fs.existsSync(destinationDir)) {
                fs.mkdirSync(destinationDir);
            }

            for (const match of matches) {
                const sourceFile = sourceDir + '/' + match;
                const destinationFile = destinationDir + '/' + match;
                fs.copyFileSync(sourceFile, destinationFile);
            }
        }
    }
})();