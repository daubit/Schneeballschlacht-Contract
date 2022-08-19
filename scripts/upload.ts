import dotenv from "dotenv";
import PinateSDK from "@pinata/sdk";
import CONST from "./util/const.json";
import { MFSWrapper, File } from "./util/ipfs";
import { readFileSync, writeFileSync } from "fs";
dotenv.config();

const API_KEY = process.env.PINATA_KEY || "";
const PRIVATE_KEY = process.env.PINATA_SECRECT_KEY || "";

async function main() {
  const fileName = process.argv.slice(2).pop();
  if (!fileName) throw new Error("Cannot find sample name");
  const pinata = PinateSDK(API_KEY, PRIVATE_KEY);
  const mfs = new MFSWrapper();
  const folder = `/${fileName}`;
  try {
    await mfs.node!.files.rm(folder, { recursive: true });
  } catch (e) {
    console.log("No directory found!");
  }
  await mfs.mkdir(folder);
  const samples = readFile(fileName);
  for (const i in samples) {
    const sample = samples[i];
    const content = JSON.stringify(sample, null, 2);
    const file: File = { name: (parseInt(i) + 1).toString(), content: content };
    await mfs.addFileToFolder(file, folder);
    const result = await mfs.stat(`${folder}/${(parseInt(i) + 1).toString()}`);
    const cid = result.cid.toString();
    await mfs.node?.pin.add(cid);
    await pinata.pinByHash(cid);
  }
  const result = await mfs.stat(folder);
  const cid = result.cid.toString();
  await mfs.node?.pin.add(cid);
  await pinata.pinByHash(cid);
  saveCID(cid);
  console.log(`CID: ${cid} saved!`);
}

function saveCID(cid: string) {
  const tmp = { ...CONST };
  tmp.FOLDER_CID = cid;
  writeFileSync("./scripts/util/const.json", JSON.stringify(tmp, null, 2));
}

interface Metadata {
  name: string;
  image: string;
  description: string;
}

function readFile(fileName: string): Metadata[] {
  return JSON.parse(readFileSync(`${fileName}.json`, "utf8")).map(
    (x: any) => x.data
  );
}

// eslint-disable-next-line no-unused-vars
async function unpinAll() {
  const pinata = PinateSDK(API_KEY, PRIVATE_KEY);
  const pinList = await pinata.pinList();
  for (const pin of pinList.rows) {
    const isUnpinned = new Date(pin.date_unpinned).getTime() < Date.now();
    const cid = pin.ipfs_pin_hash;
    try {
      if (!isUnpinned) await pinata.unpin(cid);
    } catch (e) {
      console.log("Unexpected behavior!");
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
