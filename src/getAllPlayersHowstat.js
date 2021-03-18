'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const getDate = require('./utils').getDate;

const getAllPlayersFromHTML = (getDateDef) => {
    let players = [];

    const getDate = new Function(' return (' + getDateDef + ').apply(null, arguments)');

    const rows = document.querySelectorAll('table.tablelined tr');
    let index = 0;
    for (const row of rows) {
        if (index >= 2 && index < (rows.length - 1)) {
            try {
                let player = {};

                const cells = row.querySelectorAll('td');

                const nameElement = cells[0];
                const nameLink = nameElement.querySelector('a');
                if (nameLink) {
                    const matches = nameLink.href.match(/(.*)?PlayerID=(.*)/);
                    player.id = parseInt(matches[2], 10);
                    player.name = nameLink.innerText;
                    // console.log("\t" + player.name);
                }

                const dobElement = cells[1];
                const birthDateString = dobElement.innerText.split('/').reverse().join('/');
                player.birthDateString = birthDateString;
                player.birthDate = getDate.call(null, new Date(birthDateString)).getTime();

                const countryElement = cells[2];
                if (countryElement) {
                    player.country = countryElement.innerText;
                }

                players.push(player);
            } catch (e) {
                console.log(e);
                console.log(index, row.innerText);
            }
        }

        index++;
    }

    return players;
};

const getAllPlayersFromHowstat = async () => {
    let players = [];
    try {
        const browser  = await puppeteer.launch({
            headless: true,
            devtools: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        for (let i = 65; i <= 90; i++) {
            const alpha = String.fromCharCode(i);
            console.log('Getting player list for ' + alpha);

            const playerUrl = 'http://www.howstat.com/cricket/Statistics/Players/PlayerList.asp?Group=' + alpha;

            const page = await browser.newPage();
            await page.goto(playerUrl, {
                waitUntil: 'networkidle2',
                timeout: 0
            });
            page.on('console', msg => console.log('PAGE LOG:', msg.text()));

            const batchPlayers = await page.evaluate(getAllPlayersFromHTML, getDate.toString());
            // console.log(batchPlayers);
            players = players.concat(batchPlayers);
            // console.log(players);
            await page.close();
        }


        await browser.close();
    } catch (e) {
        console.log('Error while getting details player list. Error: ' + e);
    }


    return players;
}

(async () => {
    const players = await getAllPlayersFromHowstat();
    const playerListFilePath = path.resolve(__dirname, '../data/playerListHowstat.json');

    try {
        fs.writeFileSync(playerListFilePath, JSON.stringify(players, null, '  '));
    } catch (error) {
        console.log("\n\t\tError while writing player cache. Error: " + error + "\n");
    }
})();