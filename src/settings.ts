import {
    getSolcBin,
    getSolcABI,
    numToHexStr,
    strToHexStr
} from 'myvetools/dist/utils';

const masterNodes = [
    '0x929710d206f0e1133f353553353de5bc80c8460b',
    '0xaf05f933692569a710c2f6fa323a59e20068d418',
    '0x7bd72c20b67b7145a85eb2705913eeb980635a64'
];

const endorsor = '0x5e4abda5cced44f70c9d2e1be4fda08c4291945b';

const approvers = [
    '0xcb43d5d874893a67d94cdb0c28e2a93285f56ff0',
    '0x7d350a72ea46d0927139e57dfe2174d7acaa9d30',
    '0x62fa853cefc28aca2c225e66da96a692171d86e7'
];

const voters = [
    '0xfa580a85722b39c500a514c7292e9e5710a73974',
    '0xe4e98a2c7831af1173f9f84c530fe844859d1836'
];

const sks = [
    '0xf444380a4ff56e64581b70d2df523e6209f0129a81cd1752665871bb12c44be4',
    '0x90c615d63edccc0eca33a0d7b9957fc673d5992c2ea00f1a1e99ea78339a16f2',
    '0xc680ab8d6cc787554093596cd16c9bf890ad8630fc064aaf50089a4dc10287fe',
    '0xc444fafc3ad4c124ff3094cc95fd5b9d6d06b7529f4dd0cf1361a445b4b95b02',
    '0x66f12223802822eedcf417f6fd0a5e23d02dd161a3c075d00ef1a9ac4818596a'
];

const dummyVotingContractBytecode = getSolcBin('./src/dummyVotingContract.sol', 'DummyVotingContract');
const dummyVotingContractABI = JSON.parse(getSolcABI('./src/dummyVotingContract.sol', 'DummyVotingContract'));

const NEW_REWARD_RATIO = numToHexStr(4e17);
const REWARD_RATIO_KEY = strToHexStr('reward-ratio', 64);

export {
    masterNodes,
    endorsor,
    approvers,
    sks,
    voters,
    dummyVotingContractBytecode,
    dummyVotingContractABI,
    NEW_REWARD_RATIO,
    REWARD_RATIO_KEY
}