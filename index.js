// all seed from https://fdc.nal.usda.gov/download-seedsets.html
// Full Download of All seed Types -
//   direct package link: https://fdc.nal.usda.gov/fdc-seedsets/Foodseed_Central_csv_2021-10-28.zip
//
// this db does not contain smoke point data, so the sp data is found from here:
// https://www.masterclass.com/articles/cooking-oils-and-smoke-points-what-to-know-and-how-to-choose#why-is-oil-smoke-point-important
// https://en.wikipedia.org/wiki/Template:Smoke_point_of_cooking_oils

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
  palm: { sp: 235 },
  avocado: { sp: 270 },
  coconut: { sp: 204 },
  'virgin coconut': { id: '2152470', sp: 177 },
  sunflower: { sp: 232 },
  'sunflower, high': { sp: 232 },
  'olive, extra virgin': { sp: 163 },
  'olive, extra light': { sp: 200 },
  'refined sunflower & olive': { id: '1991749', sp: 240 },

  // seed
  corn: { sp: 232 },
  soybean: { sp: 234 },
  rice: { sp: 240 },
  canola: { sp: 204 },
  // rapeseed: {},
  peanut: { sp: 232 },
  sesame: { sp: 177 },
  cottonseed: { sp: 220 },
  grapeseed: { sp: 216 },
  teaseed: {},
  'flaxseed, cold': { sp: 107 },
  safflower: { sp: 254 },

  // nut
  walnut: { sp: 232 },
  almond: { sp: 221 },
  // apricot: {sp: 0 },
  hazelnut: { sp: 254 },
  macadamia: { id: '2084008', sp: 210 },

  // fat
  ghee: { sp: 232 }, // clarified butter
  'fat, beef tallow': { sp: 204 },
  lard: { id: '2116466', sp: 188 },
  // 'refined lard': { id: '2137792' },
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
      nids.sort((a, b) => 0.5 - (a.name < b.name))

      fs.writeFileSync('./nids.json', JSON.stringify(nids, null, 2))

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
