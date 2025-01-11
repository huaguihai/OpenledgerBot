const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { v4: uuidv4 } = require('uuid');

// 显示标题
function displayHeader() {
  const width = process.stdout.columns;
  const headerLines = [
    "<|============================================|>",
    " OpenLedger Bot ",
    " github.com/recitativonika ",
    "<|============================================|>"
  ];
  headerLines.forEach(line => {
    console.log(`\x1b[36m${line.padStart((width + line.length) / 2)}\x1b[0m`);
  });
}

// 读取并解析账户信息
const tokens = fs.readFileSync('account.txt', 'utf8').trim().split(/\s+/).map(line => {
  const parts = line.split(':');
  if (parts.length !== 4) {
    console.warn(`跳过格式错误的行: ${line}`);
    return null;
  }
  const [token, workerID, id, ownerAddress] = parts;
  return { token: token.trim(), workerID: workerID.trim(), id: id.trim(), ownerAddress: ownerAddress.trim() };
}).filter(tokenObj => tokenObj !== null);

// 读取代理列表
let proxies = [];
try {
  proxies = fs.readFileSync('proxy.txt', 'utf8').trim().split(/\s+/);
} catch (error) {
  console.error('读取proxy.txt时出错:', error.message);
}

// 检查代理数量是否足够
if (proxies.length < tokens.length) {
  console.error('代理数量少于账户数量。请提供足够的代理。');
  process.exit(1);
}

const accountIDs = {};

// 读取GPU列表
const gpuList = JSON.parse(fs.readFileSync('src/gpu.json', 'utf8'));

// 读取或初始化数据分配
let dataAssignments = {};
try {
  dataAssignments = JSON.parse(fs.readFileSync('data.json', 'utf8'));
} catch (error) {
  console.log('未找到现有数据分配，初始化新分配。');
}

// 获取或分配资源
function getOrAssignResources(workerID) {
  if (!dataAssignments[workerID]) {
    const randomGPU = gpuList[Math.floor(Math.random() * gpuList.length)];
    const randomStorage = (Math.random() * 500).toFixed(2);
    dataAssignments[workerID] = {
      gpu: randomGPU,
      storage: randomStorage
    };
    try {
      fs.writeFileSync('data.json', JSON.stringify(dataAssignments, null, 2));
    } catch (error) {
      console.error('写入data.json时出错:', error.message);
    }
  }
  return dataAssignments[workerID];
}

// 询问是否使用代理
async function askUseProxy() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    function ask() {
      rl.question('是否使用代理？(y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          resolve(true);
          rl.close();
        } else if (answer.toLowerCase() === 'n') {
          resolve(false);
          rl.close();
        } else {
          console.log('请回答 y 或 n。');
          ask();
        }
      });
    }
    ask();
  });
}

// 获取账户ID
async function getAccountID(token, index, useProxy, delay = 60000) {
  const proxyUrl = proxies[index];
  const agent = useProxy ? new HttpsProxyAgent(proxyUrl) : undefined;
  const proxyText = useProxy ? proxyUrl : 'False';

  let attempt = 1;
  while (true) {
    try {
      const response = await axios.get('https://apitn.openledger.xyz/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        httpsAgent: agent
      });
      const accountID = response.data.data.id;
      accountIDs[token] = accountID;
      console.log(`\x1b[33m[${index + 1}]\x1b[0m 账户ID \x1b[36m${accountID}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);
      return;
    } catch (error) {
      console.error(`\x1b[33m[${index + 1}]\x1b[0m 获取账户ID时出错，索引 ${index}，尝试 ${attempt}:`, error.message);
      console.log(`\x1b[33m[${index + 1}]\x1b[0m ${delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

// 获取账户详情
async function getAccountDetails(token, index, useProxy, retries = 3, delay = 60000) {
  const proxyUrl = proxies[index];
  const agent = useProxy ? new HttpsProxyAgent(proxyUrl) : undefined;
  const proxyText = useProxy ? proxyUrl : 'False';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const rewardRealtimeResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_realtime', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        httpsAgent: agent
      });

      const rewardHistoryResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward_history', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        httpsAgent: agent
      });

      const rewardResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/reward', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        httpsAgent: agent
      });

      const totalHeartbeats = parseInt(rewardRealtimeResponse.data.data[0].total_heartbeats, 10);
      const totalPoints = parseInt(rewardHistoryResponse.data.data[0].total_points, 10);
      const totalPointFromReward = parseFloat(rewardResponse.data.data.totalPoint);
      const epochName = rewardResponse.data.data.name;

      const total = totalHeartbeats + totalPointFromReward;

      console.log(`\x1b[33m[${index + 1}]\x1b[0m 账户ID \x1b[36m${accountIDs[token]}\x1b[0m, 总心跳 \x1b[32m${totalHeartbeats}\x1b[0m, 总积分 \x1b[32m${total.toFixed(2)}\x1b[0m (\x1b[33m${epochName}\x1b[0m), 代理: \x1b[36m${proxyText}\x1b[0m`);
      return;
    } catch (error) {
      console.error(`获取账户详情时出错，索引 ${index}，尝试 ${attempt}:`, error.message);
      if (attempt < retries) {
        console.log(`${delay / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`所有重试尝试均失败。`);
      }
    }
  }
}

// 检查并领取奖励
async function checkAndClaimReward(token, index, useProxy, retries = 3, delay = 60000) {
  const proxyUrl = proxies[index];
  const agent = useProxy ? new HttpsProxyAgent(proxyUrl) : undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const claimDetailsResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_details', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        httpsAgent: agent
      });

      const claimed = claimDetailsResponse.data.data.claimed;

      if (!claimed) {
        const claimRewardResponse = await axios.get('https://rewardstn.openledger.xyz/api/v1/claim_reward', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          httpsAgent: agent
        });

        if (claimRewardResponse.data.status === 'SUCCESS') {
          console.log(`\x1b[33m[${index + 1}]\x1b[0m 账户ID \x1b[36m${accountIDs[token]}\x1b[0m \x1b[32m成功领取每日奖励!\x1b[0m`);
        }
      }
      return;
    } catch (error) {
      console.error(`领取奖励时出错，索引 ${index}，尝试 ${attempt}:`, error.message);
      if (attempt < retries) {
        console.log(`${delay / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`所有重试尝试均失败。`);
      }
    }
  }
}

// 定期检查并领取奖励
async function checkAndClaimRewardsPeriodically(useProxy) {
  const promises = tokens.map(({ token }, index) => checkAndClaimReward(token, index, useProxy));
  await Promise.all(promises);

  setInterval(async () => {
    const promises = tokens.map(({ token }, index) => checkAndClaimReward(token, index, useProxy));
    await Promise.all(promises);
  }, 12 * 60 * 60 * 1000);
}

// 处理请求
async function processRequests(useProxy) {
  const promises = tokens.map(({ token, workerID, id, ownerAddress }, index) => {
    return (async () => {
      await getAccountID(token, index, useProxy);
      if (accountIDs[token]) {
        await getAccountDetails(token, index, useProxy);
        await checkAndClaimReward(token, index, useProxy);
        connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy);
      }
    })();
  });

  await Promise.all(promises);
}

// 连接WebSocket
function connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy) {
  const wsUrl = `wss://apitn.openledger.xyz/ws/v1/orch?authToken=${token}`;
  let ws = new WebSocket(wsUrl);
  const proxyText = useProxy ? proxies[index] : 'False';
  let heartbeatInterval;

  const browserID = uuidv4();
  const connectionUUID = uuidv4();

  // 发送心跳
  function sendHeartbeat() {
    const { gpu: assignedGPU, storage: assignedStorage } = getOrAssignResources(workerID);
    const heartbeatMessage = {
      message: {
        Worker: {
          Identity: workerID,
          ownerAddress,
          type: 'LWEXT',
          Host: 'chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc'
        },
        Capacity: {
          AvailableMemory: (Math.random() * 32).toFixed(2),
          AvailableStorage: assignedStorage,
          AvailableGPU: assignedGPU,
          AvailableModels: []
        }
      },
      msgType: 'HEARTBEAT',
      workerType: 'LWEXT',
      workerID
    };
    console.log(`\x1b[33m[${index + 1}]\x1b[0m 发送心跳，workerID: \x1b[33m${workerID}\x1b[0m, 账户ID \x1b[33m${accountIDs[token]}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);
    ws.send(JSON.stringify(heartbeatMessage));
  }

  ws.on('open', function open() {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m 已连接WebSocket，workerID: \x1b[33m${workerID}\x1b[0m, 账户ID \x1b[33m${accountIDs[token]}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);

    const registerMessage = {
      workerID,
      msgType: 'REGISTER',
      workerType: 'LWEXT',
      message: {
        id,
        type: 'REGISTER',
        worker: {
          host: 'chrome-extension://ekbbplmjjgoobhdlffmgeokalelnmjjc',
          identity: workerID,
          ownerAddress,
          type: 'LWEXT'
        }
      }
    };
    ws.send(JSON.stringify(registerMessage));

    heartbeatInterval = setInterval(sendHeartbeat, 30000);
  });

  ws.on('message', function incoming(data) {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m 收到workerID \x1b[33m${workerID}\x1b[0m的消息: ${data}, 账户ID \x1b[33m${accountIDs[token]}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);
  });

  ws.on('error', function error(err) {
    console.error(`\x1b[33m[${index + 1}]\x1b[0m WebSocket错误，workerID \x1b[33m${workerID}\x1b[0m:`, err);
  });

  ws.on('close', function close() {
    console.log(`\x1b[33m[${index + 1}]\x1b[0m WebSocket连接关闭，workerID \x1b[33m${workerID}\x1b[0m, 账户ID \x1b[33m${accountIDs[token]}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);
    clearInterval(heartbeatInterval);
    setTimeout(() => {
      console.log(`\x1b[33m[${index + 1}]\x1b[0m 重新连接WebSocket，workerID: \x1b[33m${workerID}\x1b[0m, 账户ID \x1b[33m${accountIDs[token]}\x1b[0m, 代理: \x1b[36m${proxyText}\x1b[0m`);
      connectWebSocket({ token, workerID, id, ownerAddress }, index, useProxy);
    }, 30000);
  });
}

// 定期更新账户详情
async function updateAccountDetailsPeriodically(useProxy) {
  setInterval(async () => {
    const promises = tokens.map(({ token }, index) => getAccountDetails(token, index, useProxy));
    await Promise.all(promises);
  }, 5 * 60 * 1000);
}

// 主函数
(async () => {
  displayHeader();
  const useProxy = await askUseProxy();
  await checkAndClaimRewardsPeriodically(useProxy);
  await processRequests(useProxy);
  updateAccountDetailsPeriodically(useProxy);
})();
