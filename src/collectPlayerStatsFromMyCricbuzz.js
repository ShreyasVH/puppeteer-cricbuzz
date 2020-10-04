'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const axios = require('axios');

const get = async (url) => {
    const response = await axios.get(url);

    return {
        status: response.status,
        result: response.data
    };
}

const getPlayers = async () => {
    const limit = 2;
    let offset = 0;

    let players = [];

    const url = 'http://cric-api-java.herokuapp.com/cricbuzz/players/all/' + offset + '/' + limit;
    const playersBatchResponse = await get(url);
    if (200 === playersBatchResponse.status) {
        const playersBatch = playersBatchResponse.result;
        players = players.concat(playersBatch);
    }

    return players;
}

const getPlayerStats = (id) => {
    const url = 'http://cric-api-java.herokuapp.com/cricbuzz/players/' + id;

    return get(url);
}

(async() => {
    let playerStats = {};
    // const statsFilePath = 'data/playerStatsMyCricbuzz';
    // if (fs.existsSync(statsFilePath)) {
    //     playerStats = JSON.parse(fs.readFileSync(statsFilePath));
    // }

    const players = await getPlayers();
    await console.log(JSON.stringify(players, null, '  '));

    for (const player of players) {
        const statsResponse = await getPlayerStats(player.id);
        const stats = statsResponse.result;

        playerStats[player.name] = {
            battingStats: stats.battingStats,
            bowlingStats: stats.bowlingStats,
            fieldingStats: stats.bowlingStats
        };

        await fs.writeFile('data/playerStatsMyCricbuzz.json', JSON.stringify(playerStats, null, '  '), error => {
            if (error) {
                console.log("\n\t\tError while writing player stats. Error: " + error + "\n");
            }
        });
    }
})();