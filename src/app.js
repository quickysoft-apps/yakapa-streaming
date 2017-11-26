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

const concat = (tags, jobs) => {
	let concatenatedData
	tags.map(tag => {
		const rootpath = path.join(__dirname, '..', '..', 'storage', tag)
		jobs.map(job => {
			const fullpath = path.join(rootpath, `${job}.json`)
			if (fs.existsSync(fullpath)) {
				const data = new dataForge.readFileSync(fullpath).parseJSON()
				concatenatedData = concatenatedData ? concatenatedData.concat(data) : data
			}
		})
	})
	return concatenatedData
}

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

const applySubset = (data, subset) => {
	const columns = data.getColumnNames()
	const mandatorySelectors = selectors.concat(['timestamp', 'tag', 'job'])
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
	
	const {	name, tags,	jobs,	queries } = JSON.parse(decompressed)
	const concatenatedData = concat(tags, jobs)
	
	queries.map(query => {		
		const queryData = [applyQuery(concatenatedData, query)]
		let data = new dataForge.DataFrame(queryData)
		if (query.subset) {
			data = data.subset(query.subset)	
		}		
		
		const streamedMessage = {	
			name,	
			query: query.name, 
			data: data.toArray() 
		}
		client.emit(STREAMED, JSON.stringify(streamedMessage), from) 
	})
	
})