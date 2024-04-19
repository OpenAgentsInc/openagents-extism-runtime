const {
    BlobStore_create,
    BlobStore_get,
    BlobStore_write,
    BlobStore_read,
    Blob_close,
    BlobStore_del
} = Host.getFunctions()


class BlobStore {
    constructor(id){
        this.idMem = Memory.fromString(id);
    }

    static async create(name, encryptionKey="", includeEncryptionKeyInOutput=false) {
        const nameMem = Memory.fromString(name);
        const encryptionKeyMem = Memory.fromString(encryptionKey);
        const includeEncryptionKeyInOutput = BigInt(includeEncryptionKeyInOutput?1:0);
        const urlOff = await BlobStore_create(nameMem.offset, encryptionKeyMem.offset, includeEncryptionKeyInOutput)
        return new BlobStore(Memory.find(urlOff).readString());
    }

    static async open(url) {
        const urlMem = Memory.fromString(url);
        const idOff = await BlobStore_get(urlMem.offset);
        return new BlobStore(Memory.find(idOff).readString());
    }

    async close() {
        await Blob_close(this.idMem.offset);
    }

    async write(path, data) {
        const pathMem = Memory.fromString(path);
        const dataMem = Memory.fromBuffer(data);
        await BlobStore_write(this.idMem.offset, pathMem.offset, dataMem.offset);
    }

    async read(path) {
        const pathMem = Memory.fromString(path);
        const dataOff = await BlobStore_read(this.idMem.offset,pathMem.offset);
        return Memory.find(dataOff).readBuffer();
    }
    
    async del(path) {
        const pathMem = Memory.fromString(path);
        await BlobStore_del(this.idMem.offset, pathMem.offset);
    }
}