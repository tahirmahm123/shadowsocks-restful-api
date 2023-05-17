# Shadowsocks Restful Api
A secure, reliable, standard restful api for managing shadowsocks-libev.

A Complete Rewrite as a Source Code of [shadowsocks-restful-api](https://github.com/Eggham/shadowsocks-restful-api.git).
The [original repo](https://github.com/Eggham/shadowsocks-restful-api.git) is only compiled form and is very old. 
## Install (Ubuntu 16.04)

#### Download shadowsocks-restful-api:
```
cd ~
git clone https://github.com/tahirmahm123/shadowsocks-restful-api.git
```

#### Install Node:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo bash -
sudo apt-get install nodejs -y
```

#### Install dependencies:
```
sudo apt-get install -y python-dev make g++ screen
cd ~/shadowsocks-restful-api
npm i
```

#### Install shadowsocks-libev:
```
sudo apt-get install software-properties-common -y
sudo add-apt-repository ppa:max-c-lv/shadowsocks-libev -y
sudo apt-get update
sudo apt install shadowsocks-libev
```

#### Create digital certificate:
```
cd ~/shadowsocks-restful-api
openssl req -nodes -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365
```

#### Create config file:
```
cd ~/shadowsocks-restful-api
touch .env
echo 'LOGIN_PASSWORD = pleaseChangeThisPassword' >> .env
echo 'LISTEN_PORT = 4001' >> .env
```

## Run

#### Run shadowsocks-libev in the background:
```
screen -dm ss-manager -u --manager-address /tmp/shadowsocks-manager.sock --fast-open
```

#### Run shadowsocks-restful-api in the background:
```
cd ~/shadowsocks-restful-api
screen -dm node app.js
```

## API

#### Login
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  POST                                                             |
| Request URL:                  |  https://host_name:port/login                                     |
| Request Header:               |  Content-Type: application/json                                   |
| Request Body:                 |  {"password": "your_login_password"}                              |
| Response HTTP Status Code:    |  201 Created                                                      |
| Response Body:                |  {"token","your_authentication_token"}                            |
| Response Error Status Code:   |  401 Unauthorized <br> 500 Internal Server Error                  |

Request example (curl):  
```
curl -ik -H "Content-Type: application/json" -X POST -d '{"password":"pleaseChangeThisPassword"}' https://localhost:4001/login
```
Response example:  
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk"}
```

#### Ping
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  GET                                                              |
| Request URL:                  |  https://host_name:port/ping                                      |
| Request Header:               |  Authorization: Bearer your_authentication_toke                   |
| Response HTTP Status Code:    |  200 OK                                                           |
| Response Body:                |  {"pong":"pong"}                                                  |
| Response Error Status Code:   |  401 Unauthorized <br>424 (shadowsocks unreachable) <br> 425 (shadowsocks no response) <br> 500 Internal Server Error |

Request example (curl):  
```
curl -ik -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk" https://localhost:4001/ping
```
Response example:  
```json
{"pong":"pong"}
```

#### Add a port
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  POST                                                             |
| Request URL:                  |  https://host_name:port/                                          |
| Request Header:               |  Content-Type: application/json <br> Authorization: Bearer your_authentication_toke |
| Request Body:                 |  {"port": port_number, "password": "port_password", "method": "encryption_method"}                |
| Response HTTP Status Code:    |  201 Created                                                      |
| Response Error Status Code:   |  401 Unauthorized <br> 409 (port already exists from shadowsocks) <br> 410 (port not available from operating system) <br> 422 (shadowsocks failed adding port) <br> 427 (operating system failed adding port) 424 (shadowsocks unreachable) <br> 425 (shadowsocks no response) <br> 500 Internal Server Error |

Request example (curl):  
```
curl -ik -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk" -X POST -d '{"port": 50000,"password":"2owkq9wu2elwst7","method":"chacha20-ietf-poly1305"}' https://localhost:4001/
```

Supported encryption methods are: 
  * `aes-128-gcm`
  * `aes-192-gcm`
  * `aes-256-gcm`
  * `aes-128-cfb`
  * `aes-192-cfb`
  * `aes-256-cfb`
  * `aes-128-ctr`
  * `aes-192-ctr`
  * `aes-256-ctr`
  * `camellia-128-cfb`
  * `camellia-192-cfb`
  * `camellia-256-cfb`
  * `bf-cfb`
  * `chacha20-ietf-poly1305`
  * `xchacha20-ietf-poly1305`
  * `salsa20`
  * `chacha20`
  * `chacha20-ietf`

  If the `method` field is not supplied, the default method is `aes-256-cfb`.

#### Delete a port
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  DELETE                                                           |
| Request URL:                  |  https://host_name:port?port=port_number                          |
| Request Header:               |  Authorization: Bearer your_authentication_toke                   |
| Response HTTP Status Code:    |  204 No Content                                                   |
| Response Error Status Code:   |  401 Unauthorized <br> 422 (shadowsocks failed removing port) <br> 427 (operating system failed removing port) <br> 424 (shadowsocks unreachable) <br> 425 (shadowsocks no response) <br> 500 Internal Server Error |

Request example (curl):  
```
curl -ik -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk" -X DELETE https://localhost:4001?port=50000
```

#### Get all ports
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  GET                                                              |
| Request URL:                  |  https://host_name:port/all                                       |
| Request Header:               |  Authorization: Bearer your_authentication_toke                   |
| Response HTTP Status Code:    |  200 OK                                                           |
| Response Body:                |  [{"port":port_number, "password":"port_password","method":"encryption_method"}, ... ]         |
| Response Error Status Code:   |  401 Unauthorized <br>424 (shadowsocks unreachable) <br> 425 (shadowsocks no response) <br> 500 Internal Server Error |

Request example (curl):  
```
curl -ik -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk" https://localhost:4001/all
```
Response example:  
```json
[{"port": 50000,"password":"2owkq9wu2elwst7","method":"chacha20-ietf-poly1305"}, {"port": 50001,"password":"dowl3829j3suniw6","method":"aes-256-cfb"}]
```

#### Get traffic for all ports
|                               |                                                                   |
| :---------------------------- | :---------------------------------------------------------------- |
| Request method:               |  GET                                                              |
| Request URL:                  |  https://host_name:port/traffic/all                               |
| Request Header:               |  Authorization: Bearer your_authentication_toke                   |
| Response HTTP Status Code:    |  200 OK                                                           |
| Response Body:                |  [{"port":port_number, "traffic": traffic_usage}, ... ]           |
| Response Error Status Code:   |  401 Unauthorized <br>424 (shadowsocks unreachable) <br> 425 (shadowsocks no response) <br> 500 Internal Server Error |

Request example (curl):  
```
curl -ik -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1Mjk0ODg0MTcsImV4cCI6MTUyOTU3NDgxN30.9wdDV4hXvHdCkWhcOFpW2YXvSL6WupWSj2kTI6XMhFk" https://localhost:4001/traffic/all
```
Response example:  
```json
[{"port": 50000,"traffic":928727287}, {"port": 50001,"traffic":0}]
```

## Authentication

All the api requests except for login require an Authorization header. The header pattern is: `Authorization: Bearer <token>`. The token can be obtained from the login api.

A token expires in 24 hours. A new token is needed once the old one expires. Tokens can be re-used in multiple requests before exiration.

## Security

This program encrypts all the traffic end-to-end using https. It requires you to set up a digital certificate. There are many ways that you can get a free digital certificate. You may also generate your own self-signed digital certificate:

```
cd ~/shadowsocks-restful-api/
openssl req -nodes -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365
```

## Reliability

This program aims to achieve best reliability. It will attempt to re-open the ports upon restart of shadowsocks or this program itself. It also keeps monitoring the opened ports. Should anyone were dropped (due to any unprecedented reason), this program would attemp to re-open it.

## Bug report and feature request

Welcome to create an issue for them. Bugs have high priority to get addressed. Feature requests will depend on their popularity, importance.
