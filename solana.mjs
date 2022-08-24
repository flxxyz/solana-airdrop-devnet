#!/usr/bin/env node

const HttpsProxyAgent = require('https-proxy-agent');
const localIgnoreAddress = require('./ignoreAddress.json');

// 接收sol的地址
const addresses = [
  'FX4uPshuUKe21Ys33xjqaFVG9HkRq2ecvNEU61TppRMr',
  '7mzxFYbKPwJqgwUxwC8QNM4MpMG3Xp3sUYkX6u2P5fZ',
  '8JJNC281jK9bXxu6QcSzdEYM15LjbssPTq7UymrtZRTK',
  'C2wGsGYBEjejcejZTnXgCJvdChBU9LeGVuGCykGzUwUo',
  'Efb9NkC1o3YnNQPA9rwhRhs4jjPiFxv7PFzNZ4962LH1',
];
const ignoreAddress = localIgnoreAddress || [];

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

async function request(i) {
  const newAddresses = addresses.filter((address) => !ignoreAddress.includes(address));
  if (newAddresses.length === 0) {
    throw new Error('Not Address');
  }
  const addr = newAddresses[random(0, newAddresses.length - 1)];
  const config = [
    {
      url: TESTNET,
      amount: 1 * BASE,
      waiting: 10 * 1000,
    },
    {
      url: DEVNET,
      amount: 2 * BASE,
      waiting: 8 * 1000,
    },
  ];
  const cfg = config[i % 2] || config[0];

  try {
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
	  params:[addr, cfg.amount],
	}),
    }));
    const content = await result.json();

    if (content.code === -32603) {
      ignoreAddress.push(addr);
    }
    console.log(content);
  } catch (err) {
    console.error(err);
  }

  // rate limit
  await sleep(cfg.waiting);

  // next request, or exit
  if ((i - 1) !== 0) {
    await request(i - 1);
  }
}

// 5000 times!
await request(5000);

