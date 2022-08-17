import { getSnowballAttribs } from "./metadata-snowball";

export function getAttribsFromFilename(type: string, filename: string) {
  if (type === "snowball") {
    return getSnowballAttribs(filename);
  } else {
    console.log(`invalid type ${type}`);
    process.exit(1);
  }
}

export function getName(
  category: string,
  metadataAttribs: { value: string }[],
  metadataTemplate: Record<string, unknown>
) {
  if (category === "snowball") {
    return `${metadataTemplate.name}`;
  } else {
    throw new Error(`unknown category ${category}`);
  }
}
