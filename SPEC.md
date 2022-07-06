# Schneeballschlacht

Schneeballschlacht add a Game Element to a NFT. The idea is that the NFTs are used in a Snowball fight till the round resets and a new Round begins.

## Description

Schneeballschlacht(Snowballfight) is a NFT with an associated roind. The players can throw their Snowball NFT at each other(addresses). The Snowballs level up after a certain point.
The round ends if either one of the following conditions are met:

    1. A Snowball reaches max level
    2. the Deadline has been reached
    3. The max supply of Snowballs has been reached

If a Snowball reaches max level the round ends and restarts, the winner gets a trophy NFT.

## Implementation details

### Round Start

An arbitrary user can start the round. As an incentive the initiator receive a free level 1 Snowball.

### Mint

Anyone can mint a new level 1 Snowball for _x_(small amount in USD) Native tokens. Players can mint however many NFTs they want.

### Throw

A Snowball at level _n_ can be thrown at _n+1_ addresses, where as each address must be different from each other.

After a Snowball has been thrown _n+1_ times, one of the 3 Addresses(thrower + (_n+1_) receivers) gets randomly minted a level _n+1_ snowball. A snowball can must be thrown at a different address every time. e.g. Snowball A with level 1 can be thrown to address **a** and **b** but cannot be thrown to the same address twice(or to the holders address). But a second Snowball B can still be throw to the same addresses.

A max level - 1 NFT that levels up(e.g a max level NFT would be created) ends the round. The max level nft gets minted to the thrower that ended the round(e.g. no random distribution)

Throwing a NFT cost a small amount of token(small USD price) scaled linear with NFT level.

Cooldown: After throwing a Snowball the Account cannot throw another snowball for ~3 minutes.

Stone: A Snowball being thrown has a 0,1% \* LEVEL(specific formula is wip) chance of containing a stone, this chance is reevaluated every throw. If a snowball contains a stone the the address it is thrown to is timeouted for 24 hours.

### Payout

Payout is calculated a follows, 1 level on an NFT gives the right to 1 share of the payout. e.g. payoutPerLevel = balance / sum(levels)

### Round End

When the round ends the payout get calculated und distributed. All NFTs get "burned", but holder data is preserved. I should be possible to get the holders of NFTs in previous rounds.
The round ends when either:

    1. End block height has been reached
    2. the max supply of Snowballs has been reached
    3. A Snowball has been level up to max level

If the round ended because a max level snowball was created the winner(creator of the max level snowball) gets a trophy nft, that does not factor into the payout.

### Metadata

For every round the start block height, end block height, number of NFT, number of throws, total payout and payout per level is saved when the round ends.

### Notes

- Metadata of every round must be inspectable.
- The State of every round must be preserved. e.g. users should be able to lookup NFT owners, balances etc of previous rounds
- Smart Contract must be easily extendable. Further feature will come in the future.
- Last throw does not automatically restarts a new round.
