const fs = require('fs');
const path = require('path');
const getStadiumDetails = require('./getStadiumDetails').getStadiumDetails;

const getPlayerIdFromLink = link => {
    let playerId = '';

    if (link) {
        const playerLinkMatches = link.match(/(.*)\/(\d+)(.*)/);
        playerId = playerLinkMatches[2];
    } else {
        console.log(link);
    }

    return playerId;
};

const getStadiumIdFromLink = link => {
    const stadiumLinkMatches = link.match(/(.*)\/(\d+)(.*)/);
    return stadiumLinkMatches[2];
};

const getMatchIdFromLink = link => {
    const matchLinkMatches = link.match(/(.*)\/(\d+)(.*)/);
    return parseInt(matchLinkMatches[2], 10);
};

const getTourIdFromLink = link => {
    const tourLinkMatches = link.match(/(.*)\/(\d+)(.*)/);
    return parseInt(tourLinkMatches[2], 10);
};

const getPlayer = (name, teamName, players, bench, playerReplacements, teamReplacements, isRecursive = false) => {
    let playerResponse = {
        name: '',
        link: ''
    };

    teamName = correctTeam(teamName, teamReplacements);

    // console.log(JSON.stringify(players, null, ' '));

    if (!isRecursive && playerReplacements.hasOwnProperty(name)) {
        name = playerReplacements[name];
    }
    // console.log(JSON.stringify(playerReplacements));
    // console.log(name);
    // console.log(teamName);

    let options = [];

    players = players.concat(bench);

    if (name === 'sub') {
        return {
            name: 'sub',
            link: 'https://www.cricbuzz.com/profiles/1/sub'
        };
    }

    let pIndex = 1;
    for (const playerObject of players) {
        if (pIndex > 1) {
            // break;
        }

        if (teamName === correctTeam(playerObject.team, teamReplacements)) {
            const player = playerObject.player;

            if (player === name) {
                playerResponse.name = name;
                playerResponse.link = playerObject.link;
                return playerResponse;
            } else {

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if (nameParts.length === 1) {
                    if (playerParts[playerParts.length - 1] === nameParts[0]) {
                        // console.log(JSON.stringify(player));
                        options.push({
                            name: player,
                            link: playerObject.link
                        });
                    }
                }
            }
        }
        pIndex++;
    }

    if(options.length === 0)
    {
        for (const playerObject of players) {
            if (pIndex > 1) {
                // break;
            }

            if (teamName === correctTeam(playerObject.team, teamReplacements)) {
                const player = playerObject.player;

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if (nameParts.length === 1) {
                    if (playerParts[0] === nameParts[0]) {
                        options.push({
                            name: player,
                            link: playerObject.link
                        });
                    }
                }
            }
            pIndex++;
        }
    }

    if(options.length === 0)
    {
        for (const playerObject of players) {
            if (pIndex > 1) {
                // break;
            }

            if (teamName === correctTeam(playerObject.team, teamReplacements)) {
                const player = playerObject.player;

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if ((playerParts[playerParts.length - 1] === nameParts[nameParts.length - 1]) && (nameParts[0][0].toLowerCase() === playerParts[0][0].toLowerCase())) {
                    options.push({
                        name: player,
                        link: playerObject.link
                    });
                }
            }
            pIndex++;
        }
    }

    if(options.length === 0)
    {
        for (const playerObject of players) {
            if (pIndex > 1) {
                // break;
            }

            if (teamName === correctTeam(playerObject.team, teamReplacements)) {
                const player = playerObject.player;

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if (nameParts.length === 1) {
                    if (playerParts.indexOf(nameParts[0]) !== -1) {
                        options.push({
                            name: player,
                            link: playerObject.link
                        });
                    }
                }
            }
            pIndex++;
        }
    }

    if(options.length === 0)
    {
        for (const playerObject of players) {
            if (pIndex > 1) {
                // break;
            }

            if (teamName === correctTeam(playerObject.team, teamReplacements)) {
                const player = playerObject.player;

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if (nameParts.length === 1) {
                    if (player.toLowerCase().replace(/ |'/g, '').indexOf(name.toLowerCase().replace(/'/g, '')) !== -1) {
                        options.push({
                            name: player,
                            link: playerObject.link
                        });
                    }
                }
            }
            pIndex++;
        }
    }

    if(options.length === 0)
    {
        for (const playerObject of players) {
            if (pIndex > 1) {
                // break;
            }

            if (teamName === correctTeam(playerObject.team, teamReplacements)) {
                const player = playerObject.player;

                let nameParts = name.split(' ');
                let playerParts = player.split(' ');
                // console.log(JSON.stringify(nameParts, null, ' '));
                // console.log(JSON.stringify(playerParts, null, ' '));
                // console.log(nameParts[0]);
                // console.log(playerParts[playerParts.length - 1]);

                if (nameParts.length > 1) {
                    return getPlayer(nameParts[nameParts.length - 1], teamName, players, bench, playerReplacements, teamReplacements, true);
                }
            }
            pIndex++;
        }
    }

    if (options.length === 1) {
        playerResponse.name = options[0].name;
        playerResponse.link = options[0].link;
    } else if(options.length > 0) {
        playerResponse.options = options;
    }

    return playerResponse;
}

const getGameType = (matchName, tourName) => {
    let gameType = 'ODI';

    let matches = matchName.match(/(.*) vs (.*), (.*)/);
    const matchNameParts = matchName.split(', ');
    const gameTypeText = matchNameParts[1];
    if (tourName.match(/T20|Twenty20/)) {
        gameType = 'T20';
    } else if (gameTypeText.match(/ODI|odi/)) {
        gameType = 'ODI';
    } else if (gameTypeText.match(/Test|test/)) {
        gameType = 'TEST';
    } else if (gameTypeText.match(/T20|t20/)) {
        gameType = 'T20';
    } else if (gameType.match(/match|Match/)) {
        gameType = 'ODI';
    }

    return gameType;
}

const getBallsFromOversText = async (oversText, matchStartTime, stadiumUrl) => {
    const overParts = oversText.split('.');
    let balls = 0;
    const overs = parseInt(overParts[0], 10);
    if (overParts.length === 2) {
        balls = parseInt(overParts[1],10);
    }
    balls += (overs * await getBallsPerOver(matchStartTime, stadiumUrl));
    return balls;
}

const getBallsPerOver = async (matchStartTime, stadiumUrl) => {
    let balls = 6;

    const stadiumId = getStadiumIdFromLink(stadiumUrl);
    if (stadiumId) {
        const stadiumCache = JSON.parse(fs.readFileSync('data/stadiumCache.json'));
        let stadiumDetails;
        if (stadiumCache.hasOwnProperty(stadiumId)) {
            stadiumDetails = stadiumCache[stadiumId];
        } else {
            console.log('Fetching stadium details');
            stadiumDetails = await getStadiumDetails(stadiumId);
        }

        const country = stadiumDetails.country;

        switch (country) {
            case 'England':
                if (matchStartTime > (new Date('1946-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1939-01-01')).getTime()) {
                    balls = 8;
                } else if (matchStartTime > (new Date('1900-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1889-01-01')).getTime()) {
                    balls = 5;
                } else {
                    balls = 4;
                }
                break;
            case 'Australia':
                if (matchStartTime > (new Date('1979-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1936-01-01')).getTime()) {
                    balls = 8;
                } else if (matchStartTime > (new Date('1928-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1924-01-01')).getTime()) {
                    balls = 8;
                } else if (matchStartTime > (new Date('1891-01-01')).getTime()) {
                    balls = 6;
                } else {
                    balls = 4;
                }
                break;
            case 'South Africa':
                if (matchStartTime > (new Date('1961-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1938-01-01')).getTime()) {
                    balls = 8;
                } else if (matchStartTime > (new Date('1902-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1891-01-01')).getTime()) {
                    balls = 5;
                } else {
                    balls = 4;
                }
                break;
            case 'New Zealand':
                if (matchStartTime > (new Date('1979-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1968-01-01')).getTime()) {
                    balls = 8;
                } else {
                    balls = 6;
                }
                break;
            case 'Pakistan':
                if (matchStartTime > (new Date('1978-01-01')).getTime()) {
                    balls = 6;
                } else if (matchStartTime > (new Date('1974-01-01')).getTime()) {
                    balls = 8;
                } else {
                    balls = 6;
                }
                break;
        }
    }

    return balls;
}

const correctTeam = (team, teamReplacements) => {
    let output = team;

    if (null === teamReplacements) {
        teamReplacements = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/teamReplacements.json')));
    }

    if (teamReplacements.hasOwnProperty(team.toLowerCase())) {
        output = teamReplacements[team.toLowerCase()];
    }

    return output;
};

exports.getPlayerIdFromLink = getPlayerIdFromLink;
exports.getStadiumIdFromLink = getStadiumIdFromLink;
exports.getPlayer = getPlayer;
exports.getMatchIdFromLink = getMatchIdFromLink;
exports.getTourIdFromLink = getTourIdFromLink;
exports.getGameType = getGameType;
exports.getBallsFromOversText = getBallsFromOversText;
exports.getBallsPerOver = getBallsPerOver;
exports.correctTeam = correctTeam;