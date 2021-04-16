'use strict';

const fs = require('fs');
const path = require('path');

(async () => {
    const cachePath = path.resolve(__dirname, '../data/playerCache.json');
    let updatePlayerCache = {};
    const playerCache = JSON.parse(fs.readFileSync(cachePath));
    let count = 0;

    for (const playerId in playerCache) {
        const details = playerCache[playerId];

        const dob = new Date(details.birthDate);
        const hours = parseInt(dob.toLocaleString('en-GB', {timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false}), 10);
        const minutes = parseInt(dob.toLocaleString(undefined, {timeZone: 'Asia/Kolkata', minute: '2-digit'}));
        const seconds = parseInt(dob.toLocaleString(undefined, {timeZone: 'Asia/Kolkata', second: '2-digit'}));

        if ((hours === 0) && (minutes === 0) && (seconds === 0)) {
            updatePlayerCache[playerId] = details;
        } else {
            console.log(details.birthDate);
            console.log(dob.getHours(), dob.getMinutes(), dob.getSeconds());
            console.log(details.name);

            // let newDOB = dob;

            count++;
            console.log('----------------');
        }
    }
    console.log('Count: ' + count);
    fs.writeFileSync(cachePath, JSON.stringify(updatePlayerCache, null, ' '));
})();