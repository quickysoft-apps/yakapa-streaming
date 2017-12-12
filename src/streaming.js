import * as Common from 'yakapa-common'
import * as path from 'path'
import * as fs from 'fs'
import perfy from 'perfy'
import { InfluxDB } from 'influx'

export default class Streaming {

  constructor(name, select,	measurements,	tags, where, groupby, limit) {
    this._influx = new InfluxDB({
      database: 'yakapa',
      host: 'localhost',
      port: 8086,
      username: 'yakapa',
      password: 'Yakapa+123'
    })
    this._name = name    
    this._select = select
    this._measurements = measurements
    this._tags = tags
    this._where = where
    this._groupby = groupby
    this._limit = limit
  }

  execute(onStreamed, onError) {
    try {
      perfy.start('stream')
      const where = this._where ? `where ${this._where}` : ''
      const groupby = this._groupby ? `groupby ${this._groupby}` : ''
      const limit = this._limit ? `limit ${this._limit}` : ''        
      const query = `select ${this._select} from ${this._measurements.map(x => `"threedays"."${x}"`)} ${where} ${groupby} ${limit}`      
      this._influx.query(query).then(data => {
        onStreamed(data)  
        Common.Logger.info(`${this._name} streamed in`, perfy.end('stream').time, 's')
      })

    } catch (error) {
      Common.Logger.error(error)
      Common.Logger.info(`${this._name} streaming end with error in`, perfy.end('stream').time, 's')
      if (onError) {
        onError()
      }
    }
  }

}