let activeDice = 0
let game
let socket
let isThisPlayer1 = false
let isThisPlayer2 = false
let sequence

start()

// In the start we get the initial data needed to get the contract address
function start() {
    socket = io()
    setListeners()

    let game = JSON.parse(localStorage.getItem('game'))
    isThisPlayer1 = game.isPlayer1
    isThisPlayer2 = game.isPlayer2
    socket.emit('get-players-data', game.contractAddress)
}

function setListeners() {
    document.querySelectorAll('.dice-image').forEach(dice => {
        dice.addEventListener('click', e => {
            // Set the active dice data
            activeDice = parseInt(e.target.id.substr(-1))
            // Remove all the past selected dices classes
            let dices = document.querySelectorAll('.dice-image')
            for(let i = 0; i < dices.length; i++) {
                dices[i].className = 'dice-image'
            }
            // Set the active class
            e.target.className = e.target.className + " dice-active"
        })
    })

    document.querySelector('.place-bet').addEventListener('click', () => {
        let bet = document.querySelector('.bet-input').value

        if(activeDice == 0) return status('You must select a dice before placing the bet')
        if(bet == 0) return status('You must place a bet larger than zero')
        if(bet > getGameBalance()) return status("You can't bet higher than your current balance of " + web3.fromWei(getGameBalance()) + ' ether')
        if(bet > getGameEscrow()) return status("You can't bet higher than your escrow of " + web3.fromWei(getGameEscrow()) + ' ether')

        placeBet(bet)
    })

    socket.on('game-data', gameData => {
        game = gameData
        sequence = gameData.sequence

        // Show some game information
        document.querySelector('.game-info').innerHTML = `
            Contract: <b>${gameData.contractAddress}</b> <br/>
            You are: <b>${(isThisPlayer1) ? 'player 1' : 'player 2'}</b> <br/>
            Balance player 1: <b>${gameData.balancePlayer1}</b> <br/>
            Balance player 2: <b>${gameData.balancePlayer2}</b> <br/>
            Escrow player 1: <b>${gameData.escrowPlayer1}</b> <br/>
            Escrow player 2: <b>${gameData.escrowPlayer2}</b> <br/>
            Current game: <b>${gameData.sequence + 1}</b>
        `
    })

    // TODO verify this is working
    socket.on('player-messgae', messageData => {
        verifyMessage(messageData.signedMessage, messageData.nonce, messageData.call, messageData.bet, messageData.balance, messageData.sequence)
    })
}

function status(message) {
    document.querySelector('.status').innerHTML = message
    setTimeout(() => {
        document.querySelector('.status').innerHTML = ''
    }, 3e3)
}

function getGameBalance() {
    if(isThisPlayer1) return game.balancePlayer1
    else return game.balancePlayer2
}

function getGameEscrow() {
    if(isThisPlayer1) return game.escrowPlayer1
    else return game.escrowPlayer2
}

function getOtherPlayersAddress() {
    if(isThisPlayer1) return game.addressPlayer1
    else return game.addressPlayer2
}

// This function takes care of generating the messages with the 'activeDice' and the bet used
async function placeBet(bet) {
    const nonce = Math.floor(Math.random() * 1e16)
    const hash = generateHash(nonce, activeDice, bet, getGameBalance(), sequence)
    const signedMessage = await signMessage(hash)
    const data = {
        signedMessage: signedMessage,
        nonce: nonce,
        sequence: sequence
    }

    if(isThisPlayer1) {
        data.callPlayer1 = activeDice
        data.betPlayer1 = bet
        data.balancePlayer1 = game.balancePlayer1
    } else {
        data.callPlayer2 = activeDice
        data.betPlayer2 = bet
        data.balancePlayer2 = game.balancePlayer2
    }

    sequence++

    console.log('data', data)

    // TODO Continue here with sending the message to the other player to verify it
}

function generateHash(nonce, call, bet, balance, sequence) {
	const hash = '0x' + ethereumjs.ABI.soliditySHA3(
		['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
		[nonce, call, bet, balance, sequence]
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

// Checks that the message given by the player is valid to make sure the information is correct to continue playing and to reveal the results
function verifyMessage(signedMessage, nonce, call, bet, balance, sequence) {
	const hash = generateHash(nonce, call, bet, balance, sequence)
	const message = ethereumjs.ABI.soliditySHA3(
		['string', 'bytes32'],
		['\x19Ethereum Signed Message:\n32', hash]
	)
	const splitSignature = ethereumjsUtil.fromRpcSig(signedMessage)
	const publicKey = ethereumjsUtil.ecrecover(message, splitSignature.v, splitSignature.r, splitSignature.s)
	const signer = ethereumjsUtil.pubToAddress(publicKey).toString('hex')
	const isMessageValid = (signer.toLowerCase() == ethereumjsUtil.stripHexPrefix(getOtherPlayersAddress()).toLowerCase())
	return isMessageValid
}


// 1. Place the bet, send the message to the other player
// 2. He verifies it and sends the other message
// 3. The remaining player recieves the message, he verifies it and executes a call to the server
// 4. The server updates the game object and updates both players
// 5. We need to display the game information like your balance, his balance, your escrow, his escrow, and the current game being played
