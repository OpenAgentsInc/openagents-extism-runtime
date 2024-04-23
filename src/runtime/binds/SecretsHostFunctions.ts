import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import NostrConnectorClient from "../PoolConnectorClient";
import Secrets from "../Secrets";

export default class SecretHostFunctions extends HostFunctionsNamespace {
    constructor(secrets: Secrets) {
        super("Secrets");
        this.registerFunction("get", async (mng, pluginPath, pluginId, jobId, cp, eventOff: bigint) => {
            const key = cp.read(eventOff).text();
            let ns = secrets.namespace(pluginPath);
            let secret = ns ? ns.get(key): undefined;
            if(!secret) {
                ns = secrets.namespace(pluginId);
                secret = ns ? ns.get(key): undefined;
            }
            if(!secret) secret = "";
            return cp.store(secret);
        });
     
    }
}
