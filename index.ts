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
    
    let proposalID: string;
    const timeout = 5;

    const executorAddr = (await contractCall(
        connex, authorityAddr, getBuiltinABI('authority', 'executor', 'function')
    )).decoded["0"];
    console.log("executor address: " + executorAddr);

    console.log('0. Check current reward ratio');
    await checkRewardRatio(connex);

    console.log('I. Deploy voting contract');
    const dummyVotingContactAddr = await deployVotingContract(connex, timeout, approvers[0], executorAddr);

    console.log('II. Register deplyed voting contract')
    console.log('II.1. Propose to attach deployed dummny voting contract');
    proposalID = await proposeAttachingVotingContract(
        connex, timeout, approvers[1], executorAddr, dummyVotingContactAddr
    );

    console.log('II.2. Approve proposal');
    await approveProposal(connex, timeout, executorAddr, proposalID);

    console.log('II.3. Execute proposal');
    await executeProposal(connex, timeout, approvers[2], executorAddr, proposalID);

    console.log('II.4. Check whether voting contract has been attached');
    if(!(await contractCall(
        connex, executorAddr, getBuiltinABI('executor', 'votingContracts', 'function'), dummyVotingContactAddr
    )).decoded['0']) throw new Error('Failed');
    console.log('\tSuccess')

    console.log('III. Init vote to change reward ratio from 30% to 40%');
    const voteID = await initVote(connex, timeout, voters[0], dummyVotingContactAddr);

    console.log('IV. Tally');
    await tallyVote(connex, timeout, voters[0], dummyVotingContactAddr, voteID);

    console.log('V. Submit a proposal of executing the voted action for final approval');
    proposalID = await executeVote(connex, timeout, voters[0], dummyVotingContactAddr, voteID);

    console.log('VI. Authorize vote action');
    await approveProposal(connex, timeout, executorAddr, proposalID);

    console.log('VII. Execute vote action');
    await executeProposal(connex, timeout, voters[0], executorAddr, proposalID);

    console.log('VIII. Check new reward ratio');
    await checkRewardRatio(connex);

    driver.close();
})().catch(err => {
    console.log(err);
});

async function executeVote(
    connex: Connex, timeout: number, txSender: string, dummyVotingContactAddr: string, voteID: string
): Promise<string> {
    const txResponse = await contractCallWithTx(
        connex, voters[0], 500000, dummyVotingContactAddr, 0, 
        getABI(dummyVotingContractABI, 'execute', 'function'), voteID
    );
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);

    const decoded = (await contractCall(
        connex, dummyVotingContactAddr, getABI(dummyVotingContractABI, 'votes', 'function'), voteID
    )).decoded;
    const proposalID = decoded["proposalID"];
    console.log('\tProposalID: ' + proposalID);

    return proposalID;
}

async function tallyVote(
    connex: Connex, timeout: number, txSender: string, dummyVotingContactAddr: string, voteID: string
) {
    const txResponse = await contractCallWithTx(
        connex, txSender, 200000, dummyVotingContactAddr, 0, 
        getABI(dummyVotingContractABI, 'tally', 'function'), voteID
    );
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);
}

async function initVote(
    connex: Connex, timeout: number, txSender: string, dummyVotingContactAddr: string
): Promise<string> {
    const txResponse = await contractCallWithTx(
        connex, txSender, 500000,
        dummyVotingContactAddr, 0,
        getABI(dummyVotingContractABI, 'init', 'function'),
        paramsAddr, encodeABI(getBuiltinABI('params', 'set', 'function'), REWARD_RATIO_KEY, NEW_REWARD_RATIO)
    );
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid); // Confirm TX
    const voteID = await getVoteID(connex, timeout, txResponse.txid);
    console.log('\tvoteID: ' + voteID);

    return voteID;
}

async function executeProposal(
    connex: Connex, timeout: number, txSender: string, executorAddr: string, proposalID: string
) { 
    const txResponse = await contractCallWithTx(
        connex, txSender, 500000, executorAddr, 0, getBuiltinABI('executor', 'execute', 'function'), proposalID
    );
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    await getReceipt(connex, timeout, txResponse.txid);
}

async function approveProposal(
    connex: Connex, timeout: number, executorAddr: string, proposalID: string
) {
    const txids: string[] = [];
    for (let approver of approvers) {
        console.log('\tApprover: ' + approver);
        const txResponse = await contractCallWithTx(
            connex, approver, 300000, executorAddr, 0, getBuiltinABI('executor', 'approve', 'function'), proposalID
        );
        console.log('\ttxid: ' + txResponse.txid);
        txids.push(txResponse.txid);
    }
    for (let id of txids) { await getReceipt(connex, timeout, id); }    // Confirm TXs
}

async function proposeAttachingVotingContract(
    connex:Connex, timeout: number, txSender: string, executorAddr: string, dummyVotingContactAddr: string
): Promise<string> {
    const txResponse = await contractCallWithTx(
        connex, txSender, 300000,
        executorAddr, 0, getBuiltinABI('executor', 'propose', 'function'),
        executorAddr,   // target contract address
        encodeABI(  // target contract call input data
            getBuiltinABI('executor', 'attachVotingContract', 'function'),
            dummyVotingContactAddr
        )
    )
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    const proposalID = await getProposalID(connex, timeout, txResponse.txid);
    console.log('\tproposalID: ' + proposalID);

    return proposalID;
}

async function checkRewardRatio(connex: Connex) {
    const decoded = (await contractCall(
        connex, paramsAddr, getBuiltinABI('params', 'get', 'function'), REWARD_RATIO_KEY
    )).decoded;
    let ratio = parseInt(new BN(decoded["0"], 10).mul(new BN('100')).div(new BN('1' + '0'.repeat(18))).toString(10));
    console.log('\tReward ratio: ' + ratio + '%');
}

async function deployVotingContract(
    connex: Connex, timeout: number, txSender: string, executorAddr: string
): Promise<string> {
    const txResponse = await deployContract(
        connex, txSender, 2000000, '0x0', dummyVotingContractBytecode, 
        getABI(dummyVotingContractABI, '', 'constructor'), executorAddr
    );
    console.log("\tTX Sender: " + txSender);
    console.log('\ttxid: ' + txResponse.txid);
    const receipt = await getReceipt(connex, timeout, txResponse.txid);
    const dummyVotingContactAddr = receipt.outputs[0].contractAddress;
    console.log('\tAddress:' + dummyVotingContactAddr);

    return dummyVotingContactAddr;
}

async function getVoteID(connex: Connex, timeout: number, txid: string): Promise<string> {
    const receipt: Connex.Thor.Receipt = await getReceipt(connex, timeout, txid);
    const abi = getABI(dummyVotingContractABI, 'Init', 'event')
    const decoded = decodeEvent(receipt.outputs[0].events[0], abi);
    return decoded["voteID"];
}

async function getProposalID(connex: Connex, timeout: number, txid: string): Promise<string> {
    const receipt = await getReceipt(connex, timeout, txid);
    const decoded = decodeEvent(
        receipt.outputs[0].events[0],
        getBuiltinABI('executor', 'proposal', 'event')
    );
    return decoded["proposalID"];
}