const {
    Secrets_get
} = Host.getFunctions()

class Secrets {
    static async get(key) {
        const mem = Memory.fromString(key);
        const off = await Secrets_get(mem.offset);
        return Memory.find(off).readString();
    }
}

if (typeof module !== "undefined") module.exports = Secrets;