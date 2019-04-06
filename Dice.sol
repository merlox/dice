pragma solidity 0.4.25;

contract Dice {
    address public player1;
    address public player2;
    uint256 public player1Escrow;
    uint256 public player2Escrow;

    uint256 public player1Balance;
    uint256 public player2Balance;
    bool public isPlayer1BalanceSetUp;
    bool public isPlayer2BalanceSetUp;
    uint256 public player1FinalBalance;
    uint256 public player2FinalBalance;
    uint256 public player1Bet;
    uint256 public player2Bet;
    uint256 public player1Call;
    uint256 public player2Call;


    constructor () public payable {
        require(msg.value > 0);
        player1 = msg.sender;
        player1Escrow = msg.value;
    }

    function setupPlayer2() public payable {
        require(msg.value > 0);
        player2 = msg.sender;
        player2Escrow = msg.value;
    }

    /// @notice To verify and save the player balance to distribute it later when the game is completed. The addressOfMessage is important to decide which balance is being updated
    function verifyPlayerBalance(bytes playerMessage, uint256 playerCall, uint256 playerBet, uint256 playerBalance, uint256 playerNonce, uint256 playerSequence, address addressOfMessage) public {
        require(player2 != address(0), '#1 The address of the player is invalid');
        require(playerMessage.length == 65, '#2 The length of the message is invalid');
        require(addressOfMessage == player1 || addressOfMessage == player2, '#3 You must use a valid address of one of the players');
        uint256 escrowToUse = player1Escrow;

        if(addressOfMessage == player2) escrowToUse = player2Escrow;

        // Recreate the signed message for the first player to verify that the parameters are correct
        bytes32 message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(playerNonce, playerCall, playerBet, playerBalance, playerSequence))));
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(playerMessage, 32))
            s := mload(add(playerMessage, 64))
            v := byte(0, mload(add(playerMessage, 96)))
        }

        address originalSigner = ecrecover(message, v, r, s);
        require(originalSigner == addressOfMessage, '#4 The signer must be the original address');

        if(addressOfMessage == player1) {
            player1Balance = playerBalance;
            isPlayer1BalanceSetUp = true;
            player1Bet = playerBet;
            player1Call = playerCall;
        } else {
            player2Balance = playerBalance;
            isPlayer2BalanceSetUp = true;
            player2Bet = playerBet;
            player2Call = playerCall;
        }

        if(isPlayer1BalanceSetUp && isPlayer2BalanceSetUp) {
            if(player1Call == player2Call) {
                player2FinalBalance = player2Balance + player2Bet;
                player1FinalBalance = player1Balance - player2Bet;
            } else {
                player1FinalBalance = player1Balance + player1Bet;
                player2FinalBalance = player2Balance - player1Bet;
            }

            player1.transfer(player1FinalBalance);
            player2.transfer(player2FinalBalance);
        }
    }
}
