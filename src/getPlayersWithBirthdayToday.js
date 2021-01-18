'use strict';

const fs = require('fs');
const path = require('path');

const playerCacheFilePath = path.resolve(__dirname, '../data/playerCache.json');
const playerCache = JSON.parse(fs.readFileSync(playerCacheFilePath));

const today = new Date();
const date = today.getDate();
const month = today.getMonth();

let playerIds = [];

for (const [playerId, details] of Object.entries(playerCache)) {
    const dateOfBirth = new Date(details.birthDate);
    const birthDate = dateOfBirth.getDate();
    const birthMonth = dateOfBirth.getMonth();
    if ((birthDate === date) && (birthMonth === month)) {
        playerIds.push(playerId);
    }
}

fs.writeFileSync(path.resolve(__dirname, '../data/playerIdsForBirthDate.csv'), playerIds.join("\n"));