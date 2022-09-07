# Sort Remix Plugin

Query decoded Ethereum transactions with SQL.

The Sort Remix Plugin simplifies adding your contract's ABI to Sort. Once a contract ABI is added, transactions on Ethereum Mainnet or Goerli Testnet can be queried. All parameters and logs/events that are part of the transaction are available for querying with the Sort API / query interface.

Learn more at [sort.xyz](https://sort.xyz)

### Install

Within the [Remix IDE](https://remix.ethereum.org), click on the :electric_plug: symbol to open the plugin manager.

Search for "Sort" and click "Activate".

### Usage

1. Compile a contract using the `Solidity Compiler` plugin.
2. Open the `Sort` plugin and select the contract name
3. Specify a name and address for the deployed contract
4. Click `Add Contract to Sort`
5. Visit sort.xyz or use the sort APIs to query for contract data.

## Contributing

`npm install` then `npm run serve`

## Special thanks

Special thanks to [OneClickDapp](https://github.com/pi0neerpat/remix-plugin-one-click-dapp), which was used as a template for creating this plugin.
