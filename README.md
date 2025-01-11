# OpenledgerBot
Openledger Bot 是一个用于自动化节点操作和每日奖励领取的工具

## 功能特性
- **自动化节点交互**
- **自动领取每日奖励**
- **支持代理服务器**

## 环境要求
- [Node.js](https://nodejs.org/) (版本14或更高)

## 安装步骤

1. 克隆仓库到本地：
   ```bash
   git clone https://github.com/huaguihai/OpenledgerBot.git
   ```
2. 进入项目目录：
   ```bash
   cd OpenledgerBot
   ```
3. 安装依赖：
   ```bash
   npm install
   ```

## 使用方法

1. 在运行脚本前，请先设置 `account.txt` 和 `proxy.txt`（如需使用代理）。以下是设置方法：
2. 账户配置：
   修改 `account.txt` 文件，填写您的账户信息
```
token1:workerID1:id1:ownerAddress1
token2:workerID2:id2:ownerAddress2
```
获取 `Token`, `WorkerID`, `id` 和 `owneraddress` 的步骤如下：
1. 首先注册账户，您可以[点击这里注册](https://testnet.openledger.xyz/?referral_code=cybav2l5ou)
2. 下载[浏览器扩展](https://chromewebstore.google.com/detail/openledger-node/ekbbplmjjgoobhdlffmgeokalelnmjjc)
3. 打开扩展程序，右键点击并选择`检查`![步骤1](https://github.com/user-attachments/assets/8abd970b-c1bc-44e1-b305-a9d76e7af063)

4. 切换到`网络`标签页，确保过滤器设置为`全部`![步骤2](https://github.com/user-attachments/assets/4fa5e1ce-b49c-46c4-b70e-26307d465d62)

5. 登录您的账户，登录后再次检查`网络`标签页，搜索websocket连接`(orch?auth...)`并打开![步骤3](https://github.com/user-attachments/assets/a09ab2e5-7873-44c4-a3ce-26feb0ee1dd0)

6. 打开`载荷`标签页，复制`bearer/authtoken`![步骤4](https://github.com/user-attachments/assets/1a14f452-ae2a-46e6-8d14-1a4d24ebd357)

7. 打开`消息`标签页，复制`WorkerID/identity`, `id` 和 `owneraddress` ![步骤5](https://github.com/user-attachments/assets/ec6069e8-6a22-45cd-bdc5-ac9352b155f5)



3. 如需使用代理，请修改并设置 `proxy.txt` 文件：
```
ip:端口
用户名:密码@ip:端口
http://ip:端口
http://用户名:密码@ip:端口
```
4. 运行脚本：
```bash
node index.js
```
请不要删除 `data.json` 文件，它存储了您的websocket数据。

## 许可证
本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 注意事项
本脚本仅用于测试目的，使用此脚本可能违反服务条款并导致您的账户被永久封禁。

扩展程序链接：[浏览器扩展](https://chromewebstore.google.com/detail/openledger-node/ekbbplmjjgoobhdlffmgeokalelnmjjc)
仪表盘链接：[Openledger仪表盘](https://testnet.openledger.xyz/?referral_code=cybav2l5ou)