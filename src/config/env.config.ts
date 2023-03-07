const development = {
    'Port':4000,
    'MongoDB':'',
    'SecretKey':''
};

const stage = {
    'Port':4000,
    'MongoDB':'',
    'SecretKey':''
};

const production = {
    'Port':4000,
    'MongoDB':'',
    'SecretKey':''
};

const config: any = process.env.NODE_ENV == 'production' ? production : process.env.NODE_ENV == 'stage' ? stage : development;

export default {
    ...config
}