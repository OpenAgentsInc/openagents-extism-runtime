
import JobManager from "../runtime/JobManager";
import JobHostFunctionsMock from "./JobHostFunctionsMock";
import NostrHostFunctionsMock from "./NostrHostFunctionsMock";
import NostrConnectorClient from "../runtime/PoolConnectorClient";
import * as Extism from "@extism/extism";

async function main() {
    const IP = process.env.NOSTR_CONNECT_GRPC_BINDING_ADDRESS || "0.0.0.0";
    const PORT = Number(process.env.NOSTR_CONNECT_GRPC_BINDING_PORT || 5000);
    const nostrConnector = new NostrConnectorClient(IP, PORT);


    const hostFunctions = [
        new JobHostFunctionsMock(nostrConnector),
        new NostrHostFunctionsMock(nostrConnector),      
    ];

    const mergedFunctions = {};
    for (const hf of hostFunctions) {
        const functions = hf.getHostFunctions(new JobManager(nostrConnector), "0");
        for (const [name, func] of Object.entries(functions)) {
            mergedFunctions[name] = func;
        }
    }
 

    const plugin = Extism.createPlugin("./plugin/plugin.wasm", {
        useWasi: true,
        runInWorker: true,
        functions: {
            "extism:host/user": mergedFunctions,
        },
    });

    const res = await (await plugin).call("run", "{}");
    console.log(res);

    for (const k in hostFunctions) {
        const m = hostFunctions[k];
        console.log(await m.check());
    }
}

main();
