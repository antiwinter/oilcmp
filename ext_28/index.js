#!/usr/bin/env node
const fs = require('fs')
const log = console.log
const txt = fs.readFileSync('./ext_28/1.html')
const async = require('async')
const _ = require('underscore')

const { DomHandler } = require("domhandler");
const { Parser, parseDocument } = require("htmlparser2");

let count = 0
let unparsed = []
let parseOne = (d, cb) => {

  if (!Array.isArray(d))
    d = [d]

  count++
  // if (d[0].name == 'div') log(d[0])
  let res = { tag: d[0].name, txt: d[0].data, t: d[0].attribs, count }

  if (d[0].type == 'text') {
    // log(count, 'setting tag')
    res.tag = 'text'
    res.txt = _.filter(res.txt.replace(/\\r\\n|\r\n/g, '').trim().split(' '), x => x != '').join(' ')
    if (res.txt == '')
      return
  }

  if (d[0].children)
    for (let i = d[0].children.length - 1; i >= 0; i--)
      unparsed.push(d[0].children[i])
  // for (let i = 1; i < d.length; i++)
  //   unparsed.shift(d[i])

  if (!res.t) res.t = {}

  cb(res)
}

const pt = [
  { name: 'id', tag: 'h3', fill: 1 },
  { name: 'serving_size_g', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-serving_size' }, fill: 2 },
  { name: 'calories_per_serving_size', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-calories_per_serving_size' }, fill: 2 },
  { name: 'Fat_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-total_fat_' }, fill: 2 },
  { name: 'Plant_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-saturated_fat_from_plants' }, fill: 2 },
  { name: 'Animal_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-saturated_fat_from_animals' }, fill: 2 },
  { name: 'MUFA_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-monunsaturated_fat_' }, fill: 2 },
  { name: 'PUFA_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-polyunsaturated_fat_' }, fill: 2 },
  { name: 'Trans_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-trans_fats_' }, fill: 2 },
  { name: 'sodium_mg', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-sodium' }, fill: 2 },
  { name: 'protein_g', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-protein' }, fill: 2 },
  { name: 'carbohydrates_g', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-carbohydrates' }, fill: 2 },
  { name: 'smoke_point_C', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-smoke_point' }, fill: 2 },
  { name: 'vitamin_e_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-vitamin_e' }, fill: 2 },
  { name: 'vitamin_k_1', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-vitamin_k' }, fill: 2 },
  { name: 'best_suited_for', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-best_suited_for' }, fill: 2 },
  { name: 'oil_note3', tag: 'div', t: { class: 'pt-cv-custom-fields pt-cv-ctf-oil_note3' }, fill: 2 },
]
let pd = []
let o = {}
let oo = {}
let pdd = []

const handler = new DomHandler((error, dom) => {
  if (error) {
    // Handle error
  } else {
    // Parsing completed, do something
    unparsed.push(dom)
    for (; ;) {
      let d = unparsed.pop()
      if (!d) {
        // log('done')

        // log(pd)
        pd.forEach((d, i) => {
          if (!d.calories_per_serving_size) return
          // log('\n===', i)
          let o = {}
          for (let k in d) {
            o[k] = d[k].data[d[k].data.length - 1]

            if (k != 'id' && k != 'best_suited_for' && k != 'oil_note3') {
              let n = o[k].split('-').map(x => {
                let y = parseFloat(x)
                return x.match(/%/) ? y / 100 : y
              })
              o[k] = n[0]
            }
          }
          pdd.push(o)
        })

        log(pt.map(p => p.name).join(','))
        pdd.forEach((d, i) => {
          let dd = []
          pt.forEach(p => {
            let x = d[p.name]
            if (!x) x = ''
            else if (typeof x == 'string') x = x.replace(/,/g, '.')
            dd.push(x)
          })
          log(dd.join(','))
        })
        break
      }

      parseOne(d, x => {
        // if (x && x.t) log(x)
        if (x.tag == 'text') {
          // log('got text', o, x)
          if (o.fill) {
            // log('filling', x)
            o.data.push(x.txt)
            o.fill--
          }
        }
        else
          pt.forEach((p, i) => {
            // log('matching', x, p)
            let mc = 1
            if (p.tag != x.tag)
              mc = 0
            if (p.t)
              for (let k in p.t)
                if (p.t[k] != x.t[k])
                  mc = 0

            if (mc) {
              if (i == 0) {
                pd.push(oo)
                oo = {}
              }
              o = { fill: p.fill, data: [] }
              oo[p.name] = o
            }
          })
      })

    }
  }
});

const parser = new Parser(handler);
parser.write(txt);
parser.end();
