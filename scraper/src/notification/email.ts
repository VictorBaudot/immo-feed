import * as request from 'request-promise'
import chalk from 'chalk'
import emailTemplate from './email-template'

export default function notify(updatedResults: any[]) {
    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_API_BASE_URL
    const email = process.env.MAILGUN_NOTIFY_EMAIL

    if ([apiKey, domain, email].some(key => !key)) {
        console.log(chalk.red('You need to define MAILGUN_API_KEY, MAILGUN_API_BASE_URL and MAILGUN_NOTIFY_EMAIL in your environment variables'))
        process.exit(1)
    }

    return request.post(`${domain}/messages`, {
        headers: {
            Authorization: 'Basic ' + new Buffer('api:' + apiKey).toString('base64')
        },
        form: {
            from: email,
            to: email,
            subject: `🏠 immo-feed - ${updatedResults.length} new result${updatedResults.length > 1 ? 's' : ''} found`,
            html: emailTemplate(updatedResults)
        }
    })
    .then(() => console.log(chalk.green(`  🔔  Email sent to ${email}`)))
    .catch((err: Error) => console.log(chalk.green(`  🔔  Email sending to ${email} failed`), err))
}
