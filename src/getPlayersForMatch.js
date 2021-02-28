'use strict';

const fs = require('fs');
const path = require('path');
const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;

const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getPlayersForMatch = (tourId, matchId) => {
    let playerIds = [];

    const tourFolder = path.resolve(__dirname, '../data/matches/' + tourId);
    const matchFilePath = tourFolder + '/' + matchId + '.json';

    if (fs.existsSync(tourFolder) && fs.existsSync(matchFilePath)) {
        const details = JSON.parse(fs.readFileSync(matchFilePath));
        if (details.hasOwnProperty('players')) {
            for (const player of details.players) {
                playerIds.push(getPlayerIdFromLink(player.link));
            }
        }
    }

    return playerIds;
}
exports.getPlayersForMatch = getPlayersForMatch;

if (fileName === scriptName) {
    (async() => {
        const tourId = process.argv[2];
        const matchId = process.argv[3];

        const playerIds = getPlayersForMatch(tourId, matchId);
        fs.writeFileSync(path.resolve(__dirname, '../data/playerIdsForMatch.csv'), playerIds.join("\n"));
    })();
}
