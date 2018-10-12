const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const ethereumjs = require('ethereumjs-abi')
const ethereumjsUtil = require('ethereumjs-util')
const port = 4000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'src')))

// 1. Setup message from player 1 with his data. He sees "Waiting for second player to join"
// 2. Setup message from player 2 with his data. A soon as he join, both get redirected to the game page
// 3. Redirect both players to the game.html view
// 4. Both players exchange messages in order with a sequence
// 5. The balances get updated whenever both messages are received and checked
let games = []
let player1Message = {}
let player2Message = {}
let game = {
    contractAddress: '',
    addressPlayer1: '',
    addressPlayer2: '',
    escrowPlayer1: '',
    escrowPlayer2: '',
    balancePlayer1: '',
    balancePlayer2: '',
    sequence: 0,
    socketPlayer1: '',
    socketPlayer2: '',
    signedMessage1: '',
    signedMessage2: '',
    betPlayer1: '',
    betPlayer2: '',
    callPlayer1: '',
    callPlayer2: '',
    nonce1: '',
    nonce2: ''
}

/* Game => {
    contractAddress, -
    addressPlayer1, -
    addressPlayer2, -
    socketPlayer1, -
    socketPlayer2, -
    escrowPlayer1, -
    escrowPlayer2, -
    balancePlayer1, -
    balancePlayer2, -
    sequence,
    signedMessage1, -
    signedMessage2, -
    betPlayer1, -
    betPlayer2, -
    callPlayer1, -
    callPlayer2, -
    nonce1, -
    nonce2 -
}
*/

async function start() {
    io.on('connection', socket => {
        console.log('User connected', socket.id)

        socket.on('disconnect', () => {
            console.log('User disconnected', socket.id)
        })

        socket.on('setup-player-1', data => {
            console.log('1. Received setup-player-1')
            game = {
                contractAddress: data.contractAddress,
                escrowPlayer1: data.escrowPlayer1,
                balancePlayer1: data.balancePlayer1,
                addressPlayer1: data.addressPlayer1,
                socketPlayer1: data.socketPlayer1
            }
        })

        socket.on('setup-player-2', async data => {
            console.log('2. Received setup-player-2')
            game.escrowPlayer2 = data.escrowPlayer2
            game.balancePlayer2 = data.balancePlayer2
            game.addressPlayer2 = data.addressPlayer2
            game.socketPlayer2 = data.socketPlayer2
            game.sequence = 0

            console.log('3. Emitting start-game')
            io.emit('start-game')
        })

        socket.on('setup-game', data => {
            console.log('4. Received setup-game')
            if(data.address == game.addressPlayer1) {
                game.socketPlayer1 = data.socket
            } else {
                game.socketPlayer2 = data.socket
            }

            console.log('5. Emmiting initial game data for both players with the updated sockets')
            io.emit('initial-game-data', game)
        })

        socket.on('signed-message-player-1', message => {
            if(message.sender != game.addressPlayer1) {
                return io.to(game.socketPlayer1).emit('error', 'The received address of the first player is invalid')
            }
            const isValid = verifyMessage(message.signedMessage, message.nonce, message.call, message.bet, game.balancePlayer1, message.sequence, game.addressPlayer1)
            if(!isValid) return io.to(game.socketPlayer1).emit('error', 'The received message is not valid, generate a new one again')

            game.signedMessage1 = message.signedMessage
            game.betPlayer1 = message.bet
            game.callPlayer1 = message.call
            game.nonce1 = message.nonce
            game.sequence = message.sequence

            // If we have both messages already, distribute the updated game object
            if(game.signedMessage2) {
                let gameCopy = Object.assign({}, game)
                games.push(gameCopy)

                game.balancePlayer2 = parseInt(game.balancePlayer2)
                game.balancePlayer1 = parseInt(game.balancePlayer1)
                if(game.callPlayer1 == game.callPlayer2) {
                    game.balancePlayer2 += parseInt(game.betPlayer2)
                    game.balancePlayer1 -= parseInt(game.betPlayer2)
                    game.winner = 2
                } else {
                    game.balancePlayer1 += parseInt(game.betPlayer1)
                    game.balancePlayer2 -= parseInt(game.betPlayer1)
                    game.winner = 1
                }
                io.emit('received-both-messages', game)
                game = resetGame(game)
            }
        })

        socket.on('signed-message-player-2', message => {
            if(message.sender != game.addressPlayer2) {
                return io.to(game.socketPlayer2).emit('error', 'The received address of the second player is invalid')
            }
            const isValid = verifyMessage(message.signedMessage, message.nonce, message.call, message.bet, game.balancePlayer2, message.sequence, game.addressPlayer2)
            if(!isValid) return io.to(game.socketPlayer2).emit('error', 'The received message is not valid, generate a new one again')

            game.signedMessage2 = message.signedMessage
            game.betPlayer2 = message.bet
            game.callPlayer2 = message.call
            game.nonce2 = message.nonce
            game.sequence = message.sequence

            // If we have both messages already, distribute the updated game object
            if(game.signedMessage1) {
                let gameCopy = Object.assign({}, game)
                games.push(gameCopy)

                game.balancePlayer2 = parseInt(game.balancePlayer2)
                game.balancePlayer1 = parseInt(game.balancePlayer1)
                if(game.callPlayer1 == game.callPlayer2) {
                    game.balancePlayer2 += parseInt(game.betPlayer2)
                    game.balancePlayer1 -= parseInt(game.betPlayer2)
                    game.winner = 2
                } else {
                    game.balancePlayer1 += parseInt(game.betPlayer1)
                    game.balancePlayer2 -= parseInt(game.betPlayer1)
                    game.winner = 1
                }
                io.emit('received-both-messages', game)
                game = resetGame(game)
            }
        })

        // On finish send the 2 latest messages which are contained in the last element.
        socket.on('finish', () => {
            let messages = games.slice(-1)
            io.to(socket.id).emit('finish-2-messages', messages[0])
        })
    })

    http.listen(port, '0.0.0.0')
    console.log(`Listening on localhost:${port}`)
}

function resetGame(game) {
    return {
        contractAddress: game.contractAddress,
        addressPlayer1: game.addressPlayer1,
        addressPlayer2: game.addressPlayer2,
        balancePlayer1: game.balancePlayer1,
        balancePlayer2: game.balancePlayer2,
        socketPlayer1: game.socketPlayer1,
        socketPlayer2: game.socketPlayer2
    }
}

// Checks that the message given by the player is valid to continue playing and to reveal the results
function verifyMessage(signedMessage, nonce, call, bet, balance, sequence, playerAddress) {
	const hash = generateHash(nonce, call, bet, balance, sequence)
	const message = ethereumjs.soliditySHA3(
		['string', 'bytes32'],
		['\x19Ethereum Signed Message:\n32', hash]
	)
	const splitSignature = ethereumjsUtil.fromRpcSig(signedMessage)
	const publicKey = ethereumjsUtil.ecrecover(message, splitSignature.v, splitSignature.r, splitSignature.s)
	const signer = ethereumjsUtil.pubToAddress(publicKey).toString('hex')
	const isMessageValid = (signer.toLowerCase() == ethereumjsUtil.stripHexPrefix(playerAddress).toLowerCase())
	return isMessageValid
}

function generateHash(nonce, call, bet, balance, sequence) {
	const hash = '0x' + ethereumjs.soliditySHA3(
		['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
		[String(nonce), String(call), String(bet), String(balance), String(sequence)]
	).toString('hex')

	return hash
}

function signMessage(hash) {
	return new Promise((resolve, reject) => {
		web3.personal.sign(hash, web3.eth.defaultAccount, (err, result) => {
			if(err) return reject(err)
			resolve(result)
		})
	})
}

start()
