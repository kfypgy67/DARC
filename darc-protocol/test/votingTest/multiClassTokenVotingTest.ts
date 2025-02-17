import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { ConditionNodeStruct, ProgramStruct } from "../../typechain-types/contracts/protocol/DARC"


const target0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const target1 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const target2 = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

const target3 = '0x870526b7973b56163a6997bb7c886f5e4ea53638';

async function letAddressVote(operatorAddress:string,darcAddress:string) {
  const currentSigner = ethers.provider.getSigner(operatorAddress);
  const currentDARC = (await ethers.getContractFactory("TestBaseContract")).attach(darcAddress).connect(currentSigner);

  const votingProgram: ProgramStruct = {
    programOperatorAddress: operatorAddress,
    notes: "vote",
    operations: [{
      operatorAddress: operatorAddress,
      opcode: 32, // vote
      param: { 
        STRING_ARRAY: [],
        BOOL_ARRAY: [true],
        VOTING_RULE_ARRAY: [],
        PARAMETER_ARRAY: [],
        PLUGIN_ARRAY: [],
        UINT256_2DARRAY: [],
        ADDRESS_2DARRAY: [],
        BYTES: []
      }
    }],
  }

  await currentDARC.testRuntimeEntrance(votingProgram);
}

describe("multi class token voting test", function () {
  it ("should pass multi class token voting test", async function () {
    const VotingTestFactory = await ethers.getContractFactory("TestBaseContract");
    const votingTestSingleTest = await VotingTestFactory.deploy();
    await votingTestSingleTest.deployed();
    await votingTestSingleTest.initialize();

    // create token class 0, mint tokens to target0, target1, target2
    await votingTestSingleTest.helper_createToken0AndMint();

    // add a before-op plugin to ask all operations as sandbox_needed
    await votingTestSingleTest.addBeforeOpPlugin({
      returnType: BigNumber.from(1), // sandbox needed
      level: BigNumber.from(3),
      votingRuleIndex: BigNumber.from(0),
      notes: "all sandbox_needed",
      bIsEnabled: true,
      bIsInitialized: true,
      bIsBeforeOperation: true,
      conditionNodes:[{
        id: BigNumber.from(0),
        nodeType: BigNumber.from(3), // bool true
        logicalOperator: BigNumber.from(0), // no operator
        conditionExpression: BigNumber.from(0), // always true
        childList: [],
        param: {
          STRING_ARRAY: [],
          UINT256_2DARRAY: [],
          ADDRESS_2DARRAY: [],
          BYTES: []
        }
      }]
    });

    // create token class 1, voting weight 1, dividend weight 1
    await votingTestSingleTest.runProgramDirectly({
      programOperatorAddress: target0,
      notes: "create token class",
      operations: [{
        operatorAddress: target0,
        opcode: 2, // create token class
        param: {
          STRING_ARRAY: ["C1", "C2", "C3"],
          BOOL_ARRAY: [],
          VOTING_RULE_ARRAY: [],
          PARAMETER_ARRAY: [],
          PLUGIN_ARRAY: [],
          UINT256_2DARRAY: [
            [ BigNumber.from(1), BigNumber.from(2), BigNumber.from(3)],
            [BigNumber.from(1), BigNumber.from(5), BigNumber.from(10)],
            [BigNumber.from(1), BigNumber.from(5), BigNumber.from(10)],
          ],
          ADDRESS_2DARRAY: [],
          BYTES: []
        }
      },
      {
        operatorAddress: target0,
        opcode: 1, // mint token
        param: {
          STRING_ARRAY: [],
          BOOL_ARRAY: [],
          VOTING_RULE_ARRAY: [],
          PARAMETER_ARRAY: [],
          PLUGIN_ARRAY: [],
          UINT256_2DARRAY: [
            [BigNumber.from(1), BigNumber.from(1), BigNumber.from(1), BigInt(2),BigInt(2),BigInt(2), BigInt(3)],  
            [BigNumber.from(1), BigNumber.from(2), BigNumber.from(3), BigInt(1), BigInt(1), BigInt(1), BigInt(1)], // amount = 100
          ],
          ADDRESS_2DARRAY: [
            [target0,target1, target2, target0, target1, target2, target3],
          ],
          BYTES: []
        }
      }], 
    }, false);

    // weight of target0 = 1*1 + 5*1 = 6
    // weight of target1 = 2*1 + 5*1 = 7
    // weight of target2 = 3*1 + 5*1 = 8
    // weight of target3 = 10*1 = 10
    // total weight is 6+7+8+10 = 31

    // add a voting rule that ask 51% to approve in absolute majority
    await votingTestSingleTest.addVotingRule({

      // class 1, 2, 3 can vote
      votingTokenClassList: [BigNumber.from(1), BigNumber.from(2), BigNumber.from(3)],
      approvalThresholdPercentage: BigNumber.from(51), // 51% to approve  (absolute majority)
      votingDurationInSeconds: BigNumber.from(1000),
      executionPendingDurationInSeconds: BigNumber.from(1000),
      bIsEnabled: true,
      notes: "50% to approve in absolute majority",
      bIsAbsoluteMajority: true,
    }, false);


    //add an after-op plugin that ask all operation to be voting_neede by vote rule 0
    await votingTestSingleTest.addAfterOpPlugin({
      returnType: BigNumber.from(3), // voting needed
      level: BigNumber.from(3),
      votingRuleIndex: BigNumber.from(0),
      notes: "all voting_needed",
      bIsEnabled: true,
      bIsInitialized: true,
      bIsBeforeOperation: false,
      conditionNodes:[{
        id: BigNumber.from(0),
        nodeType: BigNumber.from(3), // bool true
        logicalOperator: BigNumber.from(0), // no operator
        conditionExpression: BigNumber.from(0), // always true
        childList: [],
        param: {
          STRING_ARRAY: [],
          UINT256_2DARRAY: [],
          ADDRESS_2DARRAY: [],
          BYTES: []
        }
      }]
    });
    

    const program = {
      programOperatorAddress: target0,
      notes: "mint tokens",
      operations: [{
        operatorAddress: target0,
        opcode: 1, // mint token
        param: { 
          STRING_ARRAY: [],
          BOOL_ARRAY: [],
          VOTING_RULE_ARRAY: [],
          PARAMETER_ARRAY: [],
          PLUGIN_ARRAY: [],
          UINT256_2DARRAY: [
            [BigNumber.from(0)],  
            [BigNumber.from(100000)], // amount = 100000
          ],
          ADDRESS_2DARRAY: [
            [target0],
          ],
          BYTES: []
        }
      }], 
    };
    
    await votingTestSingleTest.testRuntimeEntrance(program);

    // make sure that current state is voting
    expect((await votingTestSingleTest.finiteState()).toString()).to.equal("2"); // should be FiniteState.VOTING

    // make sure that total voting power is 400
    expect((await votingTestSingleTest.getVotingItemsByIndex(1)).totalPower[0].toString()).to.equal("31"); // should be 31

    // target 0 vote, 6/31 voted
    await letAddressVote(target0, votingTestSingleTest.address);

    const indexLatestVotingItem = await votingTestSingleTest.latestVotingItemIndex();

    // // get token number of target0 at level 1 and 2
    // console.log(await votingTestSingleTest.getTokenOwnerBalance(1, target0));
    // console.log(await votingTestSingleTest.getTokenOwnerBalance(2, target0));

    // console.log(await votingTestSingleTest.getVotingItemsByIndex(1))

    const powerOfTarget0 = await votingTestSingleTest.getVoterPowerOfVotingRule(0, target0);
    // console.log("power of target0 is ", powerOfTarget0.toString());

    // make sure that current state is voting
    expect((await votingTestSingleTest.finiteState()).toString()).to.equal("2"); // should be FiniteState.VOTING
    expect((await votingTestSingleTest.getVotingItemsByIndex(indexLatestVotingItem)).powerYes[0].toString()).to.equal("6"); // should be 6

    await letAddressVote(target1, votingTestSingleTest.address);


    
    // make sure that current state is voting
    expect((await votingTestSingleTest.finiteState()).toString()).to.equal("2"); // should be FiniteState.VOTING
    expect((await votingTestSingleTest.getVotingItemsByIndex(1)).powerYes[0].toString()).to.equal("13"); // should be 100



    // target 2 vote, 21/31 voted
    await letAddressVote(target2, votingTestSingleTest.address);

    // make sure that current state is voting
    expect((await votingTestSingleTest.finiteState()).toString()).to.equal("3"); // should be FiniteState.EXECUTING_PENDING
    expect((await votingTestSingleTest.getVotingItemsByIndex(1)).powerYes[0].toString()).to.equal("21"); // should be 300

    // finally execute the pending program

    // // try to vote now
    // const program_vote: ProgramStruct = {
    //   programOperatorAddress: target0,
    //   notes: "vote",
    //   operations: [{
    //     operatorAddress: target0,
    //     opcode: 32, // vote
    //     param: { 
    //       STRING_ARRAY: [],
    //       BOOL_ARRAY: [true],
    //       VOTING_RULE_ARRAY: [],
    //       PARAMETER_ARRAY: [],
    //       PLUGIN_ARRAY: [],
    //       UINT256_2DARRAY: [],
    //       ADDRESS_2DARRAY: [],
    //       BYTES: []
    //     }
    //   }],
    // }
    // // read the voting result
    // const votingItemIndex = 1;
    // const votingItem = await votingTestSingleTest.getVotingItemsByIndex(votingItemIndex);
    // expect(votingItem.votingStatus.toString()).to.equal("2"); // should be VotingStatus.ON_GOING

    // // read the voting state:
    // const votingState = await votingTestSingleTest.finiteState();
    // expect(votingState.toString()).to.equal("2"); // should be FiniteState.VOTING

    // // vote 
    // await votingTestSingleTest.testRuntimeEntrance(program_vote).then(async (tx) => {
    //   console.log("The latest voting index is ", (await votingTestSingleTest.latestVotingItemIndex()).toString());
    //   // console log the voting state again

    //   // the voting state should be 3, which is EXECUTING_PENDING
    //   expect((await votingTestSingleTest.finiteState()).toString()).to.equal("3");

    //   const currentVotingItem = await votingTestSingleTest.getVotingItemsByIndex(votingItemIndex);

    //   // make sure that the powerYES is 600
    //   expect(currentVotingItem.powerYes[0].toString()).to.equal("600");

    //   // make sure that the total power is 1000
    //   expect(currentVotingItem.totalPower.toString()).to.equal("1000");

    //   // the latest voting index should be 1
    //   expect((await votingTestSingleTest.latestVotingItemIndex()).toString()).equal("1");

    //   //return;

      const program_execute_pending_program: ProgramStruct = {
        programOperatorAddress: target0,
        notes: "execute_pending_program",
        operations: [{
          operatorAddress: target0,
          opcode: 33, // vote
          param: { 
            STRING_ARRAY: [],
            BOOL_ARRAY: [],
            VOTING_RULE_ARRAY: [],
            PARAMETER_ARRAY: [],
            PLUGIN_ARRAY: [],
            UINT256_2DARRAY: [],
            ADDRESS_2DARRAY: [],
            BYTES: []
          }
        }],
      }
      
      // run the execute pending program
      await votingTestSingleTest.testRuntimeEntrance(program_execute_pending_program).then(async (tx) => {
        expect((await votingTestSingleTest.finiteState()).toString()).to.equal('1'); // back to idle state 
        expect((await votingTestSingleTest.latestVotingItemIndex()).toString()).to.equal("1"); // the latest voting index should be 1
        expect((await votingTestSingleTest.getTokenOwnerBalance(0, target0)).toString()).equal("100600");
      });
        

  });
})
