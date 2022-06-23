for /l %%x in (1, 1, 2) do (
  start /b npx hardhat run scripts/simulate.ts --network development
)
clear