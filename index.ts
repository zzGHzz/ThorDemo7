import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex.driver-nodejs';
const BN = require('bn.js');

import {
    getBuiltinABI,
    paramsAddr,
    authorityAddr
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
    contractCallWithTx,
    contractCall
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

    let txResponse: Connex.Vendor.TxResponse;
    let proposalID: string;
    let receipt: Connex.Thor.Receipt;
    let txids: string[];
    let decoded: Connex.Thor.Decoded;

    const timeout = 5;

    const executorAddr = (await contractCall(
        connex, authorityAddr, getBuiltinABI('authority', 'executor', 'function')
    )).decoded["0"];

    console.log('0. Check current reward ratio');
    decoded = (await contractCall(
        connex, paramsAddr, getBuiltinABI('params', 'get', 'function'), REWARD_RATIO_KEY
    )).decoded;
    let ratio = parseInt(new BN(decoded["0"], 10).mul(new BN('100')).div(new BN('1' + '0'.repeat(18))).toString(10));
    console.log('\tReward raito: ' + ratio + '%');

    console.log('I. Deploy voting contract');
    txResponse = await deployContract(
        connex, voters[0], 1000000, '0x0', dummyVotingContractBytecode, 
        getABI(dummyVotingContractABI, '', 'constructor'), executorAddr
    );
    console.log('\ttxid: ' + txResponse.txid);
    receipt = await getReceipt(connex, timeout, txResponse.txid);
    const dummyVotingContactAddr = receipt.outputs[0].contractAddress;
    console.log('\tAddress:' + dummyVotingContactAddr);
    // const dummyVotingContactAddr = '0xce584f463b40a65b124d4781b28d72a2cf7c265b';

    console.log('II. Register deplyed voting contract')
    console.log('II.1. Propose proposal');
    txResponse = await contractCallWithTx(
        connex, approvers[0], 300000,
        executorAddr, 0, getBuiltinABI('executor', 'propose', 'function'),
        executorAddr,   // target contract address
        encodeABI(  // target contract call input data
            getBuiltinABI('executor', 'attachVotingContract', 'function'),
            dummyVotingContactAddr
        )
    )
    console.log('\ttxid: ' + txResponse.txid);
    proposalID = await getProposalID(connex, timeout, txResponse.txid);
    console.log('\tproposalID: ' + proposalID);
    // proposalID = '0x4ee5a312a64cae5fd7c47a3a28afe510d77c7b445763fdb542ca451f3d00b24a';

    console.log('II.2. Approve proposal');
    txids = [];
    for (let approver of approvers) {
        console.log('\tApprover: ' + approver);
        txResponse = await contractCallWithTx(
            connex, approver, 300000, executorAddr, 0, getBuiltinABI('executor', 'approve', 'function'), proposalID
        );
        console.log('\ttxid: ' + txResponse.txid);
        txids.push(txResponse.txid);
    }
    for (let id of txids) { await getReceipt(connex, timeout, id); }    // Confirm TXs

    console.log('II.3. Execute proposal');
    console.log("\tExecutor: " + approvers[0]);
    txResponse = await contractCallWithTx(
        connex, approvers[0], 300000, executorAddr, 0, getBuiltinABI('executor', 'execute', 'function'), proposalID
    );
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);

    console.log('II.4. Check status of deployed voting contract');
    console.log(await contractCall(
        connex, executorAddr, getBuiltinABI('executor', 'votingContracts', 'function'), dummyVotingContactAddr
    ));

    console.log('III. Init vote to change reward ratio from 30% to 40%');
    txResponse = await contractCallWithTx(
        connex, voters[0], 500000,
        dummyVotingContactAddr, 0,
        getABI(dummyVotingContractABI, 'init', 'function'),
        paramsAddr, encodeABI(getBuiltinABI('params', 'set', 'function'), REWARD_RATIO_KEY, NEW_REWARD_RATIO)
    );
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid); // Confirm TX
    const voteID = await getVoteID(connex, timeout, txResponse.txid);
    console.log('\tvoteID: ' + voteID);

    // const voteID = '0x5761a60a309bddc70684525a97bef027ee0c5a58279f04001e15ac86fdc4e948';

    console.log('IV. Tally');
    txResponse = await contractCallWithTx(
        connex, voters[0], 200000, dummyVotingContactAddr, 0, getABI(dummyVotingContractABI, 'tally', 'function'), voteID
    );
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);

    console.log('V. Execute vote');
    txResponse = await contractCallWithTx(
        connex, voters[0], 200000, dummyVotingContactAddr, 0, getABI(dummyVotingContractABI, 'execute', 'function'), voteID
    );
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);

    console.log('Check vote status')
    decoded = (await contractCall(
        connex, dummyVotingContactAddr, getABI(dummyVotingContractABI, 'votes', 'function'), voteID
    )).decoded;
    proposalID = decoded["0"];
    console.log(decoded);

    console.log('VI. Authorize vote action');
    txids = [];
    for (let approver of approvers) {
        console.log('\tApprover: ' + approver);
        txResponse = await contractCallWithTx(
            connex, approver, 300000, executorAddr, 0, getBuiltinABI('executor', 'approve', 'function'), proposalID
        );
        console.log('\ttxid: ' + txResponse.txid);
        txids.push(txResponse.txid);
    }
    for (let id of txids) { await getReceipt(connex, timeout, id); }    // Confirm TXs

    console.log('VII. Execute vote action');
    txResponse = await contractCallWithTx(
        connex, voters[0], 200000, executorAddr, 0, getBuiltinABI('executor', 'execute', 'function'), voteID
    );
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);

    console.log('VIII. Check new reward ratio');
    decoded = (await contractCall(
        connex, paramsAddr, getBuiltinABI('params', 'get', 'function'), REWARD_RATIO_KEY
    )).decoded;
    ratio = parseInt(new BN(decoded[0], 10).mul(new BN('100')).div(new BN('1' + '0'.repeat(18))).toString(10));
    console.log('\tReward raito: ' + ratio + '%');

    driver.close();
})().catch(err => {
    console.log(err);
});

/**
 * Get voteID
 * 
 * @param connex 
 * @param txid 
 * @param timeout 
 */
async function getVoteID(connex: Connex, timeout: number, txid: string): Promise<string> {
    const receipt: Connex.Thor.Receipt = await getReceipt(connex, timeout, txid);
    const abi = getABI(dummyVotingContractABI, 'Init', 'event')
    const decoded = decodeEvent(receipt.outputs[0].events[0], abi);
    return new Promise((resolve, _) => { resolve(decoded["voteID"]); });
}

/**
 * Get proposalID
 * 
 * @param connex 
 * @param txid 
 * @param timeout 
 */
async function getProposalID(connex: Connex, timeout: number, txid: string): Promise<string> {
    const receipt = await getReceipt(connex, timeout, txid);
    const decoded = decodeEvent(
        receipt.outputs[0].events[0],
        getBuiltinABI('executor', 'proposal', 'event')
    );
    return new Promise((resolve, _) => { resolve(decoded["proposalID"]); });
}