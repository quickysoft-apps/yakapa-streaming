import Agent from 'yakapa-agent-client'
import * as Common from 'yakapa-common'
import * as LZString from 'lz-string'

import * as path from 'path'
import * as fs from 'fs'
import dataForge from 'data-forge'

import express from 'express'

const SERVER = 'https://mprj.cloudapp.net'
const NICKNAME = 'Streaming'
const EMAIL = 'n/a'
const TAG = 'ea0d3ee6-ad65-47f4-9ff0-d25d7a18ed97'
const EVENT_PREFIX = 'yakapa'
const STREAMED = `${EVENT_PREFIX}/streamed`

const app = express().listen(3002)
const client = new Agent.Client({	server: SERVER,	tag: TAG,	nickname: NICKNAME })

const concat = (tags, extractors, selectors) => {
	let concatenatedData
	tags.map(tag => {
		const rootpath = path.join(__dirname, '..', '..', 'storage', tag)
		extractors.map(extractor => {
			const fullpath = path.join(rootpath, `${extractor}.json`)
			if (fs.existsSync(fullpath)) {
				const data = new dataForge.readFileSync(fullpath).parseJSON()
				concatenatedData = concatenatedData ? concatenatedData.concat(data) : data
			}
		})
	})
	return concatenatedData
}

const applyQuery = (data, query) => {
	const indexedData = data.parseDates("timestamp").setIndex("timestamp").orderBy(row => row.timestamp)
	switch (query.name) {
		case 'last':
			return indexedData.last()
		default:
			return indexedData.last()
	}
}

const applySelectors = (data, selectors) => {
	const columns = data.getColumnNames()
	const mandatorySelectors = selectors.concat(['timestamp', 'tag', 'extractor'])
	const excludedColumns = columns.filter(column => mandatorySelectors.findIndex(column) === -1)
	return data.dropSeries(excludedColumns)
}

client.emitter.on('connected', () => {
	Common.Logger.info('Streaming connecté avec le tag', client.tag)
})

client.emitter.on('yakapa/stream', (socketMessage) => {
	const {	message, from, date } = socketMessage
	const decompressed = LZString.decompressFromUTF16(message)
	Common.Logger.info('Streaming', decompressed, 'asked from', from)
	const jsonMessage = JSON.parse(decompressed)
	const {	name, tags,	extractors,	selectors, query } = jsonMessage
	const concatenatedData = concat(tags, extractors, selectors)
	const queryData = [].concat(applyQuery(concatenatedData, query))
	const selectedData = applySelectors(new dataForge.DataFrame(queryData), selectors)			
	const streamedMessage = {	name,	data: selectedData.toArray() }
	client.emit(STREAMED, JSON.stringify(streamedMessage), from) 
})