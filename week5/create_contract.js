import { parseUnits } from "@ethersproject/units";
import { sleep, linea_provider } from "../utils.js";
import { BigNumber, Wallet, ethers } from "ethers";
import { defaultAbiCoder } from "@ethersproject/abi";
import { importETHWallets, writeContractToFile} from "../accs.js";

function getRandomSalt() {
    let base = BigNumber.from("61784013878581");
    let rand = Math.round(Math.random() * 3 * 100000000000);
    base = base.add(rand.toString()); // add big number to base
    let addition = Math.round(Math.random() * 100000000000);
    base = base.add(addition.toString()) // add another big number, so salt never crosses
    return base._hex.slice(2);
}
async function deployErc20(signer) {
    let salt = getRandomSalt();
    let data = `0x11b804ab000000000000000000000000cd4df914c5d857c9e4f050dee5753e1b6d5bb2620000000000000000000000000000000000000000000000000000000000000060${salt}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022449c5c5b6000000000000000000000000${signer.address.slice(2)}00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000${signer.address.slice(2)}000000000000000000000000${signer.address.slice(2)}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046e616d6500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000673796d626f6c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037697066733a2f2f516d63326d4c556d37744a39724d654152444c44586258585346743733347156663347617173535462675a326d582f300000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000d04f98c88ce1054c90022ee34d566b9237a1203c00000000000000000000000000000000000000000000000000000000`
    let to = "0x76F948E5F13B9A84A81E5681df8682BBf524805E"

    let tx = {
        to: to,
        data: data,
        // gasPrice: parseUnits("2", "gwei")
        // gasPrice: price.mul("2"),
    }
    let contractAddress = "";
    try {
        contractAddress = await signer.call(tx);
        console.log("future token address:", defaultAbiCoder.decode(["address"], contractAddress), "deploying..");
        contractAddress = defaultAbiCoder.decode(["address"], contractAddress)
    } catch (e) {
        if (e.reason.includes("missing")) {
            console.log("нода послала нахуй, адихаем 2 минуты");
            await sleep(120);
            return await deployErc20(signer);
        }
        console.log(e.reason);
        console.log("cant get create2 address");
    }
    let deployTx;
    try {
        tx.gasPrice = (await getGasPrice()).mul("2");
        deployTx = await signer.sendTransaction(tx);
        console.log("deployed erc20", "https://explorer.goerli.linea.build/tx/" + deployTx.hash);
        await writeContractToFile(signer.address + ":" + contractAddress);
        contractAddress = contractAddress[0];
    } catch (e) {
        if (e.reason.includes("missing")) {
            console.log("нода послала нахуй, адихаем 2 минуты");
            await sleep(120);
            return await deployErc20(signer);
        }
        console.log(e.reason);
        console.log("error on erc20 deploy");
    }
    return contractAddress;
}

async function openMint(signer, token) {
    let data = `0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000084938e3d7b00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000037697066733a2f2f516d58766d4255314e527464736b74687861325844444c6a556b6931444c446944534d4d595a3243516a57524b732f300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e474bc7db70000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000006477066fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000037697066733a2f2f516d5675393865637a5a52705359634633554b5952446b48734d32524d515236324b55596d6b32395544625754502f3000000000000000000000000000000000000000000000000000000000000000000000000000`;
    try {
        let tx = {
            to: token,
            data: data,
            gasPrice: (await getGasPrice()).mul("2"),
        }
        let openMint;
        openMint = await signer.sendTransaction(tx);
        console.log("opened mint to public", "https://explorer.goerli.linea.build/tx/" + openMint.hash);
        return true;
    } catch (e) {
        if (e.reason.includes("missing")) {
            console.log("нода послала нахуй, адихаем 2 минуты");
            await sleep(120);
            return await openMint(signer, token);
        }
        console.log(e.reason);
        console.log("error on open mint to public");
        return false;
    }
}

async function mintToken(signer, token) {
    let data = `0x84bb1e42000000000000000000000000${signer.address.slice(2)}0000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000080ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`

    try {
        let tx = {
            data: data,
            to: token,
            gasPrice: (await getGasPrice()).mul("2"),
        }
        let mintTx;
        mintTx = await signer.sendTransaction(tx);
        console.log("minted 10 tokens", "https://explorer.goerli.linea.build/tx/" + mintTx.hash);
        return true;
    } catch (e) {
        if (e.reason.includes("missing")) {
            console.log("нода послала нахуй, адихаем 2 минуты");
            await sleep(120);
            return await mintToken(signer, token);
        }
        console.log(e.reason);
        console.log("error on minting 10 tokens");
        return false;
    }
}
async function transferToken(signer, token) {
    let data = `0xa9059cbb000000000000000000000000630900fb257fafef02491368062d50d6677d9d750000000000000000000000000000000000000000000000000de0b6b3a7640000`

    try {
        let tx = {
            data: data,
            to: token,
            gasPrice: (await getGasPrice()).mul("2"),
        }
        let transfer;
        transfer = await signer.sendTransaction(tx);
        console.log("sent 1 token", "https://explorer.goerli.linea.build/tx/" + transfer.hash);
        return true;
    } catch (e) {
        if (e.reason.includes("missing")) {
            console.log("нода послала нахуй, адихаем 2 минуты");
            await sleep(120);
            return await transferToken(signer, token);
        }
        console.log(e.reason);
        console.log("error on sending 1 token");
        return false;
    }
}
async function getGasPrice() {
    let fee = await linea_provider.getFeeData();
    let price = fee.gasPrice;
    return price;
}

export {
    deployErc20,
    openMint,
    mintToken,
    transferToken
}