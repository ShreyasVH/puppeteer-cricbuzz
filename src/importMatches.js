'use strict';

const fs = require('fs');
const path = require('path');

const getStadiumIdFromLink = require('./utils').getStadiumIdFromLink;
const getTourIdFromLink = require('./utils').getTourIdFromLink;
const getStadiumDetails = require('./getStadiumDetails').getStadiumDetails;
const getPlayerIdFromLink = require('./utils').getPlayerIdFromLink;
const correctTeam = require('./utils').correctTeam;
const getBallsFromOversText = require('./utils').getBallsFromOversText;
const getPlayer = require('./utils').getPlayer;
const getPlayerDetails = require('./getPlayerDetailsFromCricbuzz').getPlayerDetails;
const post = require('./api').post;
const get = require('./api').get;
const getDate = require('./utils').getDate;

const endpoint = process.env.CRICBUZZ_ENDPOINT;

const getAllCountries = async () => {
    const url = endpoint + '/cricbuzz/countries';
    return get(url);
};

const getAllStadiums = async () => {
    const url = endpoint + '/cricbuzz/stadiums';
    return get(url);
};

const getAllTeams = async () => {
    const url = endpoint + '/cricbuzz/teams';
    return get(url);
};

const getAllSeries = async () => {
    const url = endpoint + '/cricbuzz/series';
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
}

const importCountries = async (details, existingCountries, errors) => {
    await importCountryForSub(existingCountries, errors);
    await importCountryFromStadium(details.stadiumURL, existingCountries, errors);
    await importCountriesFromPlayers(details.players, existingCountries, errors);
};

const importCountry = async payload => {
    const url = endpoint + '/cricbuzz/countries';
    return await post(url, payload);
}

const importStadium = async (stadiumURL, existingCountries, existingStadiums, errors) => {
    const stadiumDetails = await getStadiumDetailsFromURL(stadiumURL);

    if (existingCountries.hasOwnProperty(stadiumDetails.country)) {
        const countryId = existingCountries[stadiumDetails.country];

        let key = stadiumDetails.name + '_' + countryId;

        if (!existingStadiums.hasOwnProperty(key)) {
            const payload = {
                name: stadiumDetails.name,
                countryId
            };

            const url = endpoint + '/cricbuzz/stadiums';
            const response = await post(url, payload);
            if (response.status === 200) {
                const result = response.result;

                existingStadiums[key] = result.id;
            } else {
                errors.push({
                    payload,
                    status: response.status,
                    response: response.result,
                    type: 'IMPORT_STADIUM'
                });
            }
        }
    }
}

const importTeam = async (team, existingTeams, teamReplacements, errors) => {
    let teamResponse = {};
    const countryId = 1;

    team = teamReplacements[team];

    const key = team + '_' + countryId + '_INTERNATIONAL';

    if (!existingTeams.hasOwnProperty(key)) {
        const payload = {
            name: team,
            countryId: 1,
            teamType: "INTERNATIONAL"
        };

        const url = endpoint + '/cricbuzz/teams';
        const response = await post(url, payload);
        if (response.status === 200) {
            const result = response.result;
            teamResponse = result;
            existingTeams[key] = result.id;
        } else {
            errors.push({
                payload,
                status: response.status,
                response: response.result,
                type: 'IMPORT_TEAM'
            });
        }
    } else {
        teamResponse = {
            id: existingTeams[key],
            name: team
        };

    }

    return teamResponse;
}

const importTeams = async (details, existingTeams, teamReplacements, errors) => {
    const team1 = details.team1;
    const team2 = details.team2;
    const teamForSub = 'India';

    for (const team of [team1, team2, teamForSub]) {
        await importTeam(team.toLowerCase(), existingTeams, teamReplacements, errors);
    }
}

const importPlayers = async (details, existingCountries, existingPlayers, errors) => {
    let players = details.players;
    players = players.concat(details.bench);
    if (players) {
        for (const player of players) {
            const playerDetails = await getPlayerDetailsFromURL(player.link);
            if (existingCountries.hasOwnProperty(playerDetails.country)) {
                const countryId = existingCountries[playerDetails.country];
                let dateOfBirth = playerDetails.birthDate;
                if (dateOfBirth === null) {
                    dateOfBirth = (getDate(new Date('1970-01-01'))).getTime();
                }
                const key = playerDetails.name + '_' + countryId + '_' + dateOfBirth;
                if (!existingPlayers.hasOwnProperty(key)) {
                    const payload = {
                        name: playerDetails.name,
                        countryId,
                        dateOfBirth: dateOfBirth,
                        image: 'https://res.cloudinary.com/dyoxubvbg/image/upload/v1577106216/artists/default_m.jpg'
                    };

                    console.log(payload);

                    const url = endpoint + '/cricbuzz/players';
                    const response = await post(url, payload);
                    if (response.status === 200) {
                        const result = response.result;
                        existingPlayers[key] = result.id;
                    } else {
                        errors.push({
                            payload,
                            status: response.status,
                            response: response.result,
                            type: 'IMPORT_PLAYER'
                        });
                    }
                }
            }
        }
    }
};

const getToursForYear = async year => {
    let tours = [];
    const url = endpoint + '/cricbuzz/tours/filter';
    const payload = {
        year,
        count: 1000
    };
    const response = await post(url, payload);
    if (response.status === 200) {
        tours = response.result;
    }
    return tours;
};

const importTour = async (details, existingTours, yearTours, errors) => {
    const tourId = getTourIdFromLink(details.tourLink);
    const tourDetailsFilePath = path.resolve(__dirname, '../data/tourDetails/' + tourId + '.json');
    if (fs.existsSync(tourDetailsFilePath)) {
        const tourDetails = JSON.parse(fs.readFileSync(tourDetailsFilePath));
        const startTime = tourDetails.startTime;

        const year = ((new Date(startTime)).getFullYear());
        const tourName= details.tourName;

        if (!yearTours.hasOwnProperty(year)) {
            yearTours[year] = await getToursForYear(year);
        }

        for (const tour of yearTours[year]) {
            const key = tour.name + '_' + tour.startTime;
            existingTours[key] = tour.id;
        }

        const key = tourName + '_' + startTime;
        if (!existingTours.hasOwnProperty(key)) {
            const payload = {
                name: tourName,
                startTime
            };

            const url = endpoint + '/cricbuzz/tours';
            const response = await post(url, payload);
            if (response.status === 200) {
                const result = response.result;
                yearTours[year].push(result);
                existingTours[key] = result.id;
            } else {
                errors.push({
                    payload,
                    status: response.status,
                    response: response.result,
                    type: 'IMPORT_TOUR'
                });
            }
        }
    }
};

const getTeamsForSeries = (tourDetails, gameType) => {
    let teams = [];

    for (const match of tourDetails.series[gameType].matches) {
        const nameParts = match.name.split(', ');
        const teamsString = nameParts[0];
        if (teamsString.match(/(.*) vs (.*)/)) {
            const teamMatches = teamsString.match(/(.*) vs (.*)/);
            const team1 = teamMatches[1];
            const team2 = teamMatches[2];
            for (const team of [team1, team2]) {
                if (teams.indexOf(team) === -1) {
                    teams.push(team);
                }
            }
        }
    }

    return teams;
}

const getSeriesType = (tourDetails, gameType) => {
    let seriesType = '';

    if (tourDetails.hasOwnProperty('series')
        && tourDetails.series.hasOwnProperty(gameType)
        && tourDetails.series[gameType].hasOwnProperty('matches')
        && tourDetails.series[gameType].matches.length > 0) {
        let teams = getTeamsForSeries(tourDetails, gameType);

        if (teams.length === 2) {
            seriesType = 'BI_LATERAL';
        } else if (teams.length === 3) {
            seriesType = 'TRI_SERIES';
        } else {
            seriesType = 'TOURNAMENT';
        }
    }

    return seriesType;
};

const getSeriesStartTime = (tourDetails, gameType) => {
    let startTime = '';

    if (tourDetails.hasOwnProperty('series')
        && tourDetails.series.hasOwnProperty(gameType)
        && tourDetails.series[gameType].hasOwnProperty('matches')
        && tourDetails.series[gameType].matches.length > 0) {
        startTime = tourDetails.series[gameType].matches[0].startTime;
    }

    return startTime;
}

const importSeries = async (details, existingTours, existingSeries, existingTeams, teamReplacements, errors) => {
    const tourName = details.tourName;
    const tourId = getTourIdFromLink(details.tourLink);
    const tourDetailsFilePath = path.resolve(__dirname, '../data/tourDetails/' + tourId + '.json');
    if (fs.existsSync(tourDetailsFilePath)) {
        const tourDetails = JSON.parse(fs.readFileSync(tourDetailsFilePath));
        const tourStartTime = tourDetails.startTime;
        const tourKey = tourName + '_' + tourStartTime;
        if (existingTours.hasOwnProperty(tourKey)) {
            const tourId = existingTours[tourKey];
            const seriesKey = tourKey + '_' + details.gameType;
            if (!existingSeries.hasOwnProperty(seriesKey)) {
                let payload = {
                    name: tourName,
                    startTime: getSeriesStartTime(tourDetails, details.gameType),
                    gameType: details.gameType,
                    type: getSeriesType(tourDetails, details.gameType),
                    tourId,
                    homeCountryId: 1
                };

                const teams = getTeamsForSeries(tourDetails, details.gameType);
                let teamIds = [];
                for (const team of teams) {
                    const teamResponse = await importTeam(team.toLowerCase(), existingTeams, teamReplacements, errors);
                    teamIds.push(teamResponse.id);
                }
                payload.teams = teamIds;

                const url = endpoint + '/cricbuzz/series';
                const response = await post(url, payload);
                if (response.status === 200) {
                    const result = response.result;
                    existingSeries[seriesKey] = result.id;
                } else {
                    const result = response.result;
                    const errorCode = result.code;
                    if (errorCode !== 4004) {
                        errors.push({
                            payload,
                            status: response.status,
                            response: response.result,
                            type: 'IMPORT_SERIES'
                        });
                    }
                }
            }
        }
    }
}

const importMatch = async (details, existingSeries, teamReplacements, playerReplacements, dismissalModes, existingTeams, existingStadiums, existingCountries, existingPlayers, errors, referenceTourId, referenceMatchId) => {
    const tourId = getTourIdFromLink(details.tourLink);
    const tourDetailsFilePath = path.resolve(__dirname, '../data/tourDetails/' + tourId + '.json');
    if (fs.existsSync(tourDetailsFilePath)) {
        const tourDetails = JSON.parse(fs.readFileSync(tourDetailsFilePath));
        const gameType = details.gameType;

        if (tourDetails.series && tourDetails.series[gameType] && tourDetails.series[gameType].startTime) {
            const seriesStartTime = tourDetails.series[gameType].startTime;
            const seriesKey = tourDetails.name + '_' + seriesStartTime + '_' + gameType;

            if (existingSeries.hasOwnProperty(seriesKey)) {
                const seriesId = existingSeries[seriesKey];

                const stadiumDetails = await getStadiumDetailsFromURL(details.stadiumURL);

                let payload = {
                    seriesId,
                    team1: existingTeams[correctTeam(details.team1, teamReplacements) + '_1_INTERNATIONAL'],
                    team2: existingTeams[correctTeam(details.team2, teamReplacements) + '_1_INTERNATIONAL'],
                    result: details.result,
                    stadium: existingStadiums[stadiumDetails.name + '_' + existingCountries[stadiumDetails.country]],
                    startTime: details.startTime
                };

                if (details.hasOwnProperty('tossWinner')) {
                    payload.tossWinner = existingTeams[correctTeam(details.tossWinner, teamReplacements) + '_1_INTERNATIONAL'];
                }

                if (details.hasOwnProperty('batFirst')) {
                    payload.batFirst = existingTeams[correctTeam(details.batFirst, teamReplacements) + '_1_INTERNATIONAL'];
                }

                if (details.hasOwnProperty('winner')) {
                    payload.winner = existingTeams[correctTeam(details.winner, teamReplacements) + '_1_INTERNATIONAL'];
                }

                if (details.hasOwnProperty('winMargin')) {
                    payload.winMargin = parseInt(details.winMargin, 10);
                }

                if (details.hasOwnProperty('winMarginType')) {
                    payload.winMarginType = details.winMarginType;
                }

                let extras = [];
                if (details.hasOwnProperty('extras')) {
                    for (const extrasObject of details.extras) {
                        extras.push({
                            runs: extrasObject.runs,
                            type: extrasObject.type,
                            battingTeam: existingTeams[correctTeam(extrasObject.battingTeam, teamReplacements) + '_1_INTERNATIONAL'],
                            bowlingTeam: existingTeams[correctTeam(extrasObject.bowlingTeam, teamReplacements) + '_1_INTERNATIONAL'],
                            innings: extrasObject.innings,
                            teamInnings: extrasObject.teamInnings
                        });
                    }
                }
                payload.extras = extras;

                let players = [];
                let playerList = [];
                if (details.hasOwnProperty('players')) {
                    playerList = playerList.concat(details.players);
                }

                if (details.hasOwnProperty('bench')) {
                    playerList = playerList.concat(details.bench);
                }

                for (const player of playerList) {
                    const playerDetails = await getPlayerDetailsFromURL(player.link);
                    players.push({
                        playerId: existingPlayers[playerDetails.name + '_' + existingCountries[playerDetails.country] + '_' + playerDetails.birthDate],
                        teamId: existingTeams[correctTeam(player.team, teamReplacements) + '_1_INTERNATIONAL'],
                        name: playerDetails.name
                    });

                }
                payload.players = players;

                let battingScores = [];
                if (details.hasOwnProperty('battingScores')) {
                    for (const score of details.battingScores) {
                        const batsmanDetails = await getPlayerDetailsFromURL(score.playerLink);

                        if (['absent hurt', 'absent ill', 'abs hurt', 'retd out'].indexOf(score.dismissalModeText) !== -1) {
                            if (score.runs > 0 && score.balls > 0) {

                            } else {
                                console.log(score.dismissalModeText);
                                continue;
                            }

                        }

                        let battingTeam = correctTeam(score.team, teamReplacements);
                        let bowlingTeam = ((battingTeam === correctTeam(details.team1, teamReplacements)) ? correctTeam(details.team2, teamReplacements) : ((battingTeam === correctTeam(details.team2, teamReplacements)) ? correctTeam(details.team1, teamReplacements) : ''));
                        let scoreObject = {
                            playerId: existingPlayers[batsmanDetails.name + '_' + existingCountries[batsmanDetails.country] + '_' + batsmanDetails.birthDate],
                            runs: score.runs,
                            balls: score.balls,
                            fours: score.fours,
                            sixes: score.sixes,
                            innings: score.innings,
                            teamInnings: score.teamInnings
                        };

                        if (score.dismissalMode) {
                            scoreObject.dismissalMode = dismissalModes[score.dismissalMode];

                            if (score.bowler) {
                                const bowler = getPlayer(score.bowler, bowlingTeam, details.players, details.bench, playerReplacements, teamReplacements);
                                const bowlerDetails = await getPlayerDetailsFromURL(bowler.link);
                                scoreObject.bowlerId = existingPlayers[bowlerDetails.name + '_' + existingCountries[bowlerDetails.country] + '_' + bowlerDetails.birthDate];

                                if ('undefined' === typeof scoreObject.bowlerId) {
                                    console.log(score.bowler);
                                    console.log(bowler);
                                    console.log(bowlerDetails.name + '_' + existingCountries[bowlerDetails.country] + '_' + bowlerDetails.birthDate);
                                }
                            }

                            if (score.fielders) {
                                let fielders = [];
                                const fieldersString = score.fielders;
                                const fielderParts = fieldersString.split(', ');
                                for (let fielderName of fielderParts) {
                                    if (fielderName.match(/sub \((.*)\)/)) {
                                        // console.log(fieldersString);
                                        fielderName = 'sub';
                                    }

                                    const fielder = getPlayer(fielderName, bowlingTeam, details.players, details.bench, playerReplacements, teamReplacements);
                                    const fielderDetails = await getPlayerDetailsFromURL(fielder.link);
                                    const fielderId = existingPlayers[fielderDetails.name + '_' + existingCountries[fielderDetails.country] + '_' + fielderDetails.birthDate];
                                    fielders.push(fielderId);
                                    if ('undefined' === typeof fielderId) {
                                        console.log(fielderName);
                                        console.log(fielder);
                                        console.log(fielderDetails.name + '_' + existingCountries[fielderDetails.country] + '_' + fielderDetails.birthDate);
                                    }
                                }

                                scoreObject.fielders = fielders.join(', ');
                            }
                        }

                        battingScores.push(scoreObject);
                    }
                }
                payload.battingScores = battingScores;

                let bowlingFigures = [];
                if (details.hasOwnProperty('bowlingFigures')) {
                    for (const figure of details.bowlingFigures) {
                        const bowlerDetails = await getPlayerDetailsFromURL(figure.playerLink);
                        bowlingFigures.push({
                            playerId: existingPlayers[bowlerDetails.name + '_' + existingCountries[bowlerDetails.country] + '_' + bowlerDetails.birthDate],
                            balls: await getBallsFromOversText(figure.oversText, details.startTime, details.stadiumURL),
                            maidens: figure.maidens,
                            runs: figure.runs,
                            wickets: figure.wickets,
                            innings: figure.innings,
                            teamInnings: figure.teamInnings
                        });
                    }
                }

                payload.bowlingFigures = bowlingFigures;

                let manOfTheMatchList = [];
                if (details.hasOwnProperty('manOfTheMatchList')) {
                    for (const player of details.manOfTheMatchList) {
                        const playerDetails = await getPlayerDetailsFromURL(player.link);
                        manOfTheMatchList.push(existingPlayers[playerDetails.name + '_' + existingCountries[playerDetails.country] + '_' + playerDetails.birthDate]);
                    }
                }

                payload.manOfTheMatchList = manOfTheMatchList;

                // console.log(JSON.stringify(payload, null, ' '));

                const url = endpoint + '/cricbuzz/matches';
                const response = await post(url, payload);
                let isDeleteRequired = false;
                if (response.status === 200) {
                    isDeleteRequired = true;
                } else {
                    const result = response.result;
                    const errorCode = result.code;
                    if (errorCode === 4004) {
                        isDeleteRequired = true;
                    } else {
                        errors.push({
                            payload,
                            status: response.status,
                            response: response.result,
                            type: 'IMPORT_MATCH'
                        });
                    }
                }

                if (isDeleteRequired) {
                    try {
                        fs.unlinkSync(path.resolve(__dirname, '../data/inputMatches/' + referenceTourId + '/' + referenceMatchId + '.json'))
                        //file removed
                    } catch(err) {
                        console.error("Error while removing matchfile: " + err)
                    }
                }
            }
        }
    }
}

const getStadiumDetailsFromURL = async (stadiumURL) => {
    const stadiumId = getStadiumIdFromLink(stadiumURL);
    let stadiumCache = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/stadiumCache.json')));
    let stadiumDetails;
    if (stadiumCache.hasOwnProperty(stadiumId)) {
        stadiumDetails = stadiumCache[stadiumId];
    } else {
        stadiumDetails = await getStadiumDetails(stadiumId);
    }

    return stadiumDetails;
}

const importCountryForSub = async (existingCountries, errors) => {
    const countryForSub = 'India';
    if (!existingCountries.hasOwnProperty(countryForSub)) {
        const payload = {
            name: countryForSub
        };
        const response = await importCountry(payload);
        if (response.status === 200) {
            const result = response.result;
            existingCountries[countryForSub] = result.id;
        } else {
            errors.push({
                payload,
                status: response.status,
                response: response.result,
                type: 'IMPORT_COUNTRY'
            });
        }
    }
}

const importCountryFromStadium = async (stadiumURL, existingCountries, errors) => {
    const stadiumDetails = await getStadiumDetailsFromURL(stadiumURL);

    if (!existingCountries.hasOwnProperty(stadiumDetails.country)) {
        const payload = {
            name: stadiumDetails.country
        };
        const response = await importCountry(payload);
        if (response.status === 200) {
            const result = response.result;
            existingCountries[stadiumDetails.country] = result.id;
        } else {
            errors.push({
                payload,
                status: response.status,
                response: response.result,
                type: 'IMPORT_COUNTRY'
            });
        }
    }
}

const getPlayerDetailsFromURL = async playerLink => {
    const playerId = getPlayerIdFromLink(playerLink);
    let playerCache = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/playerCache.json')));
    let playerDetails;
    if (playerCache.hasOwnProperty(playerId)) {
        playerDetails = playerCache[playerId];
    } else {
        playerDetails = await getPlayerDetails(playerId);
    }
    if (null === playerDetails.birthDate) {
        playerDetails.birthDate = (getDate(new Date('1970-01-01'))).getTime();
    }
    return playerDetails;
};

const importCountriesFromPlayers = async (players, existingCountries, errors) => {
    for (const player of players) {
        const playerDetails = await getPlayerDetailsFromURL(player.link)

        if (playerDetails && playerDetails.hasOwnProperty('country')) {
            const country = playerDetails.country;
            if (!existingCountries.hasOwnProperty(country)) {
                const payload = {
                    name: country
                };
                const response = await importCountry(payload);

                if (response.status === 200) {
                    const result = response.result;
                    existingCountries[country] = result.id;
                } else {
                    errors.push({
                        payload,
                        status: response.status,
                        response: response.result,
                        type: 'IMPORT_COUNTRY'
                    });
                }
            }
        }
    }
}

(async() => {
    const baseDir = path.resolve(__dirname, '../data/inputMatches');
    const errorFilePath = path.resolve(__dirname, '../data/importErrors.json');
    const tours = fs.readdirSync(baseDir);

    const errors = [];

    const teamReplacements = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/teamReplacements.json')));
    const playerReplacements = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/playerReplacements.json')));
    const dismissalModes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/dismissalModes.json')));

    const allCountriesResponse = await getAllCountries();
    let existingCountries = {};
    for (const country of allCountriesResponse.result) {
        existingCountries[country.name] = country.id;
    }

    const allStadiumsResponse = await getAllStadiums();
    let existingStadiums = {};
    for (const stadium of allStadiumsResponse.result) {
        existingStadiums[stadium.name + '_' + stadium.countryId] = stadium.id;
    }

    const allTeamsResponse = await getAllTeams();
    let existingTeams = {};
    for (const team of allTeamsResponse.result) {
        existingTeams[team.name + '_' + team.countryId + '_' + team.teamType] = team.id;
    }

    const allSeriesResponse = await getAllSeries();
    let existingSeries = {};
    for (const series of allSeriesResponse.result) {
        existingSeries[series.name + '_' + series.startTime + '_' + series.gameType] = series.id;
    }

    let yearTours = {};
    let existingTours = {};

    const allPlayers = await getAllPlayers();
    let existingPlayers = {};
    for (const player of allPlayers) {
        existingPlayers[player.name + '_' + player.countryId + '_' + player.dateOfBirth] = player.id;
    }

    let tourIndex = 0;
    for (const tourId of tours) {
        // if (tourIndex > 0) {
        //     break;
        // }

        if (tourIndex > 0) {
            console.log('------------------------------------');
        }

        console.log('Processing tour. [' + (tourIndex + 1) + '/' + tours.length + ']');

        const tourDir = baseDir + '/' + tourId;
        const matches = fs.readdirSync(tourDir);
        let matchIndex = 0;
        for (const matchFile of matches) {
            // if (matchIndex > 0) {
            //     break;
            // }

            if (matchIndex > 0) {
                console.log('\t.......................');
            }

            console.log('\tProcessing match. [' + (matchIndex + 1) + '/' + matches.length + ']');

            try {
                const matchId = matchFile.replace('.json', '');

                const matchFilePath = tourDir + '/' + matchFile;
                const details = JSON.parse(fs.readFileSync(matchFilePath));

                await importCountries(details, existingCountries, errors);
                // console.log(existingCountries);

                await importStadium(details.stadiumURL, existingCountries, existingStadiums, errors);
                // console.log(existingStadiums);

                await importTeams(details, existingTeams, teamReplacements, errors);
                // console.log(existingTeams);

                await importPlayers(details, existingCountries, existingPlayers, errors);
                // console.log(existingPlayers);

                await importTour(details, existingTours, yearTours, errors);
                // console.log(existingTours);

                await importSeries(details, existingTours, existingSeries, existingTeams, teamReplacements, errors);

                await importMatch(details, existingSeries, teamReplacements, playerReplacements, dismissalModes, existingTeams, existingStadiums, existingCountries, existingPlayers, errors, tourId, matchId);

                fs.writeFile(errorFilePath, JSON.stringify(errors, null, '  '), error => {
                    if (error) {
                        console.log("\t\tError while writing match data. Error: " + error);
                    }
                });
            } catch (e) {
                console.log('\t\tError while importing match. ' + e);
            }
            

            console.log('\tProcessed match. [' + (matchIndex + 1) + '/' + matches.length + ']');
            matchIndex++;
        }
        const remainingMatches = fs.readdirSync(tourDir);
        if (remainingMatches.length === 0) {
            try {
                fs.rmdirSync(tourDir);
            } catch (e) {
                console.log('Error while deleting tour folder: ' + e);
            }
        }

        console.log('Processed tour. [' + (tourIndex + 1) + '/' + tours.length + ']');
        tourIndex++;
    }
})();