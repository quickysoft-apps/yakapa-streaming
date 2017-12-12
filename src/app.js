import Agent from 'yakapa-agent-client'
import * as Common from 'yakapa-common'
import * as LZString from 'lz-string'
import { InfluxDB } from 'influx'
import * as path from 'path'
import * as fs from 'fs'

import Streaming from './streaming'

import express from 'express'

const SERVER = 'https://mprj.cloudapp.net'
const NICKNAME = 'Streaming'
const EMAIL = 'n/a'
const TAG = 'ea0d3ee6-ad65-47f4-9ff0-d25d7a18ed97'
const EVENT_PREFIX = 'yakapa'
const STREAMED = `${EVENT_PREFIX}/streamed`

const app = express().listen(3002)
const client = new Agent.Client({ server: SERVER, tag: TAG, nickname: NICKNAME })

const applyQuery = (data, query) => {
  switch (query.name) {
    case 'last':
      const indexedData = data.parseDates("timestamp").setIndex("timestamp").orderBy(row => row.timestamp)
      return indexedData.last()
    case 'average':
      return data.getSeries(query.series).average()
    default:
      return indexedData.last()
  }
}


client.emitter.on('connected', () => {
  Common.Logger.info('Streaming connecté avec le tag', client.tag)
})

client.emitter.on('yakapa/stream', (socketMessage) => {
  const { message, from, date } = socketMessage
  const decompressed = LZString.decompressFromUTF16(message)
  Common.Logger.info('Streaming', decompressed, 'asked from', from)

  const { name, select, measurements, tags, where, groupby, limit } = JSON.parse(decompressed)
  const streaming = new Streaming(name, select, measurements, tags, where, groupby, limit)
  streaming.execute(
    (res) => {      
      const streamedMessage = {
        name,
        data: res
      }
      client.emit(STREAMED, JSON.stringify(streamedMessage), from)
    },
    (error) => {
      Common.Logger.warn('Le streaming a échoué pour', from, error)
    }
  )


})