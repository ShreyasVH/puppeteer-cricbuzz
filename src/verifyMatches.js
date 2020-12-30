'use strict';

const fs = require('fs');

const verifyMatchDetails = require('./verifyMatchDetails').verifyMatchDetails;
const getMatchIdFromLink = require('./utils').getMatchIdFromLink;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const isGameCompleted = require('./utils').isGameCompleted;

const tourDetailsDirectory = 'data/tourDetails';
let tourDetailsList = fs.readdirSync(tourDetailsDirectory);

let missingMatches = [];
let errorData = [];

(async() => {

    let tourIndex = 1;
    for (const tourDetailsFile of tourDetailsList) {
        if (tourIndex > 1) {
            // break;
            console.log('\t-------------------------------------');
        }

        console.log('\tProcessing tour. [' + tourIndex + '/' + tourDetailsList.length + ']');

        const tourDetails = JSON.parse(fs.readFileSync(tourDetailsDirectory + '/' + tourDetailsFile));
        const tourId = getTourIdFromLink(tourDetails.tourLink);
        if (tourId) {
            const series = tourDetails.series;

            let gIndex = 1;
            for (const [gameType, gameTypeMatches] of Object.entries(series)) {
                if (gIndex > 1) {
                    console.log('\t\t................................');
                }

                console.log('\t\tProcessing gameType. [' + gIndex + '/' + Object.keys(series).length + ']');

                const matches = gameTypeMatches.matches;
                let mIndex = 1;
                for (const match of matches) {
                    if (mIndex > 1) {
                        // if (mIndex > 3) {
                        //     break;
                        // }
                        console.log('\t\t\t--------------------------');
                    }
                    console.log('\t\t\tProcessing match. [' + mIndex + '/' + matches.length + ']');

                    if (isGameCompleted(match.startTime, gameType)) {
                        const matchId = getMatchIdFromLink(match.link);
                        if (matchId) {
                            const tourFolder = 'data/matches/' + tourId;
                            const matchFile = tourFolder + '/' + matchId + '.json';
                            if (fs.existsSync(tourFolder) && fs.existsSync(matchFile)) {
                                try {
                                    const details = JSON.parse(fs.readFileSync(matchFile));
                                    console.log('\t\t\t\tVerifying match details');
                                    let errors = await verifyMatchDetails(details);
                                    // console.log(JSON.stringify(errors));
                                    const errorDataFile = 'data/matchErrors.json';

                                    if(errors.length > 0) {
                                        errorData.push({
                                            tourId,
                                            tourName: tourDetails.name,
                                            tourLink: tourDetails.tourLink,
                                            gameType,
                                            matchId,
                                            matchName: match.name,
                                            matchLink: match.link,
                                            errors
                                        });
                                    }

                                    fs.writeFileSync(errorDataFile, JSON.stringify(errorData, null, '  '), error => {
                                        if (error) {
                                            console.log("\t\tError while writing match errors. Error: " + error);
                                        }
                                    });

                                    console.log('\t\t\t\tVerified match details');
                                } catch (e) {
                                    console.log("Tour: " + tourId);
                                    console.log("Match: " + matchId);
                                    console.log("Error while getting match details. Error: " + e + "");
                                }
                            } else {
                                missingMatches.push({
                                    tourId,
                                    tourName: tourDetails.name,
                                    tourLink: tourDetails.tourLink,
                                    gameType,
                                    matchId,
                                    matchName: match.name,
                                    matchLink: match.link
                                });
                            }
                        }
                    }

                    console.log('\t\t\tProcessed match. [' + mIndex + '/' + matches.length + ']');
                    mIndex++;
                }

                console.log('\t\tProcessed gameType. [' + gIndex + '/' + Object.keys(series).length + ']');
                gIndex++;
            }
        }

        console.log('\tProcessed tour. [' + tourIndex + '/' + tourDetailsList.length + ']');
        tourIndex++;
    }

// console.log(JSON.stringify(missingMatches, null, '  '));
    fs.writeFile('data/missingMatches.json', JSON.stringify(missingMatches, null, '  '), error => {
        if (error) {
            console.log("\t\tError while writing missing matches data. Error: " + error + "");
        }
    });

})();


