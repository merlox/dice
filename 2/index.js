let Contract
let contractInstance

function start() {
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

        if(addressSelected.length === 0) {
            contractInstance = Contract.new({
                value: web3.toWei(valueSelected),
                data: bytecode.object,
                gas: 7e6
            }, (err, result) => {
                // This callback will be called twice, the second time includes the contract address
                if(!result.address) {
                    document.querySelector('#display-address').innerHTML = 'The transaction is being processed, wait until the block is mined to see the address here...'
                } else {
                    document.querySelector('#display-address').innerHTML = 'Contract address: ' + result.address
                }
            })
        } else {
            let interval
            contractInstance = Contract.at(addressSelected)
            contractInstance.setupPlayer2({
                value: web3.toWei(valueSelected),
                gas: 4e6
            }, (err, result) => {
                interval = setInterval(() => {
                    web3.eth.getTransaction(result, (err, result) => {
                        if(result.blockNumber != null) {
                            document.querySelector('#display-address').innerHTML = 'Game ready'
                            clearInterval(interval)
                        }
                    })
                }, 1e3)
            })
        }
    })
}

start()
