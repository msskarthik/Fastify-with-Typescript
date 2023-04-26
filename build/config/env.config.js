"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const development = {
    'Port': 4000,
    'MongoDB': 'mongodb://Linesheetspro:MHUzQRAmpsGNnlxo@192.168.2.7:27017/linesheetspro?authMechanism=DEFAULT&authSource=linesheetspro',
    'SecretKey': '',
    'Neo4j_URI': 'neo4j+s://8b7c8031.databases.neo4j.io',
    'UserName': 'neo4j',
    'Password': 'KP7VES5OWon-pHQqnYfHQybrqPX_lQzvgDKVfxvYla4'
};
const stage = {
    'Port': 4000,
    'MongoDB': '',
    'SecretKey': '',
    'Neo4j_URI': 'neo4j+s://8b7c8031.databases.neo4j.io',
    'UserName': 'neo4j',
    'Password': 'KP7VES5OWon-pHQqnYfHQybrqPX_lQzvgDKVfxvYla4'
};
const production = {
    'Port': 4000,
    'MongoDB': '',
    'SecretKey': '',
    'Neo4j_URI': 'neo4j+s://8b7c8031.databases.neo4j.io',
    'UserName': 'neo4j',
    'Password': 'KP7VES5OWon-pHQqnYfHQybrqPX_lQzvgDKVfxvYla4'
};
const config = process.env.NODE_ENV == 'production' ? production : process.env.NODE_ENV == 'stage' ? stage : development;
exports.default = Object.assign({}, config);
