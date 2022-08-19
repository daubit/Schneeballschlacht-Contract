# Documentation

Schneeballschlacht is an interactive on chain NFT game. Players can mint Schneebälle(Snowballs) and use them to toss them at different players. When the desired amount of tosses are met, an upgraded snowball is minted. Goal is to be first one to mint a maxed out snowball.

Schneeballschlacht utilizes three kind of contracts. The main contract Schneeballschlacht, an escrow contract for delegating the pool rewards and a simple ERC721 contract, which represent the Hall of Fame, where each winner is presented with a trophy.
## Schneeballschlacht
Main Contract containing the essential logic of the game.

### ERC721Round
An ERC721 Extension. An additional mapping layers has been added to the existing data.<br> The additional layer represent a game round. Each round stores its own data, such as totalSupply, tokens and approvals.<br>

### EscrowManager
A helper contract for managing escrows after each round. When a round is finished. A new escrow is deployed and the funds are sent to it. One could interact with the contract directly or interact with the Schneeballschlacht contract.

### Pausable 
The Pausable, from OpenZeppelin, is crucial, so certain functions can be locked if the game is over. Such as mint, toss or transfer.


## Escrow
Simple Escrow contract for storing the players funds.

## HallOfFame
Simple ERC721 which only the winners at each round can will receive.