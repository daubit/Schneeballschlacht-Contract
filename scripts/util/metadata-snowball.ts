export function getSnowballAttribs(filename: string) {
  const attribs: { trait_type: string; value: string }[] = [];
  attribs.push({
    trait_type: "Level",
    value: parseInt(filename.substring(3, 5)).toString(),
  });
  return attribs;
}
