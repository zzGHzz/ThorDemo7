/// <reference types="@vechain/connex" />

import { abi as ABI } from 'thor-devkit';
import { isByte32 } from './utils';
import { to } from 'await-to-js';

/**
 * Decode EVENT data (output by RECEIPT)
 * 
 * @param output
 * @param abiObj 
 */
function decodeEvent(output: Connex.Thor.Event, abiObj: object): ABI.Decoded {
    const event = new ABI.Event({
        type: "event",
        name: abiObj["name"],
        anonymous: abiObj["anonymous"],
        inputs: abiObj["inputs"]
    });

    return event.decode(output.data, output.topics);
}

/**
 * Encode ABI 
 * 
 * @param abiObj 
 * @param params 
 */
function encodeABI(abi: object, ...params: any[]): string {
    const fn = new ABI.Function({
        constant: abi["constant"] ? abi["constant"] : null,
        inputs: abi["inputs"],
        outputs: abi["outputs"],
        name: abi["name"] ? abi["name"] : null,
        payable: abi["payable"],
        stateMutability: abi["stateMutability"],
        type: "function"
    });
    return fn.encode(...params);
}

/**
 * Try to get RECEIPT within a certain amount of time (in blocks) 
 * 
 * @param connex 
 * @param txid 
 * @param nblock - maximal number of blocks
 */
async function getReceipt(connex: Connex, txid: string, nblock: number): Promise<Connex.Thor.Receipt> {
    if (!isByte32(txid)) { throw "Invalid txid!"; }

    const ticker = connex.thor.ticker();
    const n = nblock >= 1 ? Math.floor(nblock) : 1;

    let receipt: Connex.Thor.Receipt, err: Error;

    for (let i = 0; i < n; i++) {
        await ticker.next();

        [err, receipt] = await to(connex.thor.transaction(txid).getReceipt());
        if (err) { continue; }

        if (receipt.reverted) { throw "TX reverted!"; }

        return new Promise((resolve, _) => { resolve(receipt); });
    }

    throw "Failed to get receipt!";
}

async function deployContract(
    connex: Connex, signer: string, gas: number,
    value: number | string, bytecode: string,
    abi?: object, ...params: any[]
): Promise<Connex.Vendor.TxResponse> {
    if (!connex) { throw new Error("Empty connex!"); }
    
    let data = bytecode;
    if (abi) {
        data = data + encodeABI(abi, ...params).slice(2);
    }

    const signingService = connex.vendor.sign('tx');
    signingService.signer(signer).gas(gas);
    return signingService.request([{
        to: null,
        value: typeof(value) === 'string' ? value : Math.floor(value),
        data: data
    }]);
}

async function contractCallWithTx(
    connex: Connex, signer: string, gas: number,
    contractAddr: string, value: number | string,
    abi: object, ...params: any[]
): Promise<Connex.Vendor.TxResponse> {
    if (!connex) { throw new Error("Empty connex!"); }
    if (!abi) { throw new Error("Empty ABI!") }

    const signingService = connex.vendor.sign('tx');
    signingService.signer(signer).gas(Math.floor(gas));
    const data = encodeABI(abi, ...params);
    return signingService.request([{
        to: contractAddr, 
        value: typeof(value) === 'string' ? value : Math.floor(value), 
        data: data
    }]);
}

export {
    decodeEvent,
    encodeABI,
    getReceipt,
    deployContract,
    contractCallWithTx
}