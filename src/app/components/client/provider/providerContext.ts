"use client";
import { create } from "zustand";

//  StarknetChainId 
//   0  SN_MAIN = "0x534e5f4d41494e",
//   1  SN_GOERLI = "0x534e5f474f45524c49",
//   2  SN_SEPOLIA = "0x534e5f5345504f4c4941",
//   

interface FrontEndProviderState {
    currentFrontendProviderIndex: number,
    setCurrentFrontendProviderIndex: (currentFrontendProviderIndex: number) => void,
}

export const useFrontendProvider = create<FrontEndProviderState>()(set => ({
    // default to mainnet: this is a mainnet product, and the Sepolia endpoint
    // throws SSL errors when polled before a wallet switches the chain
    currentFrontendProviderIndex: 0,
    setCurrentFrontendProviderIndex: (currentFrontendProviderIndex: number) => { set(state => ({ currentFrontendProviderIndex })) }
}));
