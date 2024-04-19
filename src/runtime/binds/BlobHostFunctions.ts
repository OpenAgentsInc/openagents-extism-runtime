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
                currentJobId,
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
        this.registerFunction("open", async (mng, pluginPath, pluginId, currentJobId, cp, urlOff: bigint) => {
            const url = cp.read(urlOff).text();
            const res = await client.r(client.openDisk({ url }));
            return cp.store(res.diskId);
        });
        this.registerFunction(
            "close",
            async (mng, pluginPath, pluginId, currentJobId, cp, diskIdOff: bigint) => {
                const diskId = cp.read(diskIdOff).text();
                await client.r(client.closeDisk({ diskId }));
            }
        );
        this.registerFunction(
            "del",
            async (mng, pluginPath, pluginId, currentJobId, cp, diskIdOff:bigint, pathOff: bigint) => {
                const path=cp.read(pathOff).text();
                const diskId=cp.read(diskIdOff).text();
                await client.r(client.diskDeleteFile({diskId, path}));
            }
        );
        this.registerFunction(
            "read",
            async (mng, pluginPath, pluginId, currentJobId, cp, diskIdOff:bigint, pathOff: bigint) => {
                const path=cp.read(pathOff).text();
                const diskId=cp.read(diskIdOff).text();
                // resizable buffer
                const chunks=[]
                for await(const chunk of await client.rS(client.diskReadFile({diskId, path}))){
                    chunks.push(chunk);
                }
                const buffer=Buffer.concat(chunks);
                return cp.store(buffer);
            }
        );

        this.registerFunction(
            "write",
            async (mng, pluginPath, pluginId, currentJobId, cp, diskIdOff: bigint, pathOff: bigint, bufferOff:bigint) => {
                const path = cp.read(pathOff).text();
                const diskId = cp.read(diskIdOff).text();
                const buffer=cp.read(bufferOff).bytes();
                const CHUNK_SIZE = 1024 * 1024;
                const writer = client.diskWriteFile();
                for(let i=0;i<buffer.length;i+=CHUNK_SIZE){
                    writer.requests.send({diskId, path, data: buffer.slice(i, i + CHUNK_SIZE)});          
                }
                await writer.requests.complete();
            }
        );

        

        this.registerFunction(
            "newInputEventRef",
            async (mng, pluginPath, pluginId,_, cp, eventIdOff: bigint, markerOff: bigint, sourceOff: bigint) => {
                const ref = cp.read(eventIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                const input: JobInput = {
                    ref: ref,
                    type: "event",
                    marker,
                    source,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newInputJobRef",
            async (
                mng,
                pluginPath,
                pluginId,
                _,
                cp,
                jobIdOff: bigint,
                markerOff: bigint,
                sourceOff: bigint
            ) => {
                const ref = cp.read(jobIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                const input: JobInput = {
                    ref: ref,
                    type: "data",
                    marker,
                    source,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newInputData",
            async (mng, pluginPath, pluginId, _, cp, dataOff: bigint, markerOff: bigint) => {
                const data = cp.read(dataOff).text();
                const marker = cp.read(markerOff).text();
                const input: JobInput = {
                    data,
                    type: "text",
                    marker,
                };
                const inputStr = JSON.stringify(input);
                return cp.store(inputStr);
            }
        );
        this.registerFunction(
            "newParam",
            async (mng, pluginPath, pluginId, _, cp, keyOff: bigint, valuesJsonOffset: bigint) => {
                const key = cp.read(keyOff).text();
                const values = cp.read(valuesJsonOffset).json();
                const param: JobParam = {
                    key,
                    value: values,
                };
                const paramStr = JSON.stringify(param);
                return cp.store(paramStr);
            }
        );
        this.registerFunction("waitFor", async (mng, pluginPath, pluginId, _, cp, jobIdOff: bigint) => {
            const jobId = cp.read(jobIdOff).text();
            while (true) {
                console.log("Check job" + jobId);
                const res = await client.r(client.isJobDone({ jobId }));
                console.log("Job done", res);
                if (res.isDone) {
                    return BigInt(1);
                } else {
                    await new Promise((res) => setTimeout(res, 100));
                }
            }
            return BigInt(0);
        });
        this.registerFunction("request", async (mng, pluginPath, pluginId, _, cp, reqOff: bigint) => {
            const req = cp.read(reqOff).json();

            const res = await client.r(
                client.requestJob({
                    runOn: req.runOn,
                    expireAfter: Number(req.expireAfter),
                    input: req.inputs,
                    param: req.params,
                    description: req.description,
                    kind: req.kind,
                    outputFormat: req.outputFormata,
                })
            );
            const jobs: string = JSON.stringify(res);
            return cp.store(jobs);
        });
    }
}
