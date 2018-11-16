import { Storage } from '../../../api/postgres'
import { Job, DoneCallback } from 'bull';

module.exports = async function(job: Job, done: DoneCallback) {
    try {
        const storage = new Storage()
        const results = job.data
        const storedResults = []

        for (let result of results) {
            storedResults.push(await storage.updateOrCreate(result))
        }

        storage.cleanup()

        console.log('stored', storedResults.length)
        done(null, storedResults)
    } catch (e) {
        done(e)
    }
}
