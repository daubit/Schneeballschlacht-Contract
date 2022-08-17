import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { chunk, shuffle } from "lodash";
import { readdir, writeFile } from "fs/promises";
import { uploadFileToIPFS } from "./util/upload";

const NUM_THREADS = 2;

let lookup = {};
let timestamp: number | string = Date.now();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function preuploadArt() {
  let _allPictures = await readdir("./data/art");
  const index = _allPictures.indexOf(".gitkeep");
  if (index > -1) {
    _allPictures.splice(index, 1);
  }
  const tattoos = _allPictures.filter((x: string) => x.includes("SKTA"));
  const noTattoos = _allPictures.filter((x: string) => !x.includes("SKTA"));
  const allPictures = [...noTattoos, ...shuffle(tattoos).slice(0, 500)];
  console.log(`Pictures: ${allPictures.length}`);
  const chunckSize = Math.floor(allPictures.length / NUM_THREADS);
  const batch = chunk(allPictures, chunckSize);
  if (allPictures.length !== batch.flat().length) {
    throw new Error(`${allPictures.length} ${batch.flat().length}`);
  }

  const batchResult = await Promise.all(
    batch.map(async (arts) => {
      const batchLookup: Record<string, string> = {};
      for (const art of arts) {
        const ipfsArtUploadResult = await uploadFileToIPFS(`./data/art/${art}`);

        console.log(
          `Uploaded ${art} result: ${JSON.stringify(ipfsArtUploadResult)}`
        );

        if (ipfsArtUploadResult.IpfsHash) {
          batchLookup[art] = ipfsArtUploadResult.IpfsHash;
          console.log(
            `Uploaded ${art} to ipfs hash: ${ipfsArtUploadResult.IpfsHash}`
          );
          await sleep(500);
        } else {
          throw new Error(`there was an error uploading ${art} to ipfs.`);
        }
      }
      return batchLookup;
    })
  );
  lookup = Object.assign(lookup, ...batchResult);
}

if (process.argv.length >= 3) {
  timestamp = process.argv[2];
}

preuploadArt()
  .then(() => {
    writeFile(
      `./data/cids/image-ipfs-lookup-${timestamp}.json`,
      JSON.stringify(lookup)
    );
    console.log(
      `wrote cids to ./data/cids/image-ipfs-lookup-${timestamp}.json ${
        Object.keys(lookup).length
      }`
    );
  })
  .catch((err) => {
    console.log(err);
    writeFile(
      `./data/cids/image-ipfs-lookup-${timestamp}.json`,
      JSON.stringify(lookup)
    );
    console.log(
      `wrote cids to ./data/cids/image-ipfs-lookup-${timestamp}.json`
    );
    process.exit(1);
  });
