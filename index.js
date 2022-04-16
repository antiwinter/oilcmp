// all seed from https://fdc.nal.usda.gov/download-seedsets.html
// Full Download of All seed Types -
//   direct package link: https://fdc.nal.usda.gov/fdc-seedsets/Foodseed_Central_csv_2021-10-28.zip

// now we extrace seed of interest from this db

const _ = require('underscore')
const fs = require('fs')
const csv = require('fast-csv')
const log = console.log
const csv_go = (f, cb, done) => {
  fs.createReadStream(f)
    .pipe(csv.parse({ headers: true }))
    .on('error', (err) => log(err))
    .on('data', cb)
    .on('end', done)
}

let seed = {
  palm: {},
  avocado: {},
  coconut: {},
  'virgin coconut': { id: '2152470' },
  sunflower: {},
  'sunflower, high': {},
  'olive, extra virgin': {},
  'olive, extra light': {},
  'refined sunflower & olive': { id: '1991749' },

  // seed
  corn: {},
  soybean: {},
  rice: {},
  canola: {},
  // rapeseed: {},
  peanut: {},
  sesame: {},
  cottonseed: {},
  grapeseed: {},
  teaseed: {},
  'flaxseed, cold': {},
  safflower: {},

  // nut
  walnut: {},
  almond: {},
  apricot: {},
  macadamia: { id: '2084008' },

  // fat
  ghee: {},
  'fat, beef tallow': {},
  lard: { id: '2116466' },
  'refined lard': { id: '2137792' },
}
let data = {}
let nids = {}
let sdin = {}

// make regexp
let fat_begin
for (let k in seed) {
  if (k == 'ghee') fat_begin = 1
  seed[k].re = new RegExp(fat_begin ? k : `^oil, ${k}`, 'i')
}

let save = () => {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2), 'utf-8')
  // log('write to file')
}

let fix = () => {
  console.error('fixing up nutrients...')
  for (let id in data) {
    for (let nid in data[id]) {
      let x = parseInt(nid)
      if (isNaN(x)) continue
      else if (x < 1000) sdin[x] = 1
      else nids[x] = 1
    }
  }
  // log(nids)

  csv_go(
    './db_full/nutrient.csv',
    (row) => {
      if (row.id in nids || row.nutrient_nbr in sdin) {
        nids[row.id] = { ...row, c: 0 }
        sdin[row.nutrient_nbr] = row.id
      }
    },
    (c) => {
      // log('nids', nids)
      // change low_id to high_id
      for (let id in data) {
        for (let nid in data[id]) {
          if (!isNaN(parseInt(nid))) {
            if (nid in sdin) {
              data[id][sdin[nid]] = data[id][nid]
              delete data[id][nid]
            }
          }
        }
      }

      // clean nids
      for (let id in data) {
        for (let nid in data[id]) {
          if (!isNaN(parseInt(nid))) {
            if (data[id][nid].amount > 0) nids[nid].c++
          }
        }
      }

      nids = _.filter(nids, (x) => x.c)

      // final
      let header = [
        'Oil',
        ...nids.map((x) => `${x.name} (${x.unit_name})`.replace(/,/g, '.')),
      ]
      log(header.join(','))

      let seq = ['desc', ...nids.map((x) => x.id)]
      for (let id in data) {
        log(
          seq
            .map(
              (k, i) =>
                (!i
                  ? data[id][k].replace(/,/g, '.')
                  : data[id][k] && data[id][k].amount) || 0
            )
            .join(',')
        )
      }
      save()
      // log('done')
    }
  )
}

let nup = () => {
  console.error('setting up nutrients...')
  if (JSON.stringify(data).length > 20000) {
    fix()
  } else {
    let cur = 0
    csv_go(
      './db_full/food_nutrient.csv',
      (row) => {
        if (row.fdc_id in data) {
          data[row.fdc_id][row.nutrient_id] = { amount: parseFloat(row.amount) }
        }
        cur++
        if ((cur & 0xffff) == 0) process.stdout.write(`\r${cur / 21025860}`)
      },
      (c) => {
        log(`\nParsed ${c} rows`)
        save()
        fix()
      }
    )
  }
}

console.error('fetching entry...')
let wl = {
  foundation_food: 1,
  sr_legacy_food: 1,
  survey_fndds_food: 1,
}

try {
  data = require('./data.json')
  nup()
} catch (err) {
  csv_go(
    './db_full/food.csv',
    (row) => {
      for (let k in seed) {
        if (
          seed[k].id == row.fdc_id ||
          (!seed[k].id &&
            row.data_type in wl &&
            row.description.match(seed[k].re))
        ) {
          seed[k].et = row
          // delete seed[k]
        }
      }
    },
    (c) => {
      log(`Parsed ${c} rows`)
      for (let k in seed) {
        let et = seed[k].et
        if (!et) {
          log(k, 'not found')
          continue
        }
        data[et.fdc_id] = {
          seed: k,
          desc: et.description,
          date: et.publication_date,
        }
      }

      save()
      nup()
    }
  )
}
