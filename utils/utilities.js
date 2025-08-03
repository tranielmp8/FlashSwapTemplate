const { network, ethers } = require("hardhat");
const { parseUnits, getAddress } = require("ethers");

const fundErc20 = async (contract, sender, recepient, amount) => {
  const FUND_AMOUNT = parseUnits(amount, 18);
  // fund erc20 token to the contract
  const whale = await ethers.getSigner(sender);

  const contractSigner = contract.connect(whale);
  // const recipientAddress = getAddress(recepient);  // ✅ Enforce checksum here
  await contractSigner.transfer(recepient, FUND_AMOUNT);
};

const impersonateFundErc20 = async (contract, sender, recepient, amount) => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [sender],
  });

  // fund baseToken to the contract
  await fundErc20(contract, sender, recepient, amount);
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [sender],
  });
};

module.exports = {
  impersonateFundErc20: impersonateFundErc20,
};
