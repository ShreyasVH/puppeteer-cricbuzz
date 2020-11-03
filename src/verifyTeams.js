'use strict';

const fs = require('fs');
const path = require('path');
const getPlayer = require('./utils').getPlayer;
const correctTeam = require('./utils').correctTeam;

const baseDirectory = 'data/matches';

let tours = fs.readdirSync(baseDirectory);

let missingTeams = [];

const teamReplacements = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/teamReplacements.json')));

let tourIndex = 1;
for (const tour of tours) {
    if (tourIndex > 1) {
        // break;
        console.log('................................');
    }
    console.log('Processing tour. [' + tourIndex + '/' + tours.length + ']');
    const tourFolder = baseDirectory + '/' + tour;

    const matches = fs.readdirSync(tourFolder);
    let mIndex = 1;
    for (const match of matches) {
        let matchTeams = [];
        if (mIndex > 1) {
            // break;
            console.log('\t....................................');
        }

        console.log('\tProcessing match. [' + mIndex + '/' + matches.length + ']');

        const matchFile = tourFolder + '/' + match;
        let details = {};

        try {
            details = JSON.parse(fs.readFileSync(matchFile));

            if (!teamReplacements.hasOwnProperty(details.team1.toLowerCase()) && (matchTeams.indexOf(details.team1) === -1)) {
                matchTeams.push(details.team1);
            }

            if (!teamReplacements.hasOwnProperty(details.team2.toLowerCase()) && (matchTeams.indexOf(details.team2) === -1)) {
                matchTeams.push(details.team2);
            }

            if (details.hasOwnProperty('tossWinner') && !teamReplacements.hasOwnProperty(details.tossWinner.toLowerCase()) && (matchTeams.indexOf(details.tossWinner) === -1)) {
                matchTeams.push(details.tossWinner);
            }

            if (details.hasOwnProperty('batFirst') && !teamReplacements.hasOwnProperty(details.batFirst.toLowerCase()) && (matchTeams.indexOf(details.batFirst) === -1)) {
                matchTeams.push(details.batFirst);
            }

            if (details.hasOwnProperty('winner') && !teamReplacements.hasOwnProperty(details.winner.toLowerCase()) && (matchTeams.indexOf(details.winner) === -1)) {
                matchTeams.push(details.winner);
            }

            if (details.hasOwnProperty('battingScores')) {
                for (const score of details.battingScores) {
                    const team = score.team;

                    if (!teamReplacements.hasOwnProperty(team.toLowerCase()) && (matchTeams.indexOf(team) === -1)) {
                        matchTeams.push(team);
                    }
                }
            }

            if (details.hasOwnProperty('extras')) {
                for (const extras of details.extras) {
                    if (!teamReplacements.hasOwnProperty(extras.battingTeam.toLowerCase()) && (matchTeams.indexOf(extras.battingTeam) === -1)) {
                        matchTeams.push(extras.battingTeam);
                    }

                    if (!teamReplacements.hasOwnProperty(extras.bowlingTeam.toLowerCase()) && (matchTeams.indexOf(extras.bowlingTeam) === -1)) {
                        matchTeams.push(extras.bowlingTeam);
                    }
                }
            }

            if (matchTeams.length > 0) {
                missingTeams.push({
                    tour,
                    match,
                    teams: matchTeams
                });
            }
        } catch (e) {
            console.log("Error while getting match details. Error: " + e);
        }

        console.log('\tProcessed match. [' + mIndex + '/' + matches.length + ']');
        mIndex++;
    }

    console.log('Processed tour. [' + tourIndex + '/' + tours.length + ']');
    tourIndex++;
}

fs.writeFile('data/missingTeams.json', JSON.stringify(missingTeams, null, '  '), error => {
    if (error) {
        console.log("\t\tError while writing corrections data. Error: " + error + "");
    }
});

