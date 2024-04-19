import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import  NostrConnectorClient  from "../PoolConnectorClient";
export default class NostrHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Nostr");
        this.registerFunction(
            "sendSignedEvent",
            async (mng, pluginPath, pluginId, jobId, cp, eventOff: bigint) => {
                const res = await client.r(
                    client.sendSignedEvent({
                        groupId: jobId,
                        event: cp.read(eventOff).text(),
                    })
                );

                return BigInt(res.success ? 1 : 0);
            }
        );
        this.registerFunction(
            "subscribeToEvents",
            async (mng, pluginPath, pluginId, jobId, cp, filtersJsonOffset: bigint) => {
                const filters = cp.read(filtersJsonOffset).json();
                const res = await client.r(
                    client.subscribeToEvents({
                        groupId: jobId,
                        filters,
                    })
                );
                const subId = res.subscriptionId;
                return cp.store(subId);
            }
        );

        this.registerFunction(
            "unsubscribeFromEvents",
            async (mng, pluginPath, pluginId, jobId, cp, subIdOff: bigint) => {
                const res = await client.r(
                    client.unsubscribeFromEvents({
                        groupId: jobId,
                        subscriptionId: cp.read(subIdOff).text(),
                    })
                );

                return BigInt(res.success ? 1 : 0);
            }
        );

        this.registerFunction(
            "getEvents",
            async (mng, pluginPath, pluginId, jobId, cp, subIdOff: bigint, limit: bigint) => {
                const res = await client.r(
                    client.getEvents({
                        groupId: jobId,
                        subscriptionId: cp.read(subIdOff).text(),
                        limit: Number(limit),
                    })
                );
                const events = JSON.stringify(res.events);
                return cp.store(events);
            }
        );
    }
}