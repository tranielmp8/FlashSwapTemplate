const { network, ethers } = require("hardhat");
const { parseUnits, getAddress } = require("ethers");

const impersonateFundErc20 = async (tokenContract, whaleAddress, recipientAddress, amountHuman) => {
  console.log(`Impersonating Whale: ${whaleAddress}`);
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [whaleAddress],
  });

  const whaleSigner = await ethers.getSigner(whaleAddress);

  const recipient = recipientAddress;  // Already in correct format from test
  const FUND_AMOUNT = parseUnits(amountHuman, await tokenContract.decimals ? await tokenContract.decimals() : 18);

  const tokenWithWhaleSigner = tokenContract.connect(whaleSigner);

  try {
    console.log(`Attempting direct transfer() to ${recipient}...`);
    const tx = await tokenWithWhaleSigner.transfer(recipient, FUND_AMOUNT);
    await tx.wait();
    console.log(`✅ Direct transfer() succeeded`);
  } catch (transferError) {
    console.warn(`⚠️ transfer() failed: ${transferError.message}`);
    console.log(`Attempting approve() + transferFrom() fallback...`);

    try {
      const approveTx = await tokenWithWhaleSigner.approve(recipient, FUND_AMOUNT);
      await approveTx.wait();

      const recipientSigner = await ethers.getSigner(recipient);
      const tokenWithRecipientSigner = tokenContract.connect(recipientSigner);

      const transferFromTx = await tokenWithRecipientSigner.transferFrom(whaleAddress, recipient, FUND_AMOUNT);
      await transferFromTx.wait();

      console.log(`✅ transferFrom() succeeded`);
    } catch (fallbackError) {
      console.error(`❌ Both transfer() and transferFrom() failed`);
      throw fallbackError;
    }
  }

  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [whaleAddress],
  });
};

module.exports = {
  impersonateFundErc20,
};
