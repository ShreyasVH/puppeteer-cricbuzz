'use strict';

const fs = require('fs');

(() => {
    const tourDetailsDirectory = 'data/tourDetails';

    let tourDetailsList = fs.readdirSync(tourDetailsDirectory);
    let duplicates = [];

    let index = 0;
    for (const tourDetailsFile of tourDetailsList) {
        if (index > 0) {
            console.log('--------------------------------------------------');
        }
        console.log('Processing tour. [' + (index + 1) + '/' + tourDetailsList.length + ']');

        const tourDetails = JSON.parse(fs.readFileSync(tourDetailsDirectory + '/' + tourDetailsFile));
        let tourDuplicates = [];
        for (const [gameType, matchList] of Object.entries(tourDetails.series)) {
            const matchNames = [];
            for (const match of matchList.matches) {
                if (matchNames.indexOf(match.name) === -1) {
                    matchNames.push(match.name);
                } else {
                    tourDuplicates.push({
                        name: match.name,
                        link: match.link
                    });
                }
            }
        }
        if (tourDuplicates.length > 0) {
            duplicates.push({
                name: tourDetails.name,
                link: tourDetails.tourLink,
                duplicates: tourDuplicates
            });
        }

        console.log('Processed tour. [' + (index + 1) + '/' + tourDetailsList.length + ']');
        index++;
    }

    fs.writeFile('data/duplicateMatchNames.json', JSON.stringify(duplicates, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing stats. Error: " + error + "\n");
        }
    });
})();