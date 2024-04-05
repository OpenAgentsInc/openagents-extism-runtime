import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../runtime/HostFunctionsNamespace";
import  NostrConnectorClient  from "../runtime/NostrConnectorClient";
import { JobInput, JobParam } from "../runtime/proto/Protocol";
export default class NostrHostFunctionsMock extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Nostr");
        this.registerFunction("sendSignedEvent", async (mng, jobId, cp, eventOff: bigint) => {
            const event = cp.read(eventOff).text();
            console.info("sendSignedEvent", event);
            return 1;
        });
        this.registerFunction("subscribeToEvents", async (mng, jobId, cp, filtersJsonOffset: bigint) => {
            const filters = cp.read(filtersJsonOffset).json();
            console.info("subscribeToEvents", filters);
            return cp.store("{}");
        });

        this.registerFunction("unsubscribeFromEvents", async (mng, jobId, cp, subIdOff: bigint) => {
            const subscriptionId = cp.read(subIdOff).text();
            console.info("unsubscribeFromEvents", subscriptionId);

          
            return 1;
        });

        this.registerFunction("getEvents", async (mng, jobId, cp, subIdOff: bigint, limit: number) => {
            const subscriptionId = cp.read(subIdOff).text();

            console.info("getEvents", subscriptionId, limit);
            return cp.store("[]");
        });
    }
}