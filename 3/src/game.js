let activeDice = 0
let game
let socket

start()

// In the start we get the initial data needed to get the contract address
function start() {
    socket = io()
    setListeners()

    let game = JSON.parse(localStorage.getItem('game'))
    socket.emit('get-players-data', game.contractAddress)
}

function setDiceListeners() {
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
        if(activeDice == 0) return status('You must select a dice before placing the bet')

        document.querySelector('.bet-input').value
    })

    socket.on('game-data', gameData => {
        game = gameData
    })
}

function placeBet(amount, number) {

}

function status(message) {
    document.querySelector('.status').innerHTML = message
    setTimeout(() => {
        document.querySelector('.status').innerHTML = ''
    }, 3e3)
}

function callPlayer1() {

}

function callPlayer2() {

}
