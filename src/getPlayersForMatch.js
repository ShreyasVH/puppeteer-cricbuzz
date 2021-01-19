'use strict';

const fs = require('fs');
const path = require('path');
const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;


let playerIds = [];

const tourId = process.argv[2];
const matchId = process.argv[3];

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

fs.writeFileSync(path.resolve(__dirname, '../data/playerIdsForMatch.csv'), playerIds.join("\n"));