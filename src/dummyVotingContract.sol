pragma solidity >= 0.5.0;

contract DummyVotingContract {
    struct Vote {
        bytes32 proposalID;
        address targetContract;
        bool result;
        bytes data;
    }
    address public executor;
    mapping(bytes32 => Vote) public votes;

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

    function execute(bytes32 voteID) public returns(bytes32) {
        require(uint160(votes[voteID].targetContract) > 0, "VoteID does not exist!");

        if(votes[voteID].result) {
            (bool success, bytes memory returnData) = executor.call(
                abi.encodeWithSignature("propose(address,bytes)",votes[voteID].targetContract,votes[voteID].data));

            if(success) {
                bytes32 proposalID = bytesToBytes32(returnData);
                votes[voteID].proposalID = proposalID;
                emit Execute(voteID, proposalID);
            }
            else
                revert("Execution failed");
        }
    }

    function bytesToBytes32(bytes memory b) private pure returns (bytes32) {
        bytes32 out;
        if(b.length >= 32)
            for (uint i = 0; i < 32; i++) {
                out |= bytes32(b[i] & 0xFF) >> (i * 8);
            }
        else {
            uint n = 32 - b.length;
            for (uint i = 0; i < b.length; i++) {
                out |= bytes32(b[i] & 0xFF) >> ((i+n) * 8);
            }
        }
        return out;
    }
    
    // function test(bytes memory b) public pure returns(bytes32) {
    //     return bytesToBytes32(b);
    // }

    event Init(bytes32 indexed voteID);
    event Tally(bytes32 indexed voteID);
    event Execute(bytes32 indexed voteID, bytes32 indexed proposalID);
}