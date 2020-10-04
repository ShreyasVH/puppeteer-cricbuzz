const axios = require('axios');

const get = async (url, headers) => {
    const response = await axios.get(url, {
        headers
    });

    return {
        status: response.status,
        result: response.data
    };
};

const post = async (url, payload, headers) => {
    const response = await axios.post(url, payload, {
        headers
    });

    return {
        status: response.status,
        result: response.data
    };
};

const put = async (url, payload, headers) => {
    const response = await axios.put(url, payload, {
        headers
    });

    return {
        status: response.status,
        result: response.data
    };
};

exports.get = get;
exports.post = post;
exports.put = put;