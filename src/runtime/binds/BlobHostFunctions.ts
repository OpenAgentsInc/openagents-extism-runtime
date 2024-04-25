import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import PoolConnectorClient from "../PoolConnectorClient";
import { JobInput, JobParam } from "openagents-grpc-proto";

export default class BlobHostFunctions extends HostFunctionsNamespace {
    constructor(client: PoolConnectorClient) {
        super("BlobStore");
       
        this.registerFunction(
            "create",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                nameOff: bigint,
                encryptionKeyOff: bigint,
                includeEncryptionKeyInUrlOff: bigint
            ) => {
                const name = cp.read(nameOff).text();
                const encryptionKey = cp.read(encryptionKeyOff).text();
                const includeEncryptionKeyInUrl = Number(includeEncryptionKeyInUrlOff) == 1;
                const url=(await client.r(client.createDisk({    
                    name,
                    encryptionKey,
                    includeEncryptionKeyInUrl,
                }))).url;

                return cp.store(url);
            }
        );
        this.registerFunction(
            "open",
            async (mng, pluginPath, pluginId, currentJob, cp, urlOff: bigint, encryptionKeyOff: bigint) => {
                const url = cp.read(urlOff).text();
                const encryptionKey = cp.read(encryptionKeyOff).text();
                const res = await client.r(
                    client.openDisk({
                        url: url,
                        encryptionKey: encryptionKey,
                    })
                );
                return cp.store(res.diskId);
            }
        );
        this.registerFunction(
            "close",
            async (mng, pluginPath, pluginId, currentJob, cp, diskIdOff: bigint) => {
                const diskId = cp.read(diskIdOff).text();
                await client.r(client.closeDisk({ diskId }));
            }
        );
        this.registerFunction(
            "del",
            async (mng, pluginPath, pluginId, currentJob, cp, diskIdOff: bigint, pathOff: bigint) => {
                const path = cp.read(pathOff).text();
                const diskId = cp.read(diskIdOff).text();
                await client.r(client.diskDeleteFile({ diskId, path }));
            }
        );
        this.registerFunction(
            "read",
            async (mng, pluginPath, pluginId, currentJob, cp, diskIdOff: bigint, pathOff: bigint) => {
                const path = cp.read(pathOff).text();
                const diskId = cp.read(diskIdOff).text();
                // resizable buffer
                const chunks = [];
                for await (const chunk of await client.rS(client.diskReadFile({ diskId, path }))) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                return cp.store(buffer);
            }
        );

        this.registerFunction(
            "write",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                diskIdOff: bigint,
                pathOff: bigint,
                bufferOff: bigint
            ) => {
                const path = cp.read(pathOff).text();
                const diskId = cp.read(diskIdOff).text();
                const buffer = cp.read(bufferOff).bytes();
                const CHUNK_SIZE = 1024 * 1024;
                const writer = client.diskWriteFile();
                for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
                    writer.requests.send({ diskId, path, data: buffer.slice(i, i + CHUNK_SIZE) });
                }
                await writer.requests.complete();
            }
        );

        

    }
}
