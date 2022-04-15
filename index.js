// all data from https://fdc.nal.usda.gov/download-datasets.html
// Full Download of All Data Types -
//   direct package link: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2021-10-28.zip

// now we extrace data of interest from this db

const fs = require('fs')
const csv = require('fast-csv')
const log = console.log

let data = {
  Coconut: {},
  palm: {},
  'olive, extra virgin': {},
  'olive, extra light': {},
  Avocado: {},
  Safflower: {},
  Canola: {},
  rapeseed: {},
  Corn: {},
  Peanut: {},
  Sesame: {},
  Cottonseed: {},
  Soybean: {},
  Sunflower: {},
  'Sunflower, high': {},
  Grapeseed: {},
  teaseed: {},
  Macadamia: { id: '2084008' },

  // fat
  tallow: {},
  ghee: {},
  LARD: { id: '2116466' },
  'refined lard': { id: '2137792' },
  'Virgin Coconut': { id: '2152470' },
}

let csv_go = (f, cb, done) => {
  fs.createReadStream(f)
    .pipe(csv.parse({ headers: true }))
    .on('error', (err) => log(err))
    .on('data', cb)
    .on('end', done)
}

// make regexp
let fat_begin
for (let k in data) {
  if (k == 'tallow') fat_begin = 1
  data[k].re = new RegExp(fat_begin ? k : `^oil, ${k}`, 'i')
}

log('fetching entry...')
let wl = {
  foundation_food: 1,
  sr_legacy_food: 1,
  survey_fndds_food: 1,
}

csv_go(
  './db_full/food.csv',
  (row) => {
    for (let k in data) {
      if (
        data[k].id == row.fdc_id ||
        (!data[k].id &&
          row.data_type in wl &&
          row.description.match(data[k].re))
      ) {
        data[k].et = row
        // delete data[k]
      }
    }
  },
  (c) => {
    log(`Parsed ${c} rows`)
    for (let k in data) {
      log(k, data[k].et)
    }
  }
)
