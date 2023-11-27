function getLeakyBucketRateLimiter(rules) {
  let { resource, allowedRequests, timeWindowms } = rules
  resource = resource ?? '*'
  const queue = []
  let setIntervalProcess = null

  function leakyBucketRateLimiter(req, res, next) {
    if (resource !== '*' && resource !== req.url) 
      return next()
    

    if (queue.length >= allowedRequests) {
      res.setHeader('X-RateLimit-Limit', allowedRequests)
      res.setHeader('X-RateLimit-Remaining', allowedRequests - queue.length)
      res.setHeader('Retry-After-ms', timeWindowms / allowedRequests)
      return res.status(429).send(null)
    }

    
    queue.push([req, res, next])
    console.log('Enqueued request: ', req.rid)
    startBackgroundProcess()
  }

  function executeNextRequest() {
    if (!queue.length) {
      //all enqueued requests have been processed
      //the interval must be cleared to allow other enqueued 
      if (setIntervalProcess) {
        clearInterval(setIntervalProcess)
        setIntervalProcess = null
      }

      return
    }

    const [req, res, next] = queue.shift()
    res.setHeader('X-RateLimit-Limit', allowedRequests)
    res.setHeader('X-RateLimit-Remaining', allowedRequests - queue.length)
    next()
  }

  function startBackgroundProcess() {
    //if the regular intervals process if already going on 
    //the request that called this process, will have to wait
    if (setIntervalProcess) return

    //immediately serve the first request
    executeNextRequest()

    //set interval process for all other enqueued requests
    setIntervalProcess = setInterval(
      executeNextRequest,
      timeWindowms/allowedRequests
    )
  }

  return leakyBucketRateLimiter
}


function getTokenBucketRateLimiter(rules) {
  let { resource, bucketSize, windowms, message} = rules
  const store = {
    tokens: 0,
    windowStartTime : 0
  }
  
  resource = resource ?? '*'
  if (!bucketSize || !windowms) 
    throw new Error('BucketSize and windowms are manadatory inputs')

  function tokenBucketRateLimiter(request, response, next) {
    if (resource !== '*' && request.url !== resource)
      return next()

    if (Date.now() - store.windowStartTime >= windowms) {
      store.tokens = 0
      store.windowStartTime = Date.now()
    }
    
    response.setHeader('X-RateLimit-Limit', bucketSize)
    if (store.tokens >= bucketSize) {
      const retryAfterTime = store.windowStartTime + windowms - Date.now()
      response.setHeader('X-RateLimit-Remaining', 0)
      response.setHeader('Retry-After', retryAfterTime)

      return response.status(429).send(message ?? null)
    }

    store.tokens += 1
    response.setHeader('X-RateLimit-Remaining', bucketSize-store.tokens)
    next()
  }

  return tokenBucketRateLimiter
}

module.exports = {
  getLeakyBucketRateLimiter,
  getTokenBucketRateLimiter,
}