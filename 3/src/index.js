let Contract
let game = {
    contractAddress: '',
    escrowPlayer1: 0,
    escrowPlayer2: 0,
    balancePlayer1: 0,
    balancePlayer2: 0,
    isPlayer1: false,
    isPlayer2: false
}
let contractInstance
let socket

start()

function start() {
    socket = io()
    socket.on('start-game', redirectToGame)

    document.querySelector('#new-game').addEventListener('click', () => {
        const classNewGameBox = document.querySelector('.new-game-setup').className

        // Toggle hidden box to display it or hide it
        if(classNewGameBox === 'new-game-setup') {
            // To hide the box
            document.querySelector('.new-game-setup').className = 'hidden new-game-setup'
            document.querySelector('#button-continue').className = 'hidden'
            document.querySelector('#join-game').disabled = false
        } else {
            // To show the box
            document.querySelector('.new-game-setup').className = 'new-game-setup'
            document.querySelector('#button-continue').className = ''
            document.querySelector('#join-game').disabled = true
        }
    })

    document.querySelector('#join-game').addEventListener('click', () => {
        const classJoinGameBox = document.querySelector('.join-game-setup').className

        // Toggle hidden box to display it or hide it
        if(classJoinGameBox === 'join-game-setup') {
            document.querySelector('.new-game-setup').className = 'hidden new-game-setup'
            document.querySelector('.join-game-setup').className = 'hidden join-game-setup'
            document.querySelector('#button-continue').className = 'hidden'
            document.querySelector('#new-game').disabled = false
        } else {
            document.querySelector('.new-game-setup').className = 'new-game-setup'
            document.querySelector('.join-game-setup').className = 'join-game-setup'
            document.querySelector('#button-continue').className = ''
            document.querySelector('#new-game').disabled = true
        }
    })

    document.querySelector('#button-continue').addEventListener('click', () => {
        const valueSelected = document.querySelector('#eth-value').value
        const addressSelected = document.querySelector('#eth-address').value.trim()
        Contract = web3.eth.contract(abi)

        // If this is the first player set his escrow and balance
        if(addressSelected.length === 0) {
            game.isPlayer1 = true
            game.escrowPlayer1 = web3.toWei(valueSelected)
            game.balancePlayer1 = game.escrowPlayer1
            contractInstance = Contract.new({
                value: web3.toWei(valueSelected),
                data: bytecode.object,
                gas: 7e6
            }, (err, result) => {
                // This callback will be called twice, the second time includes the contract address
                if(!result.address) {
                    document.querySelector('#display-address').innerHTML = 'The transaction is being processed, wait until the block is mined to see the address here...'
                } else {
                    document.querySelector('#display-address').innerHTML = 'Contract address: ' + result.address + ' waiting for second player'
                    game.contractAddress = result.address
                    savePlayerDataLocally()

                    socket.emit('setup-player-1', game)
                }
            })

        // If this is the second player set his escrow and balance
        } else {
            let interval

            game.isPlayer2 = true
            contractInstance = Contract.at(addressSelected)
            game.contractAddress = addressSelected
            game.escrowPlayer2 = web3.toWei(valueSelected)
            game.balancePlayer2 = game.escrowPlayer2
            contractInstance.setupPlayer2({
                value: web3.toWei(valueSelected),
                gas: 4e6
            }, (err, result) => {
                document.querySelector('#display-address').innerHTML = 'The transaction is being processed, wait until the block is mined to start the game'

                interval = setInterval(() => {
                    web3.eth.getTransaction(result, (err, result) => {
                        if(result.blockNumber != null) {
                            document.querySelector('#display-address').innerHTML = 'Game ready'
                            clearInterval(interval)
                            savePlayerDataLocally()

                            socket.emit('setup-player-2', game)
                        }
                    })
                }, 1e3)
            })
        }
    })
}

// Saves the game data locally so that you can resume it later
function savePlayerDataLocally() {
    localStorage.setItem('game', JSON.stringify(game))
}

// Changes the view to game
function redirectToGame() {
    window.location = '/game.html'
}
