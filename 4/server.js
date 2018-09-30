const express = require('express')
const bodyParser = require('body-parser')
const storage = require('node-persist')
const path = require('path')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const port = 4000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'src')))

// 1. Setup message from player 1 with his data. He sees "Waiting for second player to join"
// 2. Setup message from player 2 with his data. A soon as he join, both get redirected to the game page
// 3. Redirect both players to the game.html view
// 4. Both players exchange messages in order with a sequence
// 5. The balances get updated whenever both messages are received and checked

async function start() {
    await storage.init()
    // storage.setItem()
    // await storage.getItem()

    io.on('connection', socket => {
        console.log('User connected')

        socket.on('disconnect', () => {
            console.log('User disconnected')
        })

        socket.on('setup-player-1', data => {
            console.log('Received setup-player-1')
            let player1Data = {
                contractAddress: data.contractAddress,
                escrowPlayer1: data.escrowPlayer1,
                balancePlayer1: data.balancePlayer1,
                isPlayer1: data.isPlayer1
            }
            storage.setItem(`game-${data.contractAddress}`, player1Data)
        })

        socket.on('setup-player-2', async data => {
            console.log('Received setup-player-2')
            let gameData = await storage.getItem(`game-${data.contractAddress}`)
            gameData.escrowPlayer2 = data.escrowPlayer2
            gameData.balancePlayer2 = data.balancePlayer2
            gameData.isPlayer2 = data.isPlayer2
            gameData.sequence = 0

            storage.setItem(`game-${data.contractAddress}`, gameData)

            console.log('Emitting start-game')
            io.emit('start-game')
        })

        socket.on('get-players-data', async contractAddress => {
            console.log('Received get-players-data')
            let gameData = await storage.getItem(`game-${contractAddress}`)

            console.log('Emitting game-data')
            io.emit('game-data', gameData)
        })
    })

    http.listen(port, '0.0.0.0')
    console.log(`Listening on localhost:${port}`)
}

start()
