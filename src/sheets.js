const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const path = require('path');

const get = require('./api').get;
const put = require('./api').put;

const getAccessToken = () => {
    const token = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/token.json')));

    return token.access_token;
}

const generateToken = () => {
    const credentials = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/credentials.json')));

    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(path.resolve(__dirname, '../data/token.json'), JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored');
            });
        });
    });
}

const write = (spreadsheetId, range, valueInputOption, values) => {
    let url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range + '?valueInputOption=' + valueInputOption;
    const payload = {
        values
    };
    return put(url, payload, {
        'Authorization': 'Bearer ' + getAccessToken()
    });
};

const read = async (spreadsheetId, range) => {
    let url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range;
    return get(url, {
        'Authorization': 'Bearer ' + getAccessToken()
    });
};

exports.write = write;
exports.read = read;

exports.generateToken = generateToken;