#!/usr/bin/env node

const HttpsProxyAgent = require('https-proxy-agent');
const localAddress = require('./address.json');

// 接收sol的地址
const addresses = localAddress || [];
const ignoreAddress = [];

const BASE = 1000000000;
const TESTNET = "https://api.testnet.solana.com/";
const DEVNET = "https://api.devnet.solana.com/";

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'))
    }, ms)

    promise
      .then(value => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(reason => {
        clearTimeout(timer)
        reject(reason)
      })
  })
}

async function request() {
  const newAddresses = addresses.filter((address) => !ignoreAddress.includes(address));
  if (newAddresses.length === 0) {
    throw new Error('Not Address');
  }

  const addr = newAddresses[random(0, newAddresses.length - 1)];
  let cfg = {
    url: DEVNET,
    amount: 2 * BASE,
    waiting: 15 * 1000,
  };
  switch (process.env.NETWORK) {
    case 'testnet':
      cfg = {
        url: TESTNET,
        amount: 1 * BASE,
        waiting: 15 * 1000,
      };
      break;
  }

  const options = {};
  if (process.env.PROXY_URL) {
    // Internet environment barrier
    options.agent = new HttpsProxyAgent(process.env.PROXY_URL);
  }

  const result = await timeout(30 * 1000, fetch(cfg.url, {
    ...options,
    method: 'POST',
    headers: {
      'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: uuid(),
      jsonrpc: "2.0",
      method: "requestAirdrop",
      params: [addr, cfg.amount],
    }),
  }));
  const content = await result.json();

  if (content.error && content.error.code === -32603) {
    switch (content.error.code) {
      case -32603:
        ignoreAddress.push(addr);
        break;
      case 503:
        cfg.waiting = 5 * 1000;
        break;
    }
  }
  console.log(content);

  return cfg;
}

try {
  const times = 60; // after 60 minutes
  const expireDate = Date.now() + (times * 60 * 1000);
  while (true) {
    if (Date.now() > expireDate) {
      throw new Error("Time end");
    }

    const { waiting } = await request();
    // rate limit
    await sleep(waiting);
  }
} catch (err) {
  console.error(err);
}
