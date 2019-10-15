import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex.driver-nodejs';
import { to } from 'await-to-js';
const BN = require('bn.js');

import {
    Authority,
    Executor,
    getBuiltinABI,
    paramsAddr
} from './src/built-in';

import {
    approvers,
    sks,
    voters,
    dummyVotingContractBytecode,
    dummyVotingContractABI,
    NEW_REWARD_RATIO,
    REWARD_RATIO_KEY
} from './src/settings';

import {
    getABI
} from './src/utils';

import {
    decodeEvent,
    encodeABI,
    getReceipt,
    deployContract,
    contractCallWithTx
} from './src/connexUtils';

/**
 * Main process  
 */
(async () => {
    const net = new SimpleNet("http://localhost:8669");
    const wallet = new SimpleWallet();
    const driver = await Driver.connect(net, wallet);
    const connex = new Framework(driver);

    // Add private keys
    for (let sk of sks) {
        wallet.import(sk);
    }

    const authority = new Authority(connex);
    const executorAddr = await authority.executor();
    const executor = new Executor(connex, executorAddr);

    let txResponse: Connex.Vendor.TxResponse;

    ///////////////////
    // VOTING
    ///////////////////
    // // Deploy DummyVotingContract
    // console.log('Deploy voting contract');
    // txResponse = await deployDummyVotingContract(connex, executorAddr);
    // console.log('txid: ' + txResponse.txid);

    // // Get contract address
    // const receipt = await getReceipt(connex, txResponse.txid, 5);
    // const dummyVotingContactAddr = receipt.outputs[0].contractAddress;
    // console.log('Contract address:' + dummyVotingContactAddr);

    // // Initialize a vote
    // console.log('Init vote')
    // txResponse = await initVote(connex, dummyVotingContactAddr);
    // console.log('txid: ' + txResponse.txid);
    // const voteID = await getVoteID(connex, txResponse.txid, 5);
    // console.log('voteID: ' + voteID);

    const dummyVotingContactAddr = '0x34a9fa713d8e158f33b4d9b2fc9bfd12c6ced03d';
    const voteID = '0x5761a60a309bddc70684525a97bef027ee0c5a58279f04001e15ac86fdc4e948';

    // Tally
    console.log('Tally')
    txResponse = await contractCallWithTx(
        connex,
        voters[0],
        200000,
        dummyVotingContactAddr,
        0,
        getABI(dummyVotingContractABI, 'tally', 'function'),
        voteID
    );
    console.log('txid: ' + txResponse.txid);
    const res = await checkTallyRes(connex, txResponse.txid, 5, voteID);
    if (res) { console.log("Tally successful"); }
    else { throw new Error('Tally failed'); }

    // Execute vote
    console.log('Execute vote')
    txResponse = await contractCallWithTx(
        connex,
        voters[0],
        200000,
        dummyVotingContactAddr,
        0,
        getABI(dummyVotingContractABI, 'execute', 'function'),
        voteID
    );
    console.log('txid: ' + txResponse.txid);
    const proposalID = await getProposalID(connex, txResponse.txid, 5);
    console.log('proposalID: ' + proposalID);

    ///////////////////
    // Authorization
    ///////////////////
    await approve(executor, proposalID);

    ///////////////////
    // Execution
    ///////////////////
    executor.signer(approvers[2]).gas(200000);
    txResponse = await executor.execute(proposalID);
    console.log('txid: ' + txResponse.txid);

    ///////////////////
    // Check Result
    ///////////////////
    const decoded = await checkRes(connex, 5);
    const ratio = parseInt(new BN(decoded[0], 16).div(new BN('1' + '0'.repeat(18))).toString(10)) * 100;
    console.log('New reward raito: ' + ratio + '%');

    driver.close();
})().catch(err => {
    console.log(err);
});

async function checkTallyRes(connex: Connex, txid: string, nblock: number, voteID: string): Promise<boolean> {
    try {
        const receipt = await getReceipt(connex, txid, nblock);
        const abi = getABI(dummyVotingContractABI, 'tally', 'event')
        const decoded = decodeEvent(receipt.outputs[0].events[0], abi);
        if (decoded['voteID'] == voteID) { return true; }
        return false;
    } catch (err) { throw new Error('[checkTallyRes] - ' + err); }
}

/**
 * Deploy DummyVotingContract and get the contract address.
 * 
 * @param connex 
 * @param executorAddr 
 */
async function deployDummyVotingContract(connex: Connex, executorAddr: string): Promise<Connex.Vendor.TxResponse> {
    const abi = getABI(dummyVotingContractABI, '', 'constructor');
    return await deployContract(
        connex, voters[0], 1000000,
        '0x0', dummyVotingContractBytecode,
        abi, executorAddr
    );
}

/**
 * Initiate a vote to change the reward ratio from 3e17 to 4e17
 * 
 * @param connex 
 * @param dummyVotingContactAddr 
 */
async function initVote(connex: Connex, dummyVotingContactAddr: string): Promise<Connex.Vendor.TxResponse> {
    const abi = getBuiltinABI('params', 'set', 'function');
    const data = encodeABI(abi, REWARD_RATIO_KEY, NEW_REWARD_RATIO);

    // Call DummyVotingContract.init
    return contractCallWithTx(
        connex, voters[0], 500000,
        dummyVotingContactAddr, 0,
        getABI(dummyVotingContractABI, 'init', 'function'),
        paramsAddr, data
    );
}

/**
 * Get voteID
 * 
 * @param connex 
 * @param txid 
 * @param nblock 
 */
async function getVoteID(connex: Connex, txid: string, nblock: number): Promise<string> {
    try {
        const receipt = await getReceipt(connex, txid, nblock);
        const abi = getABI(dummyVotingContractABI, 'Init', 'event')
        const decoded = decodeEvent(receipt.outputs[0].events[0], abi);
        return new Promise((resolve, _) => { resolve(decoded["voteID"]); });
    } catch (err) { throw new Error('[getVoteID] - ' + err); }
}

/**
 * Get proposalID
 * 
 * @param connex 
 * @param txid 
 * @param nblock 
 */
async function getProposalID(connex: Connex, txid: string, nblock: number): Promise<string> {
    try {
        const receipt = await getReceipt(connex, txid, nblock);

        const decoded = decodeEvent(
            receipt.outputs[0].events[0],
            getABI(dummyVotingContractABI, 'execute', 'event')
        );
        return new Promise((resolve, _) => { resolve(decoded["proposalID"]); });
    } catch (err) { throw new Error('[getProposalID] - ' + err); }
}

/**
 * Approve the submitted proposal.
 * 
 * @param executor 
 * @param proposalID 
 * 
 * Approvers: 
 * `approvers[0]`
 * `approvers[1]`
 */
async function approve(executor: Executor, proposalID: string): Promise<void> {
    try {
        let txResponse: Connex.Vendor.TxResponse;

        executor.signer(approvers[0]).gas(300000);
        txResponse = await executor.approve(proposalID);
        console.log('txid: ' + txResponse.txid);

        executor.signer(approvers[1]).gas(300000);
        txResponse = await executor.approve(proposalID);
        console.log('txid: ' + txResponse.txid);
    } catch (err) { throw new Error('[approve] - ' + err); }
}

/**
 * Check the new reward ratio.
 *
 * It is conducted through calling function `get` of the built-in contract `Params`.
 *
 * @param connex
 * @param nblock
 */
async function checkRes(connex: Connex, nblock: number): Promise<Connex.Thor.Decoded> {
    const ticker = connex.thor.ticker();
    const n = nblock >= 1 ? Math.floor(nblock) : 1;
    const abi = getBuiltinABI('params', 'get', 'function');
    const method = connex.thor.account(paramsAddr).method(abi);

    let err: Error, out: Connex.Thor.VMOutput;
    for (let i = 0; i < n; i++) {
        await ticker.next();

        console.log('Round ' + (i + 1));
        [err, out] = await to(method.call(REWARD_RATIO_KEY));
        if (err) { continue; }
        if (!out.decoded.listed) { continue; }

        return new Promise((resolve, _) => { resolve(out.decoded); });
    }

    throw new Error("Timeout!");
}