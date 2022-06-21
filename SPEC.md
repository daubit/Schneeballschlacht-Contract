# SchneeballSchlacht

## Description
SchneeballSchlacht(Snowballfight) is a NFT with an associated game. The players can throw their Snowball NFT at each other(addresses). The Snowballs level up after a certain point. 
The game ends if either one of the following conditions are met:

    1. A Snowball reaches max level
    2. the Deadline has been reached
    3. The max supply of Snowballs has been reached

If a Snowball reaches max level the game ends and restarts, the winner gets a trophy NFT.

## Implementation details

### Game Start

An arbitrary user can start the game. As an incentive the initiator receive a free level 1 Snowball.

### Mint

Anyone can mint a new level 1 Snowball for _x_(small amount in USD) Native tokens. Players can mint however many NFTs they want.

### Throw
A Snowball at level _n_ can be thrown at _n+1_ addresses, where as each address must be different from each other.

After a Snowball has been thrown _n+1_ times, one of the 3 Addresses(thrower + (_n+1_) receivers) gets randomly minted a level _n+1_ snowball. A snowball can must be thrown at a different address every time. e.g. Snowball A with level 1 can be thrown to address **a** and **b** but cannot be thrown to the same address twice(or to the holders address). But a second Snowball B can still be throw to the same addresses. 

A max level - 1 NFT that levels up(e.g a max level NFT would be created) ends the game. The max level nft gets minted to the thrower that ended the game(e.g. no random distribution)

Throwing a NFT cost a small amount of token(small USD price) scaled linear with NFT level.

### Payout

Payout is calculated a follows, 1 level on an NFT gives the right to 1 share of the payout. e.g. payoutPerLevel = balance / sum(levels)

### Game End

When the game ends the payout get calculated und distributed. All NFTs get "burned", but holder data is preserved. I should be possible to get the holders of NFTs in previous rounds. 
The game ends when either:

    1. End block height has been reached
    2. the max supply of Snowballs has been reached
    3. A Snowball has been level up to max level

If the game ended because a max level snowball was created the winner(creator of the max level snowball) gets a trophy nft, that does not factor into the payout.

### Metadata

For every round the start block height, end block height, number of NFT, number of throws, total payout and payout per level is saved when the round ends.

### Notes
- Metadata of every round must be inspectable.
- Smart Contract must be easily extendable. Further feature will come in the future.
- Last throw does not automatically restarts a new game.