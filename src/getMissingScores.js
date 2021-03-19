'use strict';

const path = require('path');
const fs = require('fs');
const mysql = require('mysql');
require('dotenv').config();

const hPlayerId = process.argv[2];
const playerId = process.argv[3];
const gameType = process.argv[4];

const gameTypes = {
    ODI: 0,
    TEST: 1,
    T20: 2
};

var con = mysql.createConnection({
    host: process.env.MYSQL_IP,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT
});

const howstatScoresFile = path.resolve(__dirname, '../../puppeteer-howstat/data/scores/' + gameType + '/' + hPlayerId + '.csv');
const cricbuzzScoresFile = path.resolve(__dirname, '../data/scores/' + gameType + '/' + playerId + '.csv');

con.connect(function(err) {
    if (err) throw err;
    const sql = 'select bs.runs, FROM_UNIXTIME(m.start_time / 1000, "%d/%m/%Y") as startTime from batting_scores bs inner join matches m on bs.player_id = ' + playerId + ' and m.id = bs.match_id inner join series s on s.id = m.series and s.game_type = ' + gameTypes[gameType] + ' inner join teams t on t.id = bs.team_id and t.team_type_id = 0 order by m.start_time, innings_id';
    con.query(sql, function (err, result) {
        if (err) throw err;

        let scores = [];
        for (const row of result) {
            scores.push(row.runs + ', ' + row.startTime);
        }

        fs.writeFileSync(cricbuzzScoresFile, scores.join("\n"));

        const howstatScores = fs.readFileSync(howstatScoresFile).toString().split("\n");
        const cricbuzzScores = fs.readFileSync(cricbuzzScoresFile).toString().split("\n");

        // console.log(howstatScores.length);
        // console.log(cricbuzzScores.length);

        let index1 = 0;
        let index2 = 0;

        // while((index1 < howstatScores.length) || (index2 < cricbuzzScores.length)) {
        while((index1 < howstatScores.length)) {
            const hscore = howstatScores[index1];
            if (index2 < (cricbuzzScores.length)) {
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
            } else {
                console.log(hscore);
            }

            index1++;
            // console.log(index1);
            // console.log(index2);
        }
    });

    con.end(function(err) {
        // The connection is terminated now
    });
});
