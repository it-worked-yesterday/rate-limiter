const express = require('express')
const ruid = require('express-ruid')
const { getTokenBucketRateLimiter, getLeakyBucketRateLimiter } = require('./middlewares/ratelimiter')

const responseTime = require('response-time')
const morgan = require('morgan')

const app = express()
const port = 3000

app.use(ruid())
app.use(responseTime())

morgan.token('rid', function (req, res) { return req.rid })
app.use(morgan(':method :url :rid :status :res[content-length] - :response-time ms'))

app.listen(port, () => {
  console.log('app is listening on port: ', port)
})

app.get('/ping', (req, res) => {
  res.status(200).send({
    pong: true
  })
})

app.get('/publicResource', getLeakyBucketRateLimiter({
  resource: '/publicResource',
  allowedRequests: 5,
  timeWindowms: 10000
}), (req, res) => {
  res.status(200).send({
    message: "You are able to access this public resource"
  })
})