import Agent from 'yakapa-agent-client'
import * as Common from 'yakapa-common'
import * as LZString from 'lz-string'

import express from 'express'

const app = express().listen(3002)
const client = new Agent.Client({
	server: 'https://mprj.cloudapp.net', 
	tag: 'ea0d3ee6-ad65-47f4-9ff0-d25d7a18ed97', 
	nickname: 'Streaming'
})

client.emitter.on('connected', () => {
	Common.Logger.info('Streaming connecté avec le tag', client.tag)
})

client.emitter.on('yakapa/stream', (socketMessage) => {

	const message = socketMessage.message
	const from = socketMessage.from
	const date = socketMessage.date
	const decompressed = LZString.decompressFromUTF16(message)

	Common.Logger.info('Streaming', decompressed, 'asked from', from)
	const jsonMessage = JSON.parse(decompressed)
	
})