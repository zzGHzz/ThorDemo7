# Demo of VeChainThor On-chain Governance - Changing the Reward Ratio

This demo simulates the on-chain governance that change the network parameter `reward ratio`. The process consists of three steps: decision making, authorization and execution. The first step is carried out on-chain by an instance of `DummnyVotingContract` while the second two steps conducted also on-chain via the deployed built-in contract `Executor`. 

The demo shows step by step how to do the required on-chain operations (functions that implement the operations are shown in brackets):
 
1. To register the voting contract to the built-in contract `Executor`:

    1. To deploy the voting contract (`deployVotingContract`)
    2. To propose a proposal of attaching the voting contract (`proposeAttachingVotingContract`);
    3. To approve the proposal (`approveProposal`);
    4. To execute the proposal (`executeProposal`);

2. To make a decision through on-chain voting:

    1. To initialize a vote (`initVote`);
    2. To tally the vote (`tallyVote`);
    3. To execute the vote, which automatically submits a proposal for changing `reward ratio` to `Executor` (`executeVote`);
    
3. To authorize the execution of the voted action:

    1. To approve the proposal (`approveProposal`);
    2. To execute the proposal (`executeProposal`).

## Terminology in Code

* `approver` / `approvers` - member(s) of the governing body;
* `authority` - built-in contract `Authority` that manages the list of validators;
* `executor` - built-in contact `Executor`;
* `dummyVotingContract` - registered voting contract;
* `voters` - accounts conducting operations of the dummy on-chain voting.

## Prerequisites

This demo should be run on a customized version of VeChainThor. Related Thor-node commands can be found in `./nodeLaunchCmd`. The definition of the network can be found in `./customChainConfig.json`. The following addtional lines are added to allow the customized VeChainThor to be compatiable with the latest version of EVM.
```
"ForkConfig": {
    "ETH_CONST": 0
}
```
Basically, it tells the system from what height it has to switch to the latest version of EVM.

YOU MUST REPLACE all the `authorityAddress` with the master addresses of the Thor node launched by you to make the demo work. The master address can be obtained by command:
```
thor master-key --config-dir <KEY_DIR>
```

Please refer to my previous article ['What you might not know about VeChainThor yet (Part V) - Customizing Your Own VeChainThor'](https://medium.com/@ziheng.zhou/what-you-might-not-know-about-vechainthor-yet-part-v-customizing-your-own-vechainthor-dd40a7667452) for details. 

## Demo Output
```
executor address: 0x0000000000000000000000004578656375746f72
0. Check current reward ratio
    Reward ratio: 30%
I. Deploy voting contract
    TX Sender: 0xcb43d5d874893a67d94cdb0c28e2a93285f56ff0
	txid: 0x4acbdb3ddf094dcaa4178c173ab4b586b688fb39a89a3dae78d627aab9c9a14a
	Address:0x69da604675b7ad6249cc5e7093ced212ded74eec
II. Register deplyed voting contract
I.1. Propose to attach deployed dummny voting contract
    TX Sender: 0x7d350a72ea46d0927139e57dfe2174d7acaa9d30
	txid: 0x70fd5498354d5b8640afbccde15f60da20559bb8e61125b2a09cd5db3c3c2419
	proposalID: 0xbf04e4cf2b6e208e965007f9add1b0937b46199e033100556772ccc239ef9164
II.2. Approve proposal
    Approver: 0xcb43d5d874893a67d94cdb0c28e2a93285f56ff0
	txid: 0x26dde198e6eeb5fb43f4c8ce402c9e8201446853ddd3b63f7ffcf860c985b64d
	Approver: 0x7d350a72ea46d0927139e57dfe2174d7acaa9d30
	txid: 0xe206405d21728a67d93cfd5222770f465ceb179f21e1274fc959a5c3a94b1a46
	Approver: 0x62fa853cefc28aca2c225e66da96a692171d86e7
	txid: 0x8e79ece9b96d8824d3ff80ee4f91663376f32b1043a761deec7ce132b95f7a11
II.3. Execute proposal
    TX Sender: 0x62fa853cefc28aca2c225e66da96a692171d86e7
	txid: 0x315c8ca567b42f9bd781d16c85e7cc3c1204b95d3b43e5e34ba440c2728538be
II.4. Check whether voting contract has been attached
    success
II. Init vote to change reward ratio from 30% to 40%
    TX Sender: 0xfa580a85722b39c500a514c7292e9e5710a73974
	txid: 0x5ed03f252ee84f4d1c82eff4885e8be4a90b4c9d5fd9ebaad7d1a2e1257bbebf
	voteID: 0xe5dd8e896836f357347fd8a0a158529f922d2ad4a8e398661cff3e2c467186e0
IV. Tally
    TX Sender: 0xfa580a85722b39c500a514c7292e9e5710a73974
	txid: 0xb3808ba8882c66716085e8fa4342de69f1f780af98ed77abf107aad348c4bd1e
V. Submit a proposal of executing the voted action for final approval
    TX Sender: 0xfa580a85722b39c500a514c7292e9e5710a73974
	txid: 0x4799c33027a811fe5a5bc6f53ac521639e5e97fa2e7aa659b12116e6ebf5f918
	ProposalID: 0xe3fa889f277820e9949c483d99bdd4fedd3847d02d6ba2ddcb51a966d4820503
VI. Authorize vote action
    Approver: 0xcb43d5d874893a67d94cdb0c28e2a93285f56ff0
	txid: 0xfc392ec5549b5c90d2947a01d64376400449a2b998c0458a054751e3f9154aea
	Approver: 0x7d350a72ea46d0927139e57dfe2174d7acaa9d30
	txid: 0xd02115e7a5088613cf20ec8fb017c560fcc96cbd4c034b5f5d8e48cf92a16787
	Approver: 0x62fa853cefc28aca2c225e66da96a692171d86e7
	txid: 0x7e860c286b33ebea2347ca7359077b6419086784b77a022c322d22b91561291e
VII. Execute vote action
    TX Sender: 0xfa580a85722b39c500a514c7292e9e5710a73974
	txid: 0x77c7184cc19ccac557ce39ff31d4a60cb999031127b32d152d873d69ccfce30d
VIII. Check new reward ratio
    Reward ratio: 40%
```