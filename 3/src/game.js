let activeDice = 0
let game
let socket
let isThisPlayer1 = false
let isThisPlayer2 = false

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
        if(isThisPlayer1 && bet > game.balancePlayer1) return status("You can't bet higher than your current balance of " + web3.fromWei(game.balancePlayer1) + ' ether')
        if(isThisPlayer2 && bet > game.balancePlayer2) return status("You can't bet higher than your current balance of " + web3.fromWei(game.balancePlayer2) + ' ether')
        if(isThisPlayer1 && bet > game.escrowPlayer1) return status("You can't bet higher than your escrow of " + web3.fromWei(game.balancePlayer1) + ' ether')
        if(isThisPlayer2 && bet > game.escrowPlayer2) return status("You can't bet higher than your escrow of " + web3.fromWei(game.balancePlayer2) + ' ether')

        placeBet(bet)
    })

    socket.on('game-data', gameData => {
        game = gameData
    })
}

// This function takes care of generating the messages with the 'activeDice' and the bet used
function placeBet(bet) {}

function status(message) {
    document.querySelector('.status').innerHTML = message
    setTimeout(() => {
        document.querySelector('.status').innerHTML = ''
    }, 3e3)
}
