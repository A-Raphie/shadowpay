# ShadowPay — Memory

- Pool 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a (mainnet)
- STRK 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- Echo helper 0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b class 0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137
- Wallet API route: wallet holds keys + proves, no proving service needed
- ContractDiscoveryProvider default, placeholders are literal strings
- Prover lag ≥10 blocks between private txs, deposits public + screened
- Relayed sender: eligibility via Deposit user_addr, not tx sender
- Starter: Akashneelesh/strk20-starter-kit, WalletAccountV6, starknet.js 10
