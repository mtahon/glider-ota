const mongoose = require('mongoose');
const {MONGO_CONFIG} = require('./config');
const {createLogger} = require('./logger');
const logger = createLogger('dao');
const SEARCH_CONFIG = {
    BY_CITY_NAME: {
        MIN_QUERY_LENGTH: 3,
        WEIGHT: 10
    },
    BY_AIRPORT_NAME: {
        MIN_QUERY_LENGTH: 3,
        WEIGHT: 20
    },
    BY_CITY_CODE: {
        MIN_QUERY_LENGTH: 3,
        WEIGHT: 25
    },
    BY_AIRPORT_CODE: {
        MIN_QUERY_LENGTH: 3,
        WEIGHT: 30               //highest weight, match with airport code is more relevant than city or airport name
    }
}

const LOOKUP_CONFIG = {
    MIN_QUERY_LENGTH: 3,
    MAX_RESULTS: 30
}


console.log(`Using DB:${MONGO_CONFIG.URL}`);

mongoose.connect(MONGO_CONFIG.URL, {useNewUrlParser: true, useUnifiedTopology: true});


const Airports = mongoose.model('airports', mongoose.Schema({
    city_name: String,
    city_code: String,
    country_code: String,
    airport_name: String,
    airport_iata_code: String,
    type: String,
    country_name: String,
    timezone: String,
    pagerank: Number,
    belongs_to_metropolitan:{type: Boolean, default: false}
}), 'airportscurated');


const isQueryLongerOrEqualThan = (query, length) => {
    if (!query)
        return false;
    return query.length >= length;
}
const decorateRecordWithWeight = (records, weight) => {
    if (!records)
        return [];
    records = records.map(record => {
        record.weight = weight;
        return record;
    })
    return records;
}
/**
 * Wrapper on airports query
 * @param query
 * @returns {Promise<*>}
 */
const searchAirports = async (query, orderBy) => {
    let q = Airports.find(query)
    if (orderBy)
        q = q.sort(orderBy)
    let results = await q.exec();
    return results;
}
const printResults = (message, airports) => {
    console.log(message)
    airports.forEach(airport=>{
        console.log(`\t${airport.airport_name} [iata=${airport.airport_iata_code} city=${airport.city_code} type=${airport.type}] [W:${airport.weight}] [W:${airport.weight}] [RANK:${airport.pagerank}]`)
    })
}

const searchAirportByString = async query => {
    const dbQuery = [
        {
            $match: {
                $or: [
                    {
                        'airport_iata_code': {
                            '$regex': `^${query}`,
                            '$options': 'i'
                        }
                    },
                    {
                        'city_name': {
                            '$regex': `^${query}`,
                            '$options': 'i'
                        }
                    },
                    {
                        'city_code': {
                            '$regex': `^${query}`,
                            '$options': 'i'
                        }
                    },
                    {
                        'airport_name': {
                            '$regex': `^${query}`,
                            '$options': 'i'
                        }
                    }
                ]
            }
        },
        {
            $group: {
                '_id': {
                    'airport_iata_code': '$airport_iata_code',
                    'type': '$type'
                },
                'city_name': {
                    $first: '$city_name'
                },
                'city_code': {
                    $first: '$city_code'
                },
                'country_code': {
                    $first: '$country_code'
                },
                'airport_name': {
                    $first: '$airport_name'
                },
                'country_name': {
                    $first: '$country_name'
                },
                'timezone': {
                    $first: '$timezone'
                },
            }
        },
        {
            $project: {
                '_id': 0,
                'airport_iata_code': '$_id.airport_iata_code',
                'type': '$_id.type',
                'city_name': 1,
                'city_code': 1,
                'country_code': 1,
                'airport_name': 1,
                'country_name': 1,
                'timezone': 1
            }
        },
        {
            $sort: {
                'city_name': 1
            }
        }
    ];
    return Airports.aggregate(dbQuery);
};

const searchByExactAirportCode = async (airportCode) => {
    if (!isQueryLongerOrEqualThan(airportCode, SEARCH_CONFIG.BY_AIRPORT_CODE.MIN_QUERY_LENGTH))
        return [];
    let results = await searchAirports({'airport_iata_code': {'$regex': `^${airportCode}`, '$options': 'i'}},{pagerank:-1,city_name:1 });
    results = decorateRecordWithWeight(results, SEARCH_CONFIG.BY_AIRPORT_NAME.WEIGHT);
    printResults(`searchByExactAirportCode(${airportCode})==>${results.length}`, results);
    return results;
}
const searchByCityName = async (cityName) => {
    if (!isQueryLongerOrEqualThan(cityName, SEARCH_CONFIG.BY_CITY_NAME.MIN_QUERY_LENGTH))
        return [];
    let results = await searchAirports({'city_name': {'$regex': `^${cityName}`, '$options': 'i'}},{pagerank:-1,city_name:1 });
    results = decorateRecordWithWeight(results, SEARCH_CONFIG.BY_CITY_NAME.WEIGHT);
    printResults(`searchByCityName(${cityName})==>${results.length}`, results);
    return results;
}
const searchByCityCode = async (cityCode) => {
    if (!isQueryLongerOrEqualThan(cityCode, SEARCH_CONFIG.BY_CITY_CODE.MIN_QUERY_LENGTH))
        return [];
    let results = await searchAirports({'city_code': {'$regex': `^${cityCode}`, '$options': 'i'}},{pagerank:-1,city_name:1 });
    results =  decorateRecordWithWeight(results, SEARCH_CONFIG.BY_CITY_CODE.WEIGHT);
    printResults(`searchByCityCode(${cityCode})==>${results.length}`, results);
    return results;
}

const searchByAirportName = async (airportName) => {
    if (!isQueryLongerOrEqualThan(airportName, SEARCH_CONFIG.BY_AIRPORT_NAME.MIN_QUERY_LENGTH))
        return [];
    let results = await searchAirports({'airport_name': {'$regex': `^${airportName}`, '$options': 'i'}},{pagerank:-1,city_name:1 });
    results =  decorateRecordWithWeight(results, SEARCH_CONFIG.BY_AIRPORT_NAME.WEIGHT);
    printResults(`searchByAirportName(${airportName})==>${results.length}`, results);
    return results;
}

const multipleComparators = (comparators) =>{
    const compare=(A,B)=>{
        for(let comparator of comparators){
            let result = comparator(A,B);
            if(result != 0)
                return result;
        }
        return 0;
    }
    return compare;
}
const byPageRankComparator = (A, B) => {
    let rankA=Number(A.pagerank);
    let rankB=Number(B.pagerank);
    if(isNaN(rankA))
        rankA=0;
    if(isNaN(rankB))
        rankB=0;
    return rankB-rankA;
}


const byWeightComparator = (A, B) => {
    let weightA = A.weight || 0;
    let weightB = B.weight || 0;
    return weightB - weightA;
}
const byTypeComparator = (A, B) => {
    let typeA=A.type || 'AIRPORT';
    let typeB=B.type || 'AIRPORT';
    if(typeA !== typeB){
        return typeB.localeCompare(typeA)
    }
}
const byAirportNameComparator = (A, B) => {
    let nameA = A.airport_name || '';
    let nameB = B.airport_name || '';
    return nameA.localeCompare(nameB)
}



const sortResults = (results) => {
    const comparator = (A, B) => {
        let typeA=A.type || 'AIRPORT';
        let typeB=B.type || 'AIRPORT';
        if(typeA !== typeB){
            return typeB.localeCompare(typeA)
        }
        let weightA = A.weight || 0;
        let weightB = B.weight || 0;
        if (weightA !== weightB)
            return weightB - weightA;
        let nameA = A.airport_name || '';
        let nameB = B.airport_name || '';
        return nameA.localeCompare(nameB)
    }
    return results.sort(comparator);
}
const removeDupes = (airports) => {
    const isSame = (a,b) =>{
        return ((a.airport_iata_code === b.airport_iata_code) && (a.type === b.type));
    }
    let uniques = airports.filter((v,i,a)=>a.findIndex(t=>isSame(t,v))===i)
    return uniques;
}
const findAllAirportsOfCity = async (cityCode) => {
    let results = await searchAirports({type:'AIRPORT',city_code: cityCode}, {pagerank:-1,city_name:1 });
    return results;
}
const getMetropolitanArea = async (cityCode) => {
    let results = await searchAirports({type:'METROPOLITAN',city_code: cityCode});
    if(results && results.length>0)
        return results[0];
    return undefined;
}

// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "Newark Liberty Intl", "airport_iata_code" : "EWR", "type" : "AIRPORT", "country_name" : "United States", "timezone" : "America/New_York" }
// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "Stewart International", "airport_iata_code" : "SWF", "type" : "AIRPORT", "country_name" : "United States", "timezone" : "America/New_York" }
// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "LaGuardia", "airport_iata_code" : "LGA", "type" : "AIRPORT", "country_name" : "United States", "timezone" : "America/New_York" }
// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "John F Kennedy Intl", "airport_iata_code" : "JFK", "type" : "AIRPORT", "country_name" : "United States", "timezone" : "America/New_York" }
// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "Metropolitan Area", "airport_iata_code" : "NYC", "type" : "METROPOLITAN", "country_name" : "United States" }
// { "city_name" : "New York", "city_code" : "NYC", "country_code" : "US", "airport_name" : "Skyports SPB", "airport_iata_code" : "NYS", "type" : "AIRPORT", "country_name" : "United States" }

const airportLookupNew = async query => {
    if (!query || query.length < LOOKUP_CONFIG.MIN_QUERY_LENGTH) {
        return [];
    }
    return searchAirportByString(query);
};

const airportLookup = async (name) => {
    if (!isQueryLongerOrEqualThan(name, LOOKUP_CONFIG.MIN_QUERY_LENGTH)) {
        return [];
    }

    //this should be optimized to avoid multiple calls - use one or two queries instead
    const promises = [
        searchByExactAirportCode(name),
        searchByCityCode(name),
        searchByAirportName(name),
        searchByCityName(name)];
    const results = await Promise.all(promises);
    let records = [];
    results.forEach(airports => {
        airports.forEach(airport => {
            records.push(airport)
        })
    })

    records = records.sort(multipleComparators([byPageRankComparator]));

    records = removeDupes(records);
    const MAX_LEN = 5;
    if (records.length > MAX_LEN) {
        records = records.splice(0, MAX_LEN)
    }
    let finalResults = [];

    //check if we have metro area - if so, find airports that belong to that city
    for (let airport of records) {
        let {city_code, airport_name, airport_iata_code, type, belongs_to_metropolitan} = airport
            if (type === 'AIRPORT')
            {
                if(belongs_to_metropolitan) {   //if airport belongs to metro, find metro and all cities that belong to it, add to results
                    let metro = await getMetropolitanArea(city_code);
                    if (metro) {
                        finalResults.push(metro)
                        let airports = await findAllAirportsOfCity(metro.city_code);
                        finalResults.push(...airports)
                    }
                }else {
                    //city does not belong to metro
                    finalResults.push(airport)
                }
            }
            if (type === 'METROPOLITAN') {  //it's metro area - add all cities that belong to it
                finalResults.push(airport)
                let airports = await findAllAirportsOfCity(city_code);
                finalResults.push(...airports)
            }
    }
    finalResults = removeDupes(finalResults);
    return finalResults;
}

module.exports = {
    searchByExactAirportCode, searchAirports, searchByCityName, searchByAirportName, airportLookup
}


