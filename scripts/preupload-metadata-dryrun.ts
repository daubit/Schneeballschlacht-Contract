import { getAttribsFromFilename, getName } from "./util/metadata";
import { readFile, writeFile, readdir } from "fs/promises";

let lookup = {};

const NFT_TYPE = "snowball";

function shuffle<T>(array: T[]) {
  array.sort(() => Math.random() - 0.5);
}

async function preuploadMetadata() {
  const metadataTemplate = JSON.parse(
    await readFile("./data/metadatatemplate.json", { encoding: "utf-8" })
  );
  const cids = JSON.parse(
    await readFile("./data/cids/image-ipfs-lookup-snowball.json", {
      encoding: "utf-8",
    })
  );
  const artFiles = (await readdir("./data/art")).filter(
    (a) => !a.includes(".gitkeep")
  );
  const fakeLookup: Record<string, string> = {};
  artFiles.forEach((a) => (fakeLookup[a] = a));

  const lookuptableEntries = Object.entries(fakeLookup);
  shuffle(lookuptableEntries);

  const metadataArray: { data: Object; filename: string }[] = [];
  for (const artlookup of lookuptableEntries) {
    const metadataAttribs = getAttribsFromFilename(NFT_TYPE, artlookup[0]);
    const metadata = {
      ...metadataTemplate,
      image: `ipfs://${cids[artlookup[1]]}`,
      attributes: metadataAttribs,
      name: getName(NFT_TYPE, metadataAttribs, metadataTemplate),
    };
    metadataArray.push({ data: metadata, filename: artlookup[0] });
  }

  lookup = metadataArray;
}

preuploadMetadata()
  .then(() => {
    writeFile(`./data/metadata-dryrun.json`, JSON.stringify(lookup));
  })
  .catch((err) => {
    console.log(err);
    writeFile(`./data/metadata-dryrun.json`, JSON.stringify(lookup));
    process.exit(1);
  });
