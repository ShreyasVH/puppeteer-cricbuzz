'use strict';

const path = require('path');
const fs = require('fs');

const howstatFiguresFile = path.resolve(__dirname, '../../puppeteer-howstat/data/figures/ODI/2000.csv');
const cricbuzzFiguresFile = '/mnt/c/Users/Shreyas/Downloads/bowling_figures.csv';

const howstatFigures = fs.readFileSync(howstatFiguresFile).toString().split("\n");
const cricbuzzFigures = fs.readFileSync(cricbuzzFiguresFile).toString().split("\n");

// console.log(howstatFigures.length);
// console.log(cricbuzzFigures.length);

let index1 = 0;
let index2 = 0;

// while((index1 < howstatFigures.length) || (index2 < cricbuzzFigures.length)) {
	while((index1 < howstatFigures.length)) {
	const hfigure = howstatFigures[index1];
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
	index1++;
	// console.log(index1);
	// console.log(index2);
}