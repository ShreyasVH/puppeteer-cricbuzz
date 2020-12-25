const axios = require('axios');

const get = async (url, headers) => {
    try {
        const response = await axios.get(url, {
            headers
        });

        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

const post = async (url, payload, headers = {}) => {
    try {
        const response = await axios.post(url, payload, {
            headers
        });

        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

const put = async (url, payload, headers) => {
    try {
        const response = await axios.put(url, payload, {
            headers
        });

        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

exports.get = get;
exports.post = post;
exports.put = put;