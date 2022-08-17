import { createReadStream } from "fs";
import pinataSDK from "@pinata/sdk";

const pinataKey = process.env.PINATA_KEY;
const pinataKeySecret = process.env.PINATA_SECRECT_KEY;

if (!pinataKey || !pinataKeySecret) {
  throw new Error(`no pinataKey or pinataKeySecret`);
}

const pinata = pinataSDK(pinataKey!, pinataKeySecret!);

export async function uploadMetadataToIPFS(data: Object) {
  return pinata.pinJSONToIPFS(data);
}

export async function uploadFileToIPFS(filepath: string) {
  const readableStreamForFile = createReadStream(filepath);
  return pinata.pinFileToIPFS(readableStreamForFile);
}
