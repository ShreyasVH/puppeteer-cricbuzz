'use strict';

const path = require('path');
const fs = require('fs');

const hPlayerId = process.argv[2];
const gameType = process.argv[3];
const howstatScoresFile = path.resolve(__dirname, '../../puppeteer-howstat/data/scores/' + gameType + '/' + hPlayerId + '.csv');
const cricbuzzScoresFile = '/mnt/c/Users/Shreyas/Downloads/batting_scores.csv';

const howstatScores = fs.readFileSync(howstatScoresFile).toString().split("\n");
const cricbuzzScores = fs.readFileSync(cricbuzzScoresFile).toString().split("\n");

// console.log(howstatScores.length);
// console.log(cricbuzzScores.length);

let index1 = 0;
let index2 = 0;

// while((index1 < howstatScores.length) || (index2 < cricbuzzScores.length)) {
while((index1 < howstatScores.length)) {
    const hscore = howstatScores[index1];
    const cscore = cricbuzzScores[index2];
    const hscoreParts = hscore.split(", ");
    const cscoreParts = cscore.split(", ");
    // console.log(hscore);
    // console.log(cscore);

    if (hscoreParts[0] === cscoreParts[0]) {
        index2++;
    } else {
        console.log(hscore);
    }
    index1++;
    // console.log(index1);
    // console.log(index2);
}