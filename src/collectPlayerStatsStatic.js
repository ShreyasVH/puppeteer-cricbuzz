'use strict';

const fs = require('fs');

const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;
const gePlayerDetails = require('./getPlayerDetailsFromCricbuzz').gePlayerDetails;
const getBallsFromOversText = require('./utils').getBallsFromOversText;
const getPlayer = require('./utils').getPlayer;
const write = require('./sheets').write;

(async() => {
    const sheetId = '1vJ9HQOrXTfgD-1c4TdTXv8QTpIhJk5MwIXFkKJEmWRw';
    const baseDirectory = 'data/matches';

    const playerCacheFilePath = 'data/playerCache.json';
    let playerCache = JSON.parse(fs.readFileSync(playerCacheFilePath));

    let playerReplacements = JSON.parse(fs.readFileSync('data/playerReplacements.json'));

    let stats = {};

    const tours = fs.readdirSync(baseDirectory);

    let tourIndex = 1;
    for (const tourId of tours) {
        // if (tourIndex > 1) {
        //     break;
        // }

        if (tourIndex > 1) {
            console.log('................................');
        }
        console.log('Processing tour. [' + tourIndex + '/' + tours.length + ']');
        const tourFolder = baseDirectory + '/' + tourId;

        const matches = fs.readdirSync(tourFolder);
        let mIndex = 1;
        for (const matchId of matches) {
            // if (mIndex > 1) {
            //     break;
            // }
            if (mIndex > 1) {
                console.log('\t------------------------------');
            }

            console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

            const matchFile = tourFolder + '/' + matchId;

            try {
                const details = JSON.parse(fs.readFileSync(matchFile));

                if (Object.keys(details).length > 0) {
                    const gameType = details.gameType;
                    if (details.players) {
                        for (const player of details.players) {
                            const playerId = parseInt(getPlayerIdFromLink(player.link), 10);

                            let playerDetails = {};
                            if (playerCache.hasOwnProperty(playerId)) {
                                playerDetails = playerCache[playerId];
                            } else {
                                console.log('\t\t\tFetching player details. ' + playerId);
                                playerDetails = await gePlayerDetails(playerId);
                                playerCache[playerId] = playerDetails;
                            }

                            if (playerId) {
                                if (!stats.hasOwnProperty(playerId)) {
                                    stats[playerId] = {
                                        name: playerDetails.name,
                                        batting: {},
                                        bowling: {},
                                        fielding: {}
                                    };
                                }

                                if (!stats[playerId].batting.hasOwnProperty(gameType)) {
                                    stats[playerId].batting[gameType] = {
                                        runs: 0,
                                        matches: 0,
                                        innings: 0,
                                        balls: 0,
                                        sixes: 0,
                                        fours: 0
                                    };
                                }

                                stats[playerId].batting[gameType].matches++;

                                if (!stats[playerId].bowling.hasOwnProperty(gameType)) {
                                    stats[playerId].bowling[gameType] = {
                                        runs: 0,
                                        matches: 0,
                                        innings: 0,
                                        balls: 0,
                                        wickets: 0,
                                        maidens: 0
                                    };
                                }

                                stats[playerId].bowling[gameType].matches++;

                                if (!stats[playerId].fielding.hasOwnProperty(gameType)) {
                                    stats[playerId].fielding[gameType] = {
                                        catches: 0,
                                        stumpings: 0,
                                        runouts: 0
                                    };
                                }
                            }
                        }
                    }

                    if (details.battingScores) {
                        for (const score of details.battingScores) {
                            const playerId = getPlayerIdFromLink(score.playerLink);

                            stats[playerId].batting[gameType].runs += score.runs;
                            stats[playerId].batting[gameType].balls += score.balls;
                            stats[playerId].batting[gameType].sixes += score.sixes;
                            stats[playerId].batting[gameType].fours += score.fours;
                            stats[playerId].batting[gameType].innings++;

                            const bowlingTeam = ((details.team1 === score.team) ? details.team2 : ((details.team2 === score.team) ? details.team1 : ''));

                            if (score.fielders) {
                                const fielders = score.fielders.split(', ');
                                for (const fielder of fielders) {
                                    const playerResponse = getPlayer(fielder, bowlingTeam, details.players, playerReplacements);
                                    if (playerResponse.link) {
                                        let fielderId = getPlayerIdFromLink(playerResponse.link);
                                        if (fielderId) {
                                            if (score.dismissalMode === 'Run Out') {
                                                stats[fielderId].fielding[gameType].runouts++;
                                            } else if (score.dismissalMode === 'Caught') {
                                                stats[fielderId].fielding[gameType].catches++;
                                            } else if (score.dismissalMode === 'Stumped') {
                                                stats[fielderId].fielding[gameType].stumpings++;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (details.bowlingFigures) {
                        for (const figure of details.bowlingFigures) {
                            const playerId = getPlayerIdFromLink(figure.playerLink);

                            stats[playerId].bowling[gameType].runs += figure.runs;
                            stats[playerId].bowling[gameType].balls += await getBallsFromOversText(figure.oversText, details.startTime, details.stadiumURL);
                            stats[playerId].bowling[gameType].wickets += figure.wickets;
                            stats[playerId].bowling[gameType].maidens += figure.maidens;
                            stats[playerId].bowling[gameType].innings++;
                        }
                    }
                }
            } catch (e) {
                console.log("\t\tError while getting match details. Error: " + e + "");
            }

            console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
            mIndex++;
        }

        console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
        tourIndex++;
    }

    fs.writeFile('data/playerStatsStatic.json', JSON.stringify(stats, null, '  '), error => {
        if (error) {
            console.log("\t\tError while writing stats. Error: " + error + "");
        }
    });

    let battingStats = [
        [
            'PlayerId',
            'Name',
            'GameType',
            'Matches',
            'Innings',
            'Runs',
            'Balls',
            'Fours',
            'Sixes'
        ]
    ];

    let bowlingStats = [
        [
            'PlayerId',
            'Name',
            'GameType',
            'Matches',
            'Innings',
            'Wickets',
            'Runs',
            'Balls',
            'Maidens'
        ]
    ];

    let fieldingStats = [
        [
            'PlayerId',
            'Name',
            'GameType',
            'Catches',
            'Stumpings',
            'Runouts'
        ]
    ];

    for (const [playerId, playerStats] of Object.entries(stats)) {
        const batting = playerStats.batting;
        if (Object.keys(batting).length > 0) {
            for (const [gameType, gameTypeStats] of Object.entries(batting)) {
                battingStats.push(
                    [
                        playerId,
                        playerStats.name,
                        gameType,
                        gameTypeStats.matches,
                        gameTypeStats.innings,
                        gameTypeStats.runs,
                        gameTypeStats.balls,
                        gameTypeStats.fours,
                        gameTypeStats.sixes
                    ]
                );
            }
        }

        const bowling = playerStats.bowling;
        if (Object.keys(bowling).length > 0) {
            for (const [gameType, gameTypeStats] of Object.entries(bowling)) {
                bowlingStats.push(
                    [
                        playerId,
                        playerStats.name,
                        gameType,
                        gameTypeStats.matches,
                        gameTypeStats.innings,
                        gameTypeStats.wickets,
                        gameTypeStats.runs,
                        gameTypeStats.balls,
                        gameTypeStats.maidens
                    ]
                );
            }
        }

        const fielding = playerStats.fielding;
        if (Object.keys(fielding).length > 0) {
            for (const [gameType, gameTypeStats] of Object.entries(fielding)) {
                if ((gameTypeStats.catches + gameTypeStats.stumpings + gameTypeStats.runouts) > 0) {
                    fieldingStats.push(
                        [
                            playerId,
                            playerStats.name,
                            gameType,
                            gameTypeStats.catches,
                            gameTypeStats.stumpings,
                            gameTypeStats.runouts
                        ]
                    );
                }
            }
        }
    }

    await write(sheetId, 'batting!A1:I', 'RAW', battingStats);
    await write(sheetId, 'bowling!A1:I', 'RAW', bowlingStats);
    await write(sheetId, 'fielding!A1:F', 'RAW', fieldingStats);
})();


