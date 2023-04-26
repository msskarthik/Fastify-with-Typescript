const development = {
    'Port': 4000,
    'MongoDB': '',
    'SecretKey': '',
    'Neo4j_URI': '',
    'UserName': '',
    'Password': ''
};

const stage = {
    'Port': 4000,
    'MongoDB': '',
    'SecretKey': '',
    'Neo4j_URI': '',
    'UserName': '',
    'Password': ''
};

const production = {
    'Port': 4000,
    'MongoDB': '',
    'SecretKey': '',
    'Neo4j_URI': '',
    'UserName': '',
    'Password': ''
};

const config: any = process.env.NODE_ENV == 'production' ? production : process.env.NODE_ENV == 'stage' ? stage : development;

export default {
    ...config
}