import Agent from 'yakapa-agent-client'
import * as Common from 'yakapa-common'
import * as LZString from 'lz-string'

const agent = new Agent({
	port: 3002,
	server: 'https://mprj.cloudapp.net',
	tag: 'ea0d3ee6-ad65-47f4-9ff0-d25d7a18ed97',
	nickname: 'Streaming'
})

agent.client.emitter.on('connected', () => {
	Common.logger.info('Streaming connecté avec le tag', agent.client.tag)
})

agent.client.emitter.on('yakapa/stream', (socketMessage) => {

	const message = socketMessage.message
	const from = socketMessage.from
	const date = socketMessage.date
	const decompressed = LZString.decompressFromUTF16(message)

	Common.logger.info('Streaming', decompressed, 'asked from', from)
	const jsonMessage = JSON.parse(decompressed)
	
})