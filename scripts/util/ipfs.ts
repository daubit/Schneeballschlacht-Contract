import { create, IPFSHTTPClient } from "ipfs-http-client";

export interface File {
  name: string;
  content: string;
}

export class MFSWrapper {
  node: IPFSHTTPClient | undefined;

  constructor(port: number = 5001) {
    this.node = create({ port });
  }

  async mkdir(path: string) {
    if (!this.node) throw new Error("Node not initialized!");
    try {
      await this.node.files.mkdir(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  async ls(path: string) {
    if (!this.node) throw new Error("Node not initialized!");
    const result = [];
    for await (const file of this.node.files.ls(path)) {
      result.push(file.name);
    }
    return result;
  }

  async addFilesToFolder(files: File[], path: string) {
    if (!this.node) throw new Error("Node not initialized!");
    for (const file of files) {
      await this.addFileToFolder(file, path);
    }
    return this;
  }

  async addFileToFolder(file: File, path: string) {
    if (!this.node) throw new Error("Node not initialized!");
    try {
      await this.node.files.write(`${path}/${file.name}`, file.content, {
        create: true,
      });
    } catch (e) {
      console.log("Could not write!");
      console.log(e);
    }
    return this;
  }

  async stat(path: string) {
    if (!this.node) throw new Error("Node not initialized!");
    return await this.node.files.stat(path);
  }
}
