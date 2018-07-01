import * as request from 'request-promise'
import * as cheerio from 'cheerio'
import { Result } from './result'
import * as puppeteer from 'puppeteer'

class Source {
    public url: string = null
    public resultAttributes: any[] = []
    public resultSelector: string = null
}

export class JSONSource extends Source {
    public type = 'json'

    public async scrape(formatters: any[]): Promise<Result[]> {
        console.log('➡️ scraping', this.url)
        const response = await request.get(this.url, { resolveWithFullResponse: true })
        const contents = JSON.parse(response.body)
        const results = contents[this.resultSelector]
        const attributes = this.resultAttributes
        const resultList: Result[] = []

        results.forEach((resultElement: any) => {
            const resultAttributes: any = {}

            attributes.forEach((attribute: any) => {
                const { type, selector, format } = attribute
                const element = resultElement[selector]
                resultAttributes[type] = format ? format(element) : element
            })

            resultList.push(Object.assign(new Result(), resultAttributes))
        })

        console.log('✔️ found', resultList.length, 'results for', this.url)

        return resultList
    }
}

export class HTMLSource extends Source {
    public type = 'html'
    // @todo add to tests
    public nextPageLink: string = null

    private async getPageContents(): Promise<{ browser: puppeteer.Browser, page: puppeteer.Page}> {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        })

        const page = await browser.newPage()
        console.log("➡️ scraping", this.url)
        page.setViewport({ width: 1280, height: 1000 })
        await page.goto(this.url)

        return { browser, page }
    }

    private async extractResults(response: string, formatters: any[]): Promise<Result[]> {
        const $: CheerioStatic = cheerio.load(response)
        const results = $(this.resultSelector)
        const attributes = this.resultAttributes
        const resultList: Result[] = []

        results.toArray().forEach((resultElement: CheerioElement) => {
            const resultAttributes: any = {}

            attributes.forEach((attribute: any) => {
                const { type, selector } = attribute
                const format = attribute.format || formatters[type]
                const element = selector ? $(selector, resultElement) : $(resultElement)
                try {
                    resultAttributes[type] = format($, element)
                } catch (e) {
                    console.log(e)
                }
            })

            resultList.push(Object.assign(new Result(), resultAttributes))
        })

        return resultList
    }

    public async scrape(formatters: any[]): Promise<Result[]> {
        const { browser, page } = await this.getPageContents()
        const results = []

        if (!this.nextPageLink) {
            const response = await page.content()
            await browser.close()
            return this.extractResults(response, formatters)
        }

        // @todo use time period in a while loop, remove block above
        for (let i = 0; i < 5; i++) {
            if (i > 0) {
                await page.click(this.nextPageLink)
                await page.waitForSelector(this.resultSelector)
            }

            const response = await page.content()
            results.push(await this.extractResults(response, formatters))
        }

        const flatResults = results.reduce((acc, val) => acc.concat(val), [])
        console.log('✔️ found', flatResults.length, 'results for', this.url)
        await browser.close()

        return flatResults
    }
}

