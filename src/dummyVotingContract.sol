pragma solidity >= 0.5.11;

// interface Executor {
//     function propose(address _target, bytes calldata _data) external returns(bytes32);
// }

import "./executor.sol";

contract DummyVotingContract {
    struct Vote {
        bytes32 proposalID;
        address targetContract;
        bool result;
        bytes data;
    }
    address executor;
    mapping(bytes32 => Vote) votes;

    constructor(address _executor) public {
        require(uint160(_executor) > 0, "Zero Executor address!");
        executor = _executor;
    }

    function init(address _targetContract, bytes memory _data) public returns(bytes32 voteID) {
        require(uint160(_targetContract) > 0, "Zero target contract address!");
        voteID = keccak256(abi.encodePacked(msg.sender, uint64(now)));
        votes[voteID] = Vote(0, _targetContract, false, _data);
        emit Init(voteID);
    }

    function tally(bytes32 voteID) public {
        require(uint160(votes[voteID].targetContract) > 0, "VoteID does not exist!");
        votes[voteID].result = true;
        emit Tally(voteID);
    }

    function execute(bytes32 voteID) public returns(bytes32 proposalID) {
        require(uint160(votes[voteID].targetContract) > 0, "VoteID does not exist!");

        if(votes[voteID].result) {
            proposalID = Executor(executor).propose(votes[voteID].targetContract, votes[voteID].data);
            votes[voteID].proposalID = proposalID;
            emit Execute(voteID, proposalID);
        }
    }

    function getTarget(bytes32 voteID) public view returns(address) {
        require(uint160(votes[voteID].targetContract) > 0, "VoteID does not exist!");
        return votes[voteID].targetContract;
    }

    function getVoteResult(bytes32 voteID) public view returns(bool) {
        require(uint160(votes[voteID].targetContract) > 0, "VoteID does not exist!");
        return votes[voteID].result;
    }

    event Init(bytes32 indexed voteID);
    event Tally(bytes32 indexed voteID);
    event Execute(bytes32 indexed voteID, bytes32 indexed proposalID);
}