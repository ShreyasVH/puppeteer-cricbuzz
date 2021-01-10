'use strict';

const fs = require('fs');
const path = require('path');

const playerReplacementsFile = path.resolve(__dirname, '../data/playerReplacements.json');
const playerReplacements = JSON.parse(fs.readFileSync(playerReplacementsFile));

let replacements = {};
for (const [name, correctedName] of Object.entries(playerReplacements)) {
    replacements[name.toLowerCase()] = correctedName;
}

// console.log(replacements);

fs.writeFileSync(playerReplacementsFile, JSON.stringify(replacements, null, ' '));