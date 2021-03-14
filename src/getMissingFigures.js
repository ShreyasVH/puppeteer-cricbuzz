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

const howstatFiguresFile = path.resolve(__dirname, '../../puppeteer-howstat/data/figures/' + gameType + '/' + hPlayerId + '.csv');
const cricbuzzFiguresFile = path.resolve(__dirname, '../data/figures/' + gameType + '/' + playerId + '.csv');

con.connect(function(err) {
	if (err) throw err;
	const sql = 'SELECT CONCAT(bf.wickets, "/", bf.runs) as figure, FROM_UNIXTIME(m.start_time / 1000, "%d/%m/%Y") as startTime FROM `bowling_figures` bf inner join matches m on m.id = bf.match_id and bf.player_id = ' + playerId + ' inner join series s on s.id = m.series and s.game_type = ' + gameTypes[gameType] + ' inner join teams t on t.id = bf.team_id and t.team_type_id = 0 order by m.start_time';
	con.query(sql, function (err, result) {
		if (err) throw err;

		let figures = [];
		for (const row of result) {
			figures.push(row.figure + ', ' + row.startTime);
		}
		// console.log(figures);

		fs.writeFileSync(cricbuzzFiguresFile, figures.join("\n"));

		const howstatFigures = fs.readFileSync(howstatFiguresFile).toString().split("\n");
		const cricbuzzFigures = fs.readFileSync(cricbuzzFiguresFile).toString().split("\n");

		// console.log(howstatFigures.length);
		// console.log(cricbuzzFigures.length);

		let index1 = 0;
		let index2 = 0;

		while((index1 < howstatFigures.length)) {
			const hfigure = howstatFigures[index1];
			if (index2 < cricbuzzFigures.length) {
				const cfigure = cricbuzzFigures[index2];
				const hfigureParts = hfigure.split(", ");
				const cfigureParts = cfigure.split(", ");
				// console.log(hfigure);
				// console.log(cfigure);

				if (hfigureParts[0] === cfigureParts[0]) {
					index2++;
				} else {
					console.log(hfigure);
				}
			} else {
				console.log(hfigure);
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