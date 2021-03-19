'use strict';

const fs = require('fs');
const path = require('path');
const getPlayerDetails = require('./getPlayerDetailsFromCricbuzz').getPlayerDetails;
const getPlayerDetailsFromHowstat = require('./getPlayerDetailsFromHowstat').getPlayerDetailsFromHowstat;
const get = require('./api').get;
const getHowstatPlayerId = require('./getHowstatPlayerId').getHowstatPlayerId;

const endpoint = process.env.CRICBUZZ_ENDPOINT;

const getAllCountries = async () => {
    const url = endpoint + '/cricbuzz/countries';
    return get(url);
};

const getAllPlayers = async () => {
    let offset = 0;
    const count = 1000;
    let players = [];

    while (true) {
        let url = endpoint + '/cricbuzz/players/all/' + offset + '/' + count;
        const playersResponse = await get(url);
        if (playersResponse.status === 200) {
            const batchPlayers = playersResponse.result;
            players = players.concat(batchPlayers);

            if (batchPlayers.length < count) {
                break;
            }
            offset += count;
        }
    }

    return players;
};

const getCreatedPlayerDetails = async id => {
    const url = endpoint + '/cricbuzz/players/' + id;
    return get(url);
};

(async () => {
    const playerListFile = path.resolve(__dirname, '../data/playersForVerification.csv');
    const playerIds = (fs.readFileSync(playerListFile)).toString().split("\r\n");

    const allCountriesResponse = await getAllCountries();
    let existingCountries = {};
    for (const country of allCountriesResponse.result) {
        existingCountries[country.name] = country.id;
    }

    const allPlayers = await getAllPlayers();
    let existingPlayers = {};
    for (const player of allPlayers) {
        existingPlayers[player.name + '_' + player.countryId + '_' + player.dateOfBirth] = player.id;
    }

    const formattedGameTypes = {
        Test: 'TEST',
        ODI: 'ODI',
        T20I: 'T20',
        IPL: 'IPL'
    };

    const mainLineCountries = [
        'India',
        'Australia',
        'South Africa',
        'New Zealand',
        'England',
        'Pakistan',
        'Sri Lanka',
        'West Indies'
    ];

    let mismatchedPlayerStats = {};
    let mismatchedPlayerStatsAssociates = {};

    const now = (new Date()).getTime();
    let index = 0;
    for (const playerId of playerIds) {
        let mismatchedStats = [];
        if (index > 0) {
            console.log('------------------------------------------');
        }

        console.log('Processing player. [' + (index + 1) + '/' + playerIds.length + ']');

        let playerCache = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/playerCache.json')));
        let playerDetails;
        if (playerCache.hasOwnProperty(playerId) && playerCache[playerId].updated && (playerCache[playerId].updated >= (now - (3 * 24 * 3600 * 1000)))) {
            playerDetails = playerCache[playerId];
        } else {
            playerDetails = await getPlayerDetails(playerId);
        }

        const howstatPlayerId = await getHowstatPlayerId(playerDetails.birthDate, playerDetails.country, playerDetails.name);
        // // console.log(howstatPlayerId);
        let playerDetailsHowstat = {
            battingStats: {},
            bowlingStats: {}
        };
        if ('number' === typeof howstatPlayerId) {
            let playerCacheHowstat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/playerCacheHowstat.json')));
            if (playerCacheHowstat.hasOwnProperty(howstatPlayerId) && playerCacheHowstat[howstatPlayerId].updated && (playerCacheHowstat[howstatPlayerId].updated >= (now - (3 * 24 * 3600 * 1000)))) {
                playerDetailsHowstat = playerCacheHowstat[howstatPlayerId];
            } else {
                playerDetailsHowstat = await getPlayerDetailsFromHowstat(howstatPlayerId);
            }
            // console.log(playerDetailsHowstat);
        }

        const key = playerDetails.name + '_' + existingCountries[playerDetails.country] + '_' + playerDetails.birthDate;
        if (existingPlayers.hasOwnProperty(key)) {
            const createdPlayerId = existingPlayers[key];

            const createdPlayerDetailsResponse = await getCreatedPlayerDetails(createdPlayerId);
            const createdPlayerDetails = createdPlayerDetailsResponse.result;

            const country = createdPlayerDetails.country.name;
            const isAssociateCountry = (mainLineCountries.indexOf(country) === -1);

            if (playerDetails.battingStats) {
                const expectedBattingStats = playerDetails.battingStats;
                const expectedBattingStatsHowstat = playerDetailsHowstat.battingStats;
                // console.log(expectedBattingStatsHowstat);
                const actualBattingStats = createdPlayerDetails.battingStats;
                for (const [gameTypeRaw, stats] of Object.entries(expectedBattingStats)) {
                    if (stats.innings == '-') {
                        continue;
                    }

                    const gameType = formattedGameTypes[gameTypeRaw];
                    if (gameType === 'IPL') {
                        continue;
                    }

                    let gameTypeStats = {};

                    if (actualBattingStats.hasOwnProperty(gameType)) {
                        const actualStats = actualBattingStats[gameType];

                        const expectedRuns = stats.runs;
                        const expectedRunsHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].runs, 10) : 0);
                        const actualRuns = actualStats.runs;
                        if ((expectedRuns != actualRuns) && (expectedRunsHowstat != actualRuns)) {
                            gameTypeStats.runs = {
                                expectedRuns,
                                actualRuns,
                                gameType
                            };
                        }

                        const expectedInnings = stats.innings;
                        const expectedInningsHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].innings, 10) : 0);
                        const actualInnings = actualStats.innings;
                        if ((expectedInnings != actualInnings) && (expectedInningsHowstat != actualInnings)) {
                            gameTypeStats.innings = {
                                expectedInnings,
                                actualInnings,
                                gameType
                            };
                        }

                        // const expectedNotOuts = stats.notOuts;
                        // const actualNotOuts = actualStats.notOuts;
                        // if (expectedNotOuts != actualNotOuts) {
                        //     gameTypeStats.notOuts = {
                        //         expectedNotOuts,
                        //         actualNotOuts,
                        //         gameType
                        //     };
                        // }

                        const expectedBalls = stats.balls;
                        const expectedBallsHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].balls, 10) : 0);
                        const actualBalls = actualStats.balls;
                        if ((expectedBalls != actualBalls) && (expectedBallsHowstat != actualBalls)) {
                            gameTypeStats.balls = {
                                expectedBalls,
                                actualBalls,
                                gameType
                            };
                        }

                        const expectedFours = stats.fours;
                        const expectedFoursHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].fours, 10) : 0);
                        const actualFours = actualStats.fours;
                        if ((expectedFours != actualFours) && (expectedFoursHowstat != actualFours)) {
                            gameTypeStats.fours = {
                                expectedFours,
                                actualFours,
                                gameType
                            };
                        }

                        const expectedSixes = stats.sixes;
                        const expectedSixesHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].sixes, 10) : 0);
                        const actualSixes = actualStats.sixes;
                        if ((expectedSixes != actualSixes) && (expectedSixesHowstat != actualSixes)) {
                            gameTypeStats.sixes = {
                                expectedSixes,
                                actualSixes,
                                gameType
                            };
                        }

                        const expectedHighest = stats.highest;
                        const expectedHighestHowstat = ((expectedBattingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBattingStatsHowstat[gameType].highest, 10) : 0);
                        const actualHighest = actualStats.highest;
                        if ((expectedHighest != actualHighest) && (expectedHighestHowstat != actualHighest)) {
                            gameTypeStats.highest = {
                                expectedHighest,
                                actualHighest,
                                gameType
                            };
                        }
                    } else {
                        gameTypeStats.missingGameType = {
                            gameType
                        };
                    }

                    if (Object.keys(gameTypeStats).length > 0) {
                        mismatchedStats.push(gameTypeStats);
                    }
                }
            }

            if (playerDetails.bowlingStats) {
                const expectedBowlingStats = playerDetails.bowlingStats;
                const expectedBowlingStatsHowstat = playerDetailsHowstat.bowlingStats;
                const actualBowlingStats = createdPlayerDetails.bowlingStats;
                for (const [gameTypeRaw, stats] of Object.entries(expectedBowlingStats)) {
                    const gameType = formattedGameTypes[gameTypeRaw];
                    if (stats.innings == '-') {
                        continue;
                    }

                    if (gameType === 'IPL') {
                        continue;
                    }



                    let gameTypeStats = {};

                    if (actualBowlingStats.hasOwnProperty(gameType)) {
                        const actualStats = actualBowlingStats[gameType];

                        const expectedRuns = stats.runs;
                        const expectedRunsHowstat = ((expectedBowlingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBowlingStatsHowstat[gameType].runs, 10) : 0);
                        const actualRuns = actualStats.runs;
                        if ((expectedRuns != actualRuns) && (expectedRunsHowstat != actualRuns)) {
                            gameTypeStats.runsBowl = {
                                expectedRuns,
                                actualRuns,
                                gameType
                            };
                        }

                        // const expectedInnings = stats.innings;
                        // const actualInnings = actualStats.innings;
                        // if (expectedInnings != actualInnings) {
                        //     gameTypeStats.inningsBowl = {
                        //         expectedInnings,
                        //         actualInnings,
                        //         gameType
                        //     };
                        // }

                        const expectedWickets = stats.wickets;
                        const expectedWicketsHowstat = ((expectedBowlingStatsHowstat.hasOwnProperty(gameType)) ? parseInt(expectedBowlingStatsHowstat[gameType].wickets, 10) : 0);
                        const actualWickets = actualStats.wickets;
                        if ((expectedWickets != actualWickets) && (expectedWicketsHowstat != actualWickets)) {
                            gameTypeStats.wickets = {
                                expectedWickets,
                                actualWickets,
                                gameType
                            };
                        }

                        // const expectedBalls = stats.balls;
                        // const actualBalls = actualStats.balls;
                        // if (expectedBalls != actualBalls) {
                        //     gameTypeStats.ballsBowl = {
                        //         expectedBalls,
                        //         actualBalls,
                        //         gameType
                        //     };
                        // }
                    }  else {
                        gameTypeStats.missingGameType = {
                            gameType
                        };
                    }

                    if (Object.keys(gameTypeStats).length > 0) {
                        mismatchedStats.push(gameTypeStats);
                    }
                }
            }

            if (mismatchedStats.length > 0) {
                if (isAssociateCountry) {
                    mismatchedPlayerStatsAssociates[playerId] = {
                        name: playerDetails.name,
                        createdPlayerId,
                        howstatPlayerId,
                        country,
                        mismatchedStats
                    };
                } else {
                    mismatchedPlayerStats[playerId] = {
                        name: playerDetails.name,
                        createdPlayerId,
                        howstatPlayerId,
                        country,
                        mismatchedStats
                    };
                }
            }
        }

        console.log('Processed player. [' + (index + 1) + '/' + playerIds.length + ']');

        index++;
    }

    fs.writeFileSync(path.resolve(__dirname, '../data/mismatchedPlayerStats.json'), JSON.stringify(mismatchedPlayerStats, null, ' '));
    fs.writeFileSync(path.resolve(__dirname, '../data/mismatchedPlayerStatsAssociates.json'), JSON.stringify(mismatchedPlayerStatsAssociates, null, ' '));
})();