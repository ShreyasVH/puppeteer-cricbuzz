'use strict';


const fs = require('fs');
const path = require('path');

const scriptName = path.basename(__filename);

const fileNameParts = process.argv[1].split('\/');
const fileName = fileNameParts[fileNameParts.length - 1];

const getHowstatPlayerId = async (dateOfBirth, country, name) => {
    let options = [];
    const listFilePath = path.resolve(__dirname, '../data/playerListHowstat.json');
    const playerList = JSON.parse(fs.readFileSync(listFilePath));

    for (const player of playerList) {
        if ((dateOfBirth == player.birthDate) && (country === player.country)) {
            const nameParts = name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            console.log(firstName, lastName);

            if ((player.name.indexOf(firstName) !== -1) || (player.name.indexOf(lastName) !== -1)) {
                options.push(player.id);
            }
        }
    }

    if (options.length === 1) {
        return options[0];
    } else {
        return options;
    }
};

exports.getHowstatPlayerId = getHowstatPlayerId;

if (fileName === scriptName) {
    (async () => {
        const dateOfBirth = process.argv[2];
        const country = process.argv[3];
        const name = process.argv[4];

        console.log(await getHowstatPlayerId(dateOfBirth, country, name));
    })();
}